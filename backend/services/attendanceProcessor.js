// // ============================================================
// // services/attendanceProcessor.js
// // ============================================================
// //
// // KEY DECISIONS:
// //
// // 1. NO hardcoded shift times. ALL shift windows are loaded
// //    from the shift_types table at runtime via loadShiftWindows().
// //    ShiftType rows with name = "A","B","C" → worker shifts.
// //    ShiftType rows with name = "Staff" (or starts with "Staff")
// //    → staff shifts, detected by punch time proximity.
// //
// // 2. TWO-PHASE PROCESSING:
// //    Phase 1 — Real-time (every biometric punch)
// //      • Saves raw punch to biometric_punches table
// //      • Creates/updates PROVISIONAL attendance (isFinalized=false)
// //      • Used by live dashboard
// //
// //    Phase 2 — Finalization (cron, shift-end + buffer)
// //      • Reads ALL punches for the day
// //      • Applies permission/absent logic
// //      • Sets isFinalized = true
// //      • Calls upsertEmployeeShift() → updates employee_shifts table
// //
// // 3. EMPLOYMENT TYPE → LOGIC MAPPING:
// //    staff          → staff logic (permission pool, staff shift rows)
// //    worker         → worker logic (Shift A/B/C rows)
// //    staff-per-day  → worker logic
// //    supervisor     → worker logic
// //
// // 4. SHIFT HIERARCHY:
// //    Standard shifts (A, B, C) → for all worker/staff-per-day/supervisor/staff employees
// //    General shifts (GENERAL_A, GENERAL_B, etc.) → fallback only
// //    Standard shifts are prioritized in detection
// //
// // 5. STAFF PERMISSION POOL (120 min / month, from PERMISSION_CONFIG):
// //    Configurable. Each late/early deducts actual minutes.
// //    Pool resets every calendar month.
// //    Only applies to "Staff" named shifts, NOT A/B/C shifts.
// //
// // 6. TIMEZONE FIX:
// //    MySQL DATETIME stores local time. Sequelize wraps it in .000Z.
// //    toLocalMoment() extracts raw UTC digits (= real local time).
// //
// // ============================================================
// //
// // BUG FIXES (v5):
// //
// // FIX 1 — Wrong shift assigned when employee punches near the END
// //          of a shift window (e.g. 07:46 punch → Shift C instead of A).
// //
// //          Root cause: Pass 1 used shift.end as upper bound. 07:46 matched
// //          Shift C (00:45–08:30) instead of Shift A early-arrival (08:30-44min).
// //
// //          Solution: Use midpoint-capped window in Pass 1, 90-min early-arrival
// //          window in Pass 2. Standard shifts (A,B,C) checked before GENERAL_*.
// //
// // FIX 2 — Staff employee detected in A/B/C shift gets "Present with Permission"
// //          and deduction from permission pool, when should get "Present" status.
// //
// //          Root cause: _finalizeStaff() applied permission pool logic even when
// //          shift detected was A/B/C (worker shift), not "Staff" named shift.
// //
// //          Solution: When staff employee detected in A/B/C shift,
// //          use WORKER finalization logic (returns "Present"), NOT staff logic.
// //
// // FIX 3 — Staff employee with shiftTypeId pointing to A/B/C shift
// //          gets wrong shift and "Absent" status even with valid punches.
// //
// //          Root cause: _finalizeStaff() Priority 1 used shiftTypeId directly
// //          even when it pointed to A/B/C. This skipped auto-detection and
// //          applied staff permission-pool logic with the wrong shift start time,
// //          producing massive lateMin (e.g. 406 min) → Absent.
// //
// //          Solution: In Priority 1, only honour shiftTypeId for Staff-named
// //          shifts. If shiftTypeId points to A/B/C, fall through to punch-time
// //          auto-detection so the correct shift (A/B/C) is detected from the
// //          actual check-in time.
// //
// // FIX 4 — Early-arriving employees (e.g. 07:46 for Shift A at 08:30)
// //          get "Absent" even after correct shift is detected.
// //
// //          Root cause: validIn filter used shift.inWindowStart (shift.start
// //          minus beginCheckInBefore = 15 min) as lower bound. A punch 44 min
// //          early falls outside this narrow window → firstCheckIn = null → Absent.
// //          detectWorkerShift Pass 2 allows up to 90 min early arrival but the
// //          validIn filter did not match this allowance.
// //
// //          Solution: Use EARLY_ARRIVAL_WINDOW_MINUTES (90 min) as the earliestIn
// //          lower bound in both _finalizeWorker and the worker path of
// //          _finalizeStaff, consistent with shift-detection behaviour.
// //
// // ============================================================

// const {
//   Attendance,
//   BiometricPunch,
//   Employee,
//   EmploymentType,
//   LeaveRequest,
//   EmployeeShift,
//   ShiftType,
// } = require("../models");
// const { Op } = require("sequelize");
// const moment = require("moment");

// // ============================================================
// // EMPLOYMENT TYPE HELPERS
// // ============================================================

// const isStaffType = (empType) => empType === "staff";
// const isWorkerType = (empType) =>
//   ["worker", "staff-per-day", "supervisor"].includes(empType);

// // ============================================================
// // CONFIG
// // ============================================================
// const PERMISSION_CONFIG = {
//   MONTHLY_POOL_MINUTES: 120,
//   GRACE_MINUTES: 10, // used if ShiftType.lateGracePeriod is null
// };

// // How many minutes before a shift starts an early arrival is still
// // attributed to THAT shift (Pass 2 of detectWorkerShift).
// // 90 min comfortably covers "I arrived 44 min early for my 08:30 shift".
// const EARLY_ARRIVAL_WINDOW_MINUTES = 90;

// // ============================================================
// // SHIFT WINDOWS CACHE
// // ============================================================

// let _shiftCache = null;
// let _shiftCacheAt = 0;
// const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// /**
//  * Load shift windows from shift_types table.
//  * Cached for CACHE_TTL_MS to avoid repeated DB hits inside loops.
//  * Pass force=true to bypass cache (e.g. after admin edits shifts).
//  */
// const loadShiftWindows = async (companyId, force = false) => {
//   const now = Date.now();
//   if (!force && _shiftCache && now - _shiftCacheAt < CACHE_TTL_MS) {
//     return _shiftCache;
//   }

//   const rows = await ShiftType.findAll({
//     where: { status: "Active", companyId },
//     order: [["name", "ASC"]],
//   });

//   if (!rows.length) {
//     throw new Error(
//       `No active ShiftType rows found for companyId=${companyId}. ` +
//         `Please seed shift_types table before processing attendance.`,
//     );
//   }

//   const workerShifts = [];
//   const staffShifts = [];

//   for (const r of rows) {
//     // Normalise HH:MM:SS → HH:MM
//     const start = r.startTime.slice(0, 5); // "08:30"
//     const end = r.endTime.slice(0, 5);     // "16:30" or "01:00"

//     // Detect midnight crossing: end is numerically < start
//     const [sh, sm] = start.split(":").map(Number);
//     const [eh, em] = end.split(":").map(Number);
//     const crossesMidnight = eh * 60 + em < sh * 60 + sm;

//     // inWindowStart = shift start − beginCheckInBefore minutes
//     const inWindowStart = moment("2000-01-01 " + start)
//       .subtract(r.beginCheckInBefore ?? 15, "minutes")
//       .format("HH:mm");

//     const inWindowEnd = end;
//     const gracePeriod = r.lateGracePeriod ?? PERMISSION_CONFIG.GRACE_MINUTES;

//     // Pre-compute shift midpoint (minutes-from-midnight).
//     // detectWorkerShift Pass 1 uses this as the upper bound of the
//     // valid check-in window so a punch near shift-end is not wrongly
//     // bucketed into that shift.
//     const startMin = sh * 60 + sm;
//     const endMinExtended = crossesMidnight
//       ? eh * 60 + em + 24 * 60
//       : eh * 60 + em;
//     const midpointMin = Math.round((startMin + endMinExtended) / 2) % (24 * 60);

//     const shiftObj = {
//       id: r.id,
//       name: r.name,
//       label: `Shift ${r.name} ${start}-${end}`,
//       start,
//       end,
//       crossesMidnight,
//       inWindowStart,
//       inWindowEnd,
//       gracePeriod,
//       beginCheckInBefore: r.beginCheckInBefore ?? 15,
//       allowCheckOutAfter: r.allowCheckOutAfter ?? 15,
//       midpointMin, // ← used by detectWorkerShift Pass 1
//     };

//     const nameLower = r.name.toLowerCase();
//     if (nameLower === "staff" || nameLower.startsWith("staff")) {
//       staffShifts.push(shiftObj);
//     } else {
//       workerShifts.push(shiftObj);
//     }
//   }

//   // ✅ FIX 1: Sort worker shifts: standard (A,B,C) first, then GENERAL_*
//   // Ensures detectWorkerShift() checks standard shifts before general shifts
//   workerShifts.sort((a, b) => {
//     const aIsStandard = /^[ABC]$/.test(a.name);
//     const bIsStandard = /^[ABC]$/.test(b.name);

//     if (aIsStandard && !bIsStandard) return -1;
//     if (!aIsStandard && bIsStandard) return 1;

//     const [ah, am] = a.start.split(":").map(Number);
//     const [bh, bm] = b.start.split(":").map(Number);
//     return (ah * 60 + am) - (bh * 60 + bm);
//   });

//   // Sort staff shifts by start time so detection is deterministic
//   staffShifts.sort((a, b) => {
//     const [ah, am] = a.start.split(":").map(Number);
//     const [bh, bm] = b.start.split(":").map(Number);
//     return ah * 60 + am - (bh * 60 + bm);
//   });

//   const shiftById = new Map();
//   for (const s of [...workerShifts, ...staffShifts]) {
//     shiftById.set(s.id, s);
//   }

//   _shiftCache = { workerShifts, staffShifts, shiftById, raw: rows };
//   _shiftCacheAt = now;
//   return _shiftCache;
// };

// /** Invalidate cache (call after ShiftType CRUD) */
// const invalidateShiftCache = () => {
//   _shiftCache = null;
//   _shiftCacheAt = 0;
// };

// // ============================================================
// // SHIFT DETECTION  (DB-driven)
// // ============================================================

// /**
//  * detectWorkerShift
//  *
//  * Pass 1 — midpoint-capped window match (FIX 1):
//  *   Checks whether punchMoment falls in [ inWindowStart → midpoint ].
//  *   Using the midpoint (not shift end) as the upper bound prevents a
//  *   punch near the tail of a shift from being wrongly assigned to it.
//  *
//  *   With A 08:30–16:30 / B 16:30–01:00 / C 01:00–08:30 :
//  *     Shift A valid check-in: 08:15 → 12:30
//  *     Shift B valid check-in: 16:15 → 20:45
//  *     Shift C valid check-in: 00:45 → 04:45
//  *   A punch at 07:46 falls OUTSIDE all three → passes to Pass 2.
//  *
//  * Pass 2 — early-arrival look-ahead (FIX 1):
//  *   If no window matched, find the shift whose start is the nearest
//  *   future time within EARLY_ARRIVAL_WINDOW_MINUTES (90 min).
//  *   07:46 → 44 min before Shift A (08:30) → Shift A ✓
//  *
//  * Pass 3 — nearest-start fallback:
//  *   Last resort: return the shift whose start is closest to the punch.
//  *
//  * ✅ FIX 1: Standard shifts (A,B,C) are checked BEFORE general shifts (GENERAL_*).
//  */
// const detectWorkerShift = (punchMoment, workerShifts) => {
//   const tot = punchMoment.hours() * 60 + punchMoment.minutes();

//   const standardShifts = workerShifts.filter((s) => /^[ABC]$/.test(s.name));
//   const generalShifts = workerShifts.filter((s) => !/^[ABC]$/.test(s.name));

//   // ══════════════════════════════════════════════════════════════
//   // TRY STANDARD SHIFTS FIRST (A, B, C)
//   // ══════════════════════════════════════════════════════════════

//   // ── Pass 1: midpoint-capped window ────────────────────────────
//   for (const shift of standardShifts) {
//     const [wsh, wsm] = shift.inWindowStart.split(":").map(Number);
//     const winStart = wsh * 60 + wsm;
//     const midpoint = shift.midpointMin;

//     if (winStart <= midpoint) {
//       if (tot >= winStart && tot <= midpoint) return shift;
//     }
//   }

//   // ── Pass 2: early-arrival look-ahead ──────────────────────────
//   let lookAheadBest = null;
//   let lookAheadDiff = Infinity;

//   for (const shift of standardShifts) {
//     const [sh, sm] = shift.start.split(":").map(Number);
//     const shiftStartMin = sh * 60 + sm;

//     let minutesBefore = shiftStartMin - tot;
//     if (minutesBefore < 0) minutesBefore += 24 * 60;

//     if (
//       minutesBefore >= 0 &&
//       minutesBefore <= EARLY_ARRIVAL_WINDOW_MINUTES &&
//       minutesBefore < lookAheadDiff
//     ) {
//       lookAheadDiff = minutesBefore;
//       lookAheadBest = shift;
//     }
//   }

//   if (lookAheadBest) return lookAheadBest;

//   // ── Pass 3: nearest-start fallback ────────────────────────────
//   let best = null;
//   let bestDiff = Infinity;
//   for (const shift of standardShifts) {
//     const [sh, sm] = shift.start.split(":").map(Number);
//     const diff = Math.abs(tot - (sh * 60 + sm));
//     if (diff < bestDiff) {
//       bestDiff = diff;
//       best = shift;
//     }
//   }

//   if (best) return best;

//   // ══════════════════════════════════════════════════════════════
//   // FALLBACK: TRY GENERAL SHIFTS (GENERAL_A, GENERAL_B, etc.)
//   // ══════════════════════════════════════════════════════════════

//   // ── Pass 1: midpoint-capped window ────────────────────────────
//   for (const shift of generalShifts) {
//     const [wsh, wsm] = shift.inWindowStart.split(":").map(Number);
//     const winStart = wsh * 60 + wsm;
//     const midpoint = shift.midpointMin;

//     if (winStart <= midpoint) {
//       if (tot >= winStart && tot <= midpoint) return shift;
//     }
//   }

//   // ── Pass 2: early-arrival look-ahead ──────────────────────────
//   lookAheadBest = null;
//   lookAheadDiff = Infinity;

//   for (const shift of generalShifts) {
//     const [sh, sm] = shift.start.split(":").map(Number);
//     const shiftStartMin = sh * 60 + sm;

//     let minutesBefore = shiftStartMin - tot;
//     if (minutesBefore < 0) minutesBefore += 24 * 60;

//     if (
//       minutesBefore >= 0 &&
//       minutesBefore <= EARLY_ARRIVAL_WINDOW_MINUTES &&
//       minutesBefore < lookAheadDiff
//     ) {
//       lookAheadDiff = minutesBefore;
//       lookAheadBest = shift;
//     }
//   }

//   if (lookAheadBest) return lookAheadBest;

//   // ── Pass 3: nearest-start fallback ────────────────────────────
//   best = null;
//   bestDiff = Infinity;
//   for (const shift of generalShifts) {
//     const [sh, sm] = shift.start.split(":").map(Number);
//     const diff = Math.abs(tot - (sh * 60 + sm));
//     if (diff < bestDiff) {
//       bestDiff = diff;
//       best = shift;
//     }
//   }

//   return best; // May be null if no shifts at all
// };

// /**
//  * detectStaffShift
//  * For staff: finds the staff shift whose window contains punchMoment.
//  * If there is only one staff shift row, always returns it.
//  * Falls back to first staff shift.
//  */
// const detectStaffShift = (punchMoment, staffShifts) => {
//   if (!staffShifts.length) return null;
//   if (staffShifts.length === 1) return staffShifts[0];

//   const tot = punchMoment.hours() * 60 + punchMoment.minutes();

//   for (const shift of staffShifts) {
//     const [wsh, wsm] = shift.inWindowStart.split(":").map(Number);
//     const [weh, wem] = shift.inWindowEnd.split(":").map(Number);
//     const winStart = wsh * 60 + wsm;
//     const winEnd = weh * 60 + wem;

//     if (tot >= winStart && tot <= winEnd) return shift;
//   }

//   console.warn(
//     `[detectStaffShift] punch at ${punchMoment.format("HH:mm")} outside all staff windows, defaulting to first staff shift`,
//   );
//   return staffShifts[0];
// };

// /**
//  * getShiftForEmployee — single entry point
//  *
//  * Priority:
//  *  1. STAFF with assigned shiftTypeId that is a Staff-named shift → use directly
//  *  2. STAFF without shiftTypeId (or shiftTypeId → A/B/C) → detect from punch time
//  *  3. WORKER / STAFF-PER-DAY / SUPERVISOR → ALWAYS auto-detect from punch time
//  */
// const getShiftForEmployee = (
//   empType,
//   punchMoment,
//   shiftWindows,
//   shiftTypeId = null,
// ) => {
//   if (isStaffType(empType)) {
//     // ✅ FIX 3: Only honour shiftTypeId for Staff-named shifts.
//     // If it points to A/B/C, fall through to punch-time auto-detection.
//     if (shiftTypeId && shiftWindows.shiftById) {
//       const assigned = shiftWindows.shiftById.get(Number(shiftTypeId));
//       if (assigned && !/^[ABC]$/.test(assigned.name)) {
//         return assigned;
//       }
//     }
//     // Try dedicated staff shifts first, then worker shifts
//     const staffShift = detectStaffShift(punchMoment, shiftWindows.staffShifts);
//     if (staffShift) return staffShift;
//     return detectWorkerShift(punchMoment, shiftWindows.workerShifts);
//   }

//   if (isWorkerType(empType)) {
//     return detectWorkerShift(punchMoment, shiftWindows.workerShifts);
//   }

//   return null;
// };

// // ============================================================
// // HELPERS
// // ============================================================

// // const toLocalMoment = (punchTime) => {
// //   if (!punchTime) return null;
// //   const raw = moment(punchTime).utc().format("YYYY-MM-DD HH:mm:ss");
// //   return moment(raw, "YYYY-MM-DD HH:mm:ss");
// // };

// // AFTER (correct — converts UTC → server local timezone)
// const toLocalMoment = (punchTime) => {
//   if (!punchTime) return null;
//   return moment.utc(punchTime).local();
// };

// const buildMoment = (dateStr, timeStr, crossDay = false) => {
//   const base = crossDay
//     ? moment(dateStr).add(1, "day").format("YYYY-MM-DD")
//     : dateStr;
//   return moment(`${base} ${timeStr.slice(0, 5)}`, "YYYY-MM-DD HH:mm");
// };

// const calcHours = (checkIn, checkOut) => {
//   if (!checkIn || !checkOut) return 0;
//   const diff = toLocalMoment(checkOut).diff(toLocalMoment(checkIn), "minutes");
//   return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0;
// };

// // ============================================================
// // PERMISSION POOL
// // ============================================================

// const getRemainingPool = async (employeeId, dateStr) => {
//   const monthStart = moment(dateStr).startOf("month").format("YYYY-MM-DD");
//   const monthEnd = moment(dateStr).endOf("month").format("YYYY-MM-DD");

//   const usedRaw = await Attendance.sum("permissionMinutes", {
//     where: {
//       employeeId,
//       attendanceDate: {
//         [Op.between]: [monthStart, monthEnd],
//         [Op.lt]: dateStr,
//       },
//       permissionMinutes: { [Op.gt]: 0 },
//     },
//   });

//   const used = usedRaw || 0;
//   const remaining = PERMISSION_CONFIG.MONTHLY_POOL_MINUTES - used;
//   return { used, remaining };
// };

// // ============================================================
// // LEAVE CHECK
// // ============================================================

// const checkIfOnLeave = (employeeId, companyId, date) =>
//   LeaveRequest.findOne({
//     where: {
//       employeeId,
//       companyId,
//       status: "Approved",
//       startDate: { [Op.lte]: date },
//       endDate: { [Op.gte]: date },
//     },
//   });

// // ============================================================
// // UPSERT ATTENDANCE
// // ============================================================

// const _upsert = async (existing, data) => {
//   if (existing) return existing.update(data);
//   return Attendance.create(data);
// };

// // ============================================================
// // EMPLOYEE SHIFT SUMMARY
// // ============================================================

// const upsertEmployeeShift = async (record, previousSnapshot = null) => {
//   const {
//     employeeId,
//     companyId,
//     attendanceDate,
//     shiftName,
//     scheduledStartTime,
//     scheduledEndTime,
//     status,
//     isLate,
//     isEarlyExit,
//     workingHours,
//     overtimeHours,
//     permissionMinutes,
//   } = record;

//   if (!shiftName || shiftName === "Unknown" || shiftName === "N/A") return;

//   const dateM = moment(attendanceDate);
//   const month = dateM.month() + 1;
//   const year = dateM.year();

//   // Step 1: Reverse old contribution if re-finalizing
//   if (
//     previousSnapshot?.shiftName &&
//     previousSnapshot.shiftName !== "Unknown" &&
//     previousSnapshot.shiftName !== "N/A"
//   ) {
//     const oldRow = await EmployeeShift.findOne({
//       where: {
//         employeeId,
//         companyId,
//         shiftName: previousSnapshot.shiftName,
//         month,
//         year,
//       },
//     });

//     if (oldRow) {
//       await oldRow.update({
//         totalDays: Math.max(0, oldRow.totalDays - 1),
//         presentDays: Math.max(
//           0,
//           oldRow.presentDays - (previousSnapshot.status === "Present" ? 1 : 0),
//         ),
//         presentWithPermissionDays: Math.max(
//           0,
//           oldRow.presentWithPermissionDays -
//             (previousSnapshot.status === "Present with Permission" ? 1 : 0),
//         ),
//         absentDays: Math.max(
//           0,
//           oldRow.absentDays - (previousSnapshot.status === "Absent" ? 1 : 0),
//         ),
//         leaveDays: Math.max(
//           0,
//           oldRow.leaveDays - (previousSnapshot.status === "Leave" ? 1 : 0),
//         ),
//         lateDays: Math.max(
//           0,
//           oldRow.lateDays - (previousSnapshot.isLate ? 1 : 0),
//         ),
//         earlyExitDays: Math.max(
//           0,
//           oldRow.earlyExitDays - (previousSnapshot.isEarlyExit ? 1 : 0),
//         ),
//         totalWorkingHours: Math.max(
//           0,
//           parseFloat(oldRow.totalWorkingHours) -
//             (parseFloat(previousSnapshot.workingHours) || 0),
//         ).toFixed(2),
//         totalOvertimeHours: Math.max(
//           0,
//           parseFloat(oldRow.totalOvertimeHours) -
//             (parseFloat(previousSnapshot.overtimeHours) || 0),
//         ).toFixed(2),
//         totalPermissionMinutes: Math.max(
//           0,
//           oldRow.totalPermissionMinutes -
//             (parseInt(previousSnapshot.permissionMinutes) || 0),
//         ),
//         lastSeenDate: oldRow.totalDays - 1 <= 0 ? null : oldRow.lastSeenDate,
//         firstSeenDate: oldRow.totalDays - 1 <= 0 ? null : oldRow.firstSeenDate,
//       });
//     }
//   }

//   // Step 2: Find or create target shift row
//   const [row] = await EmployeeShift.findOrCreate({
//     where: { employeeId, companyId, shiftName, month, year },
//     defaults: {
//       scheduledStartTime: scheduledStartTime || null,
//       scheduledEndTime: scheduledEndTime || null,
//       totalDays: 0,
//       presentDays: 0,
//       presentWithPermissionDays: 0,
//       absentDays: 0,
//       leaveDays: 0,
//       lateDays: 0,
//       earlyExitDays: 0,
//       totalWorkingHours: 0,
//       totalOvertimeHours: 0,
//       totalPermissionMinutes: 0,
//       firstSeenDate: attendanceDate,
//       lastSeenDate: attendanceDate,
//     },
//   });

//   // Step 3: Add new contribution
//   const newWorkingHours = Math.max(
//     0,
//     parseFloat(row.totalWorkingHours) + (parseFloat(workingHours) || 0),
//   );
//   const newOvertimeHours = Math.max(
//     0,
//     parseFloat(row.totalOvertimeHours) + (parseFloat(overtimeHours) || 0),
//   );
//   const newPermissionMinutes = Math.max(
//     0,
//     row.totalPermissionMinutes + (parseInt(permissionMinutes) || 0),
//   );

//   const newFirstSeen =
//     !row.firstSeenDate || attendanceDate < row.firstSeenDate
//       ? attendanceDate
//       : row.firstSeenDate;
//   const newLastSeen =
//     !row.lastSeenDate || attendanceDate > row.lastSeenDate
//       ? attendanceDate
//       : row.lastSeenDate;

//   await row.update({
//     scheduledStartTime: scheduledStartTime || row.scheduledStartTime,
//     scheduledEndTime: scheduledEndTime || row.scheduledEndTime,
//     totalDays: row.totalDays + 1,
//     presentDays: row.presentDays + (status === "Present" ? 1 : 0),
//     presentWithPermissionDays:
//       row.presentWithPermissionDays +
//       (status === "Present with Permission" ? 1 : 0),
//     absentDays: row.absentDays + (status === "Absent" ? 1 : 0),
//     leaveDays: row.leaveDays + (status === "Leave" ? 1 : 0),
//     lateDays: row.lateDays + (isLate ? 1 : 0),
//     earlyExitDays: row.earlyExitDays + (isEarlyExit ? 1 : 0),
//     totalWorkingHours: newWorkingHours.toFixed(2),
//     totalOvertimeHours: newOvertimeHours.toFixed(2),
//     totalPermissionMinutes: newPermissionMinutes,
//     firstSeenDate: newFirstSeen,
//     lastSeenDate: newLastSeen,
//   });
// };

// // ============================================================
// // DERIVE PUNCH TYPE (stateless, for devices that don't send IN/OUT)
// // ============================================================

// const derivePunchType = async (
//   punchTime,
//   empType,
//   companyId,
//   shiftTypeId = null,
// ) => {
//   const punchM = toLocalMoment(punchTime);
//   const tot = punchM.hours() * 60 + punchM.minutes();

//   const shiftWindows = await loadShiftWindows(companyId);

//   if (isStaffType(empType)) {
//     // ✅ FIX 3: Only use shiftTypeId for Staff-named shifts, not A/B/C
//     let staffShift = null;
//     if (shiftTypeId && shiftWindows.shiftById) {
//       const assigned = shiftWindows.shiftById.get(Number(shiftTypeId));
//       if (assigned && !/^[ABC]$/.test(assigned.name)) {
//         staffShift = assigned;
//       }
//     }
//     if (!staffShift) {
//       staffShift =
//         detectStaffShift(punchM, shiftWindows.staffShifts) ||
//         detectWorkerShift(punchM, shiftWindows.workerShifts);
//     }
//     if (!staffShift) return "IN";
//     const [sh, sm] = staffShift.start.split(":").map(Number);
//     const [eh, em] = staffShift.end.split(":").map(Number);
//     const midpoint = (sh * 60 + sm + eh * 60 + em) / 2;
//     return tot < midpoint ? "IN" : "OUT";
//   }

//   const shift =
//     (shiftTypeId && shiftWindows.shiftById?.get(Number(shiftTypeId))) ||
//     detectWorkerShift(punchM, shiftWindows.workerShifts);
//   if (!shift) return "IN";

//   const [sh, sm] = shift.start.split(":").map(Number);
//   const [eh, em] = shift.end.split(":").map(Number);
//   let midpoint;
//   if (shift.crossesMidnight) {
//     midpoint = (sh * 60 + sm + (eh * 60 + em + 24 * 60)) / 2;
//     midpoint = midpoint % (24 * 60);
//   } else {
//     midpoint = (sh * 60 + sm + eh * 60 + em) / 2;
//   }

//   return tot < midpoint ? "IN" : "OUT";
// };

// // ============================================================
// // PHASE 1 — REAL-TIME PUNCH PROCESSING
// // ============================================================

// const processRealtimePunch = async ({
//   employeeId,
//   punchTime,
//   punchType,
//   companyId,
// }) => {
//   const punchDate = moment(punchTime).format("YYYY-MM-DD");

//   const employee = await Employee.findByPk(employeeId, {
//     attributes: [
//       "id",
//       "firstName",
//       "lastName",
//       "employeeCode",
//       "companyId",
//       "shiftTypeId",
//     ],
//     include: [{ model: EmploymentType, as: "employmentType" }],
//   });
//   if (!employee) throw new Error(`Employee ${employeeId} not found`);

//   const empType = employee.employmentType?.name?.toLowerCase();

//   const isIn = punchType === "IN" || punchType === "Check-In";
//   const isOut = punchType === "OUT" || punchType === "Check-Out";

//   const punchM = toLocalMoment(punchTime);
//   const shiftWindows = await loadShiftWindows(companyId);
//   const shift = getShiftForEmployee(
//     empType,
//     punchM,
//     shiftWindows,
//     employee.shiftTypeId,
//   );

//   const existing = await Attendance.findOne({
//     where: { employeeId, attendanceDate: punchDate },
//   });

//   if (!existing) {
//     let isLate = false;
//     let lateByMinutes = 0;

//     if (isIn && shift) {
//       const shiftStart = buildMoment(punchDate, shift.start);
//       const grace = shift.gracePeriod ?? PERMISSION_CONFIG.GRACE_MINUTES;
//       const graceEnd = shiftStart.clone().add(grace, "minutes");
//       if (punchM.isAfter(graceEnd)) {
//         isLate = true;
//         lateByMinutes = punchM.diff(shiftStart, "minutes");
//       }
//     }

//     return Attendance.create({
//       employeeId,
//       companyId,
//       attendanceDate: punchDate,
//       shiftName: shift?.name || "Unknown",
//       scheduledStartTime: shift?.start || null,
//       scheduledEndTime: shift?.end || null,
//       firstCheckIn: isIn ? punchTime : null,
//       lastCheckOut: isOut ? punchTime : null,
//       totalCheckIns: isIn ? 1 : 0,
//       totalCheckOuts: isOut ? 1 : 0,
//       workingHours: 0,
//       overtimeHours: 0,
//       isLate,
//       lateByMinutes,
//       isEarlyExit: false,
//       earlyExitMinutes: 0,
//       permissionMinutes: 0,
//       isHoliday: false,
//       isWeekOff: false,
//       isFinalized: false,
//       autoGenerated: true,
//       status: "Present",
//       remarks: "Provisional — awaiting finalization",
//     });
//   }

//   const updates = {};
//   if (isIn) {
//     if (!existing.firstCheckIn) updates.firstCheckIn = punchTime;
//     updates.totalCheckIns = (existing.totalCheckIns || 0) + 1;
//   }
//   if (isOut) {
//     updates.lastCheckOut = punchTime;
//     updates.totalCheckOuts = (existing.totalCheckOuts || 0) + 1;
//     if (existing.firstCheckIn) {
//       updates.workingHours = calcHours(existing.firstCheckIn, punchTime);
//     }
//   }

//   await existing.update(updates);
//   return existing;
// };

// // ============================================================
// // PHASE 2 — FINALIZATION
// // ============================================================

// const finalizeAttendance = async ({
//   dateStr,
//   companyId,
//   employeeIds,
//   employeeType,
//   onProgress,
// } = {}) => {
//   console.log(`[finalize] date=${dateStr} type=${employeeType || "all"}`);

//   const results = { processed: 0, finalized: 0, skipped: 0, errors: [] };

//   const empWhere = { status: "Active" };
//   if (companyId) empWhere.companyId = companyId;
//   if (employeeIds?.length) empWhere.id = { [Op.in]: employeeIds };

//   const employees = await Employee.findAll({
//     where: empWhere,
//     include: [{ model: EmploymentType, as: "employmentType" }],
//   });

//   const toProcess = employeeType
//     ? employees.filter(
//         (e) => e.employmentType?.name?.toLowerCase() === employeeType,
//       )
//     : employees;

//   const total = toProcess.length;

//   const effCompany = companyId || toProcess[0]?.companyId;
//   if (!effCompany) return results;

//   const shiftWindows = await loadShiftWindows(effCompany);

//   for (let i = 0; i < toProcess.length; i++) {
//     const emp = toProcess[i];
//     try {
//       results.processed++;

//       const empType = emp.employmentType?.name?.toLowerCase();
//       const _isStaff = isStaffType(empType);
//       const empCompany = companyId || emp.companyId;

//       const existing = await Attendance.findOne({
//         where: { employeeId: emp.id, attendanceDate: dateStr },
//       });

//       if (existing?.isFinalized) {
//         results.skipped++;
//         if (onProgress) {
//           onProgress(
//             results.processed,
//             total,
//             `${emp.firstName} ${emp.lastName} (skipped)`,
//           );
//         }
//         continue;
//       }

//       const previousSnapshot = existing
//         ? {
//             shiftName: existing.shiftName,
//             status: existing.status,
//             isLate: existing.isLate,
//             isEarlyExit: existing.isEarlyExit,
//             workingHours: existing.workingHours,
//             overtimeHours: existing.overtimeHours,
//             permissionMinutes: existing.permissionMinutes,
//           }
//         : null;

//       const onLeave = await checkIfOnLeave(emp.id, empCompany, dateStr);
//       if (onLeave) {
//         const leaveData = {
//           employeeId: emp.id,
//           companyId: empCompany,
//           attendanceDate: dateStr,
//           shiftName: _isStaff ? "Staff" : "N/A",
//           scheduledStartTime: null,
//           scheduledEndTime: null,
//           firstCheckIn: null,
//           lastCheckOut: null,
//           totalCheckIns: 0,
//           totalCheckOuts: 0,
//           workingHours: 0,
//           overtimeHours: 0,
//           isLate: false,
//           lateByMinutes: 0,
//           isEarlyExit: false,
//           earlyExitMinutes: 0,
//           permissionMinutes: 0,
//           isHoliday: false,
//           isWeekOff: false,
//           isFinalized: true,
//           autoGenerated: true,
//           status: "Leave",
//           remarks: "Approved Leave",
//         };
//         await _upsert(existing, leaveData);
//         results.finalized++;
//         if (onProgress) {
//           onProgress(
//             results.processed,
//             total,
//             `${emp.firstName} ${emp.lastName}`,
//           );
//         }
//         continue;
//       }

//       // Fetch punches (worker shifts may cross midnight)
//       const punchDates = [dateStr];
//       if (!_isStaff) {
//         punchDates.push(moment(dateStr).add(1, "day").format("YYYY-MM-DD"));
//       }

//       const punches = await BiometricPunch.findAll({
//         where: {
//           employeeId: emp.id,
//           companyId: empCompany,
//           punchDate: { [Op.in]: punchDates },
//           status: "Valid",
//         },
//         order: [["punchTime", "ASC"]],
//       });

//       const record = _isStaff
//         ? await _finalizeStaff(
//             emp,
//             dateStr,
//             punches,
//             empCompany,
//             shiftWindows,
//             emp.shiftTypeId,
//           )
//         : await _finalizeWorker(
//             emp,
//             dateStr,
//             punches,
//             empCompany,
//             shiftWindows,
//           );

//       record.isFinalized = true;
//       record.autoGenerated = true;

//       await _upsert(existing, record);
//       await upsertEmployeeShift(record, previousSnapshot);

//       results.finalized++;

//       if (onProgress) {
//         onProgress(
//           results.processed,
//           total,
//           `${emp.firstName} ${emp.lastName}`,
//         );
//       }
//     } catch (err) {
//       console.error(`[finalize] emp=${emp.id}:`, err.message);
//       results.errors.push({ employeeId: emp.id, error: err.message });
//       if (onProgress) {
//         onProgress(results.processed, total, `emp#${emp.id} ERROR`);
//       }
//     }
//   }

//   console.log(`[finalize] done:`, results);
//   return results;
// };

// // ============================================================
// // STAFF FINALIZATION
// // ============================================================

// const _finalizeStaff = async (
//   emp,
//   dateStr,
//   punches,
//   companyId,
//   shiftWindows,
//   shiftTypeId = null,
// ) => {
//   const { staffShifts, shiftById, workerShifts } = shiftWindows;

//   let shift = null;
//   let detectedAsWorkerShift = false;

//   // ── Priority 1: use assigned shiftTypeId ONLY for Staff-named shifts ──
//   // ✅ FIX 3: If shiftTypeId points to A/B/C, skip it and fall through
//   //    to punch-time auto-detection. Using it directly would apply staff
//   //    permission-pool logic with the wrong shift window (e.g. Shift C
//   //    01:00–08:30 for an employee who works 07:46–18:06), producing a
//   //    massive lateMin → exhausted pool → Absent.
//   if (shiftTypeId && shiftById) {
//     const assigned = shiftById.get(Number(shiftTypeId)) || null;
//     if (assigned && !/^[ABC]$/.test(assigned.name)) {
//       // Only honour Staff-named shifts (e.g. "Staff", "Staff Morning")
//       shift = assigned;
//     }
//     // A/B/C assignments fall through to punch-time detection below
//   }

//   // ── Priority 2: detect from first IN punch time ──────────────────────
//   if (!shift) {
//     const allInSorted = punches
//       .filter((p) => p.punchType === "IN")
//       .sort((a, b) =>
//         toLocalMoment(a.punchTime).diff(toLocalMoment(b.punchTime)),
//       );

//     if (allInSorted.length) {
//       const firstInM = toLocalMoment(allInSorted[0].punchTime);

//       // Try dedicated Staff-named shifts first
//       shift = detectStaffShift(firstInM, staffShifts);

//       // If no Staff shift found, fall back to worker shifts (A/B/C)
//       if (!shift) {
//         shift = detectWorkerShift(firstInM, workerShifts);
//         if (shift) {
//           detectedAsWorkerShift = true;
//         }
//       }
//     }
//   }

//   // ── Priority 3: no punches at all — pick first available shift ───────
//   if (!shift) {
//     shift = staffShifts[0] || workerShifts[0] || null;
//     if (shift && workerShifts.includes(shift)) {
//       detectedAsWorkerShift = true;
//     }
//   }

//   // ══════════════════════════════════════════════════════════════════════
//   // ✅ FIX 2 + FIX 3: Staff employee on A/B/C shift → use WORKER logic
//   //    (Present/Absent only, no permission pool deduction).
//   // ✅ FIX 4: earliestIn uses EARLY_ARRIVAL_WINDOW_MINUTES (90 min) so
//   //    an employee who arrives up to 90 min before shift start is counted
//   //    as a valid IN punch (matches detectWorkerShift Pass 2 behaviour).
//   // ══════════════════════════════════════════════════════════════════════
//   if (detectedAsWorkerShift && shift) {
//     const grace = shift.gracePeriod ?? 10;
//     const shiftStart = buildMoment(dateStr, shift.start);
//     const shiftEnd = buildMoment(dateStr, shift.end, shift.crossesMidnight);
//     const graceEnd = shiftStart.clone().add(grace, "minutes");

//     // ✅ FIX 4: use EARLY_ARRIVAL_WINDOW_MINUTES, not inWindowStart (15 min).
//     // Prevents early arrivals (e.g. 07:46 for 08:30 shift) being excluded.
//     const earliestIn = shiftStart.clone().subtract(EARLY_ARRIVAL_WINDOW_MINUTES, "minutes");

//     const validIn = punches.filter((p) => {
//       if (p.punchType !== "IN") return false;
//       const t = toLocalMoment(p.punchTime);
//       return t.isSameOrAfter(earliestIn) && t.isSameOrBefore(shiftEnd);
//     });

//     const validOut = punches.filter((p) => {
//       if (p.punchType !== "OUT") return false;
//       const t = toLocalMoment(p.punchTime);
//       const maxOut = shiftEnd.clone().add(4, "hours");
//       return t.isSameOrAfter(shiftStart) && t.isSameOrBefore(maxOut);
//     });

//     const anyOut = punches.filter((p) => p.punchType === "OUT");
//     const rawOut = anyOut.length ? anyOut[anyOut.length - 1].punchTime : null;
//     const firstCheckIn = validIn.length ? validIn[0].punchTime : null;
//     const lastCheckOut = validOut.length
//       ? validOut[validOut.length - 1].punchTime
//       : null;

//     const base = {
//       employeeId: emp.id,
//       companyId,
//       attendanceDate: dateStr,
//       shiftName: shift.name,
//       scheduledStartTime: shift.start,
//       scheduledEndTime: shift.end,
//       firstCheckIn,
//       lastCheckOut: lastCheckOut || rawOut,
//       totalCheckIns: validIn.length,
//       totalCheckOuts: anyOut.length,
//       isLate: false,
//       lateByMinutes: 0,
//       isEarlyExit: false,
//       earlyExitMinutes: 0,
//       permissionMinutes: 0,
//       workingHours: 0,
//       overtimeHours: 0,
//       isHoliday: false,
//       isWeekOff: false,
//     };

//     if (!firstCheckIn) {
//       return {
//         ...base,
//         status: "Absent",
//         remarks: `No valid IN for Shift ${shift.name}`,
//       };
//     }

//     if (!lastCheckOut) {
//       const wh = rawOut ? calcHours(firstCheckIn, rawOut) : 0;
//       const msg = rawOut
//         ? `OUT at ${toLocalMoment(rawOut).format("HH:mm")} outside Shift ${shift.name} window`
//         : `IN found but no OUT for Shift ${shift.name}`;
//       return { ...base, status: "Absent", remarks: msg, workingHours: wh };
//     }

//     const lateMin = toLocalMoment(firstCheckIn).isAfter(graceEnd)
//       ? toLocalMoment(firstCheckIn).diff(shiftStart, "minutes")
//       : 0;
//     const earlyMin = toLocalMoment(lastCheckOut).isBefore(shiftEnd)
//       ? shiftEnd.diff(toLocalMoment(lastCheckOut), "minutes")
//       : 0;

//     const wh = calcHours(firstCheckIn, lastCheckOut);
//     const shiftDurationH = shiftEnd.diff(shiftStart, "minutes") / 60;
//     const otH =
//       wh > shiftDurationH ? parseFloat((wh - shiftDurationH).toFixed(2)) : 0;

//     const remarks = [];
//     if (lateMin > 0) remarks.push(`Late by ${lateMin} min`);
//     if (earlyMin > 0) remarks.push(`Early exit by ${earlyMin} min`);

//     return {
//       ...base,
//       status: "Present",
//       isLate: lateMin > 0,
//       lateByMinutes: lateMin,
//       isEarlyExit: earlyMin > 0,
//       earlyExitMinutes: earlyMin,
//       workingHours: wh,
//       overtimeHours: otH,
//       permissionMinutes: 0,
//       remarks: remarks.length ? remarks.join(", ") : null,
//     };
//   }

//   // ══════════════════════════════════════════════════════════════════════
//   // No shift found at all
//   // ══════════════════════════════════════════════════════════════════════
//   if (!shift) {
//     return {
//       employeeId: emp.id,
//       companyId,
//       attendanceDate: dateStr,
//       shiftName: "Unknown",
//       scheduledStartTime: null,
//       scheduledEndTime: null,
//       firstCheckIn: null,
//       lastCheckOut: null,
//       totalCheckIns: 0,
//       totalCheckOuts: 0,
//       isLate: false,
//       lateByMinutes: 0,
//       isEarlyExit: false,
//       earlyExitMinutes: 0,
//       permissionMinutes: 0,
//       workingHours: 0,
//       overtimeHours: 0,
//       isHoliday: false,
//       isWeekOff: false,
//       status: "Absent",
//       remarks: "No shift configured in system",
//     };
//   }

//   // ══════════════════════════════════════════════════════════════════════
//   // STAFF FINALIZATION — Staff-named shifts with permission pool
//   // ══════════════════════════════════════════════════════════════════════
//   const grace = shift.gracePeriod ?? PERMISSION_CONFIG.GRACE_MINUTES;
//   const shiftStart = buildMoment(dateStr, shift.start);
//   const shiftEnd = buildMoment(dateStr, shift.end);
//   const graceEnd = shiftStart.clone().add(grace, "minutes");
//   const earliestIn = buildMoment(dateStr, shift.inWindowStart);

//   const inPunches = punches.filter((p) => {
//     if (p.punchType !== "IN") return false;
//     const t = toLocalMoment(p.punchTime);
//     return t.isSameOrAfter(earliestIn) && t.isSameOrBefore(shiftEnd);
//   });

//   const halfwayPoint = shiftStart
//     .clone()
//     .add(shiftEnd.diff(shiftStart, "minutes") / 2, "minutes");

//   const outPunches = punches.filter(
//     (p) =>
//       p.punchType === "OUT" &&
//       toLocalMoment(p.punchTime).isSameOrAfter(halfwayPoint),
//   );

//   const anyOut = punches.filter((p) => p.punchType === "OUT");
//   const rawLastOut = anyOut.length ? anyOut[anyOut.length - 1].punchTime : null;

//   const firstCheckIn = inPunches.length ? inPunches[0].punchTime : null;
//   const lastCheckOut = outPunches.length
//     ? outPunches[outPunches.length - 1].punchTime
//     : null;

//   const base = {
//     employeeId: emp.id,
//     companyId,
//     attendanceDate: dateStr,
//     shiftName: shift.name,
//     scheduledStartTime: shift.start,
//     scheduledEndTime: shift.end,
//     firstCheckIn,
//     lastCheckOut: lastCheckOut || rawLastOut,
//     totalCheckIns: inPunches.length,
//     totalCheckOuts: anyOut.length,
//     isLate: false,
//     lateByMinutes: 0,
//     isEarlyExit: false,
//     earlyExitMinutes: 0,
//     permissionMinutes: 0,
//     workingHours: 0,
//     overtimeHours: 0,
//     isHoliday: false,
//     isWeekOff: false,
//   };

//   if (!firstCheckIn) {
//     return {
//       ...base,
//       status: "Absent",
//       remarks: "No valid check-in found in shift window",
//     };
//   }

//   if (!lastCheckOut) {
//     const wh = rawLastOut ? calcHours(firstCheckIn, rawLastOut) : 0;
//     const msg = rawLastOut
//       ? `Checked out at ${toLocalMoment(rawLastOut).format("HH:mm")} — before halfway point of shift`
//       : "Check-in found but no OUT punch recorded";
//     return { ...base, status: "Absent", remarks: msg, workingHours: wh };
//   }

//   const checkInM = toLocalMoment(firstCheckIn);
//   const checkOutM = toLocalMoment(lastCheckOut);

//   const lateMin = checkInM.isAfter(graceEnd)
//     ? checkInM.diff(shiftStart, "minutes")
//     : 0;
//   const earlyMin = checkOutM.isBefore(shiftEnd)
//     ? shiftEnd.diff(checkOutM, "minutes")
//     : 0;

//   const wh = calcHours(firstCheckIn, lastCheckOut);
//   const shiftDurationH = shiftEnd.diff(shiftStart, "minutes") / 60;
//   const otH =
//     wh > shiftDurationH ? parseFloat((wh - shiftDurationH).toFixed(2)) : 0;
//   const deviation = lateMin + earlyMin;

//   if (deviation === 0) {
//     return {
//       ...base,
//       status: "Present",
//       workingHours: wh,
//       overtimeHours: otH,
//       remarks: null,
//     };
//   }

//   const { used, remaining } = await getRemainingPool(emp.id, dateStr);

//   if (remaining <= 0) {
//     return {
//       ...base,
//       status: "Absent",
//       isLate: lateMin > 0,
//       lateByMinutes: lateMin,
//       isEarlyExit: earlyMin > 0,
//       earlyExitMinutes: earlyMin,
//       workingHours: wh,
//       permissionMinutes: 0,
//       remarks: `Permission pool exhausted (${used}/${PERMISSION_CONFIG.MONTHLY_POOL_MINUTES} min used). Marked Absent.`,
//     };
//   }

//   if (deviation <= remaining) {
//     return {
//       ...base,
//       status: "Present with Permission",
//       isLate: lateMin > 0,
//       lateByMinutes: lateMin,
//       isEarlyExit: earlyMin > 0,
//       earlyExitMinutes: earlyMin,
//       workingHours: wh,
//       overtimeHours: otH,
//       permissionMinutes: deviation,
//       remarks: `Permission: ${deviation} min deducted. Used: ${used + deviation}/${PERMISSION_CONFIG.MONTHLY_POOL_MINUTES} min. Remaining: ${remaining - deviation} min.`,
//     };
//   }

//   return {
//     ...base,
//     status: "Absent",
//     isLate: lateMin > 0,
//     lateByMinutes: lateMin,
//     isEarlyExit: earlyMin > 0,
//     earlyExitMinutes: earlyMin,
//     workingHours: wh,
//     permissionMinutes: 0,
//     remarks: `Deviation ${deviation} min exceeds remaining pool ${remaining} min → Absent.`,
//   };
// };

// // ============================================================
// // WORKER FINALIZATION
// // ============================================================

// const _finalizeWorker = async (
//   emp,
//   dateStr,
//   allPunches,
//   companyId,
//   shiftWindows,
// ) => {
//   const { workerShifts } = shiftWindows;

//   const emptyBase = {
//     employeeId: emp.id,
//     companyId,
//     attendanceDate: dateStr,
//     shiftName: "Unknown",
//     scheduledStartTime: null,
//     scheduledEndTime: null,
//     firstCheckIn: null,
//     lastCheckOut: null,
//     totalCheckIns: 0,
//     totalCheckOuts: 0,
//     isLate: false,
//     lateByMinutes: 0,
//     isEarlyExit: false,
//     earlyExitMinutes: 0,
//     permissionMinutes: 0,
//     workingHours: 0,
//     overtimeHours: 0,
//     isHoliday: false,
//     isWeekOff: false,
//   };

//   const inPunches = allPunches.filter((p) => p.punchType === "IN");
//   const anyOut = allPunches.filter((p) => p.punchType === "OUT");
//   const rawOut = anyOut.length ? anyOut[anyOut.length - 1].punchTime : null;

//   if (!inPunches.length) {
//     return {
//       ...emptyBase,
//       lastCheckOut: rawOut,
//       totalCheckOuts: anyOut.length,
//       status: "Absent",
//       remarks: "No IN punch found",
//     };
//   }

//   const firstInM = toLocalMoment(inPunches[0].punchTime);

//   // Workers ALWAYS auto-detect shift from punch time
//   const shift = detectWorkerShift(firstInM, workerShifts);

//   if (!shift) {
//     return {
//       ...emptyBase,
//       firstCheckIn: inPunches[0].punchTime,
//       totalCheckIns: inPunches.length,
//       status: "Absent",
//       remarks: `Punch at ${firstInM.format("HH:mm")} does not fall in any known shift window`,
//     };
//   }

//   const grace = shift.gracePeriod ?? 10;
//   const shiftStart = buildMoment(dateStr, shift.start);
//   const shiftEnd = buildMoment(dateStr, shift.end, shift.crossesMidnight);
//   const graceEnd = shiftStart.clone().add(grace, "minutes");

//   // ✅ FIX 4: Use EARLY_ARRIVAL_WINDOW_MINUTES instead of inWindowStart.
//   // detectWorkerShift Pass 2 allows arrivals up to 90 min before shift
//   // start (e.g. 07:46 for an 08:30 shift). The validIn filter must use
//   // the same allowance, otherwise the early punch is excluded and the
//   // employee gets Absent despite a valid check-in.
//   const earliestIn = shiftStart.clone().subtract(EARLY_ARRIVAL_WINDOW_MINUTES, "minutes");

//   const validIn = allPunches.filter((p) => {
//     if (p.punchType !== "IN") return false;
//     const t = toLocalMoment(p.punchTime);
//     return t.isSameOrAfter(earliestIn) && t.isSameOrBefore(shiftEnd);
//   });

//   const validOut = allPunches.filter((p) => {
//     if (p.punchType !== "OUT") return false;
//     const t = toLocalMoment(p.punchTime);
//     const maxOut = shiftEnd.clone().add(4, "hours");
//     return t.isSameOrAfter(shiftStart) && t.isSameOrBefore(maxOut);
//   });

//   const firstCheckIn = validIn.length ? validIn[0].punchTime : null;
//   const lastCheckOut = validOut.length
//     ? validOut[validOut.length - 1].punchTime
//     : null;

//   const base = {
//     ...emptyBase,
//     shiftName: shift.name,
//     scheduledStartTime: shift.start,
//     scheduledEndTime: shift.end,
//     firstCheckIn,
//     lastCheckOut: lastCheckOut || rawOut,
//     totalCheckIns: validIn.length,
//     totalCheckOuts: anyOut.length,
//   };

//   if (!firstCheckIn) {
//     return {
//       ...base,
//       status: "Absent",
//       remarks: `No valid IN for Shift ${shift.name}`,
//     };
//   }

//   if (!lastCheckOut) {
//     const wh = rawOut ? calcHours(firstCheckIn, rawOut) : 0;
//     const msg = rawOut
//       ? `OUT at ${toLocalMoment(rawOut).format("HH:mm")} outside Shift ${shift.name} window`
//       : `IN found but no OUT for Shift ${shift.name}`;
//     return { ...base, status: "Absent", remarks: msg, workingHours: wh };
//   }

//   const lateMin = toLocalMoment(firstCheckIn).isAfter(graceEnd)
//     ? toLocalMoment(firstCheckIn).diff(shiftStart, "minutes")
//     : 0;
//   const earlyMin = toLocalMoment(lastCheckOut).isBefore(shiftEnd)
//     ? shiftEnd.diff(toLocalMoment(lastCheckOut), "minutes")
//     : 0;

//   const wh = calcHours(firstCheckIn, lastCheckOut);
//   const shiftDurationH = shiftEnd.diff(shiftStart, "minutes") / 60;
//   const otH =
//     wh > shiftDurationH ? parseFloat((wh - shiftDurationH).toFixed(2)) : 0;

//   const remarks = [];
//   if (lateMin > 0) remarks.push(`Late by ${lateMin} min`);
//   if (earlyMin > 0) remarks.push(`Early exit by ${earlyMin} min`);

//   return {
//     ...base,
//     status: "Present",
//     isLate: lateMin > 0,
//     lateByMinutes: lateMin,
//     isEarlyExit: earlyMin > 0,
//     earlyExitMinutes: earlyMin,
//     workingHours: wh,
//     overtimeHours: otH,
//     permissionMinutes: 0,
//     remarks: remarks.length ? remarks.join(", ") : null,
//   };
// };

// // ============================================================
// // LIVE DASHBOARD
// // ============================================================

// const getLiveDashboardData = async (companyId, date) => {
//   const targetDate = date || moment().format("YYYY-MM-DD");

//   const employees = await Employee.findAll({
//     where: { companyId, status: "Active" },
//     include: [{ model: EmploymentType, as: "employmentType" }],
//   });

//   const records = await Attendance.findAll({
//     where: { companyId, attendanceDate: targetDate },
//   });

//   const byEmp = {};
//   records.forEach((r) => {
//     byEmp[r.employeeId] = r;
//   });

//   const dash = {
//     date: targetDate,
//     totalEmployees: employees.length,
//     punchedIn: 0,
//     punchedOut: 0,
//     notYetPunched: 0,
//     lateArrivals: 0,
//     byShift: {},
//     employees: [],
//   };

//   employees.forEach((emp) => {
//     const rec = byEmp[emp.id];
//     const empTyp = emp.employmentType?.name?.toLowerCase();

//     const shiftK =
//       rec?.shiftName ||
//       (isStaffType(empTyp)
//         ? "Staff"
//         : isWorkerType(empTyp)
//           ? "Worker"
//           : "Unknown");

//     if (!dash.byShift[shiftK]) {
//       dash.byShift[shiftK] = {
//         shiftName: shiftK,
//         total: 0,
//         punchedIn: 0,
//         notYetPunched: 0,
//         late: 0,
//       };
//     }
//     dash.byShift[shiftK].total++;

//     let liveStatus = "Not Punched";
//     if (rec) {
//       if (rec.lastCheckOut) {
//         liveStatus = "Punched Out";
//         dash.punchedOut++;
//       } else if (rec.firstCheckIn) {
//         liveStatus = rec.isLate ? "Working (Late)" : "Working";
//         dash.punchedIn++;
//         dash.byShift[shiftK].punchedIn++;
//         if (rec.isLate) {
//           dash.lateArrivals++;
//           dash.byShift[shiftK].late++;
//         }
//       }
//     } else {
//       dash.notYetPunched++;
//       dash.byShift[shiftK].notYetPunched++;
//     }

//     dash.employees.push({
//       employeeId: emp.id,
//       employeeName: `${emp.firstName} ${emp.lastName}`,
//       employeeCode: emp.employeeCode,
//       employeeType: emp.employmentType?.name || "N/A",
//       shiftName: shiftK,
//       punchInTime: rec?.firstCheckIn || null,
//       punchOutTime: rec?.lastCheckOut || null,
//       liveStatus,
//       isLate: rec?.isLate || false,
//       lateByMinutes: rec?.lateByMinutes || 0,
//       workingHours: rec?.workingHours || 0,
//       isFinalized: rec?.isFinalized || false,
//       finalStatus: rec?.isFinalized ? rec.status : null,
//     });
//   });

//   return dash;
// };

// // ============================================================
// // EXPORTS
// // ============================================================

// module.exports = {
//   processRealtimePunch,
//   finalizeAttendance,
//   getLiveDashboardData,
//   upsertEmployeeShift,
//   PERMISSION_CONFIG,
//   derivePunchType,
//   detectWorkerShift,
//   detectStaffShift,
//   getShiftForEmployee,
//   loadShiftWindows,
//   invalidateShiftCache,
//   isStaffType,
//   isWorkerType,
// };


// ============================================================
// services/attendanceProcessor.js
// ============================================================
//
// EMPLOYMENT TYPE → SHIFT POOL MAPPING:
//
//   staff          → Staff-named shifts (permission pool logic)
//                    Falls back to A/B/C if no Staff shift configured
//   worker         → Standard shifts: A, B, C  (worker logic)
//   staff-per-day  → Standard shifts: A, B, C  (worker logic)
//   supervisor     → General shifts:  GENERAL_A, GENERAL_B, GENERAL_C, GENERAL_D
//                                     (worker logic, no permission pool)
//
// SHIFT HIERARCHY IN DB (shift_types table):
//   Standard  → name matches /^[ABC]$/           → for staff/worker/staff-per-day
//   General   → name starts with "GENERAL_"      → for supervisor
//   Staff     → name === "staff" or starts "staff"→ for staff (permission pool)
//
// ============================================================
//
// BUG FIXES:
//
// FIX 1 — Midpoint-capped Pass 1 + 90-min early-arrival Pass 2 so a
//          punch near the tail of a shift isn't wrongly bucketed.
//
// FIX 2 — Staff employee on A/B/C shift uses WORKER logic (Present),
//          not staff permission-pool logic.
//
// FIX 3 — shiftTypeId pointing to A/B/C for a staff employee is ignored;
//          falls through to punch-time auto-detection.
//
// FIX 4 — validIn lower bound = shift.start − 90 min so early arrivals
//          counted as valid IN (matches detectWorkerShift Pass 2).
//
// FIX 5 — ROOT CAUSE: toLocalMoment() now uses moment.utc().local() so
//          UTC timestamps stored in DB are correctly converted to server
//          local timezone before being compared with shift boundaries.
//          (DB stores 02:16 UTC = 07:46 IST; old code treated 02:16 as
//          local → Shift C wrongly detected; fix → 07:46 → Shift A ✓)
//
// FIX 6 — Supervisor employees now detect from GENERAL_* shifts only
//          (GENERAL_A/B/C/D), not from standard A/B/C shifts.
//
// ============================================================

const {
  Attendance,
  BiometricPunch,
  Employee,
  EmploymentType,
  LeaveRequest,
  EmployeeShift,
  ShiftType,
  ShiftAssignment,
} = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

// ============================================================
// EMPLOYMENT TYPE HELPERS
// ============================================================

const isStaffType = (empType) => empType === "staff";
const isWorkerType = (empType) => ["worker", "staff-per-day"].includes(empType);
const isSupervisorType = (empType) => empType === "supervisor";

/** Any type that uses worker-style finalization (Present/Absent, no pool) */
const isWorkerLike = (empType) => isWorkerType(empType) || isSupervisorType(empType);

// ============================================================
// CONFIG
// ============================================================
const PERMISSION_CONFIG = {
  MONTHLY_POOL_MINUTES: 120,       // Total permission pool per month (minutes)
  GRACE_MINUTES: 10,               // Grace period for staff (minutes)
  MONTHLY_MAX_PERMISSION_DAYS: 2,  // Staff can only use permission on max 2 days/month
  DAILY_MAX_PERMISSION_MINUTES: 60, // Max 60 min permission usable in a single day
};

// Max minutes before shift start still credited to that shift (Pass 2).
const EARLY_ARRIVAL_WINDOW_MINUTES = 90;
const FINALIZE_BUFFER_MIN = 120;


// ============================================================
// SHIFT WINDOWS CACHE
// ============================================================

let _shiftCache = null;
let _shiftCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * loadShiftWindows
 *
 * Loads and caches all active ShiftType rows, partitioned into:
 *   staffShifts    — name === "staff" or starts with "staff"
 *   standardShifts — name matches /^[ABC]$/    (for worker / staff-per-day / staff fallback)
 *   generalShifts  — everything else (GENERAL_A, B, C, D…) (for supervisor)
 *   workerShifts   — standardShifts + generalShifts combined (legacy; used by staff fallback)
 */
const loadShiftWindows = async (companyId, force = false) => {
  const now = Date.now();
  if (!force && _shiftCache && now - _shiftCacheAt < CACHE_TTL_MS) return _shiftCache;

  const rows = await ShiftType.findAll({
    where: { status: "Active", companyId },
    order: [["name", "ASC"]],
  });

  if (!rows.length) {
    throw new Error(
      `No active ShiftType rows found for companyId=${companyId}. ` +
      `Please seed shift_types table before processing attendance.`,
    );
  }

  const staffShifts = [];
  const standardShifts = []; // A, B, C
  const supervisorShifts = []; // SUP_A, SUP_B, SUP_C
  const generalShifts = []; // GENERAL_A, GENERAL_B, …

  for (const r of rows) {
    const start = r.startTime.slice(0, 5);
    const end = r.endTime.slice(0, 5);
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const crossesMidnight = eh * 60 + em < sh * 60 + sm;

    const inWindowStart = moment("2000-01-01 " + start)
      .subtract(r.beginCheckInBefore ?? 15, "minutes")
      .format("HH:mm");

    const startMin = sh * 60 + sm;
    const endMinExtended = crossesMidnight ? eh * 60 + em + 24 * 60 : eh * 60 + em;
    const midpointMin = Math.round((startMin + endMinExtended) / 2) % (24 * 60);

    const shiftObj = {
      id: r.id, name: r.name,
      label: `Shift ${r.name} ${start}-${end}`,
      start, end, crossesMidnight,
      inWindowStart, inWindowEnd: end,
      gracePeriod: r.lateGracePeriod ?? PERMISSION_CONFIG.GRACE_MINUTES,
      beginCheckInBefore: r.beginCheckInBefore ?? 15,
      allowCheckOutAfter: r.allowCheckOutAfter ?? 15,
      midpointMin,
    };

    const nl = r.name.toLowerCase();
    if (nl === "staff" || nl.startsWith("staff")) {
      staffShifts.push(shiftObj);
    } else if (/^[ABC]$/.test(r.name)) {
      standardShifts.push(shiftObj);
    } else if (/^sup/i.test(r.name)) {
      supervisorShifts.push(shiftObj);
    } else {
      generalShifts.push(shiftObj);
    }
  }

  // Sort standard shifts (A,B,C) by start time
  const byStartTime = (a, b) => {
    const [ah, am] = a.start.split(":").map(Number);
    const [bh, bm] = b.start.split(":").map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  };
  standardShifts.sort(byStartTime);
  supervisorShifts.sort(byStartTime);
  generalShifts.sort(byStartTime);
  staffShifts.sort(byStartTime);

  // workerShifts = standard first, then supervisor, then general
  const workerShifts = [...standardShifts, ...supervisorShifts, ...generalShifts];

  const shiftById = new Map();
  for (const s of [...workerShifts, ...staffShifts]) shiftById.set(s.id, s);

  _shiftCache = { workerShifts, staffShifts, standardShifts, supervisorShifts, generalShifts, shiftById, raw: rows };
  _shiftCacheAt = now;
  return _shiftCache;
};

const invalidateShiftCache = () => { _shiftCache = null; _shiftCacheAt = 0; };

// ============================================================
// SHIFT DETECTION
// ============================================================

/**
 * detectWorkerShift
 *
 * Works on whatever shift array is passed in.
 * Internally separates "standard" (A/B/C) from "general" (GENERAL_*)
 * and checks standard first, then general — so if you pass the full
 * workerShifts pool both pools are tried.  If you pass ONLY generalShifts
 * (for supervisor), standardShifts will be empty and generalShifts gets
 * all three passes.
 *
 * Pass 1 — midpoint-capped window  (FIX 1)
 * Pass 2 — early-arrival look-ahead up to EARLY_ARRIVAL_WINDOW_MINUTES
 * Pass 3 — nearest-start fallback
 */
const detectWorkerShift = (punchMoment, shifts) => {
  const tot = punchMoment.hours() * 60 + punchMoment.minutes();

  const standardPool = shifts.filter((s) => /^[ABC]$/.test(s.name));
  const generalPool = shifts.filter((s) => !/^[ABC]$/.test(s.name));

  const tryPool = (pool) => {
    if (!pool.length) return null;

    // Pass 1 — midpoint-capped window
    for (const s of pool) {
      const [wsh, wsm] = s.inWindowStart.split(":").map(Number);
      const winStart = wsh * 60 + wsm;
      if (winStart <= s.midpointMin && tot >= winStart && tot <= s.midpointMin) return s;
    }

    // Pass 2 — early-arrival look-ahead
    let best = null, bestDiff = Infinity;
    for (const s of pool) {
      const [sh, sm] = s.start.split(":").map(Number);
      let minBefore = sh * 60 + sm - tot;
      if (minBefore < 0) minBefore += 24 * 60;
      if (minBefore >= 0 && minBefore <= EARLY_ARRIVAL_WINDOW_MINUTES && minBefore < bestDiff) {
        bestDiff = minBefore; best = s;
      }
    }
    if (best) return best;

    // Pass 3 — nearest start
    best = null; bestDiff = Infinity;
    for (const s of pool) {
      const [sh, sm] = s.start.split(":").map(Number);
      const diff = Math.abs(tot - (sh * 60 + sm));
      if (diff < bestDiff) { bestDiff = diff; best = s; }
    }
    return best;
  };

  return tryPool(standardPool) || tryPool(generalPool) || null;
};

/**
 * detectStaffShift
 * Finds the staff shift whose window contains punchMoment.
 */
const detectStaffShift = (punchMoment, staffShifts) => {
  if (!staffShifts.length) return null;
  if (staffShifts.length === 1) return staffShifts[0];
  const tot = punchMoment.hours() * 60 + punchMoment.minutes();
  for (const s of staffShifts) {
    const [wsh, wsm] = s.inWindowStart.split(":").map(Number);
    const [weh, wem] = s.inWindowEnd.split(":").map(Number);
    if (tot >= wsh * 60 + wsm && tot <= weh * 60 + wem) return s;
  }
  console.warn(`[detectStaffShift] ${punchMoment.format("HH:mm")} outside all staff windows`);
  return staffShifts[0];
};

/**
 * getShiftForEmployee
 *
 * Routes to the correct shift pool based on employment type:
 *
 *   staff       → Staff-named shift (or falls back to standard A/B/C)
 *   worker /
 *   staff-per-day → standard shifts (A, B, C) via detectWorkerShift
 *   supervisor  → general shifts (GENERAL_A/B/C/D) via detectWorkerShift  ← FIX 6
 *
 * FIX 3: For staff, shiftTypeId is only honoured when it points to a
 *         Staff-named shift. A/B/C shiftTypeId falls through to auto-detect.
 */
const getShiftForEmployee = (empType, punchMoment, shiftWindows, shiftTypeId = null) => {
  // ── STAFF ────────────────────────────────────────────────────────────
  if (isStaffType(empType)) {
    if (shiftTypeId && shiftWindows.shiftById) {
      const a = shiftWindows.shiftById.get(Number(shiftTypeId));
      if (a && !/^[ABC]$/.test(a.name) && !/^sup/i.test(a.name)) return a; // only non-A/B/C and non-SUP honour
    }
    return detectStaffShift(punchMoment, shiftWindows.staffShifts)
      || detectWorkerShift(punchMoment, shiftWindows.generalShifts)
      || detectWorkerShift(punchMoment, shiftWindows.standardShifts);
  }

  // ── SUPERVISOR → SUP_A/B/C only ──────────────────────────────────────
  if (isSupervisorType(empType)) {
    return detectWorkerShift(punchMoment, shiftWindows.supervisorShifts);
  }

  // ── WORKER / STAFF-PER-DAY → A, B, C only ───────────────────────────
  if (isWorkerType(empType)) {
    return detectWorkerShift(punchMoment, shiftWindows.standardShifts);
  }

  return null;
};

// ============================================================
// HELPERS
// ============================================================

/**
 * toLocalMoment  ← FIX 5 (ROOT CAUSE)
 *
 * DB stores datetimes as UTC. moment.utc().local() converts to the
 * server's local timezone so punch times align with shift boundaries
 * (which are stored as local time in shift_types).
 *
 * Before: extracted raw UTC digits → 02:16 treated as local → Shift C wrong.
 * After : moment.utc().local()     → 07:46 IST             → Shift A  ✓
 */
const toLocalMoment = (punchTime) => {
  if (!punchTime) return null;
  return moment.utc(punchTime).local();
};

const buildMoment = (dateStr, timeStr, crossDay = false) => {
  const base = crossDay
    ? moment(dateStr).add(1, "day").format("YYYY-MM-DD")
    : dateStr;
  return moment(`${base} ${timeStr.slice(0, 5)}`, "YYYY-MM-DD HH:mm");
};

const calcHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = toLocalMoment(checkOut).diff(toLocalMoment(checkIn), "minutes");
  return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0;
};

// ============================================================
// PERMISSION POOL
// ============================================================

const getRemainingPool = async (employeeId, dateStr) => {
  const monthStart = moment(dateStr).startOf("month").format("YYYY-MM-DD");
  const monthEnd = moment(dateStr).endOf("month").format("YYYY-MM-DD");

  // Fetch individual records so we can count permission days AND sum minutes
  const permissionRecords = await Attendance.findAll({
    where: {
      employeeId,
      attendanceDate: { [Op.between]: [monthStart, monthEnd], [Op.lt]: dateStr },
      permissionMinutes: { [Op.gt]: 0 },
    },
    attributes: ["permissionMinutes"],
  });

  const used = permissionRecords.reduce((sum, r) => sum + (parseInt(r.permissionMinutes) || 0), 0);
  const permissionDaysUsed = permissionRecords.length;  // count of days permission was used
  const remaining = PERMISSION_CONFIG.MONTHLY_POOL_MINUTES - used;
  return { used, remaining, permissionDaysUsed };
};

// ============================================================
// LEAVE CHECK
// ============================================================

const checkIfOnLeave = (employeeId, companyId, date) =>
  LeaveRequest.findOne({
    where: {
      employeeId, companyId, status: "Approved",
      startDate: { [Op.lte]: date },
      endDate: { [Op.gte]: date },
    },
  });

// ============================================================
// UPSERT ATTENDANCE
// ============================================================

const _upsert = async (existing, data) =>
  existing ? existing.update(data) : Attendance.create(data);

// ============================================================
// EMPLOYEE SHIFT SUMMARY
// ============================================================

const upsertEmployeeShift = async (record, previousSnapshot = null) => {
  const {
    employeeId, companyId, attendanceDate, shiftName,
    scheduledStartTime, scheduledEndTime, status,
    isLate, isEarlyExit, workingHours, overtimeHours, permissionMinutes,
  } = record;

  if (!shiftName || shiftName === "Unknown" || shiftName === "N/A") return;

  const dateM = moment(attendanceDate);
  const month = dateM.month() + 1;
  const year = dateM.year();

  // Reverse old contribution when re-finalizing
  if (
    previousSnapshot?.shiftName &&
    previousSnapshot.shiftName !== "Unknown" &&
    previousSnapshot.shiftName !== "N/A"
  ) {
    const oldRow = await EmployeeShift.findOne({
      where: { employeeId, companyId, shiftName: previousSnapshot.shiftName, month, year },
    });
    if (oldRow) {
      await oldRow.update({
        totalDays: Math.max(0, oldRow.totalDays - 1),
        presentDays: Math.max(0, oldRow.presentDays - (previousSnapshot.status === "Present" ? 1 : 0)),
        presentWithPermissionDays: Math.max(0, oldRow.presentWithPermissionDays - (previousSnapshot.status === "Present with Permission" ? 1 : 0)),
        absentDays: Math.max(0, oldRow.absentDays - (previousSnapshot.status === "Absent" ? 1 : 0)),
        leaveDays: Math.max(0, oldRow.leaveDays - (previousSnapshot.status === "Leave" ? 1 : 0)),
        lateDays: Math.max(0, oldRow.lateDays - (previousSnapshot.isLate ? 1 : 0)),
        earlyExitDays: Math.max(0, oldRow.earlyExitDays - (previousSnapshot.isEarlyExit ? 1 : 0)),
        totalWorkingHours: Math.max(0, parseFloat(oldRow.totalWorkingHours) - (parseFloat(previousSnapshot.workingHours) || 0)).toFixed(2),
        totalOvertimeHours: Math.max(0, parseFloat(oldRow.totalOvertimeHours) - (parseFloat(previousSnapshot.overtimeHours) || 0)).toFixed(2),
        totalPermissionMinutes: Math.max(0, oldRow.totalPermissionMinutes - (parseInt(previousSnapshot.permissionMinutes) || 0)),
        lastSeenDate: oldRow.totalDays - 1 <= 0 ? null : oldRow.lastSeenDate,
        firstSeenDate: oldRow.totalDays - 1 <= 0 ? null : oldRow.firstSeenDate,
      });
    }
  }

  const [row] = await EmployeeShift.findOrCreate({
    where: { employeeId, companyId, shiftName, month, year },
    defaults: {
      scheduledStartTime: scheduledStartTime || null,
      scheduledEndTime: scheduledEndTime || null,
      totalDays: 0, presentDays: 0, presentWithPermissionDays: 0,
      absentDays: 0, leaveDays: 0, lateDays: 0, earlyExitDays: 0,
      totalWorkingHours: 0, totalOvertimeHours: 0, totalPermissionMinutes: 0,
      firstSeenDate: attendanceDate, lastSeenDate: attendanceDate,
    },
  });

  const newWH = Math.max(0, parseFloat(row.totalWorkingHours) + (parseFloat(workingHours) || 0));
  const newOT = Math.max(0, parseFloat(row.totalOvertimeHours) + (parseFloat(overtimeHours) || 0));
  const newPM = Math.max(0, row.totalPermissionMinutes + (parseInt(permissionMinutes) || 0));
  const newFirstSeen = !row.firstSeenDate || attendanceDate < row.firstSeenDate ? attendanceDate : row.firstSeenDate;
  const newLastSeen = !row.lastSeenDate || attendanceDate > row.lastSeenDate ? attendanceDate : row.lastSeenDate;

  await row.update({
    scheduledStartTime: scheduledStartTime || row.scheduledStartTime,
    scheduledEndTime: scheduledEndTime || row.scheduledEndTime,
    totalDays: row.totalDays + 1,
    presentDays: row.presentDays + (status === "Present" ? 1 : 0),
    presentWithPermissionDays: row.presentWithPermissionDays + (status === "Present with Permission" ? 1 : 0),
    absentDays: row.absentDays + (status === "Absent" ? 1 : 0),
    leaveDays: row.leaveDays + (status === "Leave" ? 1 : 0),
    lateDays: row.lateDays + (isLate ? 1 : 0),
    earlyExitDays: row.earlyExitDays + (isEarlyExit ? 1 : 0),
    totalWorkingHours: newWH.toFixed(2),
    totalOvertimeHours: newOT.toFixed(2),
    totalPermissionMinutes: newPM,
    firstSeenDate: newFirstSeen,
    lastSeenDate: newLastSeen,
  });
};

// ============================================================
// DERIVE PUNCH TYPE
// ============================================================

const derivePunchType = async (punchTime, empType, companyId, shiftTypeId = null) => {
  const punchM = toLocalMoment(punchTime);
  const tot = punchM.hours() * 60 + punchM.minutes();
  const shiftWindows = await loadShiftWindows(companyId);

  let shift = null;

  if (isStaffType(empType)) {
    if (shiftTypeId && shiftWindows.shiftById) {
      const a = shiftWindows.shiftById.get(Number(shiftTypeId));
      if (a && !/^[ABC]$/.test(a.name) && !/^sup/i.test(a.name)) shift = a;
    }
    if (!shift) {
      shift = detectStaffShift(punchM, shiftWindows.staffShifts)
        || detectWorkerShift(punchM, shiftWindows.generalShifts)
        || detectWorkerShift(punchM, shiftWindows.standardShifts);
    }
  } else if (isSupervisorType(empType)) {
    shift = detectWorkerShift(punchM, shiftWindows.supervisorShifts);
  } else {
    shift = detectWorkerShift(punchM, shiftWindows.standardShifts);
  }

  if (!shift) return "IN";

  const [sh, sm] = shift.start.split(":").map(Number);
  const [eh, em] = shift.end.split(":").map(Number);
  let midpoint = shift.crossesMidnight
    ? (sh * 60 + sm + (eh * 60 + em + 24 * 60)) / 2 % (24 * 60)
    : (sh * 60 + sm + eh * 60 + em) / 2;

  return tot < midpoint ? "IN" : "OUT";
};

// ============================================================
// PHASE 1 — REAL-TIME PUNCH PROCESSING
// ============================================================

const processRealtimePunch = async ({ employeeId, punchTime, punchType, companyId }) => {
  // Ensure punchDate is derived from the same local-time conversion used
  // everywhere else in this processor (toLocalMoment).
  const punchDate = toLocalMoment(punchTime).format("YYYY-MM-DD");

  const employee = await Employee.findByPk(employeeId, {
    attributes: ["id", "firstName", "lastName", "employeeCode", "companyId", "shiftTypeId"],
    include: [{ model: EmploymentType, as: "employmentType" }],
  });
  if (!employee) throw new Error(`Employee ${employeeId} not found`);

  const empType = employee.employmentType?.name?.toLowerCase();
  const isIn = punchType === "IN" || punchType === "Check-In";
  const isOut = punchType === "OUT" || punchType === "Check-Out";
  const punchM = toLocalMoment(punchTime);
  const shiftWindows = await loadShiftWindows(companyId);
  // Check if there is a manual calendar shift assignment for today
  const assignment = await ShiftAssignment.findOne({
    where: { employeeId, assignmentDate: punchDate, status: "Active" }
  });
  let shift = null;
  if (assignment && shiftWindows.shiftById) {
    // If assigned, directly map to the scheduled calendar shift
    shift = shiftWindows.shiftById.get(Number(assignment.shiftTypeId)) || null;
  }

  let targetAttendanceDate = punchDate;
  let isShiftC = false;

  if (isOut) {
    // Check if there is an existing provisional record for yesterday that is Shift C
    const yesterdayStr = moment(punchDate).subtract(1, "days").format("YYYY-MM-DD");
    const yesterdayRecord = await Attendance.findOne({
      where: {
        employeeId,
        attendanceDate: yesterdayStr,
        shiftName: { [Op.in]: ["C", "SUP_C"] },
        isFinalized: false
      }
    });
    if (yesterdayRecord) {
      targetAttendanceDate = yesterdayStr;
      shift = shiftWindows.shiftById 
        ? (Array.from(shiftWindows.shiftById.values()).find(s => s.name === yesterdayRecord.shiftName) || null)
        : null;
      isShiftC = true;
    }
  }

  if (!isShiftC) {
    if (!shift) {
      // Fallback to default employee profile shift or punch-time auto-detection
      shift = getShiftForEmployee(empType, punchM, shiftWindows, employee.shiftTypeId);
    }
    isShiftC = shift && (shift.name === "C" || shift.name === "SUP_C");
    if (isShiftC) {
      targetAttendanceDate = moment(punchDate).subtract(1, "days").format("YYYY-MM-DD");
    }
  }

  const existing = await Attendance.findOne({ where: { employeeId, attendanceDate: targetAttendanceDate } });

  if (!existing) {
    let isLate = false, lateByMinutes = 0;
    if (isIn && shift) {
      const shiftStart = buildMoment(targetAttendanceDate, shift.start, isShiftC);
      // Staff always uses PERMISSION_CONFIG.GRACE_MINUTES (10 min); workers use shift-configured grace.
      const effectiveGrace = isStaffType(empType) ? PERMISSION_CONFIG.GRACE_MINUTES : (shift.gracePeriod ?? PERMISSION_CONFIG.GRACE_MINUTES);
      const graceEnd = shiftStart.clone().add(effectiveGrace, "minutes");
      if (punchM.isAfter(graceEnd)) { isLate = true; lateByMinutes = punchM.diff(shiftStart, "minutes"); }
    }
    return Attendance.create({
      employeeId, companyId, attendanceDate: targetAttendanceDate,
      shiftName: shift?.name || "Unknown",
      scheduledStartTime: shift?.start || null,
      scheduledEndTime: shift?.end || null,
      firstCheckIn: isIn ? punchTime : null,
      lastCheckOut: isOut ? punchTime : null,
      totalCheckIns: isIn ? 1 : 0,
      totalCheckOuts: isOut ? 1 : 0,
      workingHours: 0, overtimeHours: 0,
      isLate, lateByMinutes,
      isEarlyExit: false, earlyExitMinutes: 0,
      permissionMinutes: 0, isHoliday: false, isWeekOff: false,
      isFinalized: false, autoGenerated: true,
      status: "Present", remarks: "Provisional — awaiting finalization",
    });
  }

  const updates = {};
  if (isIn) {
    if (!existing.firstCheckIn) updates.firstCheckIn = punchTime;
    updates.totalCheckIns = (existing.totalCheckIns || 0) + 1;
  }
  if (isOut) {
    updates.lastCheckOut = punchTime;
    updates.totalCheckOuts = (existing.totalCheckOuts || 0) + 1;
    if (existing.firstCheckIn) updates.workingHours = calcHours(existing.firstCheckIn, punchTime);
  }
  if (!existing.isFinalized && shift) {
    updates.shiftName = shift.name;
    updates.scheduledStartTime = shift.start;
    updates.scheduledEndTime = shift.end;

    // Recalculate late status based on firstCheckIn
    const effectiveFirstIn = updates.firstCheckIn || existing.firstCheckIn;
    if (effectiveFirstIn) {
      const firstInM = toLocalMoment(effectiveFirstIn);
      const shiftStart = buildMoment(targetAttendanceDate, shift.start, isShiftC);
      const effectiveGrace = isStaffType(empType) ? PERMISSION_CONFIG.GRACE_MINUTES : (shift.gracePeriod ?? PERMISSION_CONFIG.GRACE_MINUTES);
      const graceEnd = shiftStart.clone().add(effectiveGrace, "minutes");
      if (firstInM.isAfter(graceEnd)) {
        updates.isLate = true;
        updates.lateByMinutes = firstInM.diff(shiftStart, "minutes");
      } else {
        updates.isLate = false;
        updates.lateByMinutes = 0;
      }
    }
  }
  await existing.update(updates);
  return existing;
};

// ============================================================
// PHASE 2 — FINALIZATION
// ============================================================

const finalizeAttendance = async ({
  dateStr,
  companyId,
  employeeIds,
  employeeType,
  onProgress,
  force = false,
} = {}) => {
  console.log(`[finalize] date=${dateStr} type=${employeeType || "all"} force=${force}`);
  const results = { processed: 0, finalized: 0, skipped: 0, errors: [] };

  const empWhere = { status: "Active" };
  if (companyId) empWhere.companyId = companyId;
  if (employeeIds?.length) empWhere.id = { [Op.in]: employeeIds };

  const employees = await Employee.findAll({
    where: empWhere,
    include: [{ model: EmploymentType, as: "employmentType" }],
  });

  const toProcess = employeeType
    ? employees.filter((e) => e.employmentType?.name?.toLowerCase() === employeeType)
    : employees;
  const total = toProcess.length;
  const effCompany = companyId || toProcess[0]?.companyId;
  if (!effCompany) return results;

  const shiftWindows = await loadShiftWindows(effCompany);

  for (let i = 0; i < toProcess.length; i++) {
    const emp = toProcess[i];
    try {
      results.processed++;
      const empType = emp.employmentType?.name?.toLowerCase();
      const _isStaff = isStaffType(empType);
      const _isSupervisor = isSupervisorType(empType);
      const empCompany = companyId || emp.companyId;

      const existing = await Attendance.findOne({
        where: { employeeId: emp.id, attendanceDate: dateStr },
      });

      if (existing?.isFinalized && !force) {
        results.skipped++;
        if (onProgress) onProgress(results.processed, total, `${emp.firstName} (skipped)`);
        continue;
      }

      const previousSnapshot = existing ? {
        shiftName: existing.shiftName,
        status: existing.status,
        isLate: existing.isLate,
        isEarlyExit: existing.isEarlyExit,
        workingHours: existing.workingHours,
        overtimeHours: existing.overtimeHours,
        permissionMinutes: existing.permissionMinutes,
      } : null;

      const onLeave = await checkIfOnLeave(emp.id, empCompany, dateStr);
      if (onLeave) {
        await _upsert(existing, {
          employeeId: emp.id, companyId: empCompany, attendanceDate: dateStr,
          shiftName: _isStaff ? "Staff" : "N/A",
          scheduledStartTime: null, scheduledEndTime: null,
          firstCheckIn: null, lastCheckOut: null,
          totalCheckIns: 0, totalCheckOuts: 0,
          workingHours: 0, overtimeHours: 0,
          isLate: false, lateByMinutes: 0,
          isEarlyExit: false, earlyExitMinutes: 0,
          permissionMinutes: 0, isHoliday: false, isWeekOff: false,
          isFinalized: true, autoGenerated: true,
          status: "Leave", remarks: "Approved Leave",
        });
        results.finalized++;
        if (onProgress) onProgress(results.processed, total, `${emp.firstName}`);
        continue;
      }

      // Worker/supervisor shifts may cross midnight — fetch next day's punches too
      const punchDates = [dateStr];
      if (!_isStaff) punchDates.push(moment(dateStr).add(1, "day").format("YYYY-MM-DD"));

      const punches = await BiometricPunch.findAll({
        where: {
          employeeId: emp.id, companyId: empCompany,
          punchDate: { [Op.in]: punchDates }, status: "Valid",
        },
        order: [["punchTime", "ASC"]],
      });

      // ── Skip today's employees whose shifts have not ended yet ────
      if (dateStr === moment().format("YYYY-MM-DD") && !force) {
        let shift = null;
        if (_isStaff) {
          if (emp.shiftTypeId && shiftWindows.shiftById) {
            const a = shiftWindows.shiftById.get(Number(emp.shiftTypeId)) || null;
            if (a && !/^[ABC]$/.test(a.name) && !/^sup/i.test(a.name)) shift = a;
          }
          if (!shift) {
            const firstIn = punches
              .filter((p) => p.punchType === "IN")
              .sort((a, b) => toLocalMoment(a.punchTime).diff(toLocalMoment(b.punchTime)))[0];
            if (firstIn) {
              const firstInM = toLocalMoment(firstIn.punchTime);
              shift = detectStaffShift(firstInM, shiftWindows.staffShifts);
              if (!shift) {
                shift = detectWorkerShift(firstInM, shiftWindows.standardShifts);
              }
            }
          }
          if (!shift) {
            shift = shiftWindows.staffShifts[0] || shiftWindows.standardShifts[0] || null;
          }
        } else if (_isSupervisor) {
          const firstIn = punches
            .filter((p) => p.punchType === "IN")
            .sort((a, b) => toLocalMoment(a.punchTime).diff(toLocalMoment(b.punchTime)))[0];
          if (firstIn) {
            const firstInM = toLocalMoment(firstIn.punchTime);
            shift = detectWorkerShift(firstInM, shiftWindows.supervisorShifts);
          }
          if (!shift) {
            shift = shiftWindows.supervisorShifts[0] || null;
          }
        } else {
          const firstIn = punches
            .filter((p) => p.punchType === "IN")
            .sort((a, b) => toLocalMoment(a.punchTime).diff(toLocalMoment(b.punchTime)))[0];
          if (firstIn) {
            const firstInM = toLocalMoment(firstIn.punchTime);
            shift = detectWorkerShift(firstInM, shiftWindows.standardShifts);
          }
          if (!shift) {
            shift = shiftWindows.standardShifts[0] || null;
          }
        }

        if (shift) {
          const shiftEnd = buildMoment(dateStr, shift.end, shift.crossesMidnight);
          const finalizeTime = shiftEnd.clone().add(FINALIZE_BUFFER_MIN, "minutes");
          if (moment().isBefore(finalizeTime)) {
            results.skipped++;
            if (onProgress) {
              onProgress(
                results.processed,
                total,
                `${emp.firstName} (Shift ${shift.name} not ended yet, skipped)`
              );
            }
            continue;
          }
        }
      }

      let record;
      if (_isStaff) {
        record = await _finalizeStaff(emp, dateStr, punches, empCompany, shiftWindows, emp.shiftTypeId);
      } else if (_isSupervisor) {
        record = await _finalizeWorker(emp, dateStr, punches, empCompany, shiftWindows, shiftWindows.supervisorShifts);
      } else {
        // worker / staff-per-day → standard A/B/C pool
        record = await _finalizeWorker(emp, dateStr, punches, empCompany, shiftWindows, shiftWindows.standardShifts);
      }

      if (record.isFinalized === undefined) {
        record.isFinalized = true;
      }
      record.autoGenerated = true;

      await _upsert(existing, record);
      if (record.isFinalized) {
        await upsertEmployeeShift(record, previousSnapshot);
        results.finalized++;
      } else {
        results.skipped++;
      }
      if (onProgress) onProgress(results.processed, total, `${emp.firstName}`);

    } catch (err) {
      console.error(`[finalize] emp=${emp.id}:`, err.message);
      results.errors.push({ employeeId: emp.id, error: err.message });
      if (onProgress) onProgress(results.processed, total, `emp#${emp.id} ERROR`);
    }
  }

  console.log(`[finalize] done:`, results);
  return results;
};

// ============================================================
// STAFF FINALIZATION
// ============================================================

const _finalizeStaff = async (emp, dateStr, punches, companyId, shiftWindows, shiftTypeId = null) => {
  const { staffShifts, shiftById, standardShifts, generalShifts } = shiftWindows;

  // Query weekly calendar to see if a shift override exists for this date
  const assignment = await ShiftAssignment.findOne({
    where: { employeeId: emp.id, assignmentDate: dateStr, status: "Active" }
  });

  let shift = null;
  let detectedAsWorkerShift = false;

  if (assignment && shiftById) {
    const a = shiftById.get(Number(assignment.shiftTypeId)) || null;
    if (a) {
      shift = a;
      // If manual calendar shift maps to worker/supervisor shifts, use worker finalization
      if (/^[ABC]$/.test(a.name) || a.name.startsWith("SUP_")) {
        detectedAsWorkerShift = true;
      }
    }
  }

  if (!shift) {
    // Priority 1 — assigned shiftTypeId
    // Staff-named and GENERAL shifts are honoured; A/B/C (worker shifts) are ignored → auto-detection
    if (shiftTypeId && shiftById) {
      const a = shiftById.get(Number(shiftTypeId)) || null;
      if (a && !/^[ABC]$/.test(a.name) && !/^sup/i.test(a.name)) shift = a;
    }
  }

  // Priority 2 — detect from first IN punch
  if (!shift) {
    const firstIn = punches
      .filter((p) => p.punchType === "IN")
      .sort((a, b) => toLocalMoment(a.punchTime).diff(toLocalMoment(b.punchTime)))[0];

    if (firstIn) {
      const firstInM = toLocalMoment(firstIn.punchTime);
      // Try Staff-named shifts first
      shift = detectStaffShift(firstInM, staffShifts);
      if (!shift) {
        // Try GENERAL shifts (staff employees use GENERAL_A/B/C/D)
        shift = detectWorkerShift(firstInM, generalShifts);
      }
      if (!shift) {
        // Last resort: standard A/B/C (treated as worker logic)
        shift = detectWorkerShift(firstInM, standardShifts);
        if (shift) detectedAsWorkerShift = true;
      }
    }
  }

  // Priority 3 — no punches: first available shift
  if (!shift) {
    shift = staffShifts[0] || generalShifts[0] || standardShifts[0] || null;
    if (shift && standardShifts.includes(shift)) detectedAsWorkerShift = true;
  }

  // ── Worker shift (A/B/C) detected for staff → WORKER logic ──────────
  // ✅ FIX 2 + FIX 4
  if (detectedAsWorkerShift && shift) {
    return _buildWorkerRecord(emp, dateStr, punches, companyId, shift);
  }

  // ── No shift found ───────────────────────────────────────────────────
  if (!shift) {
    return {
      employeeId: emp.id, companyId, attendanceDate: dateStr,
      shiftName: "Unknown", scheduledStartTime: null, scheduledEndTime: null,
      firstCheckIn: null, lastCheckOut: null, totalCheckIns: 0, totalCheckOuts: 0,
      isLate: false, lateByMinutes: 0, isEarlyExit: false, earlyExitMinutes: 0,
      permissionMinutes: 0, workingHours: 0, overtimeHours: 0,
      isHoliday: false, isWeekOff: false,
      status: "Absent", remarks: "No shift configured in system",
    };
  }

  // ── Staff-named shift: permission pool logic ─────────────────────────
  // Staff always gets 10-min grace (PERMISSION_CONFIG.GRACE_MINUTES), independent of shift config.
  const grace = PERMISSION_CONFIG.GRACE_MINUTES;
  const shiftStart = buildMoment(dateStr, shift.start);
  const shiftEnd = buildMoment(dateStr, shift.end);
  const graceEnd = shiftStart.clone().add(grace, "minutes");
  const earliestIn = buildMoment(dateStr, shift.inWindowStart);

  const inPunches = punches.filter((p) => {
    if (p.punchType !== "IN") return false;
    const t = toLocalMoment(p.punchTime);
    return t.isSameOrAfter(earliestIn) && t.isSameOrBefore(shiftEnd);
  });
  const half = shiftStart.clone().add(shiftEnd.diff(shiftStart, "minutes") / 2, "minutes");
  const outPunches = punches.filter(
    (p) => p.punchType === "OUT" && toLocalMoment(p.punchTime).isSameOrAfter(half),
  );
  const anyOut = punches.filter((p) => p.punchType === "OUT");
  const rawLastOut = anyOut.length ? anyOut[anyOut.length - 1].punchTime : null;
  const firstCheckIn = inPunches.length ? inPunches[0].punchTime : null;
  const lastCheckOut = outPunches.length ? outPunches[outPunches.length - 1].punchTime : null;

  const base = {
    employeeId: emp.id, companyId, attendanceDate: dateStr,
    shiftName: shift.name, scheduledStartTime: shift.start, scheduledEndTime: shift.end,
    firstCheckIn, lastCheckOut: lastCheckOut || rawLastOut,
    totalCheckIns: inPunches.length, totalCheckOuts: anyOut.length,
    isLate: false, lateByMinutes: 0, isEarlyExit: false, earlyExitMinutes: 0,
    permissionMinutes: 0, workingHours: 0, overtimeHours: 0,
    isHoliday: false, isWeekOff: false,
  };

  if (!firstCheckIn) return { ...base, status: "Absent", remarks: "No valid check-in found in shift window" };
  if (!lastCheckOut) {
    const wh = rawLastOut ? calcHours(firstCheckIn, rawLastOut) : 0;
    if (!rawLastOut) {
      const checkInM = toLocalMoment(firstCheckIn);
      const lateMin = checkInM.isAfter(graceEnd) ? checkInM.diff(shiftStart, "minutes") : 0;
      return {
        ...base,
        status: "Present",
        isFinalized: false,
        isLate: lateMin > 0,
        lateByMinutes: lateMin,
        remarks: "Check-in found but no OUT punch recorded",
      };
    }
    return {
      ...base, status: "Absent", workingHours: wh,
      remarks: `Checked out at ${toLocalMoment(rawLastOut).format("HH:mm")} — before halfway point of shift`,
    };
  }

  const checkInM = toLocalMoment(firstCheckIn);
  const checkOutM = toLocalMoment(lastCheckOut);
  const lateMin = checkInM.isAfter(graceEnd) ? checkInM.diff(shiftStart, "minutes") : 0;
  const earlyMin = checkOutM.isBefore(shiftEnd) ? shiftEnd.diff(checkOutM, "minutes") : 0;
  const wh = calcHours(firstCheckIn, lastCheckOut);
  const durH = shiftEnd.diff(shiftStart, "minutes") / 60;
  const otH = wh > durH ? parseFloat((wh - durH).toFixed(2)) : 0;
  const deviation = lateMin + earlyMin;

  if (deviation === 0) return { ...base, status: "Present", workingHours: wh, overtimeHours: otH, remarks: null };

  // ── Rule 1: Staff cannot use permission in both morning (late check-in) and evening (early exit) on the same day ──
  if (lateMin > 0 && earlyMin > 0) {
    return {
      ...base, status: "Absent",
      isLate: true, lateByMinutes: lateMin,
      isEarlyExit: true, earlyExitMinutes: earlyMin,
      workingHours: wh,
      remarks: `Used permission in both morning (late check-in by ${lateMin} min) and evening (early exit by ${earlyMin} min) → Absent.`,
    };
  }

  // ── Rule 2: Daily cap — max 60 min permission in a single day (late + early exit combined) ──
  if (deviation > PERMISSION_CONFIG.DAILY_MAX_PERMISSION_MINUTES) {
    return {
      ...base, status: "Absent",
      isLate: lateMin > 0, lateByMinutes: lateMin,
      isEarlyExit: earlyMin > 0, earlyExitMinutes: earlyMin,
      workingHours: wh,
      remarks: `Daily permission limit exceeded: ${deviation} min > ${PERMISSION_CONFIG.DAILY_MAX_PERMISSION_MINUTES} min allowed per day → Absent.`,
    };
  }

  const { used, remaining, permissionDaysUsed } = await getRemainingPool(emp.id, dateStr);

  // ── Rule 3: Monthly day count — max 2 permission days per month (3rd late day = Absent) ──
  if (permissionDaysUsed >= PERMISSION_CONFIG.MONTHLY_MAX_PERMISSION_DAYS) {
    return {
      ...base, status: "Absent",
      isLate: lateMin > 0, lateByMinutes: lateMin,
      isEarlyExit: earlyMin > 0, earlyExitMinutes: earlyMin,
      workingHours: wh,
      remarks: `Monthly permission days exhausted: ${permissionDaysUsed}/${PERMISSION_CONFIG.MONTHLY_MAX_PERMISSION_DAYS} days already used this month → Absent.`,
    };
  }

  // ── Rule 4: Pool time check — deviation must fit within remaining pool minutes ──
  if (remaining <= 0) {
    return {
      ...base, status: "Absent",
      isLate: lateMin > 0, lateByMinutes: lateMin,
      isEarlyExit: earlyMin > 0, earlyExitMinutes: earlyMin,
      workingHours: wh,
      remarks: `Permission pool exhausted (${used}/${PERMISSION_CONFIG.MONTHLY_POOL_MINUTES} min used) → Absent.`,
    };
  }
  if (deviation <= remaining) {
    return {
      ...base, status: "Present with Permission",
      isLate: lateMin > 0, lateByMinutes: lateMin,
      isEarlyExit: earlyMin > 0, earlyExitMinutes: earlyMin,
      workingHours: wh, overtimeHours: otH, permissionMinutes: deviation,
      remarks: `Permission: ${deviation} min deducted. Day ${permissionDaysUsed + 1}/${PERMISSION_CONFIG.MONTHLY_MAX_PERMISSION_DAYS}. Pool: ${used + deviation}/${PERMISSION_CONFIG.MONTHLY_POOL_MINUTES} min used. Remaining: ${remaining - deviation} min.`,
    };
  }
  return {
    ...base, status: "Absent",
    isLate: lateMin > 0, lateByMinutes: lateMin,
    isEarlyExit: earlyMin > 0, earlyExitMinutes: earlyMin,
    workingHours: wh,
    remarks: `Deviation ${deviation} min exceeds remaining pool ${remaining} min → Absent.`,
  };
};

// ============================================================
// WORKER FINALIZATION
// ============================================================

/**
 * _finalizeWorker
 *
 * Used for: worker, staff-per-day, supervisor, and staff-on-worker-shift.
 *
 * @param {Object[]} shiftsPool — which shifts to detect from:
 *    standardShifts  for worker / staff-per-day
 *    generalShifts   for supervisor            ← FIX 6
 *    (passed explicitly from finalizeAttendance)
 */
const _finalizeWorker = async (emp, dateStr, allPunches, companyId, shiftWindows, shiftsPool = null) => {
  // Default: use standardShifts if no pool specified
  const shifts = shiftsPool || shiftWindows.standardShifts;

  const emptyBase = {
    employeeId: emp.id, companyId, attendanceDate: dateStr,
    shiftName: "Unknown", scheduledStartTime: null, scheduledEndTime: null,
    firstCheckIn: null, lastCheckOut: null, totalCheckIns: 0, totalCheckOuts: 0,
    isLate: false, lateByMinutes: 0, isEarlyExit: false, earlyExitMinutes: 0,
    permissionMinutes: 0, workingHours: 0, overtimeHours: 0,
    isHoliday: false, isWeekOff: false,
  };

  const inPunches = allPunches.filter((p) => p.punchType === "IN");
  const anyOut = allPunches.filter((p) => p.punchType === "OUT");
  const rawOut = anyOut.length ? anyOut[anyOut.length - 1].punchTime : null;

  if (!inPunches.length) {
    return { ...emptyBase, lastCheckOut: rawOut, totalCheckOuts: anyOut.length, status: "Absent", remarks: "No IN punch found" };
  }

  // Look up manual calendar shift assignment for the date
  // Shift C / SUP_C starts early the next morning, so its assignment could be stored under the next day's date.
  const isCDate = moment(dateStr).add(1, "day").format("YYYY-MM-DD");
  const assignment = await ShiftAssignment.findOne({
    where: {
      employeeId: emp.id,
      assignmentDate: { [Op.in]: [dateStr, isCDate] },
      status: "Active"
    }
  });

  let shift = null;
  if (assignment && shiftWindows.shiftById) {
    const assignedShift = shiftWindows.shiftById.get(Number(assignment.shiftTypeId)) || null;
    if (assignedShift) {
      const isCName = assignedShift.name === "C" || assignedShift.name === "SUP_C";
      const isNextDay = assignment.assignmentDate === isCDate;
      if (!isNextDay || isCName) {
        shift = assignedShift;
      }
    }
  }

  const firstInM = toLocalMoment(inPunches[0].punchTime);
  if (!shift) {
    // If no calendar assignment exists, fall back to auto-detecting standard shift from punch times
    shift = detectWorkerShift(firstInM, shifts);
  }

  if (!shift) {
    return {
      ...emptyBase, firstCheckIn: inPunches[0].punchTime, totalCheckIns: inPunches.length,
      status: "Absent",
      remarks: `Punch at ${firstInM.format("HH:mm")} does not fall in any known shift window`,
    };
  }

  return _buildWorkerRecord(emp, dateStr, allPunches, companyId, shift);
};

// ============================================================
// SHARED WORKER RECORD BUILDER
// (used by both _finalizeWorker and _finalizeStaff worker-fallback)
// ============================================================

const _buildWorkerRecord = (emp, dateStr, allPunches, companyId, shift) => {
  const grace = shift.gracePeriod ?? 10;
  const isShiftC = shift.name === "C" || shift.name === "SUP_C";
  const shiftStart = buildMoment(dateStr, shift.start, isShiftC);
  const shiftEnd = buildMoment(dateStr, shift.end, isShiftC || shift.crossesMidnight);
  const graceEnd = shiftStart.clone().add(grace, "minutes");

  // ✅ FIX 4: 90-min early-arrival window matches detectWorkerShift Pass 2
  const earliestIn = shiftStart.clone().subtract(EARLY_ARRIVAL_WINDOW_MINUTES, "minutes");

  const validIn = allPunches.filter((p) => {
    if (p.punchType !== "IN") return false;
    const t = toLocalMoment(p.punchTime);
    return t.isSameOrAfter(earliestIn) && t.isSameOrBefore(shiftEnd);
  });
  const validOut = allPunches.filter((p) => {
    if (p.punchType !== "OUT") return false;
    const t = toLocalMoment(p.punchTime);
    return t.isSameOrAfter(shiftStart) && t.isSameOrBefore(shiftEnd.clone().add(4, "hours"));
  });
  const anyOut = allPunches.filter((p) => p.punchType === "OUT");
  const rawOut = anyOut.length ? anyOut[anyOut.length - 1].punchTime : null;
  const firstCheckIn = validIn.length ? validIn[0].punchTime : null;
  const lastCheckOut = validOut.length ? validOut[validOut.length - 1].punchTime : null;

  const base = {
    employeeId: emp.id, companyId, attendanceDate: dateStr,
    shiftName: shift.name, scheduledStartTime: shift.start, scheduledEndTime: shift.end,
    firstCheckIn, lastCheckOut: lastCheckOut || rawOut,
    totalCheckIns: validIn.length, totalCheckOuts: anyOut.length,
    isLate: false, lateByMinutes: 0, isEarlyExit: false, earlyExitMinutes: 0,
    permissionMinutes: 0, workingHours: 0, overtimeHours: 0,
    isHoliday: false, isWeekOff: false,
  };

  if (!firstCheckIn) return { ...base, status: "Absent", remarks: `No valid IN for Shift ${shift.name}` };
  if (!lastCheckOut) {
    const wh = rawOut ? calcHours(firstCheckIn, rawOut) : 0;
    if (!rawOut) {
      const lateMin = toLocalMoment(firstCheckIn).isAfter(graceEnd) ? toLocalMoment(firstCheckIn).diff(shiftStart, "minutes") : 0;
      return {
        ...base,
        status: "Present",
        isFinalized: false,
        isLate: lateMin > 0,
        lateByMinutes: lateMin,
        remarks: `IN found but no OUT for Shift ${shift.name}`,
      };
    }
    return {
      ...base, status: "Absent", workingHours: wh,
      remarks: `OUT at ${toLocalMoment(rawOut).format("HH:mm")} outside Shift ${shift.name} window`,
    };
  }

  const lateMin = toLocalMoment(firstCheckIn).isAfter(graceEnd) ? toLocalMoment(firstCheckIn).diff(shiftStart, "minutes") : 0;
  const earlyMin = toLocalMoment(lastCheckOut).isBefore(shiftEnd) ? shiftEnd.diff(toLocalMoment(lastCheckOut), "minutes") : 0;
  const wh = calcHours(firstCheckIn, lastCheckOut);
  const durH = shiftEnd.diff(shiftStart, "minutes") / 60;
  const otH = wh > durH ? parseFloat((wh - durH).toFixed(2)) : 0;
  const remarks = [];
  if (lateMin > 0) remarks.push(`Late by ${lateMin} min`);
  if (earlyMin > 0) remarks.push(`Early exit by ${earlyMin} min`);

  return {
    ...base, status: "Present",
    isLate: lateMin > 0, lateByMinutes: lateMin,
    isEarlyExit: earlyMin > 0, earlyExitMinutes: earlyMin,
    workingHours: wh, overtimeHours: otH,
    remarks: remarks.length ? remarks.join(", ") : null,
  };
};

// ============================================================
// LIVE DASHBOARD
// ============================================================

const getLiveDashboardData = async (companyId, date) => {
  const targetDate = date || moment().format("YYYY-MM-DD");

  const employees = await Employee.findAll({
    where: { companyId, status: "Active" },
    include: [{ model: EmploymentType, as: "employmentType" }],
  });
  const records = await Attendance.findAll({ where: { companyId, attendanceDate: targetDate } });
  const byEmp = {};
  records.forEach((r) => { byEmp[r.employeeId] = r; });

  const dash = {
    date: targetDate, totalEmployees: employees.length,
    punchedIn: 0, punchedOut: 0, notYetPunched: 0, lateArrivals: 0,
    byShift: {}, employees: [],
  };

  employees.forEach((emp) => {
    const rec = byEmp[emp.id];
    const empTyp = emp.employmentType?.name?.toLowerCase();

    const shiftK = rec?.shiftName || (
      isStaffType(empTyp) ? "Staff" :
        isSupervisorType(empTyp) ? "Supervisor" :
          isWorkerType(empTyp) ? "Worker" : "Unknown"
    );

    if (!dash.byShift[shiftK]) {
      dash.byShift[shiftK] = { shiftName: shiftK, total: 0, punchedIn: 0, notYetPunched: 0, late: 0 };
    }
    dash.byShift[shiftK].total++;

    let liveStatus = "Not Punched";
    if (rec) {
      if (rec.lastCheckOut) {
        liveStatus = "Punched Out"; dash.punchedOut++;
      } else if (rec.firstCheckIn) {
        liveStatus = rec.isLate ? "Working (Late)" : "Working";
        dash.punchedIn++; dash.byShift[shiftK].punchedIn++;
        if (rec.isLate) { dash.lateArrivals++; dash.byShift[shiftK].late++; }
      }
    } else { dash.notYetPunched++; dash.byShift[shiftK].notYetPunched++; }

    dash.employees.push({
      employeeId: emp.id,
      employeeName: emp.firstName,
      employeeCode: emp.employeeCode,
      employeeType: emp.employmentType?.name || "N/A",
      shiftName: shiftK,
      punchInTime: rec?.firstCheckIn || null,
      punchOutTime: rec?.lastCheckOut || null,
      liveStatus,
      isLate: rec?.isLate || false,
      lateByMinutes: rec?.lateByMinutes || 0,
      workingHours: rec?.workingHours || 0,
      isFinalized: rec?.isFinalized || false,
      finalStatus: rec?.isFinalized ? rec.status : null,
    });
  });

  return dash;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  processRealtimePunch,
  finalizeAttendance,
  getLiveDashboardData,
  upsertEmployeeShift,
  PERMISSION_CONFIG,
  derivePunchType,
  detectWorkerShift,
  detectStaffShift,
  getShiftForEmployee,
  loadShiftWindows,
  invalidateShiftCache,
  isStaffType,
  isWorkerType,
  isSupervisorType,
  isWorkerLike,
};