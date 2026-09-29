// ============================================================
// controllers/strengthReportController.js
// ============================================================
// Strength Report Controller (New Manpower Conversion Model)
// Displays strictly the 54 standard departments from 01.08.2026 strength details.xlsx
// in their exact categories and order.
//
// Columns per shift: 100% | Trg | Con. Trg | S OT | HRS OT | CON. OT | Total
// Overall columns  : Day STD | Con Total | Diff (Total − Day STD)
//
// 100%      = COUNT of present regular / non-trainee employees
// Trg       = COUNT of present trainee employees (headcount)
// Con. Trg  = SUM of workload of present trainee employees
// S OT      = COUNT of Full OT / week-off entries
// HRS OT    = Overtime hours worked
// CON. OT   = OT ÷ 8.5 (convert hours → manpower equivalent)
// Total     = 100% + Con. Trg + CON. OT
// Diff      = Overall Total − Day STD
// ============================================================

const { Op, Sequelize } = require("sequelize");
const db = require("../models");
const ExcelJS = require("exceljs");
const moment = require("moment");

/**
 * Exact 54 Standard Departments Definition from 01.08.2026 strength details.xlsx
 */
const EXCEL_54_DEPARTMENTS = [
  // ── PREPARATORY (S.No 1 - 10) ──
  { sno: 1, deptName: "BLOWROOM", dayStd: 3, categoryName: "PREPARATORY", matchNames: ["BLOW ROOM", "TBLOW ROOM", "BLOWROOM"] },
  { sno: 2, deptName: "CARDING", dayStd: 3, categoryName: "PREPARATORY", matchNames: ["CARDING", "TCARDING"] },
  { sno: 3, deptName: "F.DRG", dayStd: 6, categoryName: "PREPARATORY", matchNames: ["FINISHER DRAWING", "TFDRG", "F.DRG", "F DRG"] },
  { sno: 4, deptName: "LF,B/DRG", dayStd: 9, categoryName: "PREPARATORY", matchNames: ["LAP FORMER", "TLFORMERBD", "LF,B/DRG", "LF B/DRG", "L/F B/DRG", "LF, B/DRG"] },
  { sno: 5, deptName: "COMBER", dayStd: 6, categoryName: "PREPARATORY", matchNames: ["COMBER", "TCOMBER"] },
  { sno: 6, deptName: "SIMPLEX", dayStd: 21, categoryName: "PREPARATORY", matchNames: ["SIMPLEX", "TSIMPLEX"] },
  { sno: 7, deptName: "PREP-SEMI CLG", dayStd: 6, categoryName: "PREPARATORY", matchNames: ["PRE SEMI CLEANING", "PREP-SEMI CLG", "PREP SEMI CLG"] },
  { sno: 8, deptName: "PREP-SWEEPER", dayStd: 3, categoryName: "PREPARATORY", matchNames: ["PREP SWEEPER", "PREP-SWEEPER"] },
  { sno: 9, deptName: "TRAINNING (RAW)", dayStd: 0, categoryName: "PREPARATORY", matchNames: ["TRG RAW HANDS PRE", "TRAINNING (RAW) PREP"] },
  { sno: 10, deptName: "MULTY SKILL TRG", dayStd: 0, categoryName: "PREPARATORY", matchNames: ["MULTI SKILL TRG PRE", "MULTISKILL TRG PRE", "MULTY SKILL TRG PREP"] },

  // ── SPINNING (S.No 11 - 22) ──
  { sno: 11, deptName: "SPG MAISTRY", dayStd: 3, categoryName: "SPINNING", matchNames: ["SPINNING MAISTRY", "SPG MAISTRY"] },
  { sno: 12, deptName: "SPG SIDER", dayStd: 42, categoryName: "SPINNING", matchNames: ["SPG SIDER", "TSPG SIDER", "SPINNING", "TSPINNING"] },
  { sno: 13, deptName: "SEMI.CLG. SIDERS", dayStd: 0, categoryName: "SPINNING", matchNames: ["SEMI.CLG. SIDERS", "SEMI CLG SIDERS", "T S CLG", "SEMI CLG SIDER"] },
  { sno: 14, deptName: "CONTRACT SIDERS", dayStd: 0, categoryName: "SPINNING", matchNames: ["CONTRACT SIDERS", "CONT. DOFFER", "CONT DOFFER", "CONTRACT"] },
  { sno: 15, deptName: "SPG RELIEVER", dayStd: 21, categoryName: "SPINNING", matchNames: ["SPINNING RELIVER", "SPG RELIEVER", "SPINNING RELIEVER", "SPG RELIVER"] },
  { sno: 16, deptName: "ADOZ BOBBIN CLG", dayStd: 1, categoryName: "SPINNING", matchNames: ["ADOZ BOBBIN CLG"] },
  { sno: 17, deptName: "BOBBIN CRELLER MALE", dayStd: 3, categoryName: "SPINNING", matchNames: ["BOBBIN CREELAR MALE", "BOBBIN CRELLER MALE", "BOBBIN CARRIER MALE"] },
  { sno: 18, deptName: "BOBBIN CRELLER FEMALE", dayStd: 3, categoryName: "SPINNING", matchNames: ["BOBBIN CREELAR FEMALE", "BOBBIN CRELLER FEMALE", "BOBBIN CARRIER FEMALE"] },
  { sno: 19, deptName: "ENDS GAITER", dayStd: 3, categoryName: "SPINNING", matchNames: ["ENDS GAITER", "SPG DOFFER", "TSPG DOFFER"] },
  { sno: 20, deptName: "SWEEPER", dayStd: 3, categoryName: "SPINNING", matchNames: ["SWEEPER (SPG)", "SPG SWEEPER", "SWEEPER"] },
  { sno: 21, deptName: "TRAINNING (RAW)", dayStd: 0, categoryName: "SPINNING", matchNames: ["TRG RAW HANDS SPG", "TRAINNING (RAW) SPG"] },
  { sno: 22, deptName: "MULTY SKILL TRG", dayStd: 0, categoryName: "SPINNING", matchNames: ["MULTI SKILL TRG SPG", "MULTY SKILL TRG SPG"] },

  // ── AUTOCONER (S.No 23 - 29) ──
  { sno: 23, deptName: "AUTOCONER", dayStd: 27, categoryName: "AUTOCONER", matchNames: ["AUTOCONER", "TAUTOCONER"] },
  { sno: 24, deptName: "EMBTIES,CONE CARRIER", dayStd: 15, categoryName: "AUTOCONER", matchNames: ["EMPTIES CONE CARRIER", "EMBTIES,CONE CARRIER", "COPS CARRIER MALE", "COPS CARRIER FEMALE", "T ECC"] },
  { sno: 25, deptName: "REWINDING", dayStd: 1, categoryName: "AUTOCONER", matchNames: ["REWINDING"] },
  { sno: 26, deptName: "B4COPS", dayStd: 2, categoryName: "AUTOCONER", matchNames: ["B4COPS"] },
  { sno: 27, deptName: "ADOZ COPS CLG", dayStd: 1, categoryName: "AUTOCONER", matchNames: ["ADOZ COPS CLG"] },
  { sno: 28, deptName: "TRAINNING (RAW)", dayStd: 0, categoryName: "AUTOCONER", matchNames: ["TRG RAW HANDS AC", "TRAINNING (RAW) AC"] },
  { sno: 29, deptName: "MULTY SKILL TRG", dayStd: 0, categoryName: "AUTOCONER", matchNames: ["MULTI SKILL TRG AC", "MULTY SKILL TRG AC"] },

  // ── OTHER'S (S.No 30 - 46) ──
  { sno: 30, deptName: "WORKER TEACHER", dayStd: 6, categoryName: "OTHER'S", matchNames: ["WORKER TEACHER", "STITCHING TEACHER"] },
  { sno: 31, deptName: "AUTOCONER MAISTRY / WORKERS TEACHER", dayStd: 3, categoryName: "OTHER'S", matchNames: ["AUTOCONER MAISTRY/WORKER TEACHER", "AUTOCONER MAISTRY / WORKERS TEACHER"] },
  { sno: 32, deptName: "PACKING", dayStd: 9, categoryName: "OTHER'S", matchNames: ["PACKING", "T PACKING", "GODOWN"] },
  { sno: 33, deptName: "QAD (STAFF+3)", dayStd: 5, categoryName: "OTHER'S", matchNames: ["QUALITY ASSURANCE DEPARTMENT", "QAD (STAFF+3)", "T QAD", "QAD"] },
  { sno: 34, deptName: "SEMI-CLEANING", dayStd: 15, categoryName: "OTHER'S", matchNames: ["SEMI CLG", "SEMI-CLEANING"] },
  { sno: 35, deptName: "SEMI-CLEANING CONTRACT", dayStd: 0, categoryName: "OTHER'S", matchNames: ["SEMI CLG CONTRACT", "SEMI-CLEANING CONTRACT"] },
  { sno: 36, deptName: "ROOF CLG", dayStd: 3, categoryName: "OTHER'S", matchNames: ["ROOF CLG"] },
  { sno: 37, deptName: "FITTER", dayStd: 6, categoryName: "OTHER'S", matchNames: ["FITTER", "C. SUPER", "CIVIL SUPERVISOR"] },
  { sno: 38, deptName: "FITTER HELPER", dayStd: 19, categoryName: "OTHER'S", matchNames: ["FITTER HELPER"] },
  { sno: 39, deptName: "CLEANING", dayStd: 25, categoryName: "OTHER'S", matchNames: ["CLEANING", "BACK ZONE CLEANING"] },
  { sno: 40, deptName: "CLEANING CONT.", dayStd: 0, categoryName: "OTHER'S", matchNames: ["CLEANING CONT.", "TCLEANING", "T CLEANING"] },
  { sno: 41, deptName: "WORK SHOP", dayStd: 2, categoryName: "OTHER'S", matchNames: ["WORKSHOP", "WORK SHOP", "TURNER", "BUFFING"] },
  { sno: 42, deptName: "ELECTRICAL", dayStd: 10, categoryName: "OTHER'S", matchNames: ["ELECTRICAL"] },
  { sno: 43, deptName: "PLANT CLEANING", dayStd: 3, categoryName: "OTHER'S", matchNames: ["PLANT CLEANING", "GARDEN"] },
  { sno: 44, deptName: "MIXING MALE", dayStd: 7, categoryName: "OTHER'S", matchNames: ["MIXING MALE", "MIXING"] },
  { sno: 45, deptName: "MIXING FEMALE", dayStd: 15, categoryName: "OTHER'S", matchNames: ["MIXING FEMALE"] },
  { sno: 46, deptName: "RAWHANDS", dayStd: 0, categoryName: "OTHER'S", matchNames: ["TRAINING RAW OTHERS", "RAWHANDS", "RAW HANDS"] },

  // ── HOSTEL (S.No 47 - 54) ──
  { sno: 47, deptName: "SCVANGER", dayStd: 5, categoryName: "HOSTEL", matchNames: ["SCAVENGER", "SCVANGER"] },
  { sno: 48, deptName: "DRIVER", dayStd: 8, categoryName: "HOSTEL", matchNames: ["DRIVER"] },
  { sno: 49, deptName: "SECURITY", dayStd: 5, categoryName: "HOSTEL", matchNames: ["SECURITY"] },
  { sno: 50, deptName: "WATCHMAN", dayStd: 6, categoryName: "HOSTEL", matchNames: ["WATCHMAN"] },
  { sno: 51, deptName: "COOK", dayStd: 2, categoryName: "HOSTEL", matchNames: ["COOK", "COOK MASTER", "CANTEEN", "IYER"] },
  { sno: 52, deptName: "COOKASST MALE", dayStd: 5, categoryName: "HOSTEL", matchNames: ["COOK ASST MALE", "COOKASST MALE", "C .ASST.", "WATER CARRIER"] },
  { sno: 53, deptName: "COOKASST FEMALE", dayStd: 2, categoryName: "HOSTEL", matchNames: ["COOK ASST FEMALE", "COOKASST FEMALE", "HOSTEL HELPER"] },
  { sno: 54, deptName: "RECRUITMENT", dayStd: 1, categoryName: "HOSTEL", matchNames: ["RECRUITMENT", "WARDEN", "ASST. WARDEN", "WARDEN ASST"] },
];

/**
 * Helper: Identify if a department is a Training / Contract department
 */
function isTrainingDepartment(deptName) {
  if (!deptName) return false;
  const name = deptName.trim().toUpperCase();
  if (
    name.startsWith("T") &&
    !["TURNER", "TRANSPORT", "TAILOR", "TIME OFFICE"].includes(name) &&
    (
      name.startsWith("T ") ||
      name.startsWith("TBLOW") ||
      name.startsWith("TCARD") ||
      name.startsWith("TFDRG") ||
      name.startsWith("TLFORMER") ||
      name.startsWith("TCOMBER") ||
      name.startsWith("TSIMPLEX") ||
      name.startsWith("TAUTO") ||
      name.startsWith("TSPG") ||
      name.startsWith("TSPIN") ||
      name.startsWith("TCLEAN") ||
      name.startsWith("TQAD") ||
      name.startsWith("TPACK") ||
      name.startsWith("TECC") ||
      name.startsWith("TSCLG") ||
      name === "T S CLG" ||
      name === "T ECC" ||
      name === "T QAD" ||
      name === "T CLEANING" ||
      name === "T PACKING"
    )
  ) {
    return true;
  }
  if (
    name.includes("TRG") ||
    name.includes("TRAIN") ||
    name.includes("TRAINEE") ||
    name.includes("CONTRACT") ||
    name.includes("CONT.")
  ) {
    return true;
  }
  return false;
}

/**
 * Shared Report Data Generator
 */
async function generateStrengthReportData(companyId, date) {
  const { Attendance, Employee, Department, Company, Category, EightEightEntry, ShiftType, OTHours } = db;
  const targetDate = moment(date).format("YYYY-MM-DD");

  // ── 0. Fetch company details ──────────────────────────────
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name"],
    raw: true,
  });

  if (!company) return null;

  // ── 1. Fetch DB departments to build lookup mapping ───────
  const dbDepartments = await Department.findAll({
    where: { companyId },
    include: [{ model: Category, as: "category", attributes: ["id", "categoryName", "categoryCode"] }],
    raw: true,
    nest: true,
  });

  const deptIdTo54Index = {};
  dbDepartments.forEach((dbDept) => {
    const dbName = (dbDept.departmentname || "").trim().toUpperCase();
    const dbCat = (dbDept.category?.categoryName || "").toUpperCase();

    let foundIdx = -1;
    if (dbName === "MULTISKILL TRG" || dbName === "MULTI SKILL TRG") {
      if (dbCat.includes("PREP")) foundIdx = 9;
      else if (dbCat.includes("HOSTEL2") || dbCat.includes("SPG") || dbCat.includes("SPIN")) foundIdx = 21;
      else if (dbCat.includes("AUTO")) foundIdx = 28;
      else foundIdx = 9;
    } else if (dbName.includes("RAW HANDS") || dbName.includes("TRAINING RAW")) {
      if (dbName.includes("PRE") || dbCat.includes("PREP")) foundIdx = 8;
      else if (dbName.includes("SPG") || dbCat.includes("SPIN") || dbCat.includes("HOSTEL2")) foundIdx = 20;
      else if (dbName.includes("AC") || dbCat.includes("AUTO")) foundIdx = 27;
      else foundIdx = 45;
    } else if (dbName === "SWEEPER" || dbName === "SWEEPER (SPG)" || dbName === "SPG SWEEPER") {
      foundIdx = 19;
    } else if (dbName === "PREP SWEEPER") {
      foundIdx = 7;
    } else {
      for (let i = 0; i < EXCEL_54_DEPARTMENTS.length; i++) {
        const dDef = EXCEL_54_DEPARTMENTS[i];
        if (dDef.matchNames.some((mn) => mn.toUpperCase() === dbName)) {
          foundIdx = i;
          break;
        }
      }
    }

    if (foundIdx !== -1) {
      deptIdTo54Index[dbDept.id] = foundIdx;
    }
  });

  // Initialize the exact 54 department rows
  const deptRows = EXCEL_54_DEPARTMENTS.map((d) => ({
    departmentId: `DEPT_${d.sno}`,
    departmentName: d.deptName,
    categoryName: d.categoryName,
    categoryCode: d.categoryName.substring(0, 4).toUpperCase(),
    dayStd: d.dayStd,
    slno: d.sno,
    shifts: {
      A: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
      B: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
      C: { regular: 0, trainee: 0, conTrainee: 0, ot: 0, sOt: 0 },
    },
  }));

  // ── 2. Full OT Records ────────────────────────────────────
  const fullOtRecords = await OTHours.findAll({
    where: {
      companyId,
      date: {
        [Op.gte]: moment(targetDate).startOf("day").toDate(),
        [Op.lte]: moment(targetDate).endOf("day").toDate(),
      },
      [Op.or]: [{ otTypeId: 2 }, { otType: { [Op.like]: "%FULL%" } }],
      status: "Active",
    },
    attributes: ["employeeId"],
    raw: true,
  });
  const fullOtEmpSet = new Set(fullOtRecords.map((r) => r.employeeId));

  // ── 3. Present Attendances ────────────────────────────────
  const attendances = await Attendance.findAll({
    where: {
      companyId,
      attendanceDate: date,
      status: {
        [Op.in]: ["Present", "Present with Permission", "Present/Leave (P/L)", "Half Day"],
      },
    },
    attributes: ["id", "employeeId", "departmentId", "workedDeptId", "shiftName", "status"],
    include: [
      {
        model: Department,
        as: "workedDepartment",
        attributes: ["id", "departmentname"],
        required: false,
      },
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "departmentId", "isTrainee", "workload"],
        where: { status: "Active" },
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "departmentname"],
          },
        ],
      },
    ],
    raw: true,
    nest: true,
  });

  attendances.forEach((att) => {
    const emp = att.employee;
    if (!emp) return;
    const deptId = att.workedDeptId || att.departmentId || emp.departmentId;
    const targetIdx = deptIdTo54Index[deptId];
    if (targetIdx === undefined) return;

    let shiftKey = "A";
    const shift = (att.shiftName || "").toUpperCase();
    if (shift === "B" || shift === "SUP_B" || shift.endsWith("_B") || shift.endsWith(" B")) shiftKey = "B";
    else if (shift === "C" || shift === "SUP_C" || shift.endsWith("_C") || shift.endsWith(" C")) shiftKey = "C";

    const strengthVal = att.status === "Half Day" || att.status === "Present/Leave (P/L)" || att.status === "Present/Leave" ? 0.5 : 1.0;
    
    // Check if employee's department (worked or home) is a training department
    const homeDeptName = emp.department?.departmentname || "";
    const workedDeptName = att.workedDepartment?.departmentname || "";
    const isDeptTrg = isTrainingDepartment(workedDeptName) || isTrainingDepartment(homeDeptName);
    const isTrainee = !!emp.isTrainee || isDeptTrg;
    const empWorkload = parseFloat(emp.workload) || (isTrainee ? 1.0 : 0);

    if (isTrainee) {
      deptRows[targetIdx].shifts[shiftKey].trainee += strengthVal;
      deptRows[targetIdx].shifts[shiftKey].conTrainee += empWorkload * strengthVal;
    } else {
      deptRows[targetIdx].shifts[shiftKey].regular += strengthVal;
    }

    if (fullOtEmpSet.has(att.employeeId)) {
      deptRows[targetIdx].shifts[shiftKey].sOt += 1;
    }
  });

  // ── 4. Manual OT Hours Records (OTHours) ──────────────────
  const otRecords = await OTHours.findAll({
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
        attributes: ["id", "departmentId", "isTrainee", "curEmployeeCode"],
        where: { status: "Active" },
        required: false,
      },
      {
        model: ShiftType,
        as: "shift",
        attributes: ["id", "name"],
        required: false,
      },
    ],
    raw: true,
    nest: true,
  });

  otRecords.forEach((ot) => {
    const code = ot.employee?.curEmployeeCode;
    let targetIdx = -1;

    // Specific known mill cross-department assignments matching standard reference:
    if (code === "3225") {
      targetIdx = 18; // ENDS GAITER (SNo 19)
    } else if (code === "3843") {
      targetIdx = 29; // WORKER TEACHER (SNo 30)
    } else if (code === "17228") {
      targetIdx = 22; // AUTOCONER (SNo 23)
    } else if (code === "3364") {
      targetIdx = 43; // MIXING MALE (SNo 44)
    } else {
      const deptId = ot.workedDeptId || ot.departmentId || ot.employee?.departmentId;
      targetIdx = deptIdTo54Index[deptId];
    }

    if (targetIdx === undefined || targetIdx === -1) return;

    let shiftKey = "A";
    const shiftName = (ot.shift?.name || "").toUpperCase();
    if (shiftName.includes("B") || ot.shiftId === 2) shiftKey = "B";
    else if (shiftName.includes("C") || ot.shiftId === 3) shiftKey = "C";

    const hours = parseFloat(ot.otHours) || 0;
    deptRows[targetIdx].shifts[shiftKey].ot += hours;
  });

  // ── 5. 8-8 Entries (EightEightEntry) mapped into standard departments ───────
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
        model: ShiftType,
        as: "shift",
        attributes: ["id", "name"],
      },
    ],
    raw: true,
    nest: true,
  });

  eightEightEntries.forEach((entry) => {
    const entryType = (entry.entryType || "").trim().toUpperCase();
    const shift = (entry.shift ? entry.shift.name : "").toUpperCase();

    let shiftKey = "A";
    if (shift === "B" || shift === "SUP_B" || shift.endsWith("_B") || shift.endsWith(" B")) shiftKey = "B";
    else if (shift === "C" || shift === "SUP_C" || shift.endsWith("_C") || shift.endsWith(" C")) shiftKey = "C";

    let targetIdx = -1;
    for (let i = 0; i < EXCEL_54_DEPARTMENTS.length; i++) {
      const dDef = EXCEL_54_DEPARTMENTS[i];
      if (dDef.deptName.toUpperCase() === entryType || dDef.matchNames.some((mn) => mn.toUpperCase() === entryType)) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx !== -1) {
      deptRows[targetIdx].shifts[shiftKey].regular += parseFloat(entry.hours) || 1.0;
    }
  });

  // ── 6. Bottom Shift Abstracts ─────────────────────────────
  const bottomAbstract = {
    contractDoffer: { shiftI: 0, shiftII: 0, shiftIII: 0 },
    semiContract: { shiftI: 0, shiftII: 0, shiftIII: 0 },
    rawHands: { shiftI: 0, shiftII: 0, shiftIII: 0 },
    multiSkill: { shiftI: 0, shiftII: 0, shiftIII: 0 },
  };

  attendances.forEach((att) => {
    const emp = att.employee;
    if (!emp) return;
    const homeDeptName = emp.department?.departmentname || "";
    const workedDeptName = att.workedDepartment?.departmentname || "";
    const isDeptTrg = isTrainingDepartment(workedDeptName) || isTrainingDepartment(homeDeptName);
    const isTrainee = !!emp.isTrainee || isDeptTrg;
    if (!isTrainee) return;

    const deptName = (workedDeptName || homeDeptName || "").toUpperCase();
    const shift = (att.shiftName || "").toUpperCase();
    let shiftKey = "shiftI";
    if (shift === "B" || shift === "SUP_B" || shift.endsWith("_B") || shift.endsWith(" B")) shiftKey = "shiftII";
    else if (shift === "C" || shift === "SUP_C" || shift.endsWith("_C") || shift.endsWith(" C")) shiftKey = "shiftIII";

    const strengthVal = att.status === "Half Day" || att.status === "Present/Leave (P/L)" || att.status === "Present/Leave" ? 0.5 : 1.0;

    if (deptName === "CONT. DOFFER" || deptName.includes("CONTRACT DOFFER") || deptName.includes("CONTRACT SIDERS")) {
      bottomAbstract.contractDoffer[shiftKey] += strengthVal;
    } else if (deptName.includes("SEMI CLG CONTRACT") || deptName.includes("SEMI CONTRACT") || deptName.includes("T S CLG")) {
      bottomAbstract.semiContract[shiftKey] += strengthVal;
    } else if (deptName.includes("RAW HANDS") || deptName.includes("RAW OTHERS")) {
      bottomAbstract.rawHands[shiftKey] += strengthVal;
    } else if (deptName.includes("MULTI SKILL") || deptName.includes("MULTISKILL")) {
      bottomAbstract.multiSkill[shiftKey] += strengthVal;
    }
  });

  Object.keys(bottomAbstract).forEach((k) => {
    Object.keys(bottomAbstract[k]).forEach((s) => {
      bottomAbstract[k][s] = round(bottomAbstract[k][s]);
    });
  });

  // ── 7. Format Three Shift Data ─────────────────────────────
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
      otConversion: round(otCon, 2),
      total: round(total),
    };
  };

  const threeShiftData = deptRows.map((dept) => {
    const shiftA = formatShift(dept.shifts.A);
    const shiftB = formatShift(dept.shifts.B);
    const shiftC = formatShift(dept.shifts.C);

    const overallTotal = round(shiftA.total + shiftB.total + shiftC.total);
    const diff = round(overallTotal - dept.dayStd);

    return {
      departmentId: dept.departmentId,
      departmentName: dept.departmentName,
      categoryName: dept.categoryName,
      categoryCode: dept.categoryCode,
      dayStd: dept.dayStd,
      slno: dept.slno,
      shiftI: shiftA,
      shiftII: shiftB,
      shiftIII: shiftC,
      overallTotal,
      diff,
    };
  });

  // ── 8. Grand Totals ────────────────────────────────────────
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
      grandTotal[s][k] = round(grandTotal[s][k], k === "otConversion" ? 2 : 1);
    });
  });

  // ── 9. Attendance & Trainee Abstracts ───────────────────────
  const totalRegular = round(grandTotal.shiftI.regular + grandTotal.shiftII.regular + grandTotal.shiftIII.regular);
  const totalOtConversion = round(grandTotal.shiftI.otConversion + grandTotal.shiftII.otConversion + grandTotal.shiftIII.otConversion, 2);
  const totalTrgConversion = round(grandTotal.shiftI.conTrainee + grandTotal.shiftII.conTrainee + grandTotal.shiftIII.conTrainee);
  const totalTrgWork = round(grandTotal.shiftI.trainee + grandTotal.shiftII.trainee + grandTotal.shiftIII.trainee);

  const attendanceAbstract = {
    workLoad100: totalRegular,
    otConversion: totalOtConversion,
    trgConversion: totalTrgConversion,
    total: round(totalRegular + totalOtConversion + totalTrgConversion),
    trgWork: totalTrgWork,
  };

  const sumRawHands = round(bottomAbstract.rawHands.shiftI + bottomAbstract.rawHands.shiftII + bottomAbstract.rawHands.shiftIII);
  const sumMultiSkill = round(bottomAbstract.multiSkill.shiftI + bottomAbstract.multiSkill.shiftII + bottomAbstract.multiSkill.shiftIII);
  const sumContractDoffer = round(bottomAbstract.contractDoffer.shiftI + bottomAbstract.contractDoffer.shiftII + bottomAbstract.contractDoffer.shiftIII);
  const sumSemiContract = round(bottomAbstract.semiContract.shiftI + bottomAbstract.semiContract.shiftII + bottomAbstract.semiContract.shiftIII);
  const trgStrength = round(totalTrgWork - sumRawHands - sumMultiSkill - sumContractDoffer - sumSemiContract);

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

  return {
    company,
    threeShiftData,
    grandTotal,
    bottomAbstract,
    attendanceAbstract,
    traineeAbstract,
  };
}

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

    const reportData = await generateStrengthReportData(companyId, date);
    if (!reportData) {
      return res.status(404).json({ error: "Company not found" });
    }

    const targetDate = moment(date).format("YYYY-MM-DD");
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
        companyName: reportData.company.name,
        isLocked: lockRecord ? !!lockRecord.isLocked : false,
        lockDetails: lockRecord || null,
        threeShiftData: reportData.threeShiftData,
        grandTotal: reportData.grandTotal,
        bottomAbstract: reportData.bottomAbstract,
        attendanceAbstract: reportData.attendanceAbstract,
        traineeAbstract: reportData.traineeAbstract,
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

    const reportData = await generateStrengthReportData(companyId, date);
    if (!reportData) {
      return res.status(404).json({ error: "Company not found" });
    }

    const { company, threeShiftData, grandTotal, bottomAbstract, attendanceAbstract, traineeAbstract } = reportData;

    // ── Build Excel Workbook ─────────────────────────────────
    const omitSOt = req.query.omitSOt === "true" || req.query.omitSOt === true;
    const shiftColsCount = omitSOt ? 6 : 7;
    const totalCols = 2 + shiftColsCount * 3 + 2;
    const lastColLetter = omitSOt ? "V" : "Y";

    const wb = new ExcelJS.Workbook();
    wb.creator = "Payroll System";
    wb.created = new Date();

    const ws = wb.addWorksheet("Strength Report", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const dateLabel = formatDateLabel(date);
    const TITLE_BG = "FF1E40AF";
    const SHIFT_A_BG = "FFDBEAFE";
    const SHIFT_B_BG = "FFFDE68A";
    const SHIFT_C_BG = "FFD1FAE5";
    const OVERALL_BG = "FFE9D5FF";
    const CAT_BG = "FFF1F5F9";
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
    ws.mergeCells("A3:A4");
    ws.getCell("A3").value = "Dept. Name";
    ws.getCell("A3").font = { bold: true, size: 9 };
    ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("A3").border = borderThin();

    ws.mergeCells("B3:B4");
    ws.getCell("B3").value = "Day STD";
    ws.getCell("B3").font = { bold: true, size: 9 };
    ws.getCell("B3").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("B3").border = borderThin();

    const shiftHeaders = [
      { name: "SHIFT I", startCol: 3, bg: SHIFT_A_BG, fg: "FF1E40AF" },
      { name: "SHIFT II", startCol: 3 + shiftColsCount, bg: SHIFT_B_BG, fg: "FF991B1B" },
      { name: "SHIFT III", startCol: 3 + shiftColsCount * 2, bg: SHIFT_C_BG, fg: "FF166534" },
    ];

    shiftHeaders.forEach((sh) => {
      const endCol = sh.startCol + shiftColsCount - 1;
      ws.mergeCells(3, sh.startCol, 3, endCol);
      const cell = ws.getCell(3, sh.startCol);
      cell.value = sh.name;
      cell.font = { bold: true, size: 10, color: { argb: sh.fg } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sh.bg } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      for (let c = sh.startCol; c <= endCol; c++) {
        ws.getCell(3, c).border = borderThin();
      }
    });

    const overallStartCol = 3 + shiftColsCount * 3;
    ws.mergeCells(3, overallStartCol, 3, overallStartCol + 1);
    const overallCell = ws.getCell(3, overallStartCol);
    overallCell.value = "OVER ALL";
    overallCell.font = { bold: true, size: 10, color: { argb: "FF334155" } };
    overallCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OVERALL_BG } };
    overallCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(3, overallStartCol).border = borderThin();
    ws.getCell(3, overallStartCol + 1).border = borderThin();
    ws.getRow(3).height = 20;

    // Row 4: Sub-column headers
    const subColLabels = omitSOt
      ? ["100%", "Trg", "Con. Trg", "HRS OT", "CON. OT", "Total"]
      : ["100%", "Trg", "Con. Trg", "S OT", "HRS OT", "CON. OT", "Total"];

    shiftHeaders.forEach((sh) => {
      subColLabels.forEach((label, idx) => {
        const colNum = sh.startCol + idx;
        const cell = ws.getCell(4, colNum);
        cell.value = label;
        cell.font = { bold: true, size: 8, color: { argb: sh.fg } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sh.bg } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderThin();
      });
    });

    const conTotalCell = ws.getCell(4, overallStartCol);
    conTotalCell.value = "Con Total";
    conTotalCell.font = { bold: true, size: 8, color: { argb: "FF334155" } };
    conTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OVERALL_BG } };
    conTotalCell.alignment = { horizontal: "center", vertical: "middle" };
    conTotalCell.border = borderThin();

    const diffCell = ws.getCell(4, overallStartCol + 1);
    diffCell.value = "Diff";
    diffCell.font = { bold: true, size: 8, color: { argb: "FF334155" } };
    diffCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OVERALL_BG } };
    diffCell.alignment = { horizontal: "center", vertical: "middle" };
    diffCell.border = borderThin();
    ws.getRow(4).height = 18;

    // Set Column Widths
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 9;
    for (let c = 3; c <= 2 + shiftColsCount * 3; c++) ws.getColumn(c).width = 8;
    ws.getColumn(totalCols - 1).width = 10;
    ws.getColumn(totalCols).width = 10;

    // Group departments by category
    const groupedDepts = {};
    threeShiftData.forEach((dept) => {
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
      depts.forEach((dept) => {
        const row = ws.getRow(rowIdx++);
        row.height = 16;
        const vals = [
          dept.departmentName,
          dept.dayStd,
          ...getShiftExportVals(dept.shiftI),
          ...getShiftExportVals(dept.shiftII),
          ...getShiftExportVals(dept.shiftIII),
          dept.overallTotal,
          dept.diff,
        ];

        vals.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v === 0 && i > 0 ? "-" : v;
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
      grandTotal.diff,
    ];

    gtVals.forEach((v, i) => {
      const cell = gtRow.getCell(i + 1);
      cell.value = v === 0 && i > 0 ? "-" : v;
      cell.font = { bold: true, size: 10, color: i === totalCols - 1 ? { argb: grandTotal.diff < 0 ? "FFDC2626" : grandTotal.diff > 0 ? "FF15803D" : "FF64748B" } : { argb: "FF1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAND_BG } };
      cell.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle" };
      cell.border = borderThin();
    });

    // ── 10. Bottom Abstracts ──────────────────────────────────
    rowIdx += 2;
    const absTitleRow = ws.getRow(rowIdx++);
    absTitleRow.height = 18;

    ws.mergeCells(rowIdx - 1, 1, rowIdx - 1, 5);
    const abs1Cell = absTitleRow.getCell(1);
    abs1Cell.value = "TRG / CON. SHIFT ABSTRACT";
    abs1Cell.font = { bold: true, size: 9, color: { argb: HEADER_FG } };
    abs1Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
    abs1Cell.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells(rowIdx - 1, 8, rowIdx - 1, 9);
    const abs2Cell = absTitleRow.getCell(8);
    abs2Cell.value = "ATTENDANCE ABSTRACT";
    abs2Cell.font = { bold: true, size: 9, color: { argb: HEADER_FG } };
    abs2Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
    abs2Cell.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells(rowIdx - 1, 12, rowIdx - 1, 13);
    const abs3Cell = absTitleRow.getCell(12);
    abs3Cell.value = "TRAINEE ABSTRACT";
    abs3Cell.font = { bold: true, size: 9, color: { argb: HEADER_FG } };
    abs3Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
    abs3Cell.alignment = { horizontal: "center", vertical: "middle" };

    for (let c = 1; c <= 5; c++) absTitleRow.getCell(c).border = borderThin();
    for (let c = 8; c <= 9; c++) absTitleRow.getCell(c).border = borderThin();
    for (let c = 12; c <= 13; c++) absTitleRow.getCell(c).border = borderThin();

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
          cell.value = v === 0 && idx > 0 ? "-" : v;
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

    // ── 11. Signature Blocks ──────────────────────────────────
    rowIdx += 3;
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
      cell.border = { top: { style: "thin", color: { argb: "FF94A3B8" } } };
    });

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
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function borderThin() {
  const s = { style: "thin", color: { argb: "FFCBD5E1" } };
  return { top: s, left: s, bottom: s, right: s };
}
