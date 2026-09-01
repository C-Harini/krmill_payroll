// ============================================================
// ADDITIONS TO SHIFT REPORT CONTROLLER
// Adds support for:
//   reportType = "with_weekoff"    → totalDays + weekOffDays
//   reportType = "without_weekoff" → totalDays - weekOffDays
//
// Requires: npm install moment (already used in project)
// Employee table must have a `weeklyOff` column storing
// comma-separated day names e.g. "SUNDAY" or "SUNDAY,SATURDAY"
// ============================================================

const {
  EmployeeShift,
  Employee,
  EmploymentType,
  LeaveRequest,
  LeaveType,
  Attendance,
} = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

// ─── Existing helpers (keep as-is) ───────────────────────────────────────────

function getMonthYearRange(startDate, endDate) {
  const months = [];
  let cur = moment(startDate).startOf("month");
  const end = moment(endDate).endOf("month");
  while (cur.isSameOrBefore(end)) {
    months.push({ month: cur.month() + 1, year: cur.year() });
    cur.add(1, "month");
  }
  return months;
}

async function getEarnedLeaveDays(employeeId, companyId, startDate, endDate) {
  const leaveRecords = await LeaveRequest.findAll({
    where: {
      employeeId,
      companyId,
      status: "Approved",
      isDeleted: false,
      startDate: { [Op.lte]: endDate },
      endDate: { [Op.gte]: startDate },
    },
    include: [
      {
        model: LeaveType,
        as: "LeaveType",
        attributes: ["id", "name"],
        where: {
          [Op.or]: [
            { name: { [Op.like]: "%Earned%" } },
            { name: { [Op.like]: "%Privilege%" } },
            { name: { [Op.like]: "%EL%" } },
          ],
        },
        required: true,
      },
    ],
  });

  let totalEL = 0;
  for (const lr of leaveRecords) {
    const leaveStart = moment.max(moment(lr.startDate), moment(startDate));
    const leaveEnd = moment.min(moment(lr.endDate), moment(endDate));
    if (leaveEnd.isSameOrAfter(leaveStart)) {
      const leaveTotalDays =
        moment(lr.endDate).diff(moment(lr.startDate), "days") + 1;
      const overlapDays = leaveEnd.diff(leaveStart, "days") + 1;
      const ratio = leaveTotalDays > 0 ? overlapDays / leaveTotalDays : 0;
      totalEL += parseFloat(lr.totalDays) * ratio;
    }
  }
  return parseFloat(totalEL.toFixed(2));
}

// ─── NEW HELPER: Count how many times specific weekday(s) fall in a date range ─
//
// weeklyOffString: "SUNDAY" or "SUNDAY,SATURDAY" (case-insensitive)
// startDate, endDate: "YYYY-MM-DD" strings
//
// Strategy: iterate day-by-day using moment for accuracy.
// For a typical month range this is max ~31 iterations — very cheap.
// For longer ranges (multi-month reports) we use a smarter week-math approach.

function countWeekOffDaysInRange(weeklyOffString, startDate, endDate) {
  if (!weeklyOffString) return 0;

  // Map day names → moment weekday numbers (0=Sun, 1=Mon, ... 6=Sat)
  const DAY_MAP = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };

  // Parse the weeklyOff field — handle comma-separated, trimmed, uppercase
  const offDayNumbers = weeklyOffString
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter((d) => DAY_MAP[d] !== undefined)
    .map((d) => DAY_MAP[d]);

  if (offDayNumbers.length === 0) return 0;

  const start = moment(startDate).startOf("day");
  const end = moment(endDate).startOf("day");
  const totalDaysInRange = end.diff(start, "days") + 1;

  // For ranges up to 60 days — iterate directly (simple, accurate)
  if (totalDaysInRange <= 60) {
    let count = 0;
    const cur = start.clone();
    while (cur.isSameOrBefore(end)) {
      if (offDayNumbers.includes(cur.day())) {
        count++;
      }
      cur.add(1, "day");
    }
    return count;
  }

  // For longer ranges — use week-math per off-day (more efficient)
  // Count occurrences of a single weekday between two dates:
  // Formula: floor((totalDays + startOffset) / 7) where startOffset accounts
  // for how many days into the week the range starts relative to target day.
  let total = 0;
  for (const dayNum of offDayNumbers) {
    // Find first occurrence of dayNum >= start
    let firstOccurrence = start.clone();
    while (firstOccurrence.day() !== dayNum) {
      firstOccurrence.add(1, "day");
    }
    if (firstOccurrence.isAfter(end)) continue;

    // Count: 1 (first) + full weeks remaining
    const remainingDays = end.diff(firstOccurrence, "days");
    total += 1 + Math.floor(remainingDays / 7);
  }
  return total;
}

// ─── UPDATED getShiftReport ───────────────────────────────────────────────────

exports.getShiftReport = async (req, res) => {
  const { companyId, startDate, endDate, reportType, employeeId } = req.query;

  if (!companyId || !startDate || !endDate || !reportType) {
    return res.status(400).json({
      success: false,
      message: "companyId, startDate, endDate, and reportType are required.",
    });
  }

  const validReportTypes = [
    "shift_report",
    "with_el",
    "without_el",
    "with_weekoff",
    "without_weekoff",
    "monthly_attendance"
  ];
  if (!validReportTypes.includes(reportType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid reportType. Must be one of: ${validReportTypes.join(", ")}`,
    });
  }

  const start = moment(startDate).format("YYYY-MM-DD");
  const end = moment(endDate).format("YYYY-MM-DD");

  if (
    !moment(start).isValid() ||
    !moment(end).isValid() ||
    moment(end).isBefore(moment(start))
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid date range." });
  }

  console.log(
    `[getShiftReport] type=${reportType} companyId=${companyId} ${start} to ${end} emp=${employeeId || "all"}`,
  );

  try {
    if (reportType === "monthly_attendance") {
      // 1. Get dates in range
      const dates = [];
      const days = [];
      let curr = moment(start);
      const last = moment(end);
      while (curr.isSameOrBefore(last)) {
        const dateStr = curr.format("YYYY-MM-DD");
        dates.push(dateStr);
        days.push(curr.format("DD"));
        curr.add(1, "day");
      }

      // 2. Fetch active employees
      const empWhere = { companyId, status: "Active" };
      if (employeeId) empWhere.id = employeeId;
      const employees = await Employee.findAll({
        where: empWhere,
        include: [
          {
            model: require("../models").Department,
            as: "department",
            attributes: ["id", "departmentname", "acronym"]
          }
        ],
        order: [["employeeCode", "ASC"]]
      });

      // 3. Fetch attendance records for the date range
      const attWhere = {
        companyId,
        attendanceDate: {
          [Op.between]: [start, end]
        }
      };
      if (employeeId) attWhere.employeeId = employeeId;
      const attRecords = await require("../models").Attendance.findAll({
        where: attWhere,
        attributes: ["employeeId", "attendanceDate", "status", "shiftName"],
        raw: true
      });

      // Create lookup map: employeeId -> date -> record
      const attMap = {};
      for (const r of attRecords) {
        if (!attMap[r.employeeId]) attMap[r.employeeId] = {};
        attMap[r.employeeId][r.attendanceDate] = r;
      }

      // Helper to convert shift name to shift code (A->1, B->2, C->3)
      const getShiftCode = (shiftName) => {
        if (!shiftName) return "";
        const name = shiftName.toUpperCase();
        if (name === "A" || name.includes("SHIFT_A") || name.endsWith("_A")) return "1";
        if (name === "B" || name.includes("SHIFT_B") || name.endsWith("_B")) return "2";
        if (name === "C" || name.includes("SHIFT_C") || name.endsWith("_C")) return "3";
        return shiftName.charAt(0);
      };

      // Helper to map status name to abbreviation
      const mapStatusToAbbreviation = (status) => {
        switch (status) {
          case "Present": return "P";
          case "Present with Permission": return "WP";
          case "Absent": return "A";
          case "Half Day": return "P/L";
          case "Leave": return "L";
          case "Holiday": return "NH";
          case "Week Off": return "W";
          default: return "-";
        }
      };

      // 4. Construct employee summaries
      const summary = [];
      for (const emp of employees) {
        const empAtt = attMap[emp.id] || {};
        const dailyAttendance = {};

        let pCount = 0;
        let aCount = 0;
        let lCount = 0;
        let wCount = 0;
        let nhCount = 0;

        for (const dateStr of dates) {
          const rec = empAtt[dateStr];
          if (rec) {
            const statusAbbr = mapStatusToAbbreviation(rec.status);
            dailyAttendance[dateStr] = {
              status: statusAbbr,
              shiftCode: (statusAbbr === "P" || statusAbbr === "WP" || statusAbbr === "P/L") ? getShiftCode(rec.shiftName) : ""
            };

            // Calculate summaries
            if (rec.status === "Present" || rec.status === "Present with Permission") {
              pCount += 1;
            } else if (rec.status === "Absent") {
              aCount += 1;
            } else if (rec.status === "Leave") {
              lCount += 1;
            } else if (rec.status === "Week Off") {
              wCount += 1;
            } else if (rec.status === "Holiday") {
              nhCount += 1;
            } else if (rec.status === "Half Day") {
              pCount += 0.5;
              lCount += 0.5;
            }
          } else {
            dailyAttendance[dateStr] = { status: "-", shiftCode: "" };
          }
        }

        // Earned Leave lookup
        const elCount = await getEarnedLeaveDays(emp.id, companyId, start, end);

        summary.push({
          employeeId: emp.id,
          employeeName: (emp.firstName || "").trim(),
          employeeCode: emp.employeeCode,
          departmentAcronym: emp.department?.acronym || emp.department?.departmentname || "-",
          dailyAttendance,
          totals: {
            P: pCount,
            A: aCount,
            L: lCount,
            W: wCount,
            NH: nhCount,
            CWH: "-",
            EL: elCount > 0 ? elCount : "-"
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          reportType: "monthly_attendance",
          startDate: start,
          endDate: end,
          dates,
          days,
          companyId: parseInt(companyId),
          totalEmployees: summary.length,
          summary
        }
      });
    }
    // ── Step 1: Month list ────────────────────────────────────────────────────
    const monthYears = getMonthYearRange(start, end);

    // ── Step 2: Fetch EmployeeShift rows ──────────────────────────────────────
    const shiftWhere = {
      companyId,
      [Op.or]: monthYears.map(({ month, year }) => ({ month, year })),
    };
    if (employeeId) shiftWhere.employeeId = employeeId;

    const rows = await EmployeeShift.findAll({
      where: shiftWhere,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "employeeCode",
            "weeklyOff",
          ], // ← include weeklyOff
          include: [
            {
              model: EmploymentType,
              as: "employmentType",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [
        ["employeeId", "ASC"],
        ["shiftName", "ASC"],
      ],
    });

    // ── Step 3: Group by employee ─────────────────────────────────────────────
    const byEmp = {};
    for (const r of rows) {
      const id = r.employeeId;
      if (!byEmp[id]) {
        byEmp[id] = {
          employeeId: id,
          employeeName: r.employee
            ? r.employee.firstName || ""
            : "N/A",
          employeeCode: r.employee?.employeeCode || "N/A",
          employeeType: r.employee?.employmentType?.name || "N/A",
          weeklyOff: r.employee?.weeklyOff || null, // e.g. "SUNDAY" or "SUNDAY,SATURDAY"
          totalDaysAllShifts: 0,
          totalWorkingHoursAllShifts: 0,
          totalOvertimeHoursAllShifts: 0,
          earnedLeaveDays: 0,
          weekOffDays: 0,
          grandTotalDays: 0,
          shifts: {},
        };
      }

      const emp = byEmp[id];
      emp.totalDaysAllShifts += r.totalDays || 0;
      emp.totalWorkingHoursAllShifts += parseFloat(r.totalWorkingHours) || 0;
      emp.totalOvertimeHoursAllShifts += parseFloat(r.totalOvertimeHours) || 0;

      if (!emp.shifts[r.shiftName]) {
        emp.shifts[r.shiftName] = {
          shiftName: r.shiftName,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          lateDays: 0,
          earlyExitDays: 0,
          totalWorkingHours: 0,
          totalOvertimeHours: 0,
        };
      }

      const s = emp.shifts[r.shiftName];
      s.totalDays += r.totalDays || 0;
      s.presentDays += r.presentDays || 0;
      s.absentDays += r.absentDays || 0;
      s.leaveDays += r.leaveDays || 0;
      s.lateDays += r.lateDays || 0;
      s.earlyExitDays += r.earlyExitDays || 0;
      s.totalWorkingHours += parseFloat(r.totalWorkingHours) || 0;
      s.totalOvertimeHours += parseFloat(r.totalOvertimeHours) || 0;
    }

    // ── Step 4: Earned Leave lookup ───────────────────────────────────────────
    const includesEarnedLeave = reportType === "with_el";
    const showEarnedLeave =
      reportType === "with_el" || reportType === "without_el";

    if (showEarnedLeave) {
      for (const id of Object.keys(byEmp)) {
        try {
          byEmp[id].earnedLeaveDays = await getEarnedLeaveDays(
            id,
            companyId,
            start,
            end,
          );
        } catch (elErr) {
          console.error(
            `[getShiftReport] EL lookup failed for emp=${id}:`,
            elErr.message,
          );
          byEmp[id].earnedLeaveDays = 0;
        }
      }
    }

    // ── Step 5: Week Off calculation ──────────────────────────────────────────
    const isWeekOffReport =
      reportType === "with_weekoff" || reportType === "without_weekoff";

    if (isWeekOffReport) {
      // Fetch daily attendance records in the range for this company where employee was Present / Half Day
      const attRecords = await Attendance.findAll({
        where: {
          companyId,
          attendanceDate: { [Op.between]: [start, end] },
          status: { [Op.in]: ["Present", "Present with Permission", "Half Day"] },
        },
        attributes: ["employeeId", "attendanceDate", "shiftName", "workingHours", "overtimeHours"],
        raw: true,
      });

      // Group worked dates by employeeId
      const workedDatesMap = {};
      for (const r of attRecords) {
        if (!workedDatesMap[r.employeeId]) {
          workedDatesMap[r.employeeId] = {};
        }
        workedDatesMap[r.employeeId][r.attendanceDate] = {
          shiftName: r.shiftName,
          workingHours: parseFloat(r.workingHours || 0),
          overtimeHours: parseFloat(r.overtimeHours || 0),
        };
      }

      const DAY_MAP = {
        SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
      };

      for (const id of Object.keys(byEmp)) {
        const emp = byEmp[id];
        
        // Parse employee's weeklyOff field
        const offDayNumbers = [];
        if (emp.weeklyOff) {
          emp.weeklyOff.split(",").forEach(d => {
            const trimmed = d.trim().toUpperCase();
            if (DAY_MAP[trimmed] !== undefined) {
              offDayNumbers.push(DAY_MAP[trimmed]);
            }
          });
        }

        let weekOffDaysWorked = 0;
        let weekOffDaysNotWorked = 0;
        const weekOffShiftsWorked = {}; // shiftName -> { workingHours, overtimeHours, days }

        if (offDayNumbers.length > 0) {
          const cur = moment(start).startOf("day");
          const last = moment(end).startOf("day");
          while (cur.isSameOrBefore(last)) {
            if (offDayNumbers.includes(cur.day())) {
              const dateStr = cur.format("YYYY-MM-DD");
              const record = workedDatesMap[emp.employeeId] && workedDatesMap[emp.employeeId][dateStr];
              if (record) {
                weekOffDaysWorked++;
                const sName = record.shiftName || "Unknown";
                if (!weekOffShiftsWorked[sName]) {
                  weekOffShiftsWorked[sName] = { workingHours: 0, overtimeHours: 0, days: 0 };
                }
                weekOffShiftsWorked[sName].workingHours += record.workingHours;
                weekOffShiftsWorked[sName].overtimeHours += record.overtimeHours;
                weekOffShiftsWorked[sName].days += 1;
              } else {
                weekOffDaysNotWorked++;
              }
            }
            cur.add(1, "day");
          }
        }

        if (reportType === "without_weekoff") {
          emp.weekOffDays = weekOffDaysWorked;
          
          // Deduct from total working hours & OT hours
          for (const sName of Object.keys(weekOffShiftsWorked)) {
            const deduction = weekOffShiftsWorked[sName];
            
            emp.totalWorkingHoursAllShifts = Math.max(0, emp.totalWorkingHoursAllShifts - deduction.workingHours);
            emp.totalOvertimeHoursAllShifts = Math.max(0, emp.totalOvertimeHoursAllShifts - deduction.overtimeHours);
            
            // Also deduct from the individual shift totals
            if (emp.shifts[sName]) {
              const s = emp.shifts[sName];
              s.totalDays = Math.max(0, s.totalDays - deduction.days);
              s.presentDays = Math.max(0, s.presentDays - deduction.days);
              s.totalWorkingHours = Math.max(0, s.totalWorkingHours - deduction.workingHours);
              s.totalOvertimeHours = Math.max(0, s.totalOvertimeHours - deduction.overtimeHours);
            }
          }
        } else {
          emp.weekOffDays = 0;
        }

        emp.weekOffDaysWorked = weekOffDaysWorked;
        emp.weekOffDaysNotWorked = weekOffDaysNotWorked;
      }
    }

    // ── Step 6: grandTotalDays ────────────────────────────────────────────────
    for (const id of Object.keys(byEmp)) {
      const emp = byEmp[id];

      if (reportType === "with_el") {
        emp.grandTotalDays = emp.totalDaysAllShifts + emp.earnedLeaveDays;
      } else if (reportType === "with_weekoff") {
        // Just the total worked days (since it already includes worked weekly off days)
        emp.grandTotalDays = emp.totalDaysAllShifts;
      } else if (reportType === "without_weekoff") {
        // Subtract only the week-off days on which they actually worked
        emp.grandTotalDays = Math.max(
          0,
          emp.totalDaysAllShifts - (emp.weekOffDaysWorked || 0),
        );
      } else {
        // shift_report / without_el
        emp.grandTotalDays = emp.totalDaysAllShifts;
      }
    }

    // ── Step 7: Collect all unique shift names ────────────────────────────────
    const allShiftNames = [
      ...new Set(Object.values(byEmp).flatMap((e) => Object.keys(e.shifts))),
    ].sort();

    // ── Step 8: Format response ───────────────────────────────────────────────
    const summary = Object.values(byEmp)
      .sort((a, b) => a.employeeCode.localeCompare(b.employeeCode))
      .map((emp) => ({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        employeeCode: emp.employeeCode,
        employeeType: emp.employeeType,
        weeklyOff: emp.weeklyOff,
        totalDaysAllShifts: emp.totalDaysAllShifts,
        totalWorkingHoursAllShifts: emp.totalWorkingHoursAllShifts.toFixed(2),
        totalOvertimeHoursAllShifts: emp.totalOvertimeHoursAllShifts.toFixed(2),
        // EL fields (only when relevant)
        earnedLeaveDays: showEarnedLeave ? emp.earnedLeaveDays : undefined,
        // WeekOff fields (only when relevant)
        weekOffDays: isWeekOffReport ? emp.weekOffDays : undefined,
        weeklyOffLabel: isWeekOffReport ? emp.weeklyOff || "—" : undefined,
        grandTotalDays: emp.grandTotalDays,
        shifts: Object.values(emp.shifts).map((s) => ({
          ...s,
          totalWorkingHours: s.totalWorkingHours.toFixed(2),
          totalOvertimeHours: s.totalOvertimeHours.toFixed(2),
        })),
      }));

    console.log(`[getShiftReport] done -> ${summary.length} employees`);

    return res.status(200).json({
      success: true,
      data: {
        reportType,
        startDate: start,
        endDate: end,
        companyId: parseInt(companyId),
        totalEmployees: summary.length,
        allShiftNames,
        includesEarnedLeave,
        // Extra meta for week-off reports
        isWeekOffReport,
        weekOffMode: isWeekOffReport
          ? reportType === "with_weekoff"
            ? "added"
            : "subtracted"
          : undefined,
        summary,
      },
    });
  } catch (err) {
    console.error("[getShiftReport] Error", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
