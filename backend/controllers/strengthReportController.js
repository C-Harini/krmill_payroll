// ============================================================
// controllers/strengthReportController.js
// ============================================================
// Strength Report Controller
// Derives department-wise shift strength from daily attendance.
//
// Columns per shift: 100% | Trg | Con. Trg | HRS OT | CON. OT | Total
// Overall columns  : Con Total | Diff (Total − Day STD)
//
// 100%      = COUNT of present non-trainee employees (isTrainee = false)
// Trg       = COUNT of present trainee employees (headcount, isTrainee = true)
// Con. Trg  = SUM of workload of present trainee employees (isTrainee = true)
// HRS OT    = SUM of overtimeHours for all present employees
// CON. OT   = OT ÷ 8.5 (convert hours → manpower equivalent)
// Total     = 100% + Con. Trg + CON. OT
// Diff      = Overall Total − Department.strengthRequired
// ============================================================

const { Op, Sequelize } = require("sequelize");
const db = require("../models");
const ExcelJS = require("exceljs");
const moment = require("moment");

/**
 * GET /api/strength-report
 * Query params: companyId, date (YYYY-MM-DD)
 */
exports.getStrengthReport = async (req, res) => {
  try {
    const { companyId, date } = req.query;

    if (!companyId || !date) {
      return res.status(400).json({ error: "companyId and date are required" });
    }

    const { Attendance, Employee, Department, Company, Category, EightEightEntry, ShiftType, OTHours } = db;
    const targetDate = moment(date).format("YYYY-MM-DD");

    // Fetch FULL OT (otTypeId = 2) records for the date and company
    const otRecords = await OTHours.findAll({
      where: {
        companyId,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
        [Op.or]: [
          { otTypeId: 2 },
          { otType: { [Op.like]: "%FULL%" } }
        ],
        status: "Active",
      },
      attributes: ["employeeId", "otHours"],
      raw: true,
    });
    const fullOtMap = {};
    otRecords.forEach((r) => {
      fullOtMap[r.employeeId] = parseFloat(r.otHours || 0) || 8.0;
    });

    // ── 0. Fetch company details ──────────────────────────────
    const company = await Company.findByPk(companyId, {
      attributes: ["id", "name"],
      raw: true,
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // ── 1. Fetch all departments with Category ────────────────
    const allDepartments = await Department.findAll({
      where: { companyId },
      attributes: ["id", "departmentname", "strengthRequired", "slno"],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "categoryName", "categoryCode"],
        },
      ],
      order: [["slno", "ASC"]],
    });

    const deptMap = {};
    allDepartments.forEach((dept) => {
      deptMap[dept.id] = {
        departmentId: dept.id,
        departmentName: dept.departmentname,
        strengthRequired: dept.strengthRequired || 0,
        slno: dept.slno,
        categoryName: dept.category?.categoryName || "OTHERS",
        categoryCode: dept.category?.categoryCode || "OTHERS",
        shifts: {
          A: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
          B: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
          C: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
        },
      };
    });

    // ── 2. Fetch present attendances for date ──────────────────
    const attendances = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: date,
        status: {
          [Op.in]: ["Present", "Present with Permission", "Half Day"],
        },
      },
      attributes: ["id", "employeeId", "shiftName", "status", "overtimeHours"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "departmentId", "isTrainee", "employeeType", "workingType", "weeklyOff", "workload"],
          where: {
            status: "Active",
          },
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname", "strengthRequired", "slno"],
            }
          ]
        },
      ],
      raw: true,
      nest: true,
    });

    // ── 2b. Fetch 8-8 entries for date ─────────────────────────
    const eightEightEntries = await EightEightEntry.findAll({
      where: {
        companyId,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
        status: "Active",
      },
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "isTrainee", "employeeType", "workingType", "workload"],
          where: {
            status: "Active",
          },
          required: false,
        },
        {
          model: ShiftType,
          as: "shift",
          attributes: ["id", "name"],
        },
      ],
      raw: true,
      nest: true,
    });

    // ── 3. Aggregate shifts by department ───────────────────────
    const targetDay = moment(date).format("dddd");

    attendances.forEach((att) => {
      const emp = att.employee;
      if (!emp) return;
      const dept = emp.department;
      if (!dept) return;

      const deptId = dept.id;
      const shift = att.shiftName;

      // Ensure department exists in map
      if (!deptMap[deptId]) return;

      // Map shifts (default other shifts like Staff to Shift A/I)
      let shiftKey = "A";
      if (shift === "B" || shift === "SUP_B" || (shift && (shift.endsWith("_B") || shift.endsWith(" B")))) shiftKey = "B";
      else if (shift === "C" || shift === "SUP_C" || (shift && (shift.endsWith("_C") || shift.endsWith(" C")))) shiftKey = "C";
      else if (shift === "A" || shift === "SUP_A" || (shift && (shift.endsWith("_A") || shift.endsWith(" A")))) shiftKey = "A";

      const strengthVal = att.status === "Half Day" ? 0.5 : 1.0;
      const ot = parseFloat(att.overtimeHours) || 0;

      const isTrainee = !!emp.isTrainee;
      const empWorkload = parseFloat(emp.workload) || 0;

      if (isTrainee) {
        deptMap[deptId].shifts[shiftKey].trainee += strengthVal;
        deptMap[deptId].shifts[shiftKey].conTrainee += empWorkload * strengthVal;
      } else {
        deptMap[deptId].shifts[shiftKey].regular += strengthVal;
      }

      deptMap[deptId].shifts[shiftKey].ot += ot;
      if (fullOtMap[att.employeeId] !== undefined) {
        deptMap[deptId].shifts[shiftKey].sOt += 1;
      }
    });

    // ── 3b. Aggregate 8-8 entries globally by entryType ─────────
    eightEightEntries.forEach((entry) => {
      const entryType = entry.entryType;
      const shift = entry.shift ? entry.shift.name : "";

      let shiftKey = "A";
      if (shift === "B" || shift === "SUP_B" || (shift && (shift.endsWith("_B") || shift.endsWith(" B")))) shiftKey = "B";
      else if (shift === "C" || shift === "SUP_C" || (shift && (shift.endsWith("_C") || shift.endsWith(" C")))) shiftKey = "C";
      else if (shift === "A" || shift === "SUP_A" || (shift && (shift.endsWith("_A") || shift.endsWith(" A")))) shiftKey = "A";

      const key = `8_8_${entryType}`;

      if (!deptMap[key]) {
        deptMap[key] = {
          departmentId: key,
          departmentName: entryType,
          strengthRequired: 0,
          slno: 9000, // Display at the very end
          categoryName: "8-8 ENTRIES",
          categoryCode: "8-8",
          shifts: {
            A: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
            B: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
            C: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
          },
        };
      }

      // 8-8 entries only fill the 100% (regular) column
      deptMap[key].shifts[shiftKey].regular += parseFloat(entry.hours) || 1.0;
    });

    // ── 4. Compute Bottom Shift Abstracts ───────────────────────
    const bottomAbstract = {
      contractDoffer: { shiftI: 0, shiftII: 0, shiftIII: 0 },
      semiContract: { shiftI: 0, shiftII: 0, shiftIII: 0 },
      rawHands: { shiftI: 0, shiftII: 0, shiftIII: 0 },
      multiSkill: { shiftI: 0, shiftII: 0, shiftIII: 0 },
    };

    attendances.forEach((att) => {
      const emp = att.employee;
      if (!emp || !emp.isTrainee) return;
      const dept = emp.department;
      if (!dept) return;

      const shift = att.shiftName;
      let shiftKey = "shiftI";
      if (shift === "B" || shift === "SUP_B" || (shift && (shift.endsWith("_B") || shift.endsWith(" B")))) shiftKey = "shiftII";
      else if (shift === "C" || shift === "SUP_C" || (shift && (shift.endsWith("_C") || shift.endsWith(" C")))) shiftKey = "shiftIII";
      else if (shift === "A" || shift === "SUP_A" || (shift && (shift.endsWith("_A") || shift.endsWith(" A")))) shiftKey = "shiftI";

      const strengthVal = att.status === "Half Day" ? 0.5 : 1.0;
      const deptName = dept.departmentname.toUpperCase();

      if (deptName === 'CONT. DOFFER' || deptName.includes('CONTRACT DOFFER')) {
        bottomAbstract.contractDoffer[shiftKey] += strengthVal;
      } else if (deptName.includes('SEMI CLG CONTRACT') || deptName.includes('SEMI CONTRACT')) {
        bottomAbstract.semiContract[shiftKey] += strengthVal;
      } else if (deptName.includes('RAW HANDS') || deptName.includes('RAW OTHERS')) {
        bottomAbstract.rawHands[shiftKey] += strengthVal;
      } else if (deptName.includes('MULTI SKILL')) {
        bottomAbstract.multiSkill[shiftKey] += strengthVal;
      }
    });

    // Round bottomAbstract values
    Object.keys(bottomAbstract).forEach(k => {
      Object.keys(bottomAbstract[k]).forEach(s => {
        bottomAbstract[k][s] = round(bottomAbstract[k][s]);
      });
    });

    // ── 5. Format department three-shift data ───────────────────
    const OT_DIVISOR = 8.5;
    const formatShift = (s) => {
      const otCon = s.ot / OT_DIVISOR;
      const total = s.regular + s.conTrainee + otCon;
      return {
        regular: round(s.regular),
        trainee: round(s.trainee),
        conTrainee: round(s.conTrainee),
        sOt: round(s.sOt),
        ot: round(s.ot),
        otConversion: round(otCon),
        total: round(total),
      };
    };

    const threeShiftData = Object.values(deptMap)
      .map((dept) => {
        const shiftA = formatShift(dept.shifts.A);
        const shiftB = formatShift(dept.shifts.B);
        const shiftC = formatShift(dept.shifts.C);

        const overallTotal = round(shiftA.total + shiftB.total + shiftC.total);
        const diff = round(overallTotal - dept.strengthRequired);

        return {
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          categoryName: dept.categoryName,
          categoryCode: dept.categoryCode,
          dayStd: dept.strengthRequired,
          slno: dept.slno,
          shiftI: shiftA,
          shiftII: shiftB,
          shiftIII: shiftC,
          overallTotal,
          diff,
        };
      })
      .sort((a, b) => {
        if (a.slno !== b.slno) return a.slno - b.slno;
        return a.departmentName.localeCompare(b.departmentName);
      });

    // ── 6. Calculate Grand Totals ──────────────────────────────
    const grandTotal = {
      dayStd: 0,
      shiftI: { regular: 0, trainee: 0, conTrainee: 0, sOt: 0, ot: 0, otConversion: 0, total: 0 },
      shiftII: { regular: 0, trainee: 0, conTrainee: 0, sOt: 0, ot: 0, otConversion: 0, total: 0 },
      shiftIII: { regular: 0, trainee: 0, conTrainee: 0, sOt: 0, ot: 0, otConversion: 0, total: 0 },
      overallTotal: 0,
      diff: 0,
    };

    threeShiftData.forEach((dept) => {
      grandTotal.dayStd += dept.dayStd;
      ["shiftI", "shiftII", "shiftIII"].forEach((s) => {
        grandTotal[s].regular += dept[s].regular;
        grandTotal[s].trainee += dept[s].trainee;
        grandTotal[s].conTrainee += dept[s].conTrainee;
        grandTotal[s].sOt += dept[s].sOt;
        grandTotal[s].ot += dept[s].ot;
        grandTotal[s].otConversion += dept[s].otConversion;
        grandTotal[s].total += dept[s].total;
      });
      grandTotal.overallTotal += dept.overallTotal;
      grandTotal.diff += dept.diff;
    });

    grandTotal.dayStd = round(grandTotal.dayStd);
    grandTotal.overallTotal = round(grandTotal.overallTotal);
    grandTotal.diff = round(grandTotal.diff);

    ["shiftI", "shiftII", "shiftIII"].forEach((s) => {
      Object.keys(grandTotal[s]).forEach((k) => {
        grandTotal[s][k] = round(grandTotal[s][k]);
      });
    });

    // ── 7. Attendance Abstract ──────────────────────────────────
    const totalRegular = round(
      grandTotal.shiftI.regular +
      grandTotal.shiftII.regular +
      grandTotal.shiftIII.regular
    );
    const totalOtConversion = round(
      grandTotal.shiftI.otConversion +
      grandTotal.shiftII.otConversion +
      grandTotal.shiftIII.otConversion
    );
    const totalTrgConversion = round(
      grandTotal.shiftI.conTrainee +
      grandTotal.shiftII.conTrainee +
      grandTotal.shiftIII.conTrainee
    );
    const totalTrgWork = round(
      grandTotal.shiftI.trainee +
      grandTotal.shiftII.trainee +
      grandTotal.shiftIII.trainee
    );

    const attendanceAbstract = {
      workLoad100: totalRegular,
      otConversion: totalOtConversion,
      trgConversion: totalTrgConversion,
      total: round(totalRegular + totalOtConversion + totalTrgConversion),
      trgWork: totalTrgWork,
    };

    // ── 8. Trainee Abstract ─────────────────────────────────────
    const sumRawHands = round(
      bottomAbstract.rawHands.shiftI +
      bottomAbstract.rawHands.shiftII +
      bottomAbstract.rawHands.shiftIII
    );
    const sumMultiSkill = round(
      bottomAbstract.multiSkill.shiftI +
      bottomAbstract.multiSkill.shiftII +
      bottomAbstract.multiSkill.shiftIII
    );
    const sumContractDoffer = round(
      bottomAbstract.contractDoffer.shiftI +
      bottomAbstract.contractDoffer.shiftII +
      bottomAbstract.contractDoffer.shiftIII
    );
    const sumSemiContract = round(
      bottomAbstract.semiContract.shiftI +
      bottomAbstract.semiContract.shiftII +
      bottomAbstract.semiContract.shiftIII
    );
    const trgStrength = round(
      totalTrgWork - sumRawHands - sumMultiSkill - sumContractDoffer - sumSemiContract
    );

    const traineeAbstract = {
      workLoad100: totalRegular,
      rawHands: sumRawHands,
      multiSkill: sumMultiSkill,
      contractDoffer: sumContractDoffer,
      semiContract: sumSemiContract,
      otConversion: totalOtConversion,
      trgStrength: trgStrength,
      total: round(totalRegular + sumRawHands + sumMultiSkill + sumContractDoffer + sumSemiContract + totalOtConversion + trgStrength),
    };

    // ── 9. Fetch Lock Status for date ─────────────────────────
    const lockRecord = await db.AttendanceLock.findOne({
      where: {
        companyId: parseInt(companyId, 10),
        lockDate: targetDate,
      },
    });

    return res.json({
      success: true,
      data: {
        date,
        companyId: parseInt(companyId),
        companyName: company.name,
        isLocked: lockRecord ? !!lockRecord.isLocked : false,
        lockDetails: lockRecord || null,
        threeShiftData,
        grandTotal,
        bottomAbstract,
        attendanceAbstract,
        traineeAbstract,
      },
    });
  } catch (error) {
    console.error("Strength Report Error:", error);
    return res.status(500).json({
      error: "Failed to generate strength report",
      details: error.message,
    });
  }
};

/**
 * GET /api/strength-report/export-excel
 * Query params: companyId, date (YYYY-MM-DD)
 */
exports.exportStrengthReportExcel = async (req, res) => {
  try {
    const { companyId, date } = req.query;

    if (!companyId || !date) {
      return res.status(400).json({ error: "companyId and date are required" });
    }

    const { Attendance, Employee, Department, Company, Category, EightEightEntry, ShiftType, OTHours } = db;
    const targetDate = moment(date).format("YYYY-MM-DD");

    // Fetch FULL OT (otTypeId = 2) records for the date and company
    const otRecords = await OTHours.findAll({
      where: {
        companyId,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
        [Op.or]: [
          { otTypeId: 2 },
          { otType: { [Op.like]: "%FULL%" } }
        ],
        status: "Active",
      },
      attributes: ["employeeId", "otHours"],
      raw: true,
    });
    const fullOtMap = {};
    otRecords.forEach((r) => {
      fullOtMap[r.employeeId] = parseFloat(r.otHours || 0) || 8.0;
    });

    // ── 0. Fetch company details ──────────────────────────────
    const company = await Company.findByPk(companyId, {
      attributes: ["id", "name"],
      raw: true,
    });

    if (!company) return res.status(404).json({ error: "Company not found" });

    // ── 1. Fetch all departments with Category ────────────────
    const allDepartments = await Department.findAll({
      where: { companyId },
      attributes: ["id", "departmentname", "strengthRequired", "slno"],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "categoryName", "categoryCode"],
        },
      ],
      order: [["slno", "ASC"]],
    });

    const deptMap = {};
    allDepartments.forEach((dept) => {
      deptMap[dept.id] = {
        departmentId: dept.id,
        departmentName: dept.departmentname,
        strengthRequired: dept.strengthRequired || 0,
        slno: dept.slno,
        categoryName: dept.category?.categoryName || "OTHERS",
        categoryCode: dept.category?.categoryCode || "OTHERS",
        shifts: {
          A: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
          B: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
          C: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
        },
      };
    });

    // ── 2. Fetch present attendances for date ──────────────────
    const attendances = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: date,
        status: {
          [Op.in]: ["Present", "Present with Permission", "Half Day"],
        },
      },
      attributes: ["id", "employeeId", "shiftName", "status", "overtimeHours"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "departmentId", "isTrainee", "employeeType", "workingType", "weeklyOff", "workload"],
          where: {
            status: "Active",
          },
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "departmentname", "strengthRequired", "slno"],
            }
          ]
        },
      ],
      raw: true,
      nest: true,
    });

    // ── 2b. Fetch 8-8 entries for date ─────────────────────────
    const eightEightEntries = await EightEightEntry.findAll({
      where: {
        companyId,
        date: {
          [Op.gte]: moment(targetDate).startOf("day").toDate(),
          [Op.lte]: moment(targetDate).endOf("day").toDate(),
        },
        status: "Active",
      },
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "isTrainee", "employeeType", "workingType", "workload"],
          where: {
            status: "Active",
          },
          required: false,
        },
        {
          model: ShiftType,
          as: "shift",
          attributes: ["id", "name"],
        },
      ],
      raw: true,
      nest: true,
    });

    // ── 3. Aggregate shifts by department ───────────────────────
    const targetDay = moment(date).format("dddd");

    attendances.forEach((att) => {
      const emp = att.employee;
      if (!emp) return;
      const dept = emp.department;
      if (!dept) return;

      const deptId = dept.id;
      const shift = att.shiftName;

      if (!deptMap[deptId]) return;

      let shiftKey = "A";
      if (shift === "B" || shift === "SUP_B" || (shift && (shift.endsWith("_B") || shift.endsWith(" B")))) shiftKey = "B";
      else if (shift === "C" || shift === "SUP_C" || (shift && (shift.endsWith("_C") || shift.endsWith(" C")))) shiftKey = "C";
      else if (shift === "A" || shift === "SUP_A" || (shift && (shift.endsWith("_A") || shift.endsWith(" A")))) shiftKey = "A";

      const strengthVal = att.status === "Half Day" ? 0.5 : 1.0;
      const ot = parseFloat(att.overtimeHours) || 0;

      const isTrainee = !!emp.isTrainee;
      const empWorkload = parseFloat(emp.workload) || 0;

      if (isTrainee) {
        deptMap[deptId].shifts[shiftKey].trainee += strengthVal;
        deptMap[deptId].shifts[shiftKey].conTrainee += empWorkload * strengthVal;
      } else {
        deptMap[deptId].shifts[shiftKey].regular += strengthVal;
      }

      deptMap[deptId].shifts[shiftKey].ot += ot;
      if (fullOtMap[att.employeeId] !== undefined) {
        deptMap[deptId].shifts[shiftKey].sOt += 1;
      }
    });

    // ── 3b. Aggregate 8-8 entries globally by entryType ─────────
    eightEightEntries.forEach((entry) => {
      const entryType = entry.entryType;
      const shift = entry.shift ? entry.shift.name : "";

      let shiftKey = "A";
      if (shift === "B" || shift === "SUP_B" || (shift && (shift.endsWith("_B") || shift.endsWith(" B")))) shiftKey = "B";
      else if (shift === "C" || shift === "SUP_C" || (shift && (shift.endsWith("_C") || shift.endsWith(" C")))) shiftKey = "C";
      else if (shift === "A" || shift === "SUP_A" || (shift && (shift.endsWith("_A") || shift.endsWith(" A")))) shiftKey = "A";

      const key = `8_8_${entryType}`;

      if (!deptMap[key]) {
        deptMap[key] = {
          departmentId: key,
          departmentName: entryType,
          strengthRequired: 0,
          slno: 9000, // Display at the very end
          categoryName: "8-8 ENTRIES",
          categoryCode: "8-8",
          shifts: {
            A: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
            B: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
            C: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
          },
        };
      }

      // 8-8 entries only fill the 100% (regular) column
      deptMap[key].shifts[shiftKey].regular += parseFloat(entry.hours) || 1.0;
    });

    // ── 4. Compute Bottom Shift Abstracts ───────────────────────
    const bottomAbstract = {
      contractDoffer: { shiftI: 0, shiftII: 0, shiftIII: 0 },
      semiContract: { shiftI: 0, shiftII: 0, shiftIII: 0 },
      rawHands: { shiftI: 0, shiftII: 0, shiftIII: 0 },
      multiSkill: { shiftI: 0, shiftII: 0, shiftIII: 0 },
    };

    attendances.forEach((att) => {
      const emp = att.employee;
      if (!emp || !emp.isTrainee) return;
      const dept = emp.department;
      if (!dept) return;

      const shift = att.shiftName;
      let shiftKey = "shiftI";
      if (shift === "B" || shift === "SUP_B" || (shift && (shift.endsWith("_B") || shift.endsWith(" B")))) shiftKey = "shiftII";
      else if (shift === "C" || shift === "SUP_C" || (shift && (shift.endsWith("_C") || shift.endsWith(" C")))) shiftKey = "shiftIII";
      else if (shift === "A" || shift === "SUP_A" || (shift && (shift.endsWith("_A") || shift.endsWith(" A")))) shiftKey = "shiftI";

      const strengthVal = att.status === "Half Day" ? 0.5 : 1.0;
      const deptName = dept.departmentname.toUpperCase();

      if (deptName === 'CONT. DOFFER' || deptName.includes('CONTRACT DOFFER')) {
        bottomAbstract.contractDoffer[shiftKey] += strengthVal;
      } else if (deptName.includes('SEMI CLG CONTRACT') || deptName.includes('SEMI CONTRACT')) {
        bottomAbstract.semiContract[shiftKey] += strengthVal;
      } else if (deptName.includes('RAW HANDS') || deptName.includes('RAW OTHERS')) {
        bottomAbstract.rawHands[shiftKey] += strengthVal;
      } else if (deptName.includes('MULTI SKILL')) {
        bottomAbstract.multiSkill[shiftKey] += strengthVal;
      }
    });

    // Round values in bottomAbstract
    Object.keys(bottomAbstract).forEach(k => {
      Object.keys(bottomAbstract[k]).forEach(s => {
        bottomAbstract[k][s] = round(bottomAbstract[k][s]);
      });
    });

    // ── 5. Format department three-shift data ───────────────────
    const OT_DIVISOR = 8.5;
    const formatShift = (s) => {
      const otCon = s.ot / OT_DIVISOR;
      const total = s.regular + s.conTrainee + otCon;
      return {
        regular: round(s.regular),
        trainee: round(s.trainee),
        conTrainee: round(s.conTrainee),
        sOt: round(s.sOt),
        ot: round(s.ot),
        otConversion: round(otCon),
        total: round(total),
      };
    };

    const threeShiftData = Object.values(deptMap)
      .map((dept) => {
        const shiftA = formatShift(dept.shifts.A);
        const shiftB = formatShift(dept.shifts.B);
        const shiftC = formatShift(dept.shifts.C);

        const overallTotal = round(shiftA.total + shiftB.total + shiftC.total);
        const diff = round(overallTotal - dept.strengthRequired);

        return {
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          categoryName: dept.categoryName,
          categoryCode: dept.categoryCode,
          dayStd: dept.strengthRequired,
          slno: dept.slno,
          shiftI: shiftA,
          shiftII: shiftB,
          shiftIII: shiftC,
          overallTotal,
          diff,
        };
      })
      .sort((a, b) => {
        if (a.slno !== b.slno) return a.slno - b.slno;
        return a.departmentName.localeCompare(b.departmentName);
      });

    // ── 6. Calculate Grand Totals ──────────────────────────────
    const grandTotal = {
      dayStd: 0,
      shiftI: { regular: 0, trainee: 0, conTrainee: 0, sOt: 0, ot: 0, otConversion: 0, total: 0 },
      shiftII: { regular: 0, trainee: 0, conTrainee: 0, sOt: 0, ot: 0, otConversion: 0, total: 0 },
      shiftIII: { regular: 0, trainee: 0, conTrainee: 0, sOt: 0, ot: 0, otConversion: 0, total: 0 },
      overallTotal: 0,
      diff: 0,
    };

    threeShiftData.forEach((dept) => {
      grandTotal.dayStd += dept.dayStd;
      ["shiftI", "shiftII", "shiftIII"].forEach((s) => {
        grandTotal[s].regular += dept[s].regular;
        grandTotal[s].trainee += dept[s].trainee;
        grandTotal[s].conTrainee += dept[s].conTrainee;
        grandTotal[s].sOt += dept[s].sOt;
        grandTotal[s].ot += dept[s].ot;
        grandTotal[s].otConversion += dept[s].otConversion;
        grandTotal[s].total += dept[s].total;
      });
      grandTotal.overallTotal += dept.overallTotal;
      grandTotal.diff += dept.diff;
    });

    grandTotal.dayStd = round(grandTotal.dayStd);
    grandTotal.overallTotal = round(grandTotal.overallTotal);
    grandTotal.diff = round(grandTotal.diff);

    ["shiftI", "shiftII", "shiftIII"].forEach((s) => {
      Object.keys(grandTotal[s]).forEach((k) => {
        grandTotal[s][k] = round(grandTotal[s][k]);
      });
    });

    // ── 7. Attendance Abstract ──────────────────────────────────
    const totalRegular = round(
      grandTotal.shiftI.regular +
      grandTotal.shiftII.regular +
      grandTotal.shiftIII.regular
    );
    const totalOtConversion = round(
      grandTotal.shiftI.otConversion +
      grandTotal.shiftII.otConversion +
      grandTotal.shiftIII.otConversion
    );
    const totalTrgConversion = round(
      grandTotal.shiftI.conTrainee +
      grandTotal.shiftII.conTrainee +
      grandTotal.shiftIII.conTrainee
    );
    const totalTrgWork = round(
      grandTotal.shiftI.trainee +
      grandTotal.shiftII.trainee +
      grandTotal.shiftIII.trainee
    );

    const attendanceAbstract = {
      workLoad100: totalRegular,
      otConversion: totalOtConversion,
      trgConversion: totalTrgConversion,
      total: round(totalRegular + totalOtConversion + totalTrgConversion),
      trgWork: totalTrgWork,
    };

    // ── 8. Trainee Abstract ─────────────────────────────────────
    const sumRawHands = round(
      bottomAbstract.rawHands.shiftI +
      bottomAbstract.rawHands.shiftII +
      bottomAbstract.rawHands.shiftIII
    );
    const sumMultiSkill = round(
      bottomAbstract.multiSkill.shiftI +
      bottomAbstract.multiSkill.shiftII +
      bottomAbstract.multiSkill.shiftIII
    );
    const sumContractDoffer = round(
      bottomAbstract.contractDoffer.shiftI +
      bottomAbstract.contractDoffer.shiftII +
      bottomAbstract.contractDoffer.shiftIII
    );
    const sumSemiContract = round(
      bottomAbstract.semiContract.shiftI +
      bottomAbstract.semiContract.shiftII +
      bottomAbstract.semiContract.shiftIII
    );
    const trgStrength = round(
      totalTrgWork - sumRawHands - sumMultiSkill - sumContractDoffer - sumSemiContract
    );

    const traineeAbstract = {
      workLoad100: totalRegular,
      rawHands: sumRawHands,
      multiSkill: sumMultiSkill,
      contractDoffer: sumContractDoffer,
      semiContract: sumSemiContract,
      otConversion: totalOtConversion,
      trgStrength: trgStrength,
      total: round(totalRegular + sumRawHands + sumMultiSkill + sumContractDoffer + sumSemiContract + totalOtConversion + trgStrength),
    };

    // ── 9. Build Excel Workbook ─────────────────────────────────
    const omitSOt = req.query.omitSOt === "true" || req.query.omitSOt === true;
    const shiftColsCount = omitSOt ? 6 : 7;
    const totalCols = 2 + shiftColsCount * 3 + 2; // 22 when omitSOt, 25 otherwise
    const lastColLetter = omitSOt ? "V" : "Y";

    const wb = new ExcelJS.Workbook();
    wb.creator = "Payroll System";
    wb.created = new Date();

    const ws = wb.addWorksheet("Strength Report", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const dateLabel = formatDateLabel(date);
    const TITLE_BG = "FF1E40AF"; // deep blue
    const SHIFT_A_BG = "FFDBEAFE"; // light blue
    const SHIFT_B_BG = "FFFDE68A"; // light amber
    const SHIFT_C_BG = "FFD1FAE5"; // light green
    const OVERALL_BG = "FFE9D5FF"; // light purple
    const CAT_BG = "FFF1F5F9"; // light slate
    const HEADER_FG = "FFFFFFFF";
    const GRAND_BG = "FFE2E8F0";

    // Row 1: Company Title
    ws.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = ws.getCell("A1");
    titleCell.value = company.name;
    titleCell.font = { bold: true, size: 14, color: { argb: HEADER_FG } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Row 2: Report Subtitle & Date
    ws.mergeCells(`A2:${lastColLetter}2`);
    const subtitleCell = ws.getCell("A2");
    subtitleCell.value = `Strength Report ${omitSOt ? "(Without S OT) " : ""}- From ${dateLabel} to ${dateLabel}`;
    subtitleCell.font = { bold: true, size: 11, color: { argb: HEADER_FG } };
    subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 22;

    // Row 3: Shift / Group Headers
    const grpRow = ws.getRow(3);
    grpRow.height = 20;

    const setGrpCell = (col, val, argb, span) => {
      if (span > 1) ws.mergeCells(3, col, 3, col + span - 1);
      const c = ws.getCell(3, col);
      c.value = val;
      c.font = { bold: true, size: 10, color: { argb: "FF1E293B" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = borderThin();
    };

    setGrpCell(1, "Dept. Name", "FFF1F5F9", 1);
    setGrpCell(2, "Day STD", "FFF1F5F9", 1);
    setGrpCell(3, "SHIFT I", SHIFT_A_BG, shiftColsCount);
    setGrpCell(3 + shiftColsCount, "SHIFT II", SHIFT_B_BG, shiftColsCount);
    setGrpCell(3 + shiftColsCount * 2, "SHIFT III", SHIFT_C_BG, shiftColsCount);
    setGrpCell(3 + shiftColsCount * 3, "OVER ALL", OVERALL_BG, 2);

    // Row 4: Sub Headers
    const subLabels = omitSOt
      ? ["100%", "Trg", "Con. Trg", "HRS OT", "CON. OT", "Total"]
      : ["100%", "Trg", "Con. Trg", "S OT", "HRS OT", "CON. OT", "Total"];
    const subBgs = [SHIFT_A_BG, SHIFT_B_BG, SHIFT_C_BG];
    const subRow = ws.getRow(4);
    subRow.height = 18;

    const setSubCell = (col, val, argb) => {
      const c = ws.getCell(4, col);
      c.value = val;
      c.font = { bold: true, size: 9, color: { argb: "FF334155" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = borderThin();
    };

    setSubCell(1, "Dept. Name", "FFF1F5F9");
    setSubCell(2, "Day STD", "FFF1F5F9");
    subBgs.forEach((bg, si) =>
      subLabels.forEach((lbl, li) => setSubCell(3 + si * shiftColsCount + li, lbl, bg))
    );
    setSubCell(totalCols - 1, "Con Total", OVERALL_BG);
    setSubCell(totalCols, "Diff", OVERALL_BG);

    // Merge Dept. Name & Day STD vertically across rows 3 and 4
    ws.mergeCells(3, 1, 4, 1);
    ws.mergeCells(3, 2, 4, 2);

    // Set Column Widths
    ws.getColumn(1).width = 24;
    ws.getColumn(2).width = 9;
    for (let c = 3; c <= 2 + shiftColsCount * 3; c++) ws.getColumn(c).width = 8;
    ws.getColumn(totalCols - 1).width = 10;
    ws.getColumn(totalCols).width = 10;

    // Group departments by category
    const groupedDepts = {};
    threeShiftData.forEach(dept => {
      const cat = dept.categoryName || "OTHERS";
      if (!groupedDepts[cat]) groupedDepts[cat] = [];
      groupedDepts[cat].push(dept);
    });

    const getShiftExportVals = (s) =>
      omitSOt
        ? [s.regular, s.trainee, s.conTrainee, s.ot, s.otConversion, s.total]
        : [s.regular, s.trainee, s.conTrainee, s.sOt, s.ot, s.otConversion, s.total];

    let rowIdx = 5;
    Object.entries(groupedDepts).forEach(([categoryName, depts]) => {
      // Category Row
      const catRow = ws.getRow(rowIdx++);
      catRow.height = 18;
      ws.mergeCells(rowIdx - 1, 1, rowIdx - 1, totalCols);

      const catCell = catRow.getCell(1);
      catCell.value = categoryName.toUpperCase();
      catCell.font = { bold: true, size: 10, color: { argb: "FF334155" } };
      catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CAT_BG } };
      catCell.alignment = { horizontal: "left", vertical: "middle" };

      for (let c = 1; c <= totalCols; c++) {
        catRow.getCell(c).border = borderThin();
      }

      // Department Rows
      depts.forEach(dept => {
        // Render all departments regardless of employee count/headcount data presence
        const row = ws.getRow(rowIdx++);
        row.height = 16;
        const vals = [
          dept.departmentName,
          dept.dayStd,
          ...getShiftExportVals(dept.shiftI),
          ...getShiftExportVals(dept.shiftII),
          ...getShiftExportVals(dept.shiftIII),
          dept.overallTotal,
          dept.diff
        ];

        vals.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = (v === 0 && i > 0) ? "-" : v;
          cell.font = { size: 9 };
          cell.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle" };
          cell.border = borderThin();

          if (i === totalCols - 1) {
            cell.font = { size: 9, bold: true, color: { argb: dept.diff < 0 ? "FFDC2626" : dept.diff > 0 ? "FF15803D" : "FF64748B" } };
          } else if (i === totalCols - 2) {
            cell.font = { size: 9, bold: true };
          }
        });
      });
    });

    // Grand Total Row
    const gtRow = ws.getRow(rowIdx++);
    gtRow.height = 18;
    const gtVals = [
      "Grand Total",
      grandTotal.dayStd,
      ...getShiftExportVals(grandTotal.shiftI),
      ...getShiftExportVals(grandTotal.shiftII),
      ...getShiftExportVals(grandTotal.shiftIII),
      grandTotal.overallTotal,
      grandTotal.diff
    ];

    gtVals.forEach((v, i) => {
      const cell = gtRow.getCell(i + 1);
      cell.value = (v === 0 && i > 0) ? "-" : v;
      cell.font = { bold: true, size: 10, color: i === totalCols - 1 ? { argb: grandTotal.diff < 0 ? "FFDC2626" : grandTotal.diff > 0 ? "FF15803D" : "FF64748B" } : { argb: "FF1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAND_BG } };
      cell.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle" };
      cell.border = borderThin();
    });

    // ── 10. Draw Bottom Abstracts side by side ───────────────────
    rowIdx += 2; // leave blank rows

    // Title Row for abstracts
    const absTitleRow = ws.getRow(rowIdx++);
    absTitleRow.height = 18;

    // Abstract 1 title: Cols A to E
    ws.mergeCells(rowIdx - 1, 1, rowIdx - 1, 5);
    const abs1Cell = absTitleRow.getCell(1);
    abs1Cell.value = "TRG / CON. SHIFT ABSTRACT";
    abs1Cell.font = { bold: true, size: 9, color: { argb: HEADER_FG } };
    abs1Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
    abs1Cell.alignment = { horizontal: "center", vertical: "middle" };

    // Abstract 2 title: Cols H to I
    ws.mergeCells(rowIdx - 1, 8, rowIdx - 1, 9);
    const abs2Cell = absTitleRow.getCell(8);
    abs2Cell.value = "ATTENDANCE ABSTRACT";
    abs2Cell.font = { bold: true, size: 9, color: { argb: HEADER_FG } };
    abs2Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
    abs2Cell.alignment = { horizontal: "center", vertical: "middle" };

    // Abstract 3 title: Cols L to M
    ws.mergeCells(rowIdx - 1, 12, rowIdx - 1, 13);
    const abs3Cell = absTitleRow.getCell(12);
    abs3Cell.value = "TRAINEE ABSTRACT";
    abs3Cell.font = { bold: true, size: 9, color: { argb: HEADER_FG } };
    abs3Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
    abs3Cell.alignment = { horizontal: "center", vertical: "middle" };

    for (let c = 1; c <= 5; c++) absTitleRow.getCell(c).border = borderThin();
    for (let c = 8; c <= 9; c++) absTitleRow.getCell(c).border = borderThin();
    for (let c = 12; c <= 13; c++) absTitleRow.getCell(c).border = borderThin();

    // Shift Abstract Column Headers
    const absSubRow = ws.getRow(rowIdx++);
    absSubRow.height = 16;
    const absSubHeaders = ["Category", "SHIFT I", "SHIFT II", "SHIFT III", "TOTAL"];
    absSubHeaders.forEach((h, i) => {
      const cell = absSubRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 8 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderThin();
    });

    // Content rows
    const absRowKeys = [
      { label: "Contract Doffer", key: "contractDoffer" },
      { label: "Semi Contract", key: "semiContract" },
      { label: "Rawhands", key: "rawHands" },
      { label: "Multi Skill", key: "multiSkill" },
    ];

    const attRows = [
      { label: "100% Work Load", value: attendanceAbstract.workLoad100 },
      { label: "OT Conversion", value: attendanceAbstract.otConversion },
      { label: "Trg. Conversion", value: attendanceAbstract.trgConversion },
      { label: "Total", value: attendanceAbstract.total, isTotal: true },
      { label: "Trg. Work", value: attendanceAbstract.trgWork, isHighlight: true },
    ];

    const trgRows = [
      { label: "100% Work Load", value: traineeAbstract.workLoad100 },
      { label: "Raw hands", value: traineeAbstract.rawHands },
      { label: "Multi Skill", value: traineeAbstract.multiSkill },
      { label: "OT Conversion", value: traineeAbstract.otConversion },
      { label: "Trg. Strength", value: traineeAbstract.trgStrength },
      { label: "Total", value: traineeAbstract.total, isTotal: true },
    ];

    const maxAbsRows = Math.max(absRowKeys.length, attRows.length, trgRows.length);

    for (let rOffset = 0; rOffset < maxAbsRows; rOffset++) {
      const curRow = ws.getRow(rowIdx + rOffset);
      curRow.height = 16;

      // 1. Shift Abstract
      if (rOffset < absRowKeys.length) {
        const item = absRowKeys[rOffset];
        const s1 = bottomAbstract[item.key].shiftI;
        const s2 = bottomAbstract[item.key].shiftII;
        const s3 = bottomAbstract[item.key].shiftIII;
        const total = round(s1 + s2 + s3);

        const vals = [item.label, s1, s2, s3, total];
        vals.forEach((v, idx) => {
          const cell = curRow.getCell(idx + 1);
          cell.value = (v === 0 && idx > 0) ? "-" : v;
          cell.font = { size: 9, bold: idx === 0 || idx === 4 };
          cell.alignment = { horizontal: idx === 0 ? "left" : "center", vertical: "middle" };
          cell.border = borderThin();
        });
      }

      // 2. Attendance Abstract
      if (rOffset < attRows.length) {
        const item = attRows[rOffset];
        const labelCell = curRow.getCell(8);
        const valCell = curRow.getCell(9);

        labelCell.value = item.label;
        valCell.value = item.value === 0 ? "-" : item.value;

        labelCell.alignment = { horizontal: "left", vertical: "middle" };
        valCell.alignment = { horizontal: "center", vertical: "middle" };

        labelCell.border = borderThin();
        valCell.border = borderThin();

        if (item.isTotal) {
          labelCell.font = { bold: true, size: 9 };
          valCell.font = { bold: true, size: 10 };
          labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        } else if (item.isHighlight) {
          labelCell.font = { bold: true, size: 9, color: { argb: "FF0284C7" } };
          valCell.font = { bold: true, size: 10, color: { argb: "FF0284C7" } };
          labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
          valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
        } else {
          labelCell.font = { size: 9 };
          valCell.font = { size: 9, bold: true };
        }
      }

      // 3. Trainee Abstract
      if (rOffset < trgRows.length) {
        const item = trgRows[rOffset];
        const labelCell = curRow.getCell(12);
        const valCell = curRow.getCell(13);

        labelCell.value = item.label;
        valCell.value = item.value === 0 ? "-" : item.value;

        labelCell.alignment = { horizontal: "left", vertical: "middle" };
        valCell.alignment = { horizontal: "center", vertical: "middle" };

        labelCell.border = borderThin();
        valCell.border = borderThin();

        if (item.isTotal) {
          labelCell.font = { bold: true, size: 9 };
          valCell.font = { bold: true, size: 10 };
          labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        } else {
          labelCell.font = { size: 9 };
          valCell.font = { size: 9, bold: true };
        }
      }
    }

    rowIdx += maxAbsRows;

    // ── 11. Signature Blocks ─────────────────────────────────────
    rowIdx += 3; // leave empty space for signatures

    const sigRow = ws.getRow(rowIdx);
    sigRow.height = 18;
    const sigLabels = [
      { label: "PREPARED", col: 1 },
      { label: "AM (Trg)", col: 3 },
      { label: "M (QAT)", col: 5 },
      { label: "AM(Prod)", col: 7 },
      { label: "Sr.M (M)", col: 9 },
      { label: "M (Ele)", col: 11 },
      { label: "AM (Pers)", col: 13 },
      { label: "PM", col: 15 },
      { label: "GM (T)", col: 17 },
      { label: "MD", col: 19 },
    ];

    sigLabels.forEach((sig) => {
      const cell = sigRow.getCell(sig.col);
      cell.value = sig.label;
      cell.font = { bold: true, size: 8, color: { argb: "FF475569" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };

      // Top border represents the line above the signature label
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } }
      };
    });

    // ── Stream response ─────────────────────────────────────
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const downloadFileName = omitSOt ? `Strength_Report_Without_SOT_${date}.xlsx` : `Strength_Report_${date}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename=${downloadFileName}`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Strength Report Excel Error:", err);
    res.status(500).json({ error: "Failed to export Excel", details: err.message });
  }
};

// ── Helpers ───────────────────────────────────────────────────
function round(val, decimals = 1) {
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function borderThin() {
  const s = { style: "thin", color: { argb: "FFCBD5E1" } };
  return { top: s, left: s, bottom: s, right: s };
}
