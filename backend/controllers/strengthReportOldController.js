// ============================================================
// controllers/strengthReportOldController.js
// ============================================================
// Strength Report Old Controller
// PDF Format:
//   Columns per shift (A/B/C): Strength | S OT (count on OT) | H OT (OT hours)
//   Right summary columns    : Req | STR | H.OT
//
// Strength = COUNT of present employees in that shift (regular + trainee combined)
//            Half Day counts as 0.5
// S OT     = COUNT of employees who have overtimeHours > 0
// H OT     = SUM of overtimeHours for employees with OT
// Req      = Department.strengthRequired (Day Standard)
// STR      = Sum of Strength across all 3 shifts (A+B+C)
// H.OT     = Sum of H OT across all 3 shifts (total OT hours)
//
// Department rows include BOTH regular and trainee employees.
// Trainee departments (T prefix rows like TSPG SIDER, TCARDING, etc.)
//   are listed as separate department rows.
// Category rows (PREPARATORY, SPINNING, AUTOCONER, Others) are section dividers.
// Special sub-sections (8 to 8 Spinning, Mixing Male, etc.) appear as
//   their own grouping after main categories.
// ============================================================

const { Op } = require("sequelize");
const db = require("../models");
const ExcelJS = require("exceljs");

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

    const { Attendance, Employee, Department, Company, Category } = db;

    // ── 0. Company ────────────────────────────────────────────
    const company = await Company.findByPk(companyId, {
      attributes: ["id", "name"],
      raw: true,
    });
    if (!company) return res.status(404).json({ error: "Company not found" });

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
        // Per-shift buckets: strength (headcount), sotCount (on OT), hotHours (OT hours)
        shifts: {
          A: { strength: 0, sotCount: 0, hotHours: 0 },
          B: { strength: 0, sotCount: 0, hotHours: 0 },
          C: { strength: 0, sotCount: 0, hotHours: 0 },
        },
      };
    });

    // ── 2. Present attendances ────────────────────────────────
    const attendances = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: date,
        status: { [Op.in]: ["Present", "Present with Permission", "Half Day"] },
      },
      attributes: ["id", "employeeId", "shiftName", "status", "overtimeHours"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "departmentId", "isTrainee"],
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

    // ── 3. Aggregate per department per shift ─────────────────
    attendances.forEach((att) => {
      const emp = att.employee;
      if (!emp || !emp.department) return;

      const deptId = emp.department.id;
      if (!deptMap[deptId]) return;

      // Shift mapping: A = Shift I, B = Shift II, C = Shift III
      let shiftKey = "A";
      const sn = (att.shiftName || "").toUpperCase();
      if (sn === "B" || sn === "II" || sn === "2") shiftKey = "B";
      else if (sn === "C" || sn === "III" || sn === "3") shiftKey = "C";

      // Strength: 0.5 for Half Day, 1.0 otherwise
      const strengthVal = att.status === "Half Day" ? 0.5 : 1.0;
      const otHours = parseFloat(att.overtimeHours) || 0;

      deptMap[deptId].shifts[shiftKey].strength += strengthVal;
      if (otHours > 0) {
        deptMap[deptId].shifts[shiftKey].sotCount += 1;      // S OT: count on OT
        deptMap[deptId].shifts[shiftKey].hotHours += otHours; // H OT: sum of OT hours
      }
    });

    // ── 4. Format department rows ─────────────────────────────
    const formatShift = (s) => ({
      strength: round(s.strength),
      sotCount: s.sotCount,          // S OT column (count)
      hotHours: round(s.hotHours),   // H OT column (hours)
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
      grandTotal.req += dept.req;
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

    return res.json({
      success: true,
      data: {
        date,
        companyId: parseInt(companyId),
        companyName: company.name,
        categoryGroups: Object.values(categoryGroups),
        grandTotal,
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

    // Re-use the same aggregation logic
    const { Attendance, Employee, Department, Company, Category } = db;

    const company = await Company.findByPk(companyId, { attributes: ["id", "name"], raw: true });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const allDepartments = await Department.findAll({
      where: { companyId },
      attributes: ["id", "departmentname", "strengthRequired", "slno"],
      include: [{ model: Category, as: "category", attributes: ["id", "categoryName", "categoryCode"] }],
      order: [["slno", "ASC"]],
    });

    const deptMap = {};
    allDepartments.forEach((dept) => {
      deptMap[dept.id] = {
        departmentId: dept.id,
        departmentName: dept.departmentname,
        strengthRequired: dept.strengthRequired || 0,
        slno: dept.slno,
        categoryName: dept.category?.categoryName || "Others",
        categoryCode: dept.category?.categoryCode || "OTH",
        shifts: {
          A: { strength: 0, sotCount: 0, hotHours: 0 },
          B: { strength: 0, sotCount: 0, hotHours: 0 },
          C: { strength: 0, sotCount: 0, hotHours: 0 },
        },
      };
    });

    const attendances = await Attendance.findAll({
      where: {
        companyId,
        attendanceDate: date,
        status: { [Op.in]: ["Present", "Present with Permission", "Half Day"] },
      },
      attributes: ["id", "employeeId", "shiftName", "status", "overtimeHours"],
      include: [
        {
          model: Employee,
          as: "employee",
          attributes: ["id", "departmentId", "isTrainee"],
          where: { status: "Active" },
          include: [{ model: Department, as: "department", attributes: ["id", "departmentname", "strengthRequired", "slno"] }],
        },
      ],
      raw: true,
      nest: true,
    });

    attendances.forEach((att) => {
      const emp = att.employee;
      if (!emp || !emp.department) return;
      const deptId = emp.department.id;
      if (!deptMap[deptId]) return;

      let shiftKey = "A";
      const sn = (att.shiftName || "").toUpperCase();
      if (sn === "B" || sn === "II" || sn === "2") shiftKey = "B";
      else if (sn === "C" || sn === "III" || sn === "3") shiftKey = "C";

      const strengthVal = att.status === "Half Day" ? 0.5 : 1.0;
      const otHours = parseFloat(att.overtimeHours) || 0;

      deptMap[deptId].shifts[shiftKey].strength += strengthVal;
      if (otHours > 0) {
        deptMap[deptId].shifts[shiftKey].sotCount += 1;
        deptMap[deptId].shifts[shiftKey].hotHours += otHours;
      }
    });

    const formatShift = (s) => ({
      strength: round(s.strength),
      sotCount: s.sotCount,
      hotHours: round(s.hotHours),
    });

    const departmentRows = Object.values(deptMap)
      .map((dept) => {
        const shiftA = formatShift(dept.shifts.A);
        const shiftB = formatShift(dept.shifts.B);
        const shiftC = formatShift(dept.shifts.C);
        const totalStrength = round(shiftA.strength + shiftB.strength + shiftC.strength);
        const totalHot = round(shiftA.hotHours + shiftB.hotHours + shiftC.hotHours);
        return {
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          categoryName: dept.categoryName,
          req: dept.strengthRequired,
          slno: dept.slno,
          shiftA, shiftB, shiftC,
          totalStrength, totalHot,
        };
      })
      .sort((a, b) => a.slno - b.slno);

    const grandTotal = {
      req: 0,
      shiftA: { strength: 0, sotCount: 0, hotHours: 0 },
      shiftB: { strength: 0, sotCount: 0, hotHours: 0 },
      shiftC: { strength: 0, sotCount: 0, hotHours: 0 },
      totalStrength: 0,
      totalHot: 0,
    };
    departmentRows.forEach((dept) => {
      grandTotal.req += dept.req;
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

    // ── Build Excel ───────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Payroll System";
    wb.created = new Date();

    const ws = wb.addWorksheet("Strength Report", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const dateLabel = formatDateLabel(date);
    const TITLE_BG   = "FF1E3A8A";
    const HEADER_FG  = "FFFFFFFF";
    const SHIFT_A_BG = "FFDBEAFE";
    const SHIFT_B_BG = "FFFDE68A";
    const SHIFT_C_BG = "FFD1FAE5";
    const OVERALL_BG = "FFE9D5FF";
    const CAT_BG     = "FFF1F5F9";
    const GRAND_BG   = "FFE2E8F0";

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

    ws.mergeCells(3, 1, 4, 1); setCell(3, 1, "Deptname",  "FFF1F5F9", { align: "left" });
    ws.mergeCells(3, 2, 3, 4); setCell(3, 2, "A",         SHIFT_A_BG, { fontColor: "FF1E40AF" });
    ws.mergeCells(3, 5, 3, 7); setCell(3, 5, "B",         SHIFT_B_BG, { fontColor: "FF92400E" });
    ws.mergeCells(3, 8, 3, 10); setCell(3, 8, "C",        SHIFT_C_BG, { fontColor: "FF065F46" });
    ws.mergeCells(3, 11, 4, 11); setCell(3, 11, "Req",    OVERALL_BG);
    ws.mergeCells(3, 12, 4, 12); setCell(3, 12, "STR",    OVERALL_BG);
    ws.mergeCells(3, 13, 4, 13); setCell(3, 13, "H.OT",   OVERALL_BG);

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
        // Render all departments regardless of employee count/headcount data presence
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
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
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