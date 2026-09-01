
// NEW ENDPOINTS:
//   GET /api/attendance/shift-summary
//     → Monthly shift breakdown per employee
//     → Query: companyId, month, year, employeeId (optional)
//
//   POST /api/attendance/shift-summary/rebuild
//     → Rebuilds employee_shifts from scratch for a date range
//     → Use when migrating existing attendance data
// ============================================================

const {
  Attendance,
  Employee,
  EmploymentType,
  EmployeeShift,
} = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");
const { upsertEmployeeShift } = require("../services/attendanceProcessor");

// ============================================================
// GET SHIFT SUMMARY — monthly shift days per employee
// ============================================================
// Returns how many days each employee worked each shift in a month.
//
// Example response:
// [
//   {
//     employeeId: 1,
//     employeeName: "Alex S",
//     shifts: [
//       { shiftName: "A", totalDays: 12, presentDays: 10, ... },
//       { shiftName: "B", totalDays: 5,  presentDays: 5,  ... }
//     ]
//   }
// ]
// ============================================================
exports.getShiftSummary = async (req, res) => {
  const { companyId, month, year, employeeId } = req.query;
console.log(
  `getShiftSummary requested: companyId=${companyId} month=${month} year=${year} employeeId=${employeeId || "all"}`,
);
  if (!companyId || !month || !year) {
    return res.status(400).json({
      success: false,
      message: "companyId, month, year are required",
    });
  }

  

  try {
    const where = {
      companyId,
      month: parseInt(month),
      year: parseInt(year),
    };
    if (employeeId) where.employeeId = employeeId;

    const rows = await EmployeeShift.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "firstName", "lastName", "employeeCode"],
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

    // Group by employee
    const byEmp = {};
    rows.forEach((r) => {
      const id = r.employeeId;
      if (!byEmp[id]) {
        byEmp[id] = {
          employeeId: id,
          employeeName: r.employee
            ? r.employee.firstName
            : "N/A",
          employeeCode: r.employee?.employeeCode || "N/A",
          employeeType: r.employee?.employmentType?.name || "N/A",
          totalDaysAllShifts: 0,
          totalWorkingHoursAllShifts: 0,
          totalOvertimeHoursAllShifts: 0,
          shifts: [],
        };
      }

      byEmp[id].totalDaysAllShifts += r.totalDays || 0;
      byEmp[id].totalWorkingHoursAllShifts +=
        parseFloat(r.totalWorkingHours) || 0;
      byEmp[id].totalOvertimeHoursAllShifts +=
        parseFloat(r.totalOvertimeHours) || 0;

      byEmp[id].shifts.push({
        shiftName: r.shiftName,
        scheduledStartTime: r.scheduledStartTime,
        scheduledEndTime: r.scheduledEndTime,
        totalDays: r.totalDays,
        presentDays: r.presentDays,
        presentWithPermissionDays: r.presentWithPermissionDays,
        absentDays: r.absentDays,
        leaveDays: r.leaveDays,
        lateDays: r.lateDays,
        earlyExitDays: r.earlyExitDays,
        totalWorkingHours: parseFloat(r.totalWorkingHours).toFixed(2),
        totalOvertimeHours: parseFloat(r.totalOvertimeHours).toFixed(2),
        totalPermissionMinutes: r.totalPermissionMinutes,
        firstSeenDate: r.firstSeenDate,
        lastSeenDate: r.lastSeenDate,
      });
    });

    const summary = Object.values(byEmp).map((e) => ({
      ...e,
      totalWorkingHoursAllShifts: e.totalWorkingHoursAllShifts.toFixed(2),
      totalOvertimeHoursAllShifts: e.totalOvertimeHoursAllShifts.toFixed(2),
    }));
    console.log(`getShiftSummary companyId=${companyId} month=${month} year=${year} employeeId=${employeeId || "all"} → ${summary.length} employees`);
    return res.status(200).json({
      success: true,
      data: {
        month: parseInt(month),
        year: parseInt(year),
        companyId: parseInt(companyId),
        totalEmployees: summary.length,
        summary,
      },
    });
  } catch (err) {
    console.error("[getShiftSummary]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// REBUILD SHIFT SUMMARY — backfill from existing attendance data
// ============================================================
// Use this ONCE after deploying to populate employee_shifts from
// existing attendance records. Also use to fix any discrepancies.
//
// Body: { companyId, startDate, endDate }
// ============================================================
exports.rebuildShiftSummary = async (req, res) => {
  const { companyId, startDate, endDate } = req.body;

  if (!companyId || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "companyId, startDate, endDate are required",
    });
  }

  try {
    const start = moment(startDate).format("YYYY-MM-DD");
    const end = moment(endDate).format("YYYY-MM-DD");

    console.log(
      `[rebuildShiftSummary] companyId=${companyId} ${start} → ${end}`,
    );

    // ── Step 1: Delete existing shift summary rows for this period ──
    // Find all month+year combinations in the range
    const months = new Set();
    let cur = moment(start);
    while (cur.isSameOrBefore(moment(end))) {
      months.add(`${cur.year()}-${cur.month() + 1}`);
      cur.add(1, "month");
    }

    for (const my of months) {
      const [y, m] = my.split("-").map(Number);
      await EmployeeShift.destroy({
        where: { companyId, month: m, year: y },
      });
    }

    console.log(
      `[rebuildShiftSummary] cleared ${months.size} month(s) of shift data`,
    );

    // ── Step 2: Fetch all finalized attendance in range ────────────
    const records = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: { [Op.between]: [start, end] },
        isFinalized: true,
      },
      order: [["attendanceDate", "ASC"]],
    });

    console.log(
      `[rebuildShiftSummary] rebuilding from ${records.length} attendance records`,
    );

    // ── Step 3: Upsert each record (no previousRecord — fresh build) ──
    let processed = 0;
    const errors = [];

    for (const rec of records) {
      try {
        await upsertEmployeeShift(rec, null);
        processed++;
      } catch (err) {
        errors.push({ id: rec.id, error: err.message });
        console.error(`[rebuildShiftSummary] rec=${rec.id}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Shift summary rebuilt",
      results: {
        attendanceRecordsProcessed: processed,
        monthsCleared: months.size,
        errors,
      },
    });
  } catch (err) {
    console.error("[rebuildShiftSummary]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
