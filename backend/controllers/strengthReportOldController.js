// ============================================================
// controllers/strengthReportOldController.js
// ============================================================
// Strength Report Old Controller
// PDF Format:
//   Columns per shift (A/B/C): Strength | S OT (count on Full OT) | H OT (Hours OT sum)
//   Right summary columns    : Req | STR | H.OT
//
// Strength = COUNT of present employees in that shift (regular + trainee combined)
//            Half Day / Present/Leave counts as 0.5
//            If an employee has Full OT entry or worked on their week off / leave date, their count is excluded from Strength.
// S OT     = COUNT of employees with manual Full OT entry (OTHours) OR who worked on their week off / approved leave date
// H OT     = SUM of manual Hours OT (OTHours with otTypeId = 1 or HOURS OT)
// Req      = Department.strengthRequired (Day Standard)
// STR      = Sum of Strength across all 3 shifts (A+B+C)
// H.OT     = Sum of H OT across all 3 shifts (total OT hours)
//
// Department rows include BOTH regular and trainee employees.
// Trainee departments (T prefix rows like TSPG SIDER, TCARDING, etc.)
//   are listed as separate department rows.
// Category rows (PREPARATORY, SPINNING, AUTOCONER, Others) are section dividers.
// ============================================================

const { Op } = require("sequelize");
const db = require("../models");
const ExcelJS = require("exceljs");
const moment = require("moment");

/**
 * Helper: Resolve shift key (A, B, C) from shiftName / shiftId
 */
function resolveShiftKey(shiftName, shiftId) {
  const sn = (shiftName || "").trim().toUpperCase();
  if (
    sn === "B" ||
    sn === "II" ||
    sn === "2" ||
    sn.endsWith("_B") ||
    sn.endsWith(" B") ||
    sn === "SHIFT B" ||
    sn === "SHIFT II" ||
    sn === "SHIFT 2" ||
    shiftId === 2
  ) {
    return "B";
  }
  if (
    sn === "C" ||
    sn === "III" ||
    sn === "3" ||
    sn.endsWith("_C") ||
    sn.endsWith(" C") ||
    sn === "SHIFT C" ||
    sn === "SHIFT III" ||
    sn === "SHIFT 3" ||
    shiftId === 3
  ) {
    return "C";
  }
  if (sn.includes("B") && !sn.includes("A") && !sn.includes("C")) {
    return "B";
  }
  if (sn.includes("C") && !sn.includes("A") && !sn.includes("B")) {
    return "C";
  }
  return "A";
}

/**
 * Helper: Check if date is employee's week off day
 */
function isEmployeeWeekOffDay(emp, targetDate, att) {
  if (att && (att.isWeekOff === true || att.isWeekOff === 1 || att.isWeekOff === "true")) {
    return true;
  }
  if (!emp) return false;
  const rawWeeklyOff = (emp.weeklyOff || "").trim();
  const dayOfWeek = moment(targetDate).format("dddd").toUpperCase();

  if (!rawWeeklyOff) {
    return dayOfWeek === "SUNDAY";
  }
  if (rawWeeklyOff === "-" || rawWeeklyOff.toUpperCase() === "NO WEEKLY") {
    return false;
  }
  const offDays = rawWeeklyOff.split(",").map((d) => d.trim().toUpperCase());
  return offDays.includes(dayOfWeek);
}

/**
 * Shared data generator for JSON report & Excel export
 */
async function generateStrengthReportData(companyId, date) {
  const { Attendance, Employee, Department, Company, Category, OTHours, ShiftType, LeaveRequest } = db;
  const targetDate = moment(date).format("YYYY-MM-DD");

  // ── 0. Company ────────────────────────────────────────────
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name"],
    raw: true,
  });
  if (!company) return null;

  // ── 1. All departments ordered by slno ────────────────────
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

  // Build dept map: deptId -> aggregation bucket
  const deptMap = {};
  allDepartments.forEach((dept) => {
    deptMap[dept.id] = {
      departmentId: dept.id,
      departmentName: dept.departmentname,
      strengthRequired: dept.strengthRequired || 0,
      slno: dept.slno,
      categoryName: dept.category?.categoryName || "Others",
      categoryCode: dept.category?.categoryCode || "OTH",
      // Per-shift buckets: strength (headcount), sotCount (Full OT count), hotHours (Hours OT sum)
      shifts: {
        A: { strength: 0, sotCount: 0, hotHours: 0 },
        B: { strength: 0, sotCount: 0, hotHours: 0 },
        C: { strength: 0, sotCount: 0, hotHours: 0 },
      },
    };
  });

  // ── 2a. Manual OT entries (OTHours) ───────────────────────
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
        attributes: ["id", "departmentId", "isTrainee"],
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

  const fullOtEmpShiftSet = new Set(); // Stores `${employeeId}_${shiftKey}`

  otRecords.forEach((ot) => {
    const deptId = ot.workedDeptId || ot.departmentId || ot.employee?.departmentId;
    if (!deptId || !deptMap[deptId]) return;

    const shiftKey = resolveShiftKey(ot.shift?.name, ot.shiftId);
    const isFullOt = ot.otTypeId === 2 || (ot.otType && String(ot.otType).toUpperCase().includes("FULL"));

    if (isFullOt) {
      deptMap[deptId].shifts[shiftKey].sotCount += 1;
      if (ot.employeeId) {
        fullOtEmpShiftSet.add(`${ot.employeeId}_${shiftKey}`);
      }
    } else {
      const hours = parseFloat(ot.otHours) || 0;
      deptMap[deptId].shifts[shiftKey].hotHours += hours;
    }
  });

  // ── 2b. Approved Leave Requests on date ────────────────────
  const leaveRecords = await LeaveRequest.findAll({
    where: {
      companyId,
      status: "Approved",
      startDate: { [Op.lte]: targetDate },
      endDate: { [Op.gte]: targetDate },
    },
    attributes: ["employeeId"],
    raw: true,
  });
  const leaveEmpSet = new Set(leaveRecords.map((l) => l.employeeId));

  // ── 2c. Present attendances ───────────────────────────────
  const attendances = await Attendance.findAll({
    where: {
      companyId,
      attendanceDate: targetDate,
      status: { [Op.in]: ["Present", "Present with Permission", "Present/Leave (P/L)", "Half Day"] },
    },
    attributes: ["id", "employeeId", "departmentId", "workedDeptId", "shiftName", "status", "isWeekOff"],
    include: [
      {
        model: Department,
        as: "workedDepartment",
        attributes: ["id", "departmentname", "strengthRequired", "slno"],
        required: false,
      },
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "departmentId", "isTrainee", "weeklyOff"],
        where: { status: "Active" },
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "departmentname", "strengthRequired", "slno"],
          },
        ],
      },
    ],
    raw: true,
    nest: true,
  });

  // ── 3. Aggregate strength per department per shift ─────────
  attendances.forEach((att) => {
    const emp = att.employee;
    if (!emp) return;

    const dept = att.workedDepartment || emp.department;
    const deptId = att.workedDeptId || att.departmentId || (dept ? dept.id : null) || emp.departmentId;
    if (!deptId || !deptMap[deptId]) return;

    const shiftKey = resolveShiftKey(att.shiftName);

    // 1. If an employee has manual Full OT entry in this shift, they were already added to sotCount in 2a, so exclude from Strength
    if (fullOtEmpShiftSet.has(`${att.employeeId}_${shiftKey}`)) {
      return;
    }

    // 2. If employee came to work on their week off day OR approved leave date:
    //    Count is added to SOT of worked department and removed from Strength
    const isWeekOff = isEmployeeWeekOffDay(emp, targetDate, att);
    const isOnLeaveDate = leaveEmpSet.has(att.employeeId);

    if (isWeekOff || isOnLeaveDate) {
      deptMap[deptId].shifts[shiftKey].sotCount += 1;
      return; // Excluded/removed from Strength
    }

    // 3. Normal Strength: 0.5 for Half Day / Present/Leave, 1.0 otherwise
    const strengthVal = (att.status === "Half Day" || att.status === "Present/Leave (P/L)" || att.status === "Present/Leave") ? 0.5 : 1.0;
    deptMap[deptId].shifts[shiftKey].strength += strengthVal;
  });

  // ── 4. Format department rows ─────────────────────────────
  const formatShift = (s) => ({
    strength: round(s.strength),
    sotCount: s.sotCount,          // S OT column (Full OT count)
    hotHours: round(s.hotHours),   // H OT column (Hours OT sum)
  });

  const departmentRows = Object.values(deptMap)
    .map((dept) => {
      const shiftA = formatShift(dept.shifts.A);
      const shiftB = formatShift(dept.shifts.B);
      const shiftC = formatShift(dept.shifts.C);

      // STR = total strength across all shifts
      const totalStrength = round(shiftA.strength + shiftB.strength + shiftC.strength);
      // H.OT = total OT hours across all shifts
      const totalHot = round(shiftA.hotHours + shiftB.hotHours + shiftC.hotHours);

      return {
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        categoryName: dept.categoryName,
        categoryCode: dept.categoryCode,
        req: dept.strengthRequired,    // Req column
        slno: dept.slno,
        shiftA,
        shiftB,
        shiftC,
        totalStrength, // STR column
        totalHot,      // H.OT column
      };
    })
    .sort((a, b) => a.slno - b.slno);

  // ── 5. Group by category ──────────────────────────────────
  const categoryGroups = {};
  departmentRows.forEach((dept) => {
    const cat = dept.categoryName || "Others";
    if (!categoryGroups[cat]) {
      categoryGroups[cat] = { categoryName: cat, departments: [] };
    }
    categoryGroups[cat].departments.push(dept);
  });

  // ── 6. Grand Total ────────────────────────────────────────
  const grandTotal = {
    req: 0,
    shiftA: { strength: 0, sotCount: 0, hotHours: 0 },
    shiftB: { strength: 0, sotCount: 0, hotHours: 0 },
    shiftC: { strength: 0, sotCount: 0, hotHours: 0 },
    totalStrength: 0,
    totalHot: 0,
  };

  departmentRows.forEach((dept) => {
    grandTotal.req += parseFloat(dept.req) || 0;
    ["shiftA", "shiftB", "shiftC"].forEach((s) => {
      grandTotal[s].strength += dept[s].strength;
      grandTotal[s].sotCount += dept[s].sotCount;
      grandTotal[s].hotHours += dept[s].hotHours;
    });
    grandTotal.totalStrength += dept.totalStrength;
    grandTotal.totalHot += dept.totalHot;
  });

  grandTotal.req = round(grandTotal.req);
  ["shiftA", "shiftB", "shiftC"].forEach((s) => {
    grandTotal[s].strength = round(grandTotal[s].strength);
    grandTotal[s].hotHours = round(grandTotal[s].hotHours);
  });
  grandTotal.totalStrength = round(grandTotal.totalStrength);
  grandTotal.totalHot = round(grandTotal.totalHot);

  return {
    company,
    targetDate,
    departmentRows,
    categoryGroups: Object.values(categoryGroups),
    grandTotal,
  };
}

/**
 * GET /api/strength-report-old
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

    return res.json({
      success: true,
      data: {
        date,
        companyId: parseInt(companyId),
        companyName: reportData.company.name,
        categoryGroups: reportData.categoryGroups,
        grandTotal: reportData.grandTotal,
      },
    });
  } catch (error) {
    console.error("Strength Report Old Error:", error);
    return res.status(500).json({
      error: "Failed to generate strength report",
      details: error.message,
    });
  }
};

/**
 * GET /api/strength-report-old/export-excel
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

    const { company, departmentRows, grandTotal } = reportData;

    // ── Build Excel ───────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Payroll System";
    wb.created = new Date();

    const ws = wb.addWorksheet("Strength Report", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const dateLabel = formatDateLabel(date);
    const TITLE_BG = "FF1E3A8A";
    const HEADER_FG = "FFFFFFFF";
    const SHIFT_A_BG = "FFDBEAFE";
    const SHIFT_B_BG = "FFFDE68A";
    const SHIFT_C_BG = "FFD1FAE5";
    const OVERALL_BG = "FFE9D5FF";
    const CAT_BG = "FFF1F5F9";
    const GRAND_BG = "FFE2E8F0";

    // Total columns: 1 (Dept) + 3 shifts × 3 cols + 3 (Req/STR/HOT) = 13
    const TOTAL_COLS = 13;

    // Row 1: Company title
    ws.mergeCells(`A1:M1`);
    const r1 = ws.getCell("A1");
    r1.value = company.name;
    r1.font = { bold: true, size: 13, color: { argb: HEADER_FG } };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
    r1.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 28;

    // Row 2: Subtitle
    ws.mergeCells("A2:M2");
    const r2 = ws.getCell("A2");
    r2.value = `Strength Report From ${dateLabel} to ${dateLabel}`;
    r2.font = { bold: true, size: 10, color: { argb: HEADER_FG } };
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_BG } };
    r2.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 20;

    // Row 3: Group headers
    // Col layout: A=Deptname | B-D=A | E-G=B | H-J=C | K=Req | L=STR | M=H.OT
    const grpRow = ws.getRow(3);
    grpRow.height = 18;

    const setCell = (row, col, val, bgArgb, opts = {}) => {
      const c = ws.getCell(row, col);
      c.value = val;
      c.font = { bold: true, size: 9, color: { argb: opts.fontColor || "FF1E293B" }, ...(opts.font || {}) };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      c.alignment = { horizontal: opts.align || "center", vertical: "middle", wrapText: true };
      c.border = thin();
      return c;
    };

    ws.mergeCells(3, 1, 4, 1); setCell(3, 1, "Deptname", "FFF1F5F9", { align: "left" });
    ws.mergeCells(3, 2, 3, 4); setCell(3, 2, "A", SHIFT_A_BG, { fontColor: "FF1E40AF" });
    ws.mergeCells(3, 5, 3, 7); setCell(3, 5, "B", SHIFT_B_BG, { fontColor: "FF92400E" });
    ws.mergeCells(3, 8, 3, 10); setCell(3, 8, "C", SHIFT_C_BG, { fontColor: "FF065F46" });
    ws.mergeCells(3, 11, 4, 11); setCell(3, 11, "Req", OVERALL_BG);
    ws.mergeCells(3, 12, 4, 12); setCell(3, 12, "STR", OVERALL_BG);
    ws.mergeCells(3, 13, 4, 13); setCell(3, 13, "H.OT", OVERALL_BG);

    // Row 4: Sub-headers for shifts
    const subHeaders = ["Strength", "S OT", "H OT"];
    const shiftBgs = [SHIFT_A_BG, SHIFT_B_BG, SHIFT_C_BG];
    subHeaders.forEach((h, i) => {
      setCell(4, 2 + i, h, shiftBgs[0]);
      setCell(4, 5 + i, h, shiftBgs[1]);
      setCell(4, 8 + i, h, shiftBgs[2]);
    });

    // Column widths
    ws.getColumn(1).width = 26;
    for (let c = 2; c <= 13; c++) ws.getColumn(c).width = 9;

    // Group departments by category
    const grouped = {};
    departmentRows.forEach((d) => {
      const cat = d.categoryName || "Others";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(d);
    });

    let ri = 5;

    Object.entries(grouped).forEach(([catName, depts]) => {
      // Category header row
      ws.mergeCells(ri, 1, ri, TOTAL_COLS);
      const catCell = ws.getCell(ri, 1);
      catCell.value = catName.toUpperCase();
      catCell.font = { bold: true, size: 9, color: { argb: "FF334155" } };
      catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CAT_BG } };
      catCell.alignment = { horizontal: "left", vertical: "middle" };
      for (let c = 1; c <= TOTAL_COLS; c++) ws.getCell(ri, c).border = thin();
      ws.getRow(ri).height = 16;
      ri++;

      depts.forEach((dept) => {
        const row = ws.getRow(ri++);
        row.height = 15;

        const vals = [
          dept.departmentName,
          cellVal(dept.shiftA.strength), dept.shiftA.sotCount || "-", cellVal(dept.shiftA.hotHours),
          cellVal(dept.shiftB.strength), dept.shiftB.sotCount || "-", cellVal(dept.shiftB.hotHours),
          cellVal(dept.shiftC.strength), dept.shiftC.sotCount || "-", cellVal(dept.shiftC.hotHours),
          dept.req || "-",
          cellVal(dept.totalStrength),
          cellVal(dept.totalHot),
        ];

        vals.forEach((v, idx) => {
          const c = row.getCell(idx + 1);
          c.value = v;
          c.font = { size: 9, bold: idx >= 10 };
          c.alignment = { horizontal: idx === 0 ? "left" : "center", vertical: "middle" };
          c.border = thin();
          if (idx >= 10) {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
          }
        });
      });
    });

    // Grand Total
    const gtRow = ws.getRow(ri++);
    gtRow.height = 18;
    const gtVals = [
      "Grand Total",
      cellVal(grandTotal.shiftA.strength), grandTotal.shiftA.sotCount || "-", cellVal(grandTotal.shiftA.hotHours),
      cellVal(grandTotal.shiftB.strength), grandTotal.shiftB.sotCount || "-", cellVal(grandTotal.shiftB.hotHours),
      cellVal(grandTotal.shiftC.strength), grandTotal.shiftC.sotCount || "-", cellVal(grandTotal.shiftC.hotHours),
      grandTotal.req,
      cellVal(grandTotal.totalStrength),
      cellVal(grandTotal.totalHot),
    ];
    gtVals.forEach((v, i) => {
      const c = gtRow.getCell(i + 1);
      c.value = v;
      c.font = { bold: true, size: 10 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAND_BG } };
      c.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle" };
      c.border = thin();
    });

    // Signatures
    ri += 3;
    const sigLabels = ["PREPARED", "AM (Trg)", "M (QAT)", "AM(Prod)", "Sr.M (M)", "M (Ele)", "AM (Pers)", "PM", "GM (T)", "MANAGING DIRECTOR"];
    sigLabels.forEach((label, idx) => {
      const col = idx + 1;
      // space row
      const spaceCell = ws.getCell(ri - 1, col);
      spaceCell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };

      const c = ws.getCell(ri, col);
      c.value = label;
      c.font = { size: 8, bold: true, color: { argb: "FF475569" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    ws.getRow(ri).height = 16;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Strength_Report_${date}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export Excel", details: err.message });
  }
};

// ── Helpers ──────────────────────────────────────────────────
function round(val, decimals = 1) {
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function cellVal(val) {
  if (val === 0 || val === null || val === undefined) return "-";
  return val;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function thin() {
  const s = { style: "thin", color: { argb: "FFCBD5E1" } };
  return { top: s, left: s, bottom: s, right: s };
}