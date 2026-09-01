// ============================================================
// services/attendanceCron.js
// ============================================================
// Auto-finalizes attendance 2 hours after each shift ends.
// Cron schedules are DERIVED from shift_types table at startup.
//
// How it works:
//   1. On init, load all active ShiftType rows from DB.
//   2. For each unique shift end time, schedule a cron job at
//      endTime + 2 hours (configurable via FINALIZE_BUFFER_MIN).
//   3. Worker Shift B crosses midnight — its attendance date
//      is YESTERDAY (dateOffset: -1).
//   4. Staff shifts never cross midnight — dateOffset: 0.
//   5. A static "safety net" cron at 23:45 catches anything missed.
//
// Manual re-trigger: manualFinalize() unlocks & re-processes a
// date range for admin corrections.
// ============================================================

const cron = require("node-cron");
const moment = require("moment");
const { finalizeAttendance } = require("./attendanceProcessor");

// Buffer after shift end before finalizing (minutes)
const FINALIZE_BUFFER_MIN = 120;

// ── Build cron expression from HH:MM ─────────────────────────
const toCronExpr = (hh, mm) => `${mm} ${hh} * * *`;

// ── Derive finalize time for a shift ─────────────────────────
// Returns { cronExpr, dateOffset, label }
const shiftFinalizeMeta = (startTime, endTime, shiftName) => {
  const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
  const crossesMidnight = eh * 60 + em < sh * 60 + sm;

  // Finalize time = endTime + buffer
  const endTotalMin = eh * 60 + em + FINALIZE_BUFFER_MIN;
  const finalH = Math.floor(endTotalMin / 60) % 24;
  const finalM = endTotalMin % 60;
  const cronExpr = toCronExpr(finalH, finalM);

  // If shift crosses midnight, the punch date is yesterday
  // ALSO: If shift name is C or SUP_C, its attendance date is yesterday (dateOffset: -1)
  let dateOffset = crossesMidnight ? -1 : 0;
  if (shiftName === "C" || shiftName === "SUP_C") {
    dateOffset = -1;
  }

  return {
    cronExpr,
    dateOffset,
    crossesMidnight,
    label: `Shift ${shiftName} (ends ${endTime.slice(0, 5)}) → finalize at ${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`,
  };
};

// ── Map from companyId → array of scheduled job objects ──────
const activeJobs = new Map();

// ── Initialize crons for a specific company ──────────────────
const initAttendanceCronsForCompany = async (companyId) => {
  const { ShiftType } = require("../models");

  const shifts = await ShiftType.findAll({
    where: { status: "Active", companyId },
  });

  if (!shifts.length) {
    console.warn(
      `[attendanceCron] No active shifts found for company ${companyId}. No crons scheduled.`,
    );
    return [];
  }

  // Deduplicate: one cron per unique endTime within a company
  // (multiple shifts could end at the same time)
  const seen = new Set();
  const scheduled = [];

  for (const shift of shifts) {
    const key = `${companyId}:${shift.endTime}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const meta = shiftFinalizeMeta(shift.startTime, shift.endTime, shift.name);

    const task = cron.schedule(
      meta.cronExpr,
      async () => {
        const attendanceDate = moment()
          .add(meta.dateOffset, "days")
          .format("YYYY-MM-DD");

        console.log(
          `\n[CRON] ${meta.label} | company=${companyId} | date=${attendanceDate}`,
        );

        try {
          const results = await finalizeAttendance({
            companyId,
            dateStr: attendanceDate,
          });
          console.log(`[CRON] ${meta.label} complete:`, results);
        } catch (err) {
          console.error(`[CRON] ${meta.label} failed:`, err.message);
        }
      },
      { timezone: "Asia/Kolkata" },
    );

    scheduled.push({ shift: shift.name, ...meta, task });
    console.log(`  ✅ [company=${companyId}] ${meta.label}`);
  }

  // Safety net: 23:45 every night — catches any stragglers
  const safetyTask = cron.schedule(
    "45 23 * * *",
    async () => {
      const attendanceDate = moment().format("YYYY-MM-DD");
      console.log(
        `\n[CRON] Safety net | company=${companyId} | date=${attendanceDate}`,
      );
      try {
        const results = await finalizeAttendance({
          companyId,
          dateStr: attendanceDate,
        });
        console.log(`[CRON] Safety net complete:`, results);
      } catch (err) {
        console.error(`[CRON] Safety net failed:`, err.message);
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  scheduled.push({
    shift: "Safety net",
    cronExpr: "45 23 * * *",
    label: "Safety net 23:45 — catches any un-finalized records",
    task: safetyTask,
  });

  activeJobs.set(companyId, scheduled);
  return scheduled;
};

// ── Initialize crons for ALL companies ───────────────────────
const initAttendanceCrons = async () => {
  const { Company } = require("../models");

  console.log("===========================================");
  console.log("  Attendance Auto-Finalization Crons");
  console.log("===========================================");

  let companies;
  try {
    companies = await Company.findAll({ where: { status: "Active" } });
  } catch (e) {
    // If Company model not available, fall back to single-company from env
    const companyId = process.env.DEFAULT_COMPANY_ID || 1;
    console.warn(
      `[attendanceCron] Could not load companies (${e.message}). Using companyId=${companyId}.`,
    );
    await initAttendanceCronsForCompany(companyId);
    console.log("===========================================\n");
    return;
  }

  for (const company of companies) {
    await initAttendanceCronsForCompany(company.id);
  }

  console.log("===========================================\n");
};

// ── Manual re-trigger (admin API) ────────────────────────────
// Unlocks finalized records for the date range, then re-processes.
const manualFinalize = async ({
  companyId,
  startDate,
  endDate,
  employeeIds,
  onProgress, // optional callback(dateStr, results)
}) => {
  const { Attendance } = require("../models");
  const { Op } = require("sequelize");

  const start = moment(startDate).format("YYYY-MM-DD");
  const end = endDate ? moment(endDate).format("YYYY-MM-DD") : start;

  console.log(`[MANUAL FINALIZE] Unlocking ${start} → ${end}`);

  // Un-lock existing finalized records
  const where = {
    attendanceDate: { [Op.between]: [start, end] },
    isFinalized: true,
  };
  if (companyId) where.companyId = companyId;
  if (employeeIds?.length) where.employeeId = { [Op.in]: employeeIds };

  await Attendance.update({ isFinalized: false }, { where });

  // Generate date list
  const dates = [];
  let cur = moment(start);
  while (cur.isSameOrBefore(moment(end))) {
    dates.push(cur.format("YYYY-MM-DD"));
    cur.add(1, "day");
  }

  const totals = { processed: 0, finalized: 0, skipped: 0, errors: [] };

  for (let di = 0; di < dates.length; di++) {
    const dateStr = dates[di];

    const r = await finalizeAttendance({
      companyId,
      dateStr,
      employeeIds,
      force: true,
      onProgress: onProgress
        ? (processed, total, name) =>
          onProgress({
            dateStr,
            dateIndex: di + 1,
            totalDates: dates.length,
            processed,
            total,
            name,
          })
        : undefined,
    });


    totals.processed += r.processed;
    totals.finalized += r.finalized;
    totals.skipped += r.skipped;
    totals.errors.push(...r.errors);
  }

  console.log("✅ Manual attendance completed", totals, startDate, endDate);
  return totals;
};

module.exports = {
  initAttendanceCrons,
  initAttendanceCronsForCompany,
  manualFinalize,
};
