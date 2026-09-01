const db = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");
const INCENTIVE_CONFIG = require("../config/AttendenceIncentiveConfig");

const HostelAttendanceIncentive = db.HostelAttendanceIncentive;
const AttendanceIncentive = db.AttendanceIncentive;
const AttendanceIncentiveCondition = db.AttendanceIncentiveCondition;
const EmployeeShift = db.EmployeeShift;
const EightEightEntry = db.EightEightEntry;
const Company = db.Company;
const Department = db.Department;
const Category = db.Category;
const Employee = db.Employee;
const Designation = db.Designation;
const ShiftType = db.ShiftType;
const Attendance = db.Attendance;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const resolveHostelShiftKey = (shiftMap) => {
  const shiftI =
    (shiftMap["I"] || 0) +
    (shiftMap["A"] || 0) +
    (shiftMap["Staff"] || 0) +
    (shiftMap["SUP_A"] || 0);

  const shiftII =
    (shiftMap["II"] || 0) +
    (shiftMap["B"] || 0) +
    (shiftMap["SUP_B"] || 0);

  const shiftIII =
    (shiftMap["III"] || 0) +
    (shiftMap["C"] || 0) +
    (shiftMap["SUP_C"] || 0);

  const activeShiftsCount =
    (shiftI > 0 ? 1 : 0) + (shiftII > 0 ? 1 : 0) + (shiftIII > 0 ? 1 : 0);

  if (activeShiftsCount > 1) {
    return "SHIFT_I_II_AND_I_II_III";
  }
  return "SHIFT_I";
};

const calculateHostelIncentive = ({
  employee,
  shiftMap = {},
  categoryName = "",
  adjustedDays = null,
  slabDays = 0,
  explicitRawDays = null,
  eightEightDays = 0,
  dbConditions = [],
}) => {
  const rawFromShifts = Object.values(shiftMap).reduce((s, d) => s + d, 0);
  const rawTotal =
    explicitRawDays !== null && explicitRawDays !== undefined
      ? explicitRawDays
      : rawFromShifts;

  const effectiveSlab = Number(slabDays) || 0;
  let totalDays;
  let payableDays;

  if (adjustedDays !== null && adjustedDays !== undefined) {
    totalDays = Number(adjustedDays);
    payableDays = totalDays - effectiveSlab;
  } else {
    totalDays = rawTotal + effectiveSlab;
    payableDays = rawTotal;
  }

  // 8-8 days pay is fixed at 100 per day
  const effective88Days = Number(eightEightDays) || 0;
  const eightEightPay = Math.round(effective88Days * 100 * 100) / 100;

  // Remaining days for condition-based regular calculation
  const remainingDays = Math.max(0, payableDays - effective88Days);

  // Match condition from DB or fallback to default Hostel config
  const empCatId = employee.categoryId || null;
  const empDeptId = employee.departmentId || null;

  let cond = dbConditions.find(
    (c) => c.categoryId === empCatId && c.departmentId === empDeptId && c.status === "Active"
  );
  if (!cond) {
    cond = dbConditions.find((c) => c.categoryId === empCatId && !c.departmentId && c.status === "Active");
  }
  if (!cond) {
    cond = dbConditions.find(
      (c) => !c.categoryId && !c.departmentId && c.gradeKey === "HOSTEL" && c.status === "Active"
    );
  }

  const defaultHostelConfig = INCENTIVE_CONFIG.GRADES.HOSTEL || {
    gradeName: "Hostel",
    minDays: 22,
    highTierDays: 24,
    shifts: {
      SHIFT_I: { label: "I Shift only", low: { ratePerDay: 15 }, high: { ratePerDay: 20 } },
      SHIFT_I_II_AND_I_II_III: { label: "Combo Shifts", low: { ratePerDay: 20 }, high: { ratePerDay: 30 } },
    },
  };

  const shiftRuleKey = resolveHostelShiftKey(shiftMap);
  let minDays = defaultHostelConfig.minDays !== undefined ? defaultHostelConfig.minDays : (INCENTIVE_CONFIG.MIN_DAYS || 22);
  let highTierDays = defaultHostelConfig.highTierDays !== undefined ? defaultHostelConfig.highTierDays : (INCENTIVE_CONFIG.HIGH_TIER_DAYS || 24);
  let lowTierRate = 15;
  let highTierRate = 20;
  let shiftLabel = "I Shift only";

  if (cond) {
    minDays = cond.minDays !== null && cond.minDays !== undefined ? cond.minDays : minDays;
    highTierDays = cond.highTierDays !== null && cond.highTierDays !== undefined ? cond.highTierDays : highTierDays;
    lowTierRate = parseFloat(cond.lowTierRate) || 0;
    highTierRate = parseFloat(cond.highTierRate) || 0;
    shiftLabel = cond.shiftLabel || cond.shiftRuleKey || shiftLabel;
  } else {
    const shiftCfg = defaultHostelConfig.shifts[shiftRuleKey] || defaultHostelConfig.shifts["SHIFT_I"];
    if (shiftCfg) {
      shiftLabel = shiftCfg.label;
      lowTierRate = shiftCfg.low?.ratePerDay || 15;
      highTierRate = shiftCfg.high?.ratePerDay || 20;
    }
  }

  let tier = null;
  let ratePerDay = 0;
  let regularIncentive = 0;
  let note = "";

  const isEligibleForRegular = totalDays >= minDays;

  if (isEligibleForRegular) {
    tier = totalDays >= highTierDays ? "high" : "low";
    ratePerDay = tier === "high" ? highTierRate : lowTierRate;
    regularIncentive = Math.round(remainingDays * ratePerDay * 100) / 100;
  }

  const totalIncentive = Math.round((eightEightPay + regularIncentive) * 100) / 100;

  if (effective88Days > 0 && regularIncentive > 0) {
    note = `8-8 Days: ${effective88Days}d × ₹100 = ₹${eightEightPay} + Regular: ${remainingDays}d × ₹${ratePerDay} = ₹${regularIncentive}`;
  } else if (effective88Days > 0 && regularIncentive === 0) {
    note = `8-8 Days: ${effective88Days}d × ₹100 = ₹${eightEightPay} (Remaining ${remainingDays}d below min ${minDays}d)`;
  } else if (effective88Days === 0 && regularIncentive > 0) {
    note = `Regular: ${remainingDays}d × ₹${ratePerDay} = ₹${regularIncentive}`;
  } else {
    note = `Below minimum ${minDays} days – no incentive`;
  }

  return {
    rawDays: rawTotal,
    payableDays,
    slabDays: Math.max(0, totalDays - payableDays),
    totalDays,
    eightEightDays: effective88Days,
    eightEightPay,
    remainingDays,
    regularIncentive,
    totalIncentive,
    tier,
    ratePerDay,
    shiftKey: shiftRuleKey,
    shiftLabel,
    gradeKey: "HOSTEL",
    minDays,
    highTierDays,
    note,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET HOSTEL INCENTIVE CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────
exports.getHostelIncentiveCalculations = async (req, res) => {
  try {
    const { companyId, month, year, departmentId, employeeIds } = req.query;

    if (!companyId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "companyId, month, and year are required",
      });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const startDate = moment(`${yearNum}-${String(monthNum).padStart(2, "0")}-01`).format("YYYY-MM-DD");
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = moment(`${yearNum}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`).format("YYYY-MM-DD");

    // 1. Fetch all active employees in this company who belong to Hostel category or isHostel is true
    const empWhere = {
      companyId,
      status: "Active",
    };

    if (departmentId) {
      empWhere.departmentId = departmentId;
    }

    if (employeeIds) {
      const ids = Array.isArray(employeeIds)
        ? employeeIds.map(Number)
        : String(employeeIds).split(",").map(Number).filter(Boolean);
      if (ids.length) empWhere.id = { [Op.in]: ids };
    }

    const employees = await Employee.findAll({
      where: empWhere,
      include: [
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
      ],
      order: [["employeeCode", "ASC"]],
    });

    // Filter employees: Category name containing HOSTEL or isHostel flag
    const hostelEmployees = employees.filter((emp) => {
      const catName = (emp.category?.categoryName || "").toUpperCase();
      return catName.includes("HOSTEL") || emp.isHostel === true;
    });

    if (!hostelEmployees.length) {
      return res.status(200).json({
        success: true,
        records: [],
        summary: {
          totalEmployees: 0,
          total88Days: 0,
          total88Pay: 0,
          totalRegularPay: 0,
          totalIncentive: 0,
        },
      });
    }

    const employeeIdList = hostelEmployees.map((e) => e.id);

    const [savedIncentives, dailyRecords, eightEightEntries, dbConditions, allShiftTypes, weekOffRecords] =
      await Promise.all([
        AttendanceIncentive.findAll({
          where: {
            employeeId: { [Op.in]: employeeIdList },
            companyId,
            month: monthNum,
            year: yearNum,
          },
        }),
        AttendanceIncentive.findAll({
          where: {
            employeeId: { [Op.in]: employeeIdList },
            companyId,
            entryDate: { [Op.between]: [startDate, endDate] },
            month: null,
            year: null,
          },
          attributes: ["employeeId", "days", "slabDays", "otDays", "shiftTypeId", "entryDate", "slot"],
        }),
        EightEightEntry.findAll({
          where: {
            companyId,
            employeeId: { [Op.in]: employeeIdList },
            date: {
              [Op.gte]: moment(startDate).startOf("day").toDate(),
              [Op.lte]: moment(endDate).endOf("day").toDate(),
            },
            status: "Active",
          },
        }),
        AttendanceIncentiveCondition.findAll({
          where: {
            companyId: { [Op.or]: [companyId, null] },
            status: "Active",
          },
        }),
        ShiftType.findAll({
          where: { companyId },
        }),
        Attendance.findAll({
          where: {
            employeeId: { [Op.in]: employeeIdList },
            companyId,
            attendanceDate: { [Op.between]: [startDate, endDate] },
          },
          attributes: ["employeeId", "attendanceDate", "status", "shiftId", "shiftName"],
        }),
      ]);

    const shiftTypeMap = {};
    for (const st of allShiftTypes) {
      shiftTypeMap[st.id] = st.name;
    }

    const employeesMap = {};
    for (const emp of hostelEmployees) {
      employeesMap[emp.id] = emp;
    }

    const manualMapByEmp = {};
    for (const dr of dailyRecords) {
      const empId = dr.employeeId;
      if (!manualMapByEmp[empId]) manualMapByEmp[empId] = {};
      const dateStr = moment(dr.entryDate).format("YYYY-MM-DD");
      manualMapByEmp[empId][dateStr] = dr;
    }

    const attendanceMapByEmp = {};
    for (const att of weekOffRecords) {
      const empId = att.employeeId;
      if (!attendanceMapByEmp[empId]) attendanceMapByEmp[empId] = {};
      const dateStr = moment(att.attendanceDate).format("YYYY-MM-DD");
      attendanceMapByEmp[empId][dateStr] = att;
    }

    const eightEightDaysByEmp = {};
    for (const ee of eightEightEntries) {
      const empId = ee.employeeId;
      if (!eightEightDaysByEmp[empId]) eightEightDaysByEmp[empId] = new Set();
      const dateStr = moment(ee.date).format("YYYY-MM-DD");
      eightEightDaysByEmp[empId].add(dateStr);
    }

    for (const dr of dailyRecords) {
      if (dr.slot && Number(dr.slot) > 0) {
        if (!eightEightDaysByEmp[dr.employeeId]) eightEightDaysByEmp[dr.employeeId] = new Set();
        const dateStr = moment(dr.entryDate).format("YYYY-MM-DD");
        eightEightDaysByEmp[dr.employeeId].add(dateStr);
      }
    }

    const savedByEmp = {};
    for (const sr of savedIncentives) savedByEmp[sr.employeeId] = sr;

    const records = hostelEmployees.map((emp) => {
      const categoryName = emp.category?.categoryName || "HOSTEL";
      const saved = savedByEmp[emp.id];

      const empManualMap = manualMapByEmp[emp.id] || {};
      const empAttendanceMap = attendanceMapByEmp[emp.id] || {};

      let rawDays = 0;
      let weekOffDays = 0;
      let slabDays = 0;
      let otDays = 0;
      let slotDays = 0;
      const shiftMap = {};

      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const manual = empManualMap[dateStr];
        const att = empAttendanceMap[dateStr];

        const isWeekOffDay = emp.weeklyOff && 
          emp.weeklyOff !== "-" && 
          emp.weeklyOff !== "NO WEEKLY" && 
          moment(dateStr).format("dddd").toLowerCase() === emp.weeklyOff.toLowerCase();

        if (manual) {
          const daysWorked = parseFloat(manual.days) || 0;
          rawDays += daysWorked;
          slabDays += parseFloat(manual.slabDays) || 0;
          otDays += parseFloat(manual.otDays) || 0;
          slotDays += parseFloat(manual.slot) || 0;

          if (daysWorked > 0) {
            const shiftName = shiftTypeMap[manual.shiftTypeId] || "I";
            shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
            if (isWeekOffDay) {
              weekOffDays += 1;
            }
          }
        } else if (att) {
          let daysWorked = 0;
          if (att.status === "Present" || att.status === "Present with Permission") {
            daysWorked = 1;
          } else if (att.status === "Half Day") {
            daysWorked = 0.5;
          }

          if (daysWorked > 0) {
            rawDays += daysWorked;
            const shiftName = att.shiftName || shiftTypeMap[att.shiftId] || "I";
            shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
            if (isWeekOffDay) {
              weekOffDays += 1;
            }
          }
        }
      }

      const calculatedDays = rawDays - weekOffDays + slabDays + otDays + slotDays;
      const adjustedDays = saved ? saved.adjustedDays : calculatedDays;
      const eightEightDaysCount = eightEightDaysByEmp[emp.id]
        ? eightEightDaysByEmp[emp.id].size
        : 0;

      const calc = calculateHostelIncentive({
        employee: emp,
        shiftMap,
        categoryName,
        adjustedDays,
        slabDays,
        explicitRawDays: rawDays,
        eightEightDays: eightEightDaysCount,
        dbConditions,
      });

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.firstName,
        gender: emp.gender,
        dateOfJoining: emp.dateOfJoining,
        departmentId: emp.departmentId,
        departmentName: emp.department?.departmentname || "",
        categoryId: emp.categoryId,
        categoryName,
        shiftTypeId: emp.shiftTypeId || null,
        gradeKey: "HOSTEL",
        shiftBreakdown: shiftMap,
        rawDays: calc.rawDays,
        payableDays: calc.payableDays,
        slabDays: saved ? (saved.slabDays !== null && saved.slabDays !== undefined ? saved.slabDays : slabDays) : slabDays,
        weekOffDays,
        otDays,
        slotDays,
        adjustedDays: calc.totalDays,
        eightEightDays: calc.eightEightDays,
        eightEightPay: calc.eightEightPay,
        remainingDays: calc.remainingDays,
        shiftKey: saved ? saved.shiftKey : calc.shiftKey,
        shiftLabel: saved ? saved.shiftLabel : calc.shiftLabel,
        tier: saved ? saved.tier : calc.tier,
        ratePerDay: saved ? parseFloat(saved.ratePerDay) : calc.ratePerDay,
        regularIncentive: calc.regularIncentive,
        incentive: saved ? parseFloat(saved.incentive) : calc.totalIncentive,
        note: calc.note,
        isSaved: !!saved,
      };
    });

    const summary = {
      totalEmployees: records.length,
      total88Days: records.reduce((s, r) => s + (r.eightEightDays || 0), 0),
      total88Pay: records.reduce((s, r) => s + (r.eightEightPay || 0), 0),
      totalRegularPay: records.reduce((s, r) => s + (r.regularIncentive || 0), 0),
      totalIncentive: records.reduce((s, r) => s + (r.incentive || 0), 0),
      eligibleRegular: records.filter((r) => (r.regularIncentive || 0) > 0).length,
    };

    return res.status(200).json({
      success: true,
      records,
      summary,
    });
  } catch (error) {
    console.error("Error fetching hostel incentive calculations:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECALCULATE HOSTEL INCENTIVE (Single Employee)
// ─────────────────────────────────────────────────────────────────────────────
exports.recalculateHostelIncentive = async (req, res) => {
  try {
    const { employeeId, companyId, month, year, adjustedDays, slabDays, rawDays, eightEightDays } = req.body;

    if (!employeeId || !companyId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "employeeId, companyId, month, year are required",
      });
    }

    const employee = await Employee.findByPk(employeeId, {
      include: [
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
      ],
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const shiftRecords = await EmployeeShift.findAll({
      where: {
        employeeId,
        companyId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
    });

    const shiftMap = {};
    for (const sr of shiftRecords) {
      shiftMap[sr.shiftName] =
        (sr.presentDays || 0) + (sr.presentWithPermissionDays || 0);
    }

    const dbConditions = await AttendanceIncentiveCondition.findAll({
      where: {
        companyId: { [Op.or]: [companyId, null] },
        status: "Active",
      },
    });

    const calc = calculateHostelIncentive({
      employee,
      shiftMap,
      categoryName: employee.category?.categoryName || "HOSTEL",
      adjustedDays,
      slabDays,
      explicitRawDays: rawDays,
      eightEightDays,
      dbConditions,
    });

    return res.status(200).json({
      success: true,
      calculation: {
        rawDays: calc.rawDays,
        payableDays: calc.payableDays,
        slabDays: calc.slabDays,
        adjustedDays: calc.totalDays,
        eightEightDays: calc.eightEightDays,
        eightEightPay: calc.eightEightPay,
        remainingDays: calc.remainingDays,
        regularIncentive: calc.regularIncentive,
        incentive: calc.totalIncentive,
        tier: calc.tier,
        ratePerDay: calc.ratePerDay,
        shiftKey: calc.shiftKey,
        shiftLabel: calc.shiftLabel,
        note: calc.note,
      },
    });
  } catch (error) {
    console.error("Error recalculating hostel incentive:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK SAVE HOSTEL INCENTIVES
// ─────────────────────────────────────────────────────────────────────────────
exports.bulkSaveHostelIncentives = async (req, res) => {
  try {
    const { records, month, year, companyId } = req.body;
    if (!records?.length || !month || !year || !companyId) {
      return res.status(400).json({
        success: false,
        message: "records, month, year, companyId are required",
      });
    }

    const missingIds = records
      .filter((r) => !r.shiftTypeId || !r.departmentId)
      .map((r) => r.employeeId || r.id);

    const empLookup = {};
    if (missingIds.length) {
      const emps = await Employee.findAll({
        where: { id: { [Op.in]: missingIds } },
        attributes: ["id", "shiftTypeId", "departmentId"],
      });
      for (const e of emps) empLookup[e.id] = e;
    }

    const ops = records.map((r) => {
      const empId = r.employeeId || r.id;
      const empData = empLookup[empId] || {};
      const shiftTypeId = r.shiftTypeId || empData.shiftTypeId || 1;
      const departmentId = r.departmentId || empData.departmentId || null;

      return AttendanceIncentive.upsert({
        companyId,
        employeeId: empId,
        departmentId,
        categoryId: r.categoryId || null,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        adjustedDays: r.adjustedDays,
        slabDays: r.slabDays || 0,
        incentive: r.incentive,
        ratePerDay: r.ratePerDay,
        shiftKey: r.shiftKey,
        shiftLabel: r.shiftLabel || null,
        tier: r.tier || null,
        maleOverrideApplied: false,
        savedAt: new Date(),
        shiftTypeId,
        days: r.payableDays || r.rawDays || r.adjustedDays || 0,
        entryDate: new Date(),
        slot: r.eightEightDays || 0,
      });
    });

    await Promise.all(ops);
    return res.status(200).json({
      success: true,
      message: "Hostel incentives saved successfully",
      count: records.length,
    });
  } catch (error) {
    console.error("Error bulk saving hostel incentives:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRUD for Hostel Attendance Incentive Registration (Backwards Compatibility)
// ─────────────────────────────────────────────────────────────────────────────

// ✅ GET ALL
exports.getAll = async (req, res) => {
  try {
    const records = await HostelAttendanceIncentive.findAll({
      include: [
        { model: Company, as: "company", attributes: ["id", "name"] },
        { model: Department, as: "department", attributes: ["id", "departmentname"] },
        { model: Employee, as: "employee", attributes: ["id", "firstName", "lastName", "employeeCode"] },
      ],
      order: [["id", "DESC"]],
    });

    res.json({ records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ CREATE
exports.create = async (req, res) => {
  try {
    const { companyId, departmentId, employeeId, fromDate, toDate } = req.body;

    if (!companyId || !departmentId || !employeeId || !fromDate || !toDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = await HostelAttendanceIncentive.create({
      companyId,
      departmentId,
      employeeId,
      fromDate,
      toDate,
    });

    res.status(201).json({ message: "Created successfully", record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ UPDATE
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, departmentId, employeeId, fromDate, toDate } = req.body;

    const record = await HostelAttendanceIncentive.findByPk(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    await record.update({ companyId, departmentId, employeeId, fromDate, toDate });

    res.json({ message: "Updated successfully", record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ DELETE
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await HostelAttendanceIncentive.findByPk(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    await record.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.calculateHostelIncentive = calculateHostelIncentive;
