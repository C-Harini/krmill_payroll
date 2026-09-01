const { LunchAttendance, BiometricPunch, Employee, Department, ShiftType, Company, sequelize } = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

// Helper to calculate status based on punches
const calculateLunchStatus = (outTime, inTime) => {
  if (!outTime || !inTime) return "No Punch";
  
  const outMoment = moment(outTime, "hh:mm A");
  const inMoment = moment(inTime, "hh:mm A");
  const duration = moment.duration(inMoment.diff(outMoment)).asMinutes();
  
  // Standard lunch break limit is 30 minutes
  return duration > 30 ? "Late IN" : "Normal";
};

// 1. Download Lunch Logs (Simulate download from machine if offline)
exports.downloadLunchLogs = async (req, res) => {
  const { date, companyId } = req.body;
  if (!date || !companyId) {
    return res.status(400).json({ success: false, message: "Date and Company ID are required" });
  }

  try {
    const targetDate = moment(date).format("YYYY-MM-DD");
    
    // Fetch some active employees to mock punches for if needed
    const employees = await Employee.findAll({
      where: { companyId, status: "Active" },
      limit: 10
    });

    if (employees.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active employees found to download logs for."
      });
    }

    // Mock biometric punch logs for target date to simulate machine logs
    const mockPunches = [];
    const devices = await require("../models").BiometricDevice.findAll({ where: { companyId } });
    const deviceId = devices[0] ? devices[0].id : 1;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const enrollmentId = emp.employeeCode || `EM00${emp.id}`;

      // Simulate a few punch scenarios:
      // Employee 1: Normal Lunch Break (1:00 PM to 1:25 PM)
      if (i === 0) {
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:00:00`).toDate(),
          punchDate: targetDate,
          punchType: "OUT",
          status: "Valid"
        });
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:25:00`).toDate(),
          punchDate: targetDate,
          punchType: "IN",
          status: "Valid"
        });
      }
      // Employee 2: Late Return Break (1:05 PM to 1:45 PM -> 40 mins)
      else if (i === 1) {
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:05:00`).toDate(),
          punchDate: targetDate,
          punchType: "OUT",
          status: "Valid"
        });
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:45:00`).toDate(),
          punchDate: targetDate,
          punchType: "IN",
          status: "Valid"
        });
      }
      // Employee 3: Missed IN Punch (12:55 PM OUT only)
      else if (i === 2) {
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 12:55:00`).toDate(),
          punchDate: targetDate,
          punchType: "OUT",
          status: "Valid"
        });
      }
      // Employee 4: Missed OUT Punch (1:40 PM IN only)
      else if (i === 3) {
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:40:00`).toDate(),
          punchDate: targetDate,
          punchType: "IN",
          status: "Valid"
        });
      }
      // Other employees: Normal break
      else {
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:10:00`).toDate(),
          punchDate: targetDate,
          punchType: "OUT",
          status: "Valid"
        });
        mockPunches.push({
          companyId,
          employeeId: emp.id,
          biometricDeviceId: deviceId,
          biometricEnrollmentId: enrollmentId,
          punchTime: moment(`${targetDate} 13:35:00`).toDate(),
          punchDate: targetDate,
          punchType: "IN",
          status: "Valid"
        });
      }
    }

    // Save punches into db using findOrCreate to avoid duplication
    for (const punch of mockPunches) {
      await BiometricPunch.findOrCreate({
        where: {
          employeeId: punch.employeeId,
          punchTime: punch.punchTime
        },
        defaults: punch
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully downloaded and synchronized ${mockPunches.length} raw punch logs for ${targetDate}.`
    });
  } catch (err) {
    console.error("[downloadLunchLogs]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Post Lunch Logs
exports.postLunchLogs = async (req, res) => {
  const { date, companyId } = req.body;
  if (!date || !companyId) {
    return res.status(400).json({ success: false, message: "Date and Company ID are required" });
  }

  const transaction = await sequelize.transaction();
  try {
    const targetDate = moment(date).format("YYYY-MM-DD");

    // 1. Get all raw biometric punches for target date
    const punches = await BiometricPunch.findAll({
      where: {
        companyId,
        punchDate: targetDate
      },
      order: [["punchTime", "ASC"]],
      transaction
    });

    // 2. Group punches by employee
    const employeePunches = {};
    punches.forEach(p => {
      if (!employeePunches[p.employeeId]) {
        employeePunches[p.employeeId] = [];
      }
      employeePunches[p.employeeId].push(p);
    });

    // 3. Process each employee's lunch logs
    const results = [];
    const activeEmployees = await Employee.findAll({
      where: { companyId, status: "Active" },
      transaction
    });

    for (const emp of activeEmployees) {
      const empPunches = employeePunches[emp.id] || [];

      // Filter punches occurring in typical lunch window (11:30 AM to 3:00 PM)
      const lunchPunches = empPunches.filter(p => {
        const hour = moment(p.punchTime).hour();
        const minute = moment(p.punchTime).minute();
        const timeVal = hour * 60 + minute;
        // 11:30 is 690 mins, 15:00 is 900 mins
        return timeVal >= 690 && timeVal <= 900;
      });

      let lunchOut = null;
      let lunchIn = null;

      if (lunchPunches.length === 1) {
        // Only one punch recorded during lunch window
        const singlePunch = lunchPunches[0];
        if (singlePunch.punchType === "OUT") {
          lunchOut = moment(singlePunch.punchTime).format("hh:mm A");
        } else {
          lunchIn = moment(singlePunch.punchTime).format("hh:mm A");
        }
      } else if (lunchPunches.length >= 2) {
        // Multiple punches - first in window is out, last is in
        lunchOut = moment(lunchPunches[0].punchTime).format("hh:mm A");
        lunchIn = moment(lunchPunches[lunchPunches.length - 1].punchTime).format("hh:mm A");
      }

      const status = calculateLunchStatus(lunchOut, lunchIn);

      // Fetch the employee's active shift for this date from the attendances table
      const attendanceRecord = await require("../models").Attendance.findOne({
        where: {
          employeeId: emp.id,
          attendanceDate: targetDate
        },
        transaction
      });

      let dailyShiftId = attendanceRecord ? attendanceRecord.shiftId : null;

      // Fallback to hr_department_attendance if not in attendances
      if (!dailyShiftId) {
        const deptAttendanceRecord = await require("../models").DepartmentAttendance.findOne({
          where: {
            employeeId: emp.id,
            attendanceDate: targetDate
          },
          transaction
        });
        if (deptAttendanceRecord) {
          dailyShiftId = deptAttendanceRecord.shiftId;
        }
      }

      const resolvedShiftId = dailyShiftId
        ? dailyShiftId
        : (emp.shiftTypeId && emp.shiftTypeId !== 0 ? emp.shiftTypeId : null);

      // Create or update record in lunch_attendances
      const [record, created] = await LunchAttendance.findOrCreate({
        where: {
          employeeId: emp.id,
          date: targetDate
        },
        defaults: {
          companyId,
          departmentId: emp.departmentId,
          date: targetDate,
          lunchOutTime: lunchOut,
          lunchInTime: lunchIn,
          shiftId: resolvedShiftId,
          status
        },
        transaction
      });

      if (!created) {
        await record.update({
          lunchOutTime: lunchOut,
          lunchInTime: lunchIn,
          shiftId: resolvedShiftId,
          status
        }, { transaction });
      }

      results.push({
        employeeId: emp.id,
        name: emp.firstName,
        lunchOut,
        lunchIn,
        status
      });
    }

    await transaction.commit();
    return res.status(200).json({
      success: true,
      message: `Lunch logs successfully posted for ${results.length} active employees.`,
      data: results
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[postLunchLogs]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: Query parameters extractor
const getLunchFilterQuery = (req) => {
  const { companyId, from, to, departments, shiftId } = req.query;
  const where = { companyId };

  if (from && to) {
    where.date = { [Op.between]: [from, to] };
  } else if (from) {
    where.date = { [Op.gte]: from };
  } else if (to) {
    where.date = { [Op.lte]: to };
  }

  if (departments) {
    // departments can be a comma separated list of IDs
    const deptIds = departments.split(",").map(id => parseInt(id)).filter(id => !isNaN(id));
    if (deptIds.length > 0) {
      where.departmentId = { [Op.in]: deptIds };
    }
  }

  if (shiftId) {
    where.shiftId = parseInt(shiftId);
  }

  return where;
};

// 3. Get Lunch Records (Report)
exports.getLunchRecords = async (req, res) => {
  try {
    const where = getLunchFilterQuery(req);

    const records = await LunchAttendance.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "lastName"],
          include: [
            { model: Department, as: "department", attributes: ["departmentname"] }
          ]
        },
        { model: ShiftType, as: "shift", attributes: ["name"] }
      ],
      order: [["date", "DESC"], ["id", "ASC"]]
    });

    return res.status(200).json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error("[getLunchRecords]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Employee-wise Lunch Report
exports.getEmployeeLunchReport = async (req, res) => {
  const { empId } = req.params;
  const { from, to } = req.query;

  try {
    const where = { employeeId: empId };
    if (from && to) {
      where.date = { [Op.between]: [from, to] };
    }

    const records = await LunchAttendance.findAll({
      where,
      include: [
        { model: Employee, as: "employee", attributes: ["id", "employeeCode", "firstName", "lastName"] },
        { model: ShiftType, as: "shift", attributes: ["name"] }
      ],
      order: [["date", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error("[getEmployeeLunchReport]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. No Punch Report
exports.getNoPunchReport = async (req, res) => {
  try {
    const where = getLunchFilterQuery(req);
    where.status = "No Punch";

    const records = await LunchAttendance.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "lastName"],
          include: [
            { model: Department, as: "department", attributes: ["departmentname"] }
          ]
        },
        { model: ShiftType, as: "shift", attributes: ["name"] }
      ],
      order: [["date", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error("[getNoPunchReport]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Late IN Report
exports.getLateInReport = async (req, res) => {
  try {
    const where = getLunchFilterQuery(req);
    where.status = "Late IN";

    const records = await LunchAttendance.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "employeeCode", "firstName", "lastName"],
          include: [
            { model: Department, as: "department", attributes: ["departmentname"] }
          ]
        },
        { model: ShiftType, as: "shift", attributes: ["name"] }
      ],
      order: [["date", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error("[getLateInReport]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
