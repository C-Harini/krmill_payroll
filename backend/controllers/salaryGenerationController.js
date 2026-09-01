"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════
 *  PAYROLL SALARY GENERATION ENGINE  v11
 *  KEY CHANGE from v10:
 *    EmployeeSalaryMaster fetch is now revision-safe.
 *    Instead of grabbing ANY Active row, we now:
 *      1. Filter to rows where effectiveFrom <= payPeriodStart
 *         (so a future-dated revision never fires early)
 *      2. ORDER BY effectiveFrom DESC  (most recent revision first)
 *      3. LIMIT 1                      (take only that top row)
 *    This means:
 *      - Annual revisions entered ahead of time are safe
 *      - Backdated payroll runs pick the correct salary for that period
 *      - Multiple Active rows no longer cause non-deterministic picks
 *      - An employee with no qualifying master throws a clear error
 *        instead of being silently skipped
 * ═══════════════════════════════════════════════════════════════════
 */

const { Op } = require("sequelize");
const moment = require("moment");

const {
  Employee,
  EmployeeSalaryMaster,
  EmployeeSalaryComponent,
  SalaryComponent,
  SalaryGeneration,
  SalaryGenerationDetail,
  Attendance,
  LeaveRequest,
  LeaveType,
  AttendanceIncentive,
  AttendanceIncentiveCondition,
  ShiftType,
  AdditionalSalary,
  HolidayList,
  Holiday,
  EmployeeLoan,
  Deduction,
  Designation,
  EmployerGrade,
  EmploymentType,
  Category,
  Department,
} = require("../models");

const {
  PF_RATE,
  ESI_RATE,
  ESI_GROSS_LIMIT,
  PF_BASIC_CEILING,
  MONTHLY_PERMISSION_HRS,
  STAFF_MANAGEMENT_GRADES,
  isManagementGrade,
} = require("../config/salaryConfig");

// ── Utilities ──────────────────────────────────────────────────────
const toNum = (v) => parseFloat(v) || 0;
const roundTo10 = (n) => Math.round(n / 10) * 10;
const daysInMonth = (year, month) =>
  moment(`${year}-${String(month).padStart(2, "0")}-01`).daysInMonth();

// ── Component code helpers ─────────────────────────────────────────
const getCode = (comp) =>
  (comp.componentCode || comp.SalaryComponent?.code || "").toUpperCase().trim();
const isBasic = (c) => ["BASIC", "BASIC_PAY", "BASICPAY"].includes(c);
const isSpl = (c) =>
  [
    "SPL",
    "SPL_ALL",
    "SPLALL",
    "SPECIAL_ALLOWANCE",
    "SPECIAL_ALL",
    "SPL.ALL",
    "SPLALL",
  ].includes(c);
const isConv = (c) => ["CONV", "CON", "CONVEYANCE", "CONV_ALL"].includes(c);
const isHra = (c) => ["HRA", "HOUSE_RENT", "HOUSE_RENT_ALLOWANCE"].includes(c);
const isEnt = (c) =>
  ["ENT", "ENTERTAINMENT", "ENT_ALLO", "ENTERTAINMENT_ALLOWANCE"].includes(c);

// ── PF / ESI ───────────────────────────────────────────────────────
const calcPf = (basicEarned, isPf, fixedPf = null) => {
  if (!isPf) return 0;
  if (fixedPf !== null) return fixedPf;
  return Math.round(Math.min(basicEarned, PF_BASIC_CEILING) * PF_RATE);
};
const calcEsi = (basicEarned, splEarned, isPf) => {
  if (!isPf) return 0;
  const base = basicEarned + splEarned;
  if (base > ESI_GROSS_LIMIT) return 0;
  return Math.ceil(base * ESI_RATE);
};

// ── Holiday map ────────────────────────────────────────────────────
const getHolidayMap = async (companyId, startDate, endDate) => {
  const map = new Map();
  try {
    const lists = await HolidayList.findAll({
      where: { companyId, status: "Active" },
      include: [
        {
          model: Holiday,
          as: "holidays",
          where: {
            date: { [Op.between]: [startDate, endDate] },
            status: "Active",
          },
          required: false,
        },
      ],
    });
    for (const list of lists)
      for (const h of list.holidays || [])
        map.set(
          moment(h.date).format("YYYY-MM-DD"),
          (h.holidayType || h.type || "H").toUpperCase(),
        );
  } catch (err) {
    console.error("[getHolidayMap]", err.message);
  }
  return map;
};

// ── Additional salary ──────────────────────────────────────────────
const getAdditionalSalary = async (employeeId, companyId, month, year) => {
  try {
    const salaryMonth = `${year}-${String(month).padStart(2, "0")}`;
    const rows = await AdditionalSalary.findAll({
      where: { employeeId, companyId, salaryMonth },
      include: [
        { model: SalaryComponent, as: "salaryComponent", required: false },
      ],
    });
    const total = rows.reduce((s, r) => s + toNum(r.amount), 0);
    const components = rows.map((r) => ({
      componentId: r.salaryComponentId || null,
      componentName:
        r.salaryComponent?.name || r.description || "Additional Salary",
      componentType: "Earning",
      calculationType: "Fixed",
      baseAmount: toNum(r.amount),
      calculatedAmount: toNum(r.amount),
      isProrated: false,
      proratedAmount: toNum(r.amount),
      formula: null,
    }));
    return { total, components };
  } catch (err) {
    console.error("[getAdditionalSalary]", err.message);
    return { total: 0, components: [] };
  }
};

// ── Attendance metrics ─────────────────────────────────────────────
const getAttendanceMetrics = async (
  employeeId,
  startDate,
  endDate,
  holidayMap = new Map(),
) => {
  const [attendance, leaveRequests] = await Promise.all([
    Attendance.findAll({
      where: {
        employeeId,
        attendanceDate: { [Op.between]: [startDate, endDate] },
      },
    }),
    LeaveRequest.findAll({
      where: {
        employeeId,
        status: "Approved",
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } },
        ],
      },
      include: [{ model: LeaveType, required: false }],
    }),
  ]);

  const leaveMap = new Map();
  leaveRequests.forEach((lv) => {
    const isPaid = lv.LeaveType?.isPaid ?? true;
    const d = moment(lv.startDate);
    while (d.isSameOrBefore(moment(lv.endDate))) {
      leaveMap.set(d.format("YYYY-MM-DD"), isPaid);
      d.add(1, "day");
    }
  });

  let presentDays = 0,
    absentDays = 0,
    holidayDays = 0;
  let weekOffDays = 0,
    nhFhDays = 0,
    paidLeaveDays = 0,
    unpaidLeaveDays = 0;
  let overtimeHours = 0,
    lateCount = 0,
    earlyExitCount = 0;
  let remainingPermHrs = MONTHLY_PERMISSION_HRS;

  const cur = moment(startDate);
  while (cur.isSameOrBefore(endDate)) {
    if (cur.day() === 0) weekOffDays++;
    cur.add(1, "day");
  }

  attendance.forEach((rec) => {
    let isPresent = false;
    const ds = moment(rec.attendanceDate).format("YYYY-MM-DD");
    const hType = holidayMap.get(ds);

    switch (rec.status) {
      case "Present":
        presentDays += 1;
        isPresent = true;
        break;
      case "Half Day":
        presentDays += 0.5;
        isPresent = true;
        break;
      case "Present with Permission":
      case "Late Present":
        presentDays += 1;
        isPresent = true;
        break;
      case "Absent":
        absentDays += 1;
        break;
      case "Leave":
        if (leaveMap.has(ds)) {
          if (leaveMap.get(ds)) paidLeaveDays++;
          else unpaidLeaveDays++;
        } else paidLeaveDays++;
        break;
      case "Week Off":
        if (moment(rec.attendanceDate).day() !== 0) weekOffDays += 1;
        break;
      case "Holiday":
        holidayDays += 1;
        if (hType === "NH" || hType === "FH") {
          nhFhDays++;
          presentDays++;
          isPresent = true;
        }
        break;
      case "NH":
      case "FH":
        nhFhDays++;
        holidayDays++;
        presentDays++;
        isPresent = true;
        break;
      default:
        break;
    }

    if (rec.isLate && toNum(rec.lateByMinutes) > 0) {
      lateCount++;
      const hrsLate = Math.ceil(toNum(rec.lateByMinutes) / 60);
      if (remainingPermHrs > 0) {
        remainingPermHrs -= hrsLate;
        if (remainingPermHrs < 0 && isPresent) {
          absentDays++;
          presentDays -= rec.status === "Half Day" ? 0.5 : 1;
        }
      } else if (isPresent) {
        absentDays++;
        presentDays -= rec.status === "Half Day" ? 0.5 : 1;
      }
    }
    if (rec.isEarlyExit) earlyExitCount++;
    if (rec.overtimeHours) overtimeHours += toNum(rec.overtimeHours);
  });

  return {
    presentDays: Math.max(0, presentDays),
    absentDays: Math.max(0, absentDays),
    paidLeaveDays: Math.max(0, paidLeaveDays),
    unpaidLeaveDays: Math.max(0, unpaidLeaveDays),
    holidayDays,
    weekOffDays,
    nhFhDays,
    overtimeHours,
    lateCount,
    earlyExitCount,
  };
};

const getAttendanceIncentive = async (employeeId, month, year, att = null) => {
  try {
    const rows = await AttendanceIncentive.findAll({
      where: { employeeId, month: +month, year: +year },
    });
    const sum = rows.reduce((s, r) => s + toNum(r.incentive), 0);
    if (sum > 0 || rows.length > 0) return sum;
  } catch {
    // continue to fallback
  }

  // Fallback: calculate on-the-fly if not yet pre-saved in attendance_incentives
  try {
    const { calculateIncentive } = require("./AttendanceIncentiveController");
    const emp = await Employee.findByPk(employeeId, {
      include: [
        { model: Category, as: "category", attributes: ["id", "categoryName"] },
        { model: Designation, as: "designation", attributes: ["id", "name"] },
      ],
    });
    if (!emp) return 0;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const [attendances, dbConditions, allShiftTypes] = await Promise.all([
      Attendance.findAll({
        where: {
          employeeId,
          attendanceDate: { [Op.between]: [startDate, endDate] },
        },
        attributes: ["attendanceDate", "status", "shiftId", "shiftName"],
      }),
      AttendanceIncentiveCondition.findAll({
        where: { status: "Active" },
      }),
      ShiftType.findAll({ attributes: ["id", "name"] }),
    ]);

    const shiftTypeMap = {};
    for (const st of allShiftTypes) shiftTypeMap[st.id] = st.name;

    const shiftMap = {};
    let rawDays = 0;
    for (const attRec of attendances) {
      let daysWorked = 0;
      if (attRec.status === "Present" || attRec.status === "Present with Permission") daysWorked = 1;
      else if (attRec.status === "Half Day") daysWorked = 0.5;

      if (daysWorked > 0) {
        rawDays += daysWorked;
        const shiftName = attRec.shiftName || shiftTypeMap[attRec.shiftId] || "I";
        shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
      }
    }

    if (att && toNum(att.paidLeaveDays) > 0) {
      const elDays = toNum(att.paidLeaveDays);
      rawDays += elDays;
      shiftMap["I"] = (shiftMap["I"] || 0) + elDays;
    }

    const categoryName = emp.category?.categoryName || "";
    const calc = calculateIncentive(emp, shiftMap, categoryName, null, null, 0, rawDays, dbConditions);
    return toNum(calc?.incentive) || 0;
  } catch (err) {
    console.error(`Dynamic incentive calculation error for emp ${employeeId}:`, err.message);
    return 0;
  }
};

const getLoanEmi = async (employeeId, companyId) => {
  try {
    const where = { employeeId, status: "active" };
    if (companyId) {
      where[Op.or] = [{ companyId }, { companyId: null }];
    }
    const loans = await EmployeeLoan.findAll({ where });
    return loans.reduce((s, loan) => {
      const paid = toNum(loan.paidInstallments),
        total = toNum(loan.numberOfInstallments);
      return paid < total ? s + toNum(loan.installmentAmount) : s;
    }, 0);
  } catch {
    return 0;
  }
};

const getMiscDeductions = async (employeeId, companyId, month, year) => {
  const empty = { mess: 0, store: 0, other: 0, eb: 0, adv: 0 };
  try {
    const rows = await Deduction.findAll({
      where: { employeeId, companyId, month: +month, year: +year },
    });
    rows.forEach((r) => {
      const t = (r.deductionType || "").toLowerCase().trim();
      const a = toNum(r.amount);
      if (t === "mess") empty.mess += a;
      else if (t === "store" || t === "stores") empty.store += a;
      else if (t === "eb") empty.eb += a;
      else if (t === "advance" || t === "adv") empty.adv += a;
      else empty.other += a;
    });
    return empty;
  } catch {
    return empty;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE CALCULATORS  (unchanged from v10 — only the fetch above changed)
// ─────────────────────────────────────────────────────────────────────────────

const calcManagement = ({
  salaryMaster,
  att,
  year,
  month,
  isPf,
  gradeName,
}) => {
  const totalDays = daysInMonth(year, month);
  const monthly = toNum(salaryMaster.monthlySalary || salaryMaster.grossSalary);
  const fullBasic = Math.round(monthly * 0.6);
  const fullHra = Math.round(monthly * 0.1);
  const fullSpl = Math.round(monthly * 0.1);
  const fullConv = Math.round(monthly * 0.1);
  const fullEnt = Math.round(monthly * 0.1);
  const grossEarned = fullBasic + fullHra + fullSpl + fullConv + fullEnt;
  const isEleMGrade =
    gradeName.toUpperCase().includes("ELE (M)") ||
    gradeName.toUpperCase().includes("ELE(M)");
  const pfAmount = isPf
    ? isEleMGrade
      ? 1800
      : Math.round(fullBasic * PF_RATE)
    : 0;
  const components = [
    {
      componentName: "Basic Pay",
      componentType: "Earning",
      calculationType: "Monthly",
      baseAmount: fullBasic,
      calculatedAmount: fullBasic,
      isProrated: false,
      proratedAmount: fullBasic,
      formula: `${monthly} × 60%`,
    },
    {
      componentName: "HRA",
      componentType: "Earning",
      calculationType: "Monthly",
      baseAmount: fullHra,
      calculatedAmount: fullHra,
      isProrated: false,
      proratedAmount: fullHra,
      formula: `${monthly} × 10%`,
    },
    {
      componentName: "Special Allowance",
      componentType: "Earning",
      calculationType: "Monthly",
      baseAmount: fullSpl,
      calculatedAmount: fullSpl,
      isProrated: false,
      proratedAmount: fullSpl,
      formula: `${monthly} × 10%`,
    },
    {
      componentName: "Conveyance",
      componentType: "Earning",
      calculationType: "Monthly",
      baseAmount: fullConv,
      calculatedAmount: fullConv,
      isProrated: false,
      proratedAmount: fullConv,
      formula: `${monthly} × 10%`,
    },
    {
      componentName: "Entertainment All.",
      componentType: "Earning",
      calculationType: "Monthly",
      baseAmount: fullEnt,
      calculatedAmount: fullEnt,
      isProrated: false,
      proratedAmount: fullEnt,
      formula: `${monthly} × 10%`,
    },
  ];
  console.log(
    `[Management] ${gradeName} monthly=₹${monthly} gross=₹${grossEarned} pf=₹${pfAmount}`,
  );
  return {
    basicSalary: fullBasic,
    splAllowance: fullSpl,
    grossEarned,
    pfAmount,
    esiAmount: 0,
    absentDeduction: 0,
    leaveDeduction: 0,
    attnIncentive: 0,
    components,
    paidDays: totalDays,
    perDay: monthly / totalDays,
  };
};

const calcStaff = ({ salaryMaster, att, year, month, isPf }) => {
  const monthly = toNum(salaryMaster.monthlySalary || salaryMaster.grossSalary);
  const comps = salaryMaster.EmployeeSalaryComponents || [];
  const results = [];
  let basicFull = 0,
    splFull = 0;
  comps.forEach((comp) => {
    const code = getCode(comp);
    const fullAmt = toNum(comp.calculatedAmount);
    if (comp.componentType === "Earning") {
      if (isBasic(code)) basicFull = fullAmt;
      if (isSpl(code)) splFull = fullAmt;
    }
    results.push({
      componentId: comp.componentId ?? comp.SalaryComponent?.id ?? null,
      componentName:
        comp.SalaryComponent?.name ||
        comp.componentName ||
        comp.componentCode ||
        "",
      componentType: comp.componentType || "Earning",
      calculationType: "Monthly",
      baseAmount: fullAmt,
      calculatedAmount: fullAmt,
      isProrated: false,
      proratedAmount: fullAmt,
      formula: "Full monthly (staff always full)",
    });
  });
  const pfAmount = calcPf(basicFull, isPf);
  const esiAmount = calcEsi(basicFull, splFull, isPf);
  console.log(
    `[Staff] monthly=₹${monthly} basic=₹${basicFull} pf=₹${pfAmount} esi=₹${esiAmount}`,
  );
  return {
    basicSalary: basicFull,
    splAllowance: splFull,
    grossEarned: monthly,
    pfAmount,
    esiAmount,
    absentDeduction: 0,
    leaveDeduction: 0,
    attnIncentive: 0,
    components: results,
    paidDays: daysInMonth(year, month),
    perDay: monthly / daysInMonth(year, month),
  };
};

const calcWorkerDailyPF = ({
  salaryMaster,
  att,
  attnIncentive,
  additionalSalary,
  gradeName = "",
}) => {
  const wagesPerDay = toNum(
    salaryMaster.wagesPerDay ||
      salaryMaster.monthlySalary ||
      salaryMaster.grossSalary,
  );
  const workedDays = att.presentDays + att.paidLeaveDays;
  const comps = salaryMaster.EmployeeSalaryComponents || [];
  let convFixed = 0,
    hraFixed = 0;
  comps.forEach((comp) => {
    const c = getCode(comp);
    if (isConv(c)) convFixed = toNum(comp.calculatedAmount);
    if (isHra(c)) hraFixed = toNum(comp.calculatedAmount);
  });
  const basicEarned = Math.round(wagesPerDay * 0.6 * workedDays);
  const splEarned = Math.round(wagesPerDay * 0.4 * workedDays);
  const shiftNh = gradeName.toUpperCase().includes("MIX");
  const nhFhWages = shiftNh ? 0 : Math.round(wagesPerDay * 2 * att.nhFhDays);
  const grossEarned =
    basicEarned +
    splEarned +
    convFixed +
    hraFixed +
    nhFhWages +
    attnIncentive +
    additionalSalary.total;
  const pfAmount = calcPf(basicEarned, true);
  const esiAmount = calcEsi(basicEarned, splEarned, true);
  const components = [
    {
      componentId: null,
      componentName: "Basic Pay",
      componentType: "Earning",
      calculationType: "PerDay",
      baseAmount: wagesPerDay * 0.6,
      calculatedAmount: basicEarned,
      isProrated: true,
      proratedAmount: basicEarned,
      formula: `${(wagesPerDay * 0.6).toFixed(2)} × ${workedDays}d`,
    },
    {
      componentId: null,
      componentName: "Special Allowance",
      componentType: "Earning",
      calculationType: "PerDay",
      baseAmount: wagesPerDay * 0.4,
      calculatedAmount: splEarned,
      isProrated: true,
      proratedAmount: splEarned,
      formula: `${(wagesPerDay * 0.4).toFixed(2)} × ${workedDays}d`,
    },
  ];
  if (hraFixed > 0)
    components.push({
      componentId: null,
      componentName: "HRA",
      componentType: "Earning",
      calculationType: "Fixed",
      baseAmount: hraFixed,
      calculatedAmount: hraFixed,
      isProrated: false,
      proratedAmount: hraFixed,
      formula: "Fixed monthly",
    });
  if (convFixed > 0)
    components.push({
      componentId: null,
      componentName: "Conveyance",
      componentType: "Earning",
      calculationType: "Fixed",
      baseAmount: convFixed,
      calculatedAmount: convFixed,
      isProrated: false,
      proratedAmount: convFixed,
      formula: "Fixed monthly",
    });
  if (nhFhWages > 0)
    components.push({
      componentId: null,
      componentName: "NH/FH Wages",
      componentType: "Earning",
      calculationType: "NHFHDouble",
      baseAmount: nhFhWages,
      calculatedAmount: nhFhWages,
      isProrated: false,
      proratedAmount: nhFhWages,
      formula: `${wagesPerDay} × 2 × ${att.nhFhDays}d`,
    });
  if (attnIncentive > 0)
    components.push({
      componentId: null,
      componentName: "Attn Incentive",
      componentType: "Earning",
      calculationType: "Incentive",
      baseAmount: attnIncentive,
      calculatedAmount: attnIncentive,
      isProrated: false,
      proratedAmount: attnIncentive,
      formula: null,
    });
  components.push(...additionalSalary.components);
  console.log(
    `[WorkerDailyPF] wpd=₹${wagesPerDay} wd=${workedDays} basic=₹${basicEarned} spl=₹${splEarned} gross=₹${grossEarned} pf=₹${pfAmount} esi=₹${esiAmount}`,
  );
  return {
    basicSalary: basicEarned,
    splAllowance: splEarned,
    grossEarned,
    pfAmount,
    esiAmount,
    absentDeduction: 0,
    leaveDeduction: 0,
    attnIncentive,
    components,
    workedDays,
    perDay: null,
  };
};

const calcWorkerDailyNPF = ({
  salaryMaster,
  att,
  attnIncentive,
  additionalSalary,
}) => {
  const wagesPerDay = toNum(
    salaryMaster.wagesPerDay ||
      salaryMaster.monthlySalary ||
      salaryMaster.grossSalary,
  );
  const workedDays = att.presentDays + att.paidLeaveDays;
  const comps = salaryMaster.EmployeeSalaryComponents || [];
  let convFixed = 0,
    hraFixed = 0;
  comps.forEach((comp) => {
    const c = getCode(comp);
    if (isConv(c)) convFixed = toNum(comp.calculatedAmount);
    if (isHra(c)) hraFixed = toNum(comp.calculatedAmount);
  });
  const basicEarned = Math.round(wagesPerDay * workedDays);
  const grossEarned =
    basicEarned + convFixed + hraFixed + attnIncentive + additionalSalary.total;
  const components = [
    {
      componentId: null,
      componentName: "Basic Pay",
      componentType: "Earning",
      calculationType: "PerDay",
      baseAmount: wagesPerDay,
      calculatedAmount: basicEarned,
      isProrated: true,
      proratedAmount: basicEarned,
      formula: `${wagesPerDay} × ${workedDays}d`,
    },
  ];
  if (hraFixed > 0)
    components.push({
      componentId: null,
      componentName: "HRA",
      componentType: "Earning",
      calculationType: "Fixed",
      baseAmount: hraFixed,
      calculatedAmount: hraFixed,
      isProrated: false,
      proratedAmount: hraFixed,
      formula: "Fixed monthly",
    });
  if (convFixed > 0)
    components.push({
      componentId: null,
      componentName: "Conveyance",
      componentType: "Earning",
      calculationType: "Fixed",
      baseAmount: convFixed,
      calculatedAmount: convFixed,
      isProrated: false,
      proratedAmount: convFixed,
      formula: "Fixed monthly",
    });
  if (attnIncentive > 0)
    components.push({
      componentId: null,
      componentName: "Attn Incentive",
      componentType: "Earning",
      calculationType: "Incentive",
      baseAmount: attnIncentive,
      calculatedAmount: attnIncentive,
      isProrated: false,
      proratedAmount: attnIncentive,
      formula: null,
    });
  components.push(...additionalSalary.components);
  console.log(
    `[WorkerDailyNPF] wpd=₹${wagesPerDay} wd=${workedDays} basic=₹${basicEarned} gross=₹${grossEarned}`,
  );
  return {
    basicSalary: basicEarned,
    splAllowance: 0,
    grossEarned,
    pfAmount: 0,
    esiAmount: 0,
    absentDeduction: 0,
    leaveDeduction: 0,
    attnIncentive,
    components,
    workedDays,
    perDay: null,
  };
};

const calcWorkerMonthlyPF = ({
  salaryMaster,
  att,
  attnIncentive,
  additionalSalary,
  year,
  month,
}) => {
  const totalDays = daysInMonth(year, month);
  const paidDays = att.presentDays + att.weekOffDays;
  const factor = totalDays > 0 ? paidDays / totalDays : 0;
  const wagesPerDay = toNum(
    salaryMaster.wagesPerDay ||
      salaryMaster.monthlySalary ||
      salaryMaster.grossSalary,
  );
  const wagesEarned = Math.round((wagesPerDay * paidDays) / totalDays);
  const comps = salaryMaster.EmployeeSalaryComponents || [];
  const results = [];
  let basicFull = 0,
    splFull = 0;
  comps.forEach((comp) => {
    const code = getCode(comp);
    const fullAmt = toNum(comp.calculatedAmount);
    if (isBasic(code)) basicFull = fullAmt;
    if (isSpl(code)) splFull = fullAmt;
    const earned = Math.round(fullAmt * factor);
    results.push({
      componentId: comp.componentId ?? comp.SalaryComponent?.id ?? null,
      componentName:
        comp.SalaryComponent?.name ||
        comp.componentName ||
        comp.componentCode ||
        "",
      componentType: comp.componentType || "Earning",
      calculationType: "Monthly",
      baseAmount: fullAmt,
      calculatedAmount: earned,
      isProrated: true,
      proratedAmount: earned,
      formula: `${fullAmt} × ${paidDays}/${totalDays}`,
    });
  });
  const basicEarned = Math.round(basicFull * factor);
  const splEarned = Math.round(splFull * factor);
  const grossEarned = wagesEarned + attnIncentive + additionalSalary.total;
  const pfAmount = calcPf(basicEarned, true);
  const esiAmount = calcEsi(basicEarned, splEarned, true);
  if (attnIncentive > 0)
    results.push({
      componentId: null,
      componentName: "Attn Incentive",
      componentType: "Earning",
      calculationType: "Incentive",
      baseAmount: attnIncentive,
      calculatedAmount: attnIncentive,
      isProrated: false,
      proratedAmount: attnIncentive,
      formula: null,
    });
  results.push(...additionalSalary.components);
  console.log(
    `[WorkerMonthlyPF] wpd=₹${wagesPerDay} paid=${paidDays}/${totalDays} earn=₹${wagesEarned} basic=₹${basicEarned} pf=₹${pfAmount} esi=₹${esiAmount}`,
  );
  return {
    basicSalary: basicEarned,
    splAllowance: splEarned,
    grossEarned,
    pfAmount,
    esiAmount,
    absentDeduction: 0,
    leaveDeduction: 0,
    attnIncentive,
    components: results,
    paidDays,
    perDay: wagesPerDay / totalDays,
  };
};

const calcWorkerMonthlyNPF = ({
  salaryMaster,
  att,
  attnIncentive,
  additionalSalary,
  year,
  month,
}) => {
  const totalDays = daysInMonth(year, month);
  const paidDays = att.presentDays + att.weekOffDays;
  const wagesPerDay = toNum(
    salaryMaster.wagesPerDay ||
      salaryMaster.monthlySalary ||
      salaryMaster.grossSalary,
  );
  const wagesEarned = Math.round((wagesPerDay * paidDays) / totalDays);
  const grossEarned = wagesEarned + attnIncentive + additionalSalary.total;
  const comps = salaryMaster.EmployeeSalaryComponents || [];
  const results = [];
  if (comps.length > 0) {
    const factor = totalDays > 0 ? paidDays / totalDays : 0;
    comps.forEach((comp) => {
      const fullAmt = toNum(comp.calculatedAmount);
      const earned = Math.round(fullAmt * factor);
      results.push({
        componentId: comp.componentId ?? comp.SalaryComponent?.id ?? null,
        componentName:
          comp.SalaryComponent?.name ||
          comp.componentName ||
          comp.componentCode ||
          "",
        componentType: comp.componentType || "Earning",
        calculationType: "Monthly",
        baseAmount: fullAmt,
        calculatedAmount: earned,
        isProrated: true,
        proratedAmount: earned,
        formula: `${fullAmt} × ${paidDays}/${totalDays}`,
      });
    });
  } else {
    results.push({
      componentId: null,
      componentName: "Basic Pay",
      componentType: "Earning",
      calculationType: "Monthly",
      baseAmount: wagesPerDay,
      calculatedAmount: wagesEarned,
      isProrated: true,
      proratedAmount: wagesEarned,
      formula: `${wagesPerDay} × ${paidDays}/${totalDays}`,
    });
  }
  if (attnIncentive > 0)
    results.push({
      componentId: null,
      componentName: "Attn Incentive",
      componentType: "Earning",
      calculationType: "Incentive",
      baseAmount: attnIncentive,
      calculatedAmount: attnIncentive,
      isProrated: false,
      proratedAmount: attnIncentive,
      formula: null,
    });
  results.push(...additionalSalary.components);
  console.log(
    `[WorkerMonthlyNPF] wpd=₹${wagesPerDay} paid=${paidDays}/${totalDays} earn=₹${wagesEarned} gross=₹${grossEarned}`,
  );
  return {
    basicSalary: wagesEarned,
    splAllowance: 0,
    grossEarned,
    pfAmount: 0,
    esiAmount: 0,
    absentDeduction: 0,
    leaveDeduction: 0,
    attnIncentive,
    components: results,
    paidDays,
    perDay: wagesPerDay / totalDays,
  };
};

// ── Loan updater ───────────────────────────────────────────────────
const updateLoans = async (employeeId, companyId) => {
  try {
    const where = { employeeId, status: "active" };
    if (companyId) {
      where[Op.or] = [{ companyId }, { companyId: null }];
    }
    const loans = await EmployeeLoan.findAll({ where });
    for (const loan of loans) {
      const paid = toNum(loan.paidInstallments),
        total = toNum(loan.numberOfInstallments);
      if (paid < total) {
        const newPaid = paid + 1;
        await loan.update({
          paidInstallments: newPaid,
          paidAmount: toNum(loan.paidAmount) + toNum(loan.installmentAmount),
          status: newPaid >= total ? "completed" : "active",
        });
      }
    }
  } catch (err) {
    console.error(`[Loan] emp=${employeeId}:`, err.message);
  }
};

// ── Detail writer ──────────────────────────────────────────────────
const writeDetails = async (genId, calc, misc, loanEmi) => {
  for (const c of calc.components) {
    await SalaryGenerationDetail.create({
      salaryGenerationId: genId,
      componentId: c.componentId || null,
      componentName: c.componentName,
      componentType: c.componentType,
      calculationType: c.calculationType,
      baseAmount: c.baseAmount || 0,
      calculatedAmount: c.calculatedAmount,
      isProrated: c.isProrated ?? true,
      proratedAmount: c.proratedAmount || c.calculatedAmount,
      formula: c.formula || null,
    });
  }
  if (calc.pfAmount > 0)
    await SalaryGenerationDetail.create({
      salaryGenerationId: genId,
      componentId: null,
      componentName: "PF (Employee 12%)",
      componentType: "Deduction",
      calculationType: "Percentage",
      baseAmount: calc.basicSalary,
      calculatedAmount: calc.pfAmount,
      isProrated: false,
      proratedAmount: calc.pfAmount,
      formula: "12% of Basic",
    });
  if (calc.esiAmount > 0)
    await SalaryGenerationDetail.create({
      salaryGenerationId: genId,
      componentId: null,
      componentName: "ESI (Employee 0.75%)",
      componentType: "Deduction",
      calculationType: "Percentage",
      baseAmount: (calc.basicSalary || 0) + (calc.splAllowance || 0),
      calculatedAmount: calc.esiAmount,
      isProrated: false,
      proratedAmount: calc.esiAmount,
      formula: "ceil(0.75% of Basic+Spl)",
    });
  for (const [name, amt] of [
    ["Advance", misc.adv],
    ["Mess", misc.mess],
    ["Store", misc.store],
    ["EB", misc.eb],
    ["Other Deduction", misc.other],
    ["Loan EMI", loanEmi],
  ]) {
    if (amt > 0)
      await SalaryGenerationDetail.create({
        salaryGenerationId: genId,
        componentId: null,
        componentName: name,
        componentType: "Deduction",
        calculationType: "Fixed",
        baseAmount: amt,
        calculatedAmount: amt,
        isProrated: false,
        proratedAmount: amt,
        formula: null,
      });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE MONTH GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
async function generateForMonth({
  filtered,
  companyId,
  month,
  year,
  payPeriodStart,
  payPeriodEnd,
  results,
}) {
  const totalCalDays = daysInMonth(year, month);
  const holidayMap = await getHolidayMap(
    companyId,
    payPeriodStart,
    payPeriodEnd,
  );
  console.log(
    `\n[SalaryGen] ═══ ${month}/${year} | ${filtered.length} employees | ${holidayMap.size} holidays ═══`,
  );

  for (const emp of filtered) {
    results.processed++;
    const gradeName = emp.grade?.name || "";
    const isPf = (emp.providentFundNumber || "").toUpperCase().trim() === "PF";
    const isDailyWorker = (emp.workingType || "").toLowerCase() === "daily";
    const isMgr = isManagementGrade(gradeName);
    const isStaffEmp =
      (emp.employeeType || "").toLowerCase() === "staff" || isMgr;

    console.log(
      `\n[emp ${emp.id}] ${emp.firstName} ${emp.lastName} | grade="${gradeName}" workingType="${emp.workingType}" pf=${isPf} mgr=${isMgr} daily=${isDailyWorker}`,
    );

    try {
      const exists = await SalaryGeneration.findOne({
        where: { employeeId: emp.id, salaryMonth: month, salaryYear: year },
      });
      if (exists && exists.status === "Paid") {
        results.skipped++;
        console.log("  → SKIPPED (already paid)");
        continue;
      }

      // ── REVISION-SAFE salary master fetch ────────────────────────
      // Takes the most recent revision whose effectiveFrom is on or
      // before the first day of the pay period being processed.
      // This means:
      //   • Future-dated revisions are never picked early
      //   • Backdated runs always use the salary valid at that time
      //   • Multiple Active rows are safely resolved by effectiveFrom DESC
      const salaryMaster = await EmployeeSalaryMaster.findOne({
        where: {
          employeeId: emp.id,
          status: "Active",
          effectiveFrom: { [Op.lte]: payPeriodStart },
        },
        order: [["effectiveFrom", "DESC"]], // most recent revision first
        include: [
          {
            model: EmployeeSalaryComponent,
            include: [{ model: SalaryComponent, required: false }],
          },
        ],
      });

      if (!salaryMaster) {
        // Check if there's a future-dated Active master — helpful error message
        const futureMaster = await EmployeeSalaryMaster.findOne({
          where: {
            employeeId: emp.id,
            status: "Active",
            effectiveFrom: { [Op.gt]: payPeriodStart },
          },
          order: [["effectiveFrom", "ASC"]],
        });
        if (futureMaster) {
          throw new Error(
            `No salary master effective on or before ${payPeriodStart}. ` +
              `Earliest active revision is dated ${moment(futureMaster.effectiveFrom).format("YYYY-MM-DD")}. ` +
              `Backdate the revision or use a later pay period.`,
          );
        }
        throw new Error(
          `No active salary master found for pay period ${payPeriodStart}.`,
        );
      }

      console.log(
        `  salaryMaster id=${salaryMaster.id} effectiveFrom=${moment(salaryMaster.effectiveFrom).format("YYYY-MM-DD")} ` +
          `gross=₹${salaryMaster.monthlySalary || salaryMaster.grossSalary || salaryMaster.wagesPerDay}`,
      );

      const att = await getAttendanceMetrics(
        emp.id,
        payPeriodStart,
        payPeriodEnd,
        holidayMap,
      );
      console.log(
        `  att: present=${att.presentDays} paid_leave=${att.paidLeaveDays} absent=${att.absentDays} weekoff=${att.weekOffDays} nhfh=${att.nhFhDays}`,
      );

      const [attnIncentive, loanEmi, misc, additionalSalary] =
        await Promise.all([
          getAttendanceIncentive(emp.id, month, year, att),
          getLoanEmi(emp.id, companyId),
          getMiscDeductions(emp.id, companyId, month, year),
          getAdditionalSalary(emp.id, companyId, month, year),
        ]);

      // ── Route to correct calculator ───────────────────────────────
      let calc, empCategory, empSalaryType;

      if (isMgr) {
        calc = calcManagement({
          salaryMaster,
          att,
          year: +year,
          month: +month,
          isPf,
          gradeName,
        });
        if (additionalSalary.total > 0) {
          calc.grossEarned += additionalSalary.total;
          calc.components.push(...additionalSalary.components);
        }
        empCategory = "staff";
        empSalaryType = "monthly";
      } else if (isStaffEmp && !isDailyWorker) {
        calc = calcStaff({
          salaryMaster,
          att,
          year: +year,
          month: +month,
          isPf,
        });
        if (additionalSalary.total > 0) {
          calc.grossEarned += additionalSalary.total;
          calc.components.push(...additionalSalary.components);
        }
        empCategory = "staff";
        empSalaryType = "monthly";
      } else if (isDailyWorker) {
        calc = isPf
          ? calcWorkerDailyPF({
              salaryMaster,
              att,
              attnIncentive,
              additionalSalary,
              gradeName,
            })
          : calcWorkerDailyNPF({
              salaryMaster,
              att,
              attnIncentive,
              additionalSalary,
            });
        empCategory = "worker";
        empSalaryType = "daily";
      } else {
        calc = isPf
          ? calcWorkerMonthlyPF({
              salaryMaster,
              att,
              attnIncentive,
              additionalSalary,
              year: +year,
              month: +month,
            })
          : calcWorkerMonthlyNPF({
              salaryMaster,
              att,
              attnIncentive,
              additionalSalary,
              year: +year,
              month: +month,
            });
        empCategory = "worker";
        empSalaryType = "monthly";
      }

      const totalDeductions =
        (calc.pfAmount || 0) +
        (calc.esiAmount || 0) +
        loanEmi +
        misc.adv +
        misc.mess +
        misc.store +
        misc.other +
        misc.eb;
      const netSalary = calc.grossEarned - totalDeductions;
      const netRounded = roundTo10(netSalary);
      const empPfType = isPf ? "pf" : "npf";

      console.log(
        `  gross=₹${calc.grossEarned} ded=₹${totalDeductions} net=₹${netSalary} rounded=₹${netRounded}`,
      );

      const genData = {
        employeeId: emp.id,
        employeeSalaryMasterId: salaryMaster.id,
        companyId,
        salaryMonth: +month,
        salaryYear: +year,
        payPeriodStart,
        payPeriodEnd,
        workingDays: totalCalDays,
        totalDays: totalCalDays,
        presentDays: att.presentDays,
        absentDays: att.absentDays,
        paidLeaveDays: att.paidLeaveDays,
        unpaidLeaveDays: att.unpaidLeaveDays,
        holidayDays: att.holidayDays,
        weekOffDays: att.weekOffDays,
        nhFhDays: att.nhFhDays,
        overtimeHours: att.overtimeHours,
        lateCount: att.lateCount,
        earlyExitCount: att.earlyExitCount,
        basicSalary: calc.basicSalary,
        grossSalary: calc.grossEarned,
        totalEarnings: calc.grossEarned,
        pfAmount: calc.pfAmount,
        esiAmount: calc.esiAmount,
        absentDeduction: 0,
        leaveDeduction: 0,
        loanDeduction: loanEmi,
        attnIncentive: calc.attnIncentive ?? attnIncentive,
        totalDeductions,
        netSalary,
        netRounded,
        lateDeduction: 0,
        overtimePay: 0,
        bonus: 0,
        empCategory,
        empSalaryType,
        empPfType,
        status: "Generated",
        generatedBy: null,
      };

      let salaryGenId;
      if (exists) {
        // Clean out previous detail rows and update existing master row
        await SalaryGenerationDetail.destroy({
          where: { salaryGenerationId: exists.id },
        });
        await exists.update(genData);
        salaryGenId = exists.id;
        console.log(`  → OVERWRITTEN id=${exists.id}`);
      } else {
        const created = await SalaryGeneration.create(genData);
        salaryGenId = created.id;
        console.log(`  → CREATED id=${created.id}`);
      }

      await writeDetails(salaryGenId, calc, misc, loanEmi);
      if (loanEmi > 0) await updateLoans(emp.id, companyId);

      results.generated++;
    } catch (err) {
      console.error(`[SalaryGen] Error emp=${emp.id}:`, err.message);
      results.errors.push({
        employeeId: emp.id,
        name: emp.firstName,
        error: err.message,
        month,
        year,
      });
    }
  }
}

/* ════════════════════════════════════════════════════════════════════
   POST /api/salary-generation/generate
════════════════════════════════════════════════════════════════════ */
exports.generateSalary = async (req, res) => {
  const {
    companyId,
    month,
    year,
    fromDate,
    toDate,
    generatedBy,
    employeeIds = [],
    departmentIds = [],
    categoryIds = [],
    employeeType = "",
    workingType = "",
    pfType = "",
    staffType = "",
  } = req.body;

  if (!companyId)
    return res.status(400).json({ message: "companyId is required." });

  let monthYears = [];
  if (fromDate && toDate) {
    const s = moment(fromDate).startOf("month");
    const e = moment(toDate).startOf("month");
    while (s.isSameOrBefore(e)) {
      monthYears.push({ month: s.month() + 1, year: s.year() });
      s.add(1, "month");
    }
  } else if (month && year) {
    monthYears = [{ month: +month, year: +year }];
  } else {
    return res
      .status(400)
      .json({ message: "Provide month+year or fromDate+toDate." });
  }

  try {
    // ── Build employee WHERE ────────────────────────────────────────
    const empWhere = { companyId, status: "Active" };
    if (employeeIds.length > 0)
      empWhere.id = { [Op.in]: employeeIds.map(Number) };
    if (departmentIds.length > 0)
      empWhere.departmentId = { [Op.in]: departmentIds.map(Number) };
    if (categoryIds.length > 0)
      empWhere.categoryId = { [Op.in]: categoryIds.map(Number) };
    if (workingType) empWhere.workingType = workingType;
    if (pfType === "pf") empWhere.providentFundNumber = "PF";
    if (pfType === "npf") empWhere.providentFundNumber = "NON_PF";
    if (employeeType && employeeType !== "")
      empWhere.employeeType = employeeType;

    // ── Fetch employees WITHOUT salary master (fetched per-employee inside loop now) ──
    // We still need grade, designation, etc. for routing decisions.
    const employees = await Employee.findAll({
      where: empWhere,
      include: [
        {
          model: Designation,
          as: "designation",
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: EmployerGrade,
          as: "grade",
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: EmploymentType,
          as: "employmentType",
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "categoryName"],
          required: false,
        },
        {
          model: Department,
          as: "department",
          attributes: ["id", "departmentname"],
          required: false,
        },
      ],
    });

    if (!employees.length)
      return res
        .status(200)
        .json({
          message: "No employees found matching filters.",
          results: { processed: 0, generated: 0, skipped: 0, errors: [] },
        });

    let filtered = employees;
    if (staffType === "manager")
      filtered = employees.filter((e) =>
        isManagementGrade(e.grade?.name || ""),
      );
    else if (staffType === "staff")
      filtered = employees.filter(
        (e) => !isManagementGrade(e.grade?.name || ""),
      );

    if (!filtered.length)
      return res
        .status(200)
        .json({
          message: "No employees found for the selected filters.",
          results: { processed: 0, generated: 0, skipped: 0, errors: [] },
        });

    const results = { processed: 0, generated: 0, skipped: 0, errors: [] };

    for (const { month: m, year: y } of monthYears) {
      const payPeriodStart = moment(
        `${y}-${String(m).padStart(2, "0")}-01`,
      ).format("YYYY-MM-DD");
      const payPeriodEnd = moment(payPeriodStart)
        .endOf("month")
        .format("YYYY-MM-DD");
      await generateForMonth({
        filtered,
        companyId,
        month: m,
        year: y,
        payPeriodStart,
        payPeriodEnd,
        results,
      });
    }

    return res.status(200).json({
      message: `Salary generation completed for ${monthYears.length} month(s).`,
      months: monthYears,
      results,
      summary: {
        total: filtered.length * monthYears.length,
        generated: results.generated,
        skipped: results.skipped,
        errors: results.errors.length,
      },
    });
  } catch (err) {
    console.error("[SalaryGen] Fatal:", err);
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════════
   GET /api/salary-generation
════════════════════════════════════════════════════════════════════ */
exports.getSalaryGenerations = async (req, res) => {
  const {
    companyId,
    month,
    year,
    employeeId,
    status,
    category,
    salaryType,
    pfType,
    departmentId,
    fromDate,
    toDate,
  } = req.query;
  if (!companyId)
    return res.status(400).json({ message: "companyId is required." });
  try {
    const where = { companyId };
    if (fromDate && toDate) {
      where.createdAt = {
        [Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    } else {
      if (month) where.salaryMonth = month;
      if (year) where.salaryYear = year;
    }
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (category) where.empCategory = category;
    if (salaryType) where.empSalaryType = salaryType;
    if (pfType) where.empPfType = pfType;
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;
    const salaries = await SalaryGeneration.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "employeeCode",
            "departmentId",
          ],
          where: Object.keys(empWhere).length ? empWhere : undefined,
          required: !!Object.keys(empWhere).length,
          include: [
            {
              model: Designation,
              as: "designation",
              attributes: ["id", "name"],
              required: false,
            },
            {
              model: EmployerGrade,
              as: "grade",
              attributes: ["id", "name"],
              required: false,
            },
            {
              model: Category,
              as: "category",
              attributes: ["id", "categoryName"],
              required: false,
            },
          ],
        },
      ],
      order: [
        ["salaryYear", "DESC"],
        ["salaryMonth", "DESC"],
        ["id", "DESC"],
      ],
    });
    const totals = {
      count: salaries.length,
      totalGross: salaries.reduce((s, r) => s + toNum(r.grossSalary), 0),
      totalDeductions: salaries.reduce(
        (s, r) => s + toNum(r.totalDeductions),
        0,
      ),
      totalNet: salaries.reduce((s, r) => s + toNum(r.netSalary), 0),
      totalPf: salaries.reduce((s, r) => s + toNum(r.pfAmount), 0),
      totalEsi: salaries.reduce((s, r) => s + toNum(r.esiAmount), 0),
    };
    return res.status(200).json({ salaries, totals });
  } catch (err) {
    console.error("[getSalaryGenerations]", err);
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════════
   GET /api/salary-generation/:id
════════════════════════════════════════════════════════════════════ */
exports.getSalaryGenerationById = async (req, res) => {
  try {
    const salary = await SalaryGeneration.findByPk(req.params.id, {
      include: [
        {
          model: Employee,
          as: "employee",
          include: [
            { model: Designation, as: "designation", required: false },
            { model: EmployerGrade, as: "grade", required: false },
            { model: Category, as: "category", required: false },
          ],
        },
        {
          model: SalaryGenerationDetail,
          as: "details",
          include: [{ model: SalaryComponent, required: false }],
        },
        { model: EmployeeSalaryMaster, as: "salaryMaster" },
      ],
    });
    if (!salary) return res.status(404).json({ message: "Not found." });
    return res.status(200).json(salary);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};

/* ════════════ PATCH / DELETE / SUMMARY ════════════ */
exports.approveSalary = async (req, res) => {
  try {
    const salary = await SalaryGeneration.findByPk(req.params.id);
    if (!salary) return res.status(404).json({ message: "Not found." });
    if (salary.status !== "Generated")
      return res
        .status(400)
        .json({ message: "Only Generated can be approved." });
    await salary.update({
      status: "Approved",
      approvedBy: req.body.approvedBy || null,
      approvedAt: new Date(),
    });
    return res.status(200).json({ message: "Approved.", salary });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};

exports.paySalary = async (req, res) => {
  try {
    const salary = await SalaryGeneration.findByPk(req.params.id);
    if (!salary) return res.status(404).json({ message: "Not found." });
    if (salary.status !== "Approved")
      return res.status(400).json({ message: "Only Approved can be paid." });
    await salary.update({
      status: "Paid",
      paidBy: req.body.paidBy || null,
      paidAt: new Date(),
      paymentMethod: req.body.paymentMethod,
      paymentReference: req.body.paymentReference,
    });
    return res.status(200).json({ message: "Paid.", salary });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};

exports.deleteSalaryGeneration = async (req, res) => {
  try {
    const salary = await SalaryGeneration.findByPk(req.params.id);
    if (!salary) return res.status(404).json({ message: "Not found." });
    if (salary.status === "Paid")
      return res.status(400).json({ message: "Cannot delete a paid record." });
    await SalaryGenerationDetail.destroy({
      where: { salaryGenerationId: salary.id },
    });
    await salary.destroy();
    return res.status(200).json({ message: "Deleted." });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};

exports.getSalarySummary = async (req, res) => {
  const { companyId, month, year } = req.query;
  if (!companyId)
    return res.status(400).json({ message: "companyId required" });
  const where = { companyId };
  if (month) where.salaryMonth = month;
  if (year) where.salaryYear = year;
  const salaries = await SalaryGeneration.findAll({ where });
  return res.json({
    totalEmployees: salaries.length,
    totalGross: salaries.reduce((s, r) => s + toNum(r.grossSalary || 0), 0),
    totalNet: salaries.reduce((s, r) => s + toNum(r.netSalary || 0), 0),
    totalPf: salaries.reduce((s, r) => s + toNum(r.pfAmount || 0), 0),
    totalEsi: salaries.reduce((s, r) => s + toNum(r.esiAmount || 0), 0),
    totalDeductions: salaries.reduce(
      (s, r) => s + toNum(r.totalDeductions || 0),
      0,
    ),
    byStatus: {
      Generated: salaries.filter((s) => s.status === "Generated").length,
      Approved: salaries.filter((s) => s.status === "Approved").length,
      Paid: salaries.filter((s) => s.status === "Paid").length,
    },
  });
};

module.exports = exports;
