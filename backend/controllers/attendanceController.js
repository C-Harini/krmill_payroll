// ============================================================
// controllers/attendanceController.js
// ============================================================
// ENDPOINTS:
//
//  Real-time:
//   POST  /api/attendance/punch-webhook          ← biometric device
//   GET   /api/attendance/live-dashboard         ← who is in right now
//
//  Finalization:
//   POST  /api/attendance/regenerate             ← queue background job
//   GET   /api/attendance/regenerate-job/:jobId  ← poll job status
//   GET   /api/attendance/regenerate-jobs        ← list all jobs
//
//  Shift Summary:
//   GET   /api/attendance/shift-summary          ← monthly shift days
//   POST  /api/attendance/shift-summary/rebuild  ← backfill from attendance
//
//  Reports:
//   GET   /api/attendance/summary
//   GET   /api/attendance/permission-summary
//   GET   /api/attendance/cron-status
//
//  CRUD:
//   GET    /api/attendance
//   GET    /api/attendance/:id
//   PUT    /api/attendance/:id
//   DELETE /api/attendance/:id
//   PATCH  /api/attendance/:id/approve
// ============================================================

const {
  Attendance,
  DepartmentAttendance,
  Category,
  Employee,
  EmploymentType,
  EmployeeShift,
  Department,
} = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");
const { manualFinalize } = require("../services/attendenceCron");
const {
  processRealtimePunch,
  getLiveDashboardData,
  PERMISSION_CONFIG,
  derivePunchType,
  upsertEmployeeShift,
  invalidateShiftCache,
} = require("../services/attendanceProcessor");
const regenerateQueue = require("../services/attendanceRegenerateQueue");
const { isDateLocked } = require("../utils/attendanceLockUtil");

// ============================================================
// PUNCH WEBHOOK
// ============================================================
exports.punchWebhook = async (req, res) => {
  const { employeeId, punchTime, punchType, deviceId, companyId } = req.body;

  if (!employeeId || !punchTime) {
    return res.status(400).json({
      success: false,
      message: "employeeId and punchTime are required",
    });
  }

  try {
    const { BiometricPunch } = require("../models");

    const employee = await Employee.findByPk(employeeId, {
      include: [{ model: EmploymentType, as: "employmentType" }],
    });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const empType = employee.employmentType?.name?.toLowerCase();

    // derivePunchType is now async (reads ShiftType from DB)
    const resolvedType =
      punchType && ["IN", "OUT"].includes(punchType)
        ? punchType
        : await derivePunchType(punchTime, empType, companyId);

    // Duplicate guard — ignore if punched within 2 min
    const recentPunch = await BiometricPunch.findOne({
      where: {
        employeeId,
        companyId,
        punchDate: moment(punchTime).format("YYYY-MM-DD"),
        status: "Valid",
        punchTime: {
          [Op.gte]: moment(punchTime).subtract(2, "minutes").toDate(),
          [Op.lte]: moment(punchTime).toDate(),
        },
      },
    });

    if (recentPunch) {
      return res.status(200).json({
        success: true,
        message: "Duplicate punch ignored (within 2 min window)",
      });
    }

    await BiometricPunch.create({
      employeeId,
      companyId,
      punchTime,
      punchType: resolvedType,
      punchDate: moment(punchTime).format("YYYY-MM-DD"),
      biometricDeviceId: deviceId || null,
      status: "Valid",
    });

    const attendance = await processRealtimePunch({
      employeeId,
      punchTime,
      punchType: resolvedType,
      companyId,
    });

    return res.status(200).json({
      success: true,
      message: "Punch recorded",
      data: {
        ...attendance.dataValues,
        resolvedPunchType: resolvedType,
      },
    });
  } catch (err) {
    console.error("[punchWebhook]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// LIVE DASHBOARD
// ============================================================
exports.liveDashboard = async (req, res) => {
  const { companyId, date } = req.query;
  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "companyId is required" });
  }
  try {
    const data = await getLiveDashboardData(companyId, date);
    return res.status(200).json(data);
  } catch (err) {
    console.error("[liveDashboard]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// ADMIN: MANUAL REGENERATE — queues a background job
// ============================================================
exports.regenerateAttendance = async (req, res) => {
  const { companyId, startDate, endDate, employeeIds } = req.body;

  if (!startDate) {
    return res
      .status(400)
      .json({ success: false, message: "startDate is required" });
  }

  const jobId = regenerateQueue.enqueue({
    companyId,
    startDate,
    endDate,
    employeeIds,
  });

  return res.status(202).json({
    success: true,
    message: `Regeneration queued. Poll /api/attendance/regenerate-job/${jobId} for status.`,
    jobId,
  });
};

// ── Poll job status ───────────────────────────────────────────
exports.getRegenerateJobStatus = async (req, res) => {
  const job = regenerateQueue.getJob(req.params.jobId);
  if (!job) {
    return res
      .status(404)
      .json({ success: false, message: "Job not found or expired" });
  }
  return res.status(200).json({ success: true, ...job });
};

// ── List all jobs (admin overview) ───────────────────────────
exports.listRegenerateJobs = async (req, res) => {
  const jobs = regenerateQueue.listJobs();
  return res.status(200).json({ success: true, jobs });
};

// ============================================================
// SHIFT CACHE INVALIDATION (call after ShiftType CRUD)
// ============================================================
exports.invalidateShiftCache = async (req, res) => {
  invalidateShiftCache();
  return res.status(200).json({
    success: true,
    message:
      "Shift window cache invalidated. Next request will reload from DB.",
  });
};

// ============================================================
// SHIFT SUMMARY — monthly shift days per employee
// ============================================================
exports.getShiftSummary = async (req, res) => {
  const { companyId, month, year, employeeId } = req.query;

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

    const byEmp = {};
    rows.forEach((r) => {
      const id = r.employeeId;
      if (!byEmp[id]) {
        byEmp[id] = {
          employeeId: id,
          employeeName: r.employee
            ? `${r.employee.firstName} ${r.employee.lastName}`
            : "N/A",
          employeeCode: r.employee?.employeeCode || "N/A",
          employeeType: r.employee?.employmentType?.name || "N/A",
          totalDaysAllShifts: 0,
          totalWorkingHoursAllShifts: 0,
          totalOvertimeHoursAllShifts: 0,
          totalPermissionMinutesAll: 0,
          shifts: [],
        };
      }

      byEmp[id].totalDaysAllShifts += r.totalDays || 0;
      byEmp[id].totalWorkingHoursAllShifts +=
        parseFloat(r.totalWorkingHours) || 0;
      byEmp[id].totalOvertimeHoursAllShifts +=
        parseFloat(r.totalOvertimeHours) || 0;
      byEmp[id].totalPermissionMinutesAll += r.totalPermissionMinutes || 0;

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
// REBUILD SHIFT SUMMARY — backfill from existing attendance
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

    // Identify all month+year combos
    const months = new Set();
    let cur = moment(start).startOf("month");
    const endM = moment(end).endOf("month");
    while (cur.isSameOrBefore(endM)) {
      months.add(`${cur.year()}-${cur.month() + 1}`);
      cur.add(1, "month");
    }

    // Delete existing rows for those months
    for (const my of months) {
      const [y, m] = my.split("-").map(Number);
      const deleted = await EmployeeShift.destroy({
        where: { companyId, month: m, year: y },
      });
      console.log(
        `[rebuildShiftSummary] deleted ${deleted} rows for ${m}/${y}`,
      );
    }

    const records = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: { [Op.between]: [start, end] },
        isFinalized: true,
      },
      order: [["attendanceDate", "ASC"]],
    });

    let processed = 0;
    const errors = [];

    for (const rec of records) {
      try {
        await upsertEmployeeShift(rec, null);
        processed++;
      } catch (err) {
        errors.push({
          attendanceId: rec.id,
          date: rec.attendanceDate,
          employeeId: rec.employeeId,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Shift summary rebuilt successfully",
      results: {
        dateRange: `${start} → ${end}`,
        monthsCleared: months.size,
        attendanceRecordsProcessed: processed,
        errors,
      },
    });
  } catch (err) {
    console.error("[rebuildShiftSummary]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CRON STATUS
// ============================================================
exports.getCronStatus = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      timezone: "Asia/Kolkata (IST)",
      note: "Cron schedules are auto-derived from shift_types table end times + 2hr buffer.",
      permissionConfig: {
        monthlyPoolMinutes: PERMISSION_CONFIG.MONTHLY_POOL_MINUTES,
        graceMinutes: PERMISSION_CONFIG.GRACE_MINUTES,
        note: "Staff only. Grace period per shift is taken from shift_types.lateGracePeriod.",
      },
    },
  });
};

// ============================================================
// GET ATTENDANCE
// ============================================================
exports.getAttendance = async (req, res) => {
  const {
    companyId,
    startDate,
    endDate,
    employeeId,
    status,
    shiftName,
    search,
    page = 1,
    limit = 50,
  } = req.query;

  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "companyId is required" });
  }

  try {
    const where = { companyId, isFinalized: true };
    if (startDate && endDate) {
      where.attendanceDate = {
        [Op.between]: [
          moment(startDate).format("YYYY-MM-DD"),
          moment(endDate).format("YYYY-MM-DD"),
        ],
      };
    }
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (shiftName) where.shiftName = shiftName;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "firstName", "lastName", "employeeCode"],
          ...(search && {
            where: {
              [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { employeeCode: { [Op.like]: `%${search}%` } },
              ],
            },
          }),
          required: !!search, // INNER JOIN when searching, LEFT JOIN otherwise
          include: [
            {
              model: EmploymentType,
              as: "employmentType",
              attributes: ["id", "name"],
            },
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname"],
            },
          ],
        },
      ],
      order: [
        ["attendanceDate", "DESC"],
        ["id", "DESC"],
      ],
      limit: parseInt(limit),
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("[getAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET ATTENDANCE BY ID
// ============================================================
exports.getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: "employee",
          include: [
            {
              model: EmploymentType,
              as: "employmentType",
              attributes: ["id", "name"],
            },
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname"],
            },
          ],
        },
      ],
    });

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const monthStart = moment(record.attendanceDate)
      .startOf("month")
      .format("YYYY-MM-DD");
    const monthEnd = moment(record.attendanceDate)
      .endOf("month")
      .format("YYYY-MM-DD");
    const usedMin =
      (await Attendance.sum("permissionMinutes", {
        where: {
          employeeId: record.employeeId,
          attendanceDate: { [Op.between]: [monthStart, monthEnd] },
          permissionMinutes: { [Op.gt]: 0 },
        },
      })) || 0;

    return res.status(200).json({
      success: true,
      data: record,
      permissionContext: {
        monthlyPoolMinutes: PERMISSION_CONFIG.MONTHLY_POOL_MINUTES,
        usedMinutes: usedMin,
        remainingMinutes: Math.max(
          0,
          PERMISSION_CONFIG.MONTHLY_POOL_MINUTES - usedMin,
        ),
      },
    });
  } catch (err) {
    console.error("[getAttendanceById]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// UPDATE ATTENDANCE
// ============================================================
exports.updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    if (await isDateLocked(record.companyId, record.attendanceDate)) {
      return res.status(403).json({
        success: false,
        message: `Attendance is LOCKED for ${moment(record.attendanceDate).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    await record.update(req.body);
    const updated = await Attendance.findByPk(req.params.id, {
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
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname"],
            },
          ],
        },
      ],
    });
    return res
      .status(200)
      .json({ success: true, message: "Updated", data: updated });
  } catch (err) {
    console.error("[updateAttendance]", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ============================================================
// DELETE ATTENDANCE
// ============================================================
exports.deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    if (await isDateLocked(record.companyId, record.attendanceDate)) {
      return res.status(403).json({
        success: false,
        message: `Attendance is LOCKED for ${moment(record.attendanceDate).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    await record.destroy();
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("[deleteAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// APPROVE ATTENDANCE
// ============================================================
exports.approveAttendance = async (req, res) => {
  const { userId } = req.body;
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    await record.update({ approvedBy: userId, approvedAt: new Date() });
    return res
      .status(200)
      .json({ success: true, message: "Approved", data: record });
  } catch (err) {
    console.error("[approveAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// ATTENDANCE SUMMARY
// ============================================================
exports.getAttendanceSummary = async (req, res) => {
  const { companyId, startDate, endDate, employeeId } = req.query;
  if (!companyId) {
    return res
      .status(400)
      .json({ success: false, message: "companyId is required" });
  }
  try {
    const where = { companyId, isFinalized: true };
    if (startDate && endDate) {
      where.attendanceDate = {
        [Op.between]: [
          moment(startDate).format("YYYY-MM-DD"),
          moment(endDate).format("YYYY-MM-DD"),
        ],
      };
    }
    if (employeeId) where.employeeId = employeeId;

    const records = await Attendance.findAll({ where });
    const permUsed = records.reduce(
      (s, r) => s + (parseInt(r.permissionMinutes) || 0),
      0,
    );

    const summary = {
      totalDays: records.length,
      present: records.filter((r) => r.status === "Present").length,
      presentWithPermission: records.filter(
        (r) => r.status === "Present with Permission",
      ).length,
      absent: records.filter((r) => r.status === "Absent").length,
      halfDay: records.filter((r) => r.status === "Half Day").length,
      leave: records.filter((r) => r.status === "Leave").length,
      holiday: records.filter((r) => r.status === "Holiday").length,
      weekOff: records.filter((r) => r.status === "Week Off").length,
      lateCount: records.filter((r) => r.isLate).length,
      earlyExitCount: records.filter((r) => r.isEarlyExit).length,
      totalWorkingHours: records
        .reduce((s, r) => s + (parseFloat(r.workingHours) || 0), 0)
        .toFixed(2),
      totalOvertimeHours: records
        .reduce((s, r) => s + (parseFloat(r.overtimeHours) || 0), 0)
        .toFixed(2),
      permissionMinutesUsed: permUsed,
      permissionMinutesRemaining: Math.max(
        0,
        PERMISSION_CONFIG.MONTHLY_POOL_MINUTES - permUsed,
      ),
      monthlyPoolMinutes: PERMISSION_CONFIG.MONTHLY_POOL_MINUTES,
    };

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error("[getAttendanceSummary]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// PERMISSION SUMMARY
// ============================================================
exports.getPermissionSummary = async (req, res) => {
  const { companyId, month, year } = req.query;
  if (!companyId || !month || !year) {
    return res.status(400).json({
      success: false,
      message: "companyId, month, year required",
    });
  }

  try {
    const monthStart = moment(`${year}-${String(month).padStart(2, "0")}-01`)
      .startOf("month")
      .format("YYYY-MM-DD");
    const monthEnd = moment(`${year}-${String(month).padStart(2, "0")}-01`)
      .endOf("month")
      .format("YYYY-MM-DD");

    const records = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: { [Op.between]: [monthStart, monthEnd] },
        permissionMinutes: { [Op.gt]: 0 },
        isFinalized: true,
      },
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "firstName", "lastName", "employeeCode"],
          include: [
            {
              model: EmploymentType,
              as: "employmentType",
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [
        ["employeeId", "ASC"],
        ["attendanceDate", "ASC"],
      ],
    });

    const byEmp = {};
    records.forEach((r) => {
      const id = r.employeeId;
      if (!byEmp[id]) {
        byEmp[id] = {
          employeeId: id,
          employeeName: r.employee
            ? `${r.employee.firstName} ${r.employee.lastName}`
            : "N/A",
          employeeCode: r.employee?.employeeCode || "N/A",
          employeeType: r.employee?.employmentType?.name || "N/A",
          minutesUsed: 0,
          days: [],
        };
      }
      byEmp[id].minutesUsed += r.permissionMinutes || 0;
      byEmp[id].days.push({
        date: r.attendanceDate,
        status: r.status,
        lateByMinutes: r.lateByMinutes,
        earlyExitMinutes: r.earlyExitMinutes,
        permissionMinutes: r.permissionMinutes,
        remarks: r.remarks,
      });
    });

    const summary = Object.values(byEmp).map((e) => ({
      ...e,
      minutesRemaining: Math.max(
        0,
        PERMISSION_CONFIG.MONTHLY_POOL_MINUTES - e.minutesUsed,
      ),
      isPoolExhausted: e.minutesUsed >= PERMISSION_CONFIG.MONTHLY_POOL_MINUTES,
    }));

    return res.status(200).json({
      success: true,
      data: {
        month: parseInt(month),
        year: parseInt(year),
        monthlyPoolMinutes: PERMISSION_CONFIG.MONTHLY_POOL_MINUTES,
        summary,
      },
    });
  } catch (err) {
    console.error("[getPermissionSummary]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// MULTIPLE ENTRY ATTENDANCE
// ============================================================
// ============================================================
// MULTIPLE ENTRY ATTENDANCE (hr_department_attendance)
// ============================================================
exports.getMultipleEntryAttendance = async (req, res) => {
  const { companyId, departmentId, attendanceDate, shiftId } = req.query;

  if (!companyId || !departmentId || !attendanceDate) {
    return res.status(400).json({
      success: false,
      message: "companyId, departmentId, and attendanceDate are required",
    });
  }

  try {
    const formattedDate = moment(attendanceDate).format("YYYY-MM-DD");

    // 1. Fetch active employees for the selected department
    const employees = await Employee.findAll({
      where: {
        companyId,
        departmentId,
        status: "Active",
      },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "categoryCode", "categoryName"],
          required: false,
        },
      ],
      order: [["employeeCode", "ASC"]],
    });

    // 2. Fetch saved records from DepartmentAttendance (hr_department_attendance)
    const whereDeptAtt = {
      companyId,
      departmentId,
      attendanceDate: formattedDate,
    };
    if (shiftId) {
      whereDeptAtt.shiftId = shiftId;
    }

    const savedRecords = await DepartmentAttendance.findAll({
      where: whereDeptAtt,
      include: [
        {
          model: Employee,
          as: "employee",
        },
      ],
      order: [["id", "ASC"]],
    });

    // Fetch all employee IDs who are already assigned to ANY shift on this date
    // so they are not shown in the checklist to be assigned to another shift
    const allAssignedOnDate = await DepartmentAttendance.findAll({
      where: {
        companyId,
        attendanceDate: formattedDate,
      },
      attributes: ["employeeId"],
      raw: true,
    });
    const assignedEmpIdSet = new Set(allAssignedOnDate.map((r) => r.employeeId));

    // 3. Format Left Side (Unsaved / Department Employee checklist)
    // Exclude any employee who is already assigned with any shift on this date
    const unsavedEmployees = employees
      .filter((emp) => !assignedEmpIdSet.has(emp.id))
      .map((emp) => {
        const catCode = emp.category
          ? (emp.category.categoryName || emp.category.categoryCode)
          : "O";
        const code = emp.employeeCode || emp.ticketNo || (emp.dataValues ? emp.dataValues.employeeCode : "") || String(emp.id);
        return {
          employeeId: emp.id,
          ticketNo: code,
          employeeCode: code,
          empName: emp.firstName,
          category: catCode,
          isChecked: false,
        };
      });

    // 4. Format Right Side (Saved Data)
    const savedData = savedRecords.map((rec, index) => {
      const code = rec.ticketNo || (rec.employee ? rec.employee.employeeCode : "") || String(rec.employeeId);
      return {
        id: rec.id,
        slNo: index + 1,
        ticketNo: code,
        employeeCode: code,
        empName: rec.employee ? rec.employee.firstName : (rec.empName ? rec.empName.split(" ")[0] : ""),
        shift: rec.shiftName || "B",
        cat: rec.category || "O",
        employeeId: rec.employeeId,
        status: rec.status,
        remarks: rec.remarks || "",
        attendanceDate: rec.attendanceDate,
        workedDeptId: rec.workedDeptId,
        shiftId: rec.shiftId,
      };
    });

    // Helper: Alphabetical sort by employee name (A to Z)
    const sortByAlphabetical = (a, b) => {
      const nameA = String(a.empName || a.employeeName || "").trim().toUpperCase();
      const nameB = String(b.empName || b.employeeName || "").trim().toUpperCase();
      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) return nameCompare;

      const codeA = String(a.ticketNo || a.employeeCode || a.employeeId || "").trim();
      const codeB = String(b.ticketNo || b.employeeCode || b.employeeId || "").trim();
      const numA = parseInt(codeA.replace(/[^0-9]/g, ""), 10);
      const numB = parseInt(codeB.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
    };

    unsavedEmployees.sort(sortByAlphabetical);
    savedData.sort(sortByAlphabetical);
    savedData.forEach((rec, index) => {
      rec.slNo = index + 1;
    });

    return res.status(200).json({
      success: true,
      unsavedEmployees,
      savedData,
      data: savedData, // Backward compatibility fallback
    });
  } catch (err) {
    console.error("[getMultipleEntryAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveMultipleEntryAttendance = async (req, res) => {
  const {
    companyId,
    departmentId,
    workedDeptId,
    attendanceDate,
    shiftId,
    employees,
    status = "Present",
    userId,
  } = req.body;

  if (
    !companyId ||
    !departmentId ||
    !workedDeptId ||
    !attendanceDate ||
    !shiftId ||
    !Array.isArray(employees) ||
    employees.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "companyId, departmentId, workedDeptId, attendanceDate, shiftId, and employees selection are required",
    });
  }

  if (await isDateLocked(companyId, attendanceDate)) {
    return res.status(403).json({
      success: false,
      message: `Manual attendance entry is LOCKED for ${moment(attendanceDate).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
      isLocked: true,
    });
  }

  const { sequelize, ShiftType, Category } = require("../models");
  const transaction = await sequelize.transaction();

  try {
    const shift = await ShiftType.findByPk(shiftId);
    const shiftNameStr = shift ? shift.name : "B";
    const dateStr = moment(attendanceDate).format("YYYY-MM-DD");

    // Extract employee IDs from the request
    const empIdList = employees
      .map((empItem) => (typeof empItem === "object" ? empItem.employeeId : empItem))
      .filter(Boolean);

    // Validate that none of the selected employees are already assigned to a DIFFERENT shift on this date
    const alreadyAssignedDiffShift = await DepartmentAttendance.findAll({
      where: {
        companyId,
        attendanceDate: dateStr,
        employeeId: { [Op.in]: empIdList },
        shiftId: { [Op.ne]: shiftId },
      },
      include: [
        { model: Employee, as: "employee", attributes: ["firstName", "employeeCode"] },
        { model: ShiftType, as: "shiftType", attributes: ["name"] },
      ],
      transaction,
    });

    if (alreadyAssignedDiffShift.length > 0) {
      await transaction.rollback();
      const conflictDetails = alreadyAssignedDiffShift
        .map((r) => {
          const name = r.employee ? r.employee.firstName : (r.empName || `ID ${r.employeeId}`);
          const code = r.ticketNo || (r.employee ? r.employee.employeeCode : "");
          const sName = r.shiftName || (r.shiftType ? r.shiftType.name : `Shift ${r.shiftId}`);
          return `${name}${code ? ` (${code})` : ""} in Shift ${sName}`;
        })
        .join(", ");

      return res.status(400).json({
        success: false,
        message: `The following employee(s) are already assigned to another shift on ${dateStr}: ${conflictDetails}. An employee cannot be assigned to multiple shifts on the same date. Please edit their shift instead.`,
      });
    }

    for (const empItem of employees) {
      const empId = typeof empItem === "object" ? empItem.employeeId : empItem;
      const empStatus = typeof empItem === "object" && empItem.status ? empItem.status : status;
      const empRemarks = typeof empItem === "object" ? empItem.remarks : "";

      if (!empId) continue;

      const employee = await Employee.findByPk(empId, {
        include: [{ model: Category, as: "category", attributes: ["categoryCode", "categoryName"] }],
        transaction,
      });

      if (!employee) continue;

      const ticketNo = employee.employeeCode || employee.ticketNo || (employee.dataValues ? employee.dataValues.employeeCode : "") || String(employee.id);
      const empName = employee.firstName;
      const catCode = employee.category
        ? employee.category.categoryCode || (employee.category.categoryName ? employee.category.categoryName.charAt(0) : "O")
        : "O";

      // 1. Save or Update in hr_department_attendance table
      const [deptAtt, created] = await DepartmentAttendance.findOrCreate({
        where: {
          employeeId: empId,
          attendanceDate: dateStr,
          shiftId: shiftId,
        },
        defaults: {
          companyId,
          departmentId,
          workedDeptId,
          employeeId: empId,
          ticketNo,
          empName,
          category: catCode,
          attendanceDate: dateStr,
          status: empStatus,
          shiftId,
          shiftName: shiftNameStr,
          remarks: empRemarks || null,
          createdBy: userId || 1,
        },
        transaction,
      });

      if (!created) {
        await deptAtt.update(
          {
            departmentId,
            workedDeptId,
            ticketNo,
            empName,
            category: catCode,
            status: empStatus,
            shiftName: shiftNameStr,
            remarks: empRemarks || null,
            updatedBy: userId || 1,
          },
          { transaction }
        );
      }

      // 2. Also sync into main Attendance table for reports / salary generation
      // COMMENTED OUT: HR bulk uploads should NOT override/modify the master Attendance table.
      /*
      const [att, attCreated] = await Attendance.findOrCreate({
        where: {
          employeeId: empId,
          attendanceDate: dateStr,
        },
        defaults: {
          companyId,
          departmentId,
          workedDeptId,
          shiftId,
          shiftName: shiftNameStr,
          scheduledStartTime: shift ? shift.startTime : null,
          scheduledEndTime: shift ? shift.endTime : null,
          status: empStatus,
          remarks: empRemarks || null,
          isFinalized: true,
          autoGenerated: false,
          createdBy: userId || 1,
        },
        transaction,
      });

      if (!attCreated) {
        await att.update(
          {
            departmentId,
            workedDeptId,
            shiftId,
            shiftName: shiftNameStr,
            scheduledStartTime: shift ? shift.startTime : null,
            scheduledEndTime: shift ? shift.endTime : null,
            status: empStatus,
            remarks: empRemarks || null,
            isFinalized: true,
            autoGenerated: false,
            updatedBy: userId || 1,
          },
          { transaction }
        );
      }
      */
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: "Department attendance saved successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[saveMultipleEntryAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMultipleEntryAttendance = async (req, res) => {
  const { ids, companyId, attendanceDate, employeeIds } = req.body;

  try {
    const dateStr = attendanceDate ? moment(attendanceDate).format("YYYY-MM-DD") : null;

    if (companyId && dateStr && (await isDateLocked(companyId, dateStr))) {
      return res.status(403).json({
        success: false,
        message: `Manual attendance entry is LOCKED for ${dateStr}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const firstRec = await DepartmentAttendance.findByPk(ids[0]);
      if (firstRec && (await isDateLocked(firstRec.companyId, firstRec.attendanceDate))) {
        return res.status(403).json({
          success: false,
          message: `Manual attendance entry is LOCKED for ${moment(firstRec.attendanceDate).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
          isLocked: true,
        });
      }
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const recordsToDelete = await DepartmentAttendance.findAll({
        where: { id: { [Op.in]: ids } },
        transaction,
      });

      const empIdsToDelete = recordsToDelete.map((r) => r.employeeId);
      const recordDates = recordsToDelete.map((r) => r.attendanceDate);

      await DepartmentAttendance.destroy({
        where: { id: { [Op.in]: ids } },
        transaction,
      });

      // COMMENTED OUT: HR bulk uploads should NOT delete/modify the master Attendance table.
      /*
      if (empIdsToDelete.length > 0) {
        await Attendance.destroy({
          where: {
            employeeId: { [Op.in]: empIdsToDelete },
            attendanceDate: { [Op.in]: recordDates },
          },
          transaction,
        });
      }
      */
    } else if (companyId && dateStr && Array.isArray(employeeIds) && employeeIds.length > 0) {
      await DepartmentAttendance.destroy({
        where: {
          companyId,
          attendanceDate: dateStr,
          employeeId: { [Op.in]: employeeIds },
        },
        transaction,
      });

      // COMMENTED OUT: HR bulk uploads should NOT delete/modify the master Attendance table.
      /*
      await Attendance.destroy({
        where: {
          companyId,
          attendanceDate: dateStr,
          employeeId: { [Op.in]: employeeIds },
        },
        transaction,
      });
      */
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Provide either array of saved entry 'ids' or companyId, attendanceDate, and employeeIds",
      });
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: "Selected attendance records deleted successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[deleteMultipleEntryAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMultipleEntryAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, remarks, shiftId, attendanceDate, category, workedDeptId } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  try {
    const record = await DepartmentAttendance.findByPk(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const targetDate = attendanceDate || record.attendanceDate;
    if (await isDateLocked(record.companyId, targetDate)) {
      return res.status(403).json({
        success: false,
        message: `Manual attendance entry is LOCKED for ${moment(targetDate).format("YYYY-MM-DD")}. Please unlock the date in the Strength Report to make changes.`,
        isLocked: true,
      });
    }

    const updateFields = {
      status,
      remarks: remarks !== undefined ? remarks : record.remarks,
    };

    if (attendanceDate) {
      updateFields.attendanceDate = moment(attendanceDate).format("YYYY-MM-DD");
    }

    if (category !== undefined && category !== null && String(category).trim() !== "") {
      updateFields.category = String(category).trim().toUpperCase();
    }

    if (workedDeptId !== undefined && workedDeptId !== null && String(workedDeptId).trim() !== "") {
      updateFields.workedDeptId = parseInt(workedDeptId, 10);
    }

    if (shiftId) {
      const targetDate = updateFields.attendanceDate || record.attendanceDate;

      // Check if employee already has another record with a different entry on this date
      const existingDuplicate = await DepartmentAttendance.findOne({
        where: {
          id: { [Op.ne]: record.id },
          companyId: record.companyId,
          employeeId: record.employeeId,
          attendanceDate: targetDate,
        },
      });

      if (existingDuplicate) {
        return res.status(400).json({
          success: false,
          message: `Cannot change shift: this employee already has another attendance entry in Shift "${existingDuplicate.shiftName || existingDuplicate.shiftId}" on ${targetDate}.`,
        });
      }

      const { ShiftType } = require("../models");
      const shift = await ShiftType.findByPk(shiftId);
      updateFields.shiftId = shiftId;
      updateFields.shiftName = shift ? shift.name : record.shiftName;
    }

    await record.update(updateFields);

    return res.status(200).json({
      success: true,
      message: "Attendance record updated successfully",
      data: record,
    });
  } catch (err) {
    console.error("[updateMultipleEntryAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;