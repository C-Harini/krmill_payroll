// ============================================================
// controllers/bonusReportController.js
// ============================================================
// Bonus Report (Month wise Present Details)
// - Filters: companyId, categoryIds (multi-select), startMonth, endMonth
// - Contents match sample report BONUS 2025 2026.pdf
// - Dept name acronym only
// - Wages = 25 * (Rs/Day)
// - Exports: Excel (.xlsx) and PDF (.pdf)
// ============================================================

const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const db = require("../models");

const { Company, Category, Department, Employee, EmployeeSalaryMaster, Attendance, SalaryGeneration } = db;

// ── Helpers ──────────────────────────────────────────────────
const parseCategoryIds = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    const ids = val.map((v) => parseInt(v, 10)).filter(Boolean);
    return ids.length ? ids : null;
  }
  const ids = String(val)
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter(Boolean);
  return ids.length ? ids : null;
};

const getMonthRange = (startMonthStr, endMonthStr) => {
  // Default: Oct 2025 to Sep 2026 if not specified
  const start = startMonthStr ? moment(startMonthStr, "YYYY-MM").startOf("month") : moment().subtract(1, "year").month(9).startOf("month");
  const end = endMonthStr ? moment(endMonthStr, "YYYY-MM").startOf("month") : moment().month(8).startOf("month");

  if (!start.isValid() || !end.isValid()) {
    throw new Error("Invalid startMonth or endMonth format (expected YYYY-MM)");
  }
  if (start.isAfter(end)) {
    throw new Error("startMonth must be earlier than or equal to endMonth");
  }

  const months = [];
  const cur = start.clone();
  while (cur.isSameOrBefore(end)) {
    months.push({
      key: cur.format("YYYY-MM"),
      label: cur.format("MMM-YY"), // e.g. Oct-25
      fullLabel: cur.format("MMMM YYYY"),
      year: cur.year(),
      month: cur.month() + 1,
      startDate: cur.clone().startOf("month").format("YYYY-MM-DD"),
      endDate: cur.clone().endOf("month").format("YYYY-MM-DD"),
    });
    cur.add(1, "month");
  }

  const startDateStr = start.format("01-MM-YYYY");
  const endDateStr = end.clone().endOf("month").format("DD-MM-YYYY");
  const startYear = start.year();
  const endYear = end.year();

  return { months, startDateStr, endDateStr, startYear, endYear, rawStart: start.format("YYYY-MM-01"), rawEnd: end.clone().endOf("month").format("YYYY-MM-DD") };
};

// ── Core Data Fetcher ─────────────────────────────────────────
async function fetchBonusReportData({ companyId, categoryIds, startMonth, endMonth }) {
  if (!companyId) {
    throw new Error("companyId is required");
  }

  const { months, startDateStr, endDateStr, startYear, endYear, rawStart, rawEnd } = getMonthRange(startMonth, endMonth);

  // 1. Company
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name"],
  });
  const companyName = company?.name || "Company";

  // 2. Filter employees
  const catIdList = parseCategoryIds(categoryIds);
  const employeeWhere = { companyId };
  if (catIdList && catIdList.length > 0) {
    employeeWhere.categoryId = { [Op.in]: catIdList };
  }

  const employees = await Employee.findAll({
    where: employeeWhere,
    attributes: [
      "id",
      "curEmployeeCode",
      "newEmployeeCode",
      "firstName",
      "lastName",
      "dateOfJoining",
      "basicSalary",
      "categoryId",
      "departmentId",
      "employmentTypeId",
      "status",
    ],
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["id", "categoryName", "categoryCode"],
      },
      {
        model: Department,
        as: "department",
        attributes: ["id", "departmentname", "acronym"],
      },
    ],
    order: [
      [{ model: Category, as: "category" }, "id", "ASC"],
      ["curEmployeeCode", "ASC"],
      ["id", "ASC"],
    ],
  });

  if (!employees.length) {
    return {
      companyName,
      startDateStr,
      endDateStr,
      startYear,
      endYear,
      months,
      categories: [],
      monthTotals: {},
      grandTotal: 0,
      totalEmployees: 0,
    };
  }

  const empIds = employees.map((e) => e.id);

  // 3. Latest active salary masters for daily wage (Rs/Day)
  const salaryMasters = await EmployeeSalaryMaster.findAll({
    where: { employeeId: { [Op.in]: empIds } },
    order: [
      ["effectiveFrom", "DESC"],
      ["id", "DESC"],
    ],
  });
  const salaryMasterMap = {};
  for (const sm of salaryMasters) {
    if (!salaryMasterMap[sm.employeeId]) {
      salaryMasterMap[sm.employeeId] = sm;
    }
  }

  // 4. Attendance counts per employee per month
  const attendanceRows = await db.sequelize.query(
    `SELECT 
       employeeId,
       DATE_FORMAT(attendanceDate, '%Y-%m') AS ym,
       SUM(
         CASE 
           WHEN status IN ('Present', 'Present with Permission') THEN 1.0
           WHEN status IN ('Half Day', 'Present/Leave (P/L)', 'Present/Leave') THEN 0.5
           WHEN status IN ('NH', 'FH') THEN 1.0
           WHEN status = 'Holiday' AND (workingHours >= 7 OR firstCheckIn IS NOT NULL) THEN 1.0
           WHEN status = 'Holiday' AND workingHours >= 4 THEN 0.5
           ELSE 0.0
         END
       ) AS presentCount
     FROM attendances
     WHERE companyId = :companyId
       AND attendanceDate BETWEEN :rawStart AND :rawEnd
       AND employeeId IN (:empIds)
     GROUP BY employeeId, ym`,
    {
      replacements: { companyId, rawStart, rawEnd, empIds },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  const attMap = {};
  for (const row of attendanceRows) {
    if (!attMap[row.employeeId]) attMap[row.employeeId] = {};
    attMap[row.employeeId][row.ym] = parseFloat(row.presentCount) || 0;
  }

  // 5. SalaryGeneration fallback for generated months
  const salaryGenRows = await SalaryGeneration.findAll({
    where: {
      companyId,
      employeeId: { [Op.in]: empIds },
      [Op.or]: months.map((m) => ({ salaryYear: m.year, salaryMonth: m.month })),
    },
    attributes: ["employeeId", "salaryMonth", "salaryYear", "presentDays", "nhFhDays"],
  });

  const sgMap = {};
  for (const sg of salaryGenRows) {
    if (!sgMap[sg.employeeId]) sgMap[sg.employeeId] = {};
    const ym = `${sg.salaryYear}-${String(sg.salaryMonth).padStart(2, "0")}`;
    sgMap[sg.employeeId][ym] = (parseFloat(sg.presentDays) || 0) + (parseFloat(sg.nhFhDays) || 0);
  }

  // 6. Build Category groups with employees
  const categoriesMap = {};
  let overallSlNo = 1;
  const monthTotals = {};
  months.forEach((m) => {
    monthTotals[m.key] = 0;
  });
  let grandTotal = 0;

  for (const emp of employees) {
    const catName = (emp.category?.categoryName || "OTHERS").toUpperCase().trim();
    if (!categoriesMap[catName]) {
      categoriesMap[catName] = {
        categoryId: emp.categoryId,
        categoryName: catName,
        employees: [],
      };
    }

    // Resolve Rs/Day
    const sm = salaryMasterMap[emp.id];
    const rsPerDay = parseFloat(
      sm?.wagesPerDay || sm?.grossSalary || sm?.basicSalary || emp.basicSalary || 0
    );

    // User requirement: "and wgaes is the 25 * Rs./Day"
    const wages = Math.round(25 * rsPerDay * 100) / 100;

    // Dept name: "dept name should be the acronym only"
    const deptAcronym = (emp.department?.acronym || emp.department?.departmentname || "").trim();

    // Employee Code / Ticket No
    const ticketNo = emp.curEmployeeCode || emp.newEmployeeCode || String(emp.id);

    // Name
    const empName = [emp.firstName, emp.lastName].filter(Boolean).join(" ").trim();

    // DOJ format DD-MM-YYYY
    const doj = emp.dateOfJoining ? moment(emp.dateOfJoining).format("DD-MM-YYYY") : "-";

    // Months attendance values
    const monthDays = {};
    let empTotal = 0;

    for (const m of months) {
      let pDays = attMap[emp.id]?.[m.key];
      if (pDays === undefined || pDays === null) {
        pDays = sgMap[emp.id]?.[m.key] !== undefined ? sgMap[emp.id][m.key] : 0;
      }
      pDays = Math.round(pDays * 10) / 10;
      monthDays[m.key] = pDays > 0 ? pDays : null;
      empTotal += pDays;
      monthTotals[m.key] = Math.round((monthTotals[m.key] + pDays) * 10) / 10;
    }

    empTotal = Math.round(empTotal * 10) / 10;
    grandTotal = Math.round((grandTotal + empTotal) * 10) / 10;

    categoriesMap[catName].employees.push({
      slNo: overallSlNo++,
      employeeId: emp.id,
      ticketNo,
      empName,
      dept: deptAcronym,
      doj,
      rsPerDay,
      wages,
      monthDays,
      total: empTotal,
    });
  }

  const categories = Object.values(categoriesMap);

  return {
    companyName,
    startDateStr,
    endDateStr,
    startYear,
    endYear,
    months,
    categories,
    monthTotals,
    grandTotal,
    totalEmployees: employees.length,
  };
}

// ── GET /api/bonus-report ─────────────────────────────────────
exports.getBonusReport = async (req, res) => {
  try {
    const data = await fetchBonusReportData(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[getBonusReport] Error:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ── GET /api/bonus-report/export/excel ─────────────────────────
exports.exportBonusReportExcel = async (req, res) => {
  try {
    const data = await fetchBonusReportData(req.query);
    const { companyName, startDateStr, endDateStr, startYear, endYear, months, categories, monthTotals, grandTotal } = data;

    const wb = new ExcelJS.Workbook();
    wb.creator = "Payroll System";
    const ws = wb.addWorksheet("Bonus Report", {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // Filename: "Bonus Report from start year to end year"
    const filename =
      startYear === endYear
        ? `Bonus_Report_${startYear}.xlsx`
        : `Bonus_Report_${startYear}_to_${endYear}.xlsx`;

    const totalCols = 7 + months.length + 1; // Sl.No, Tkt.No, Emp Name, Dept, DOJ, Rs/Day, Wages + Months + Total

    // Header styling helpers
    const thinBorder = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    // Row 1: Company Title
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = companyName;
    titleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: "FF0F172A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 24;

    // Row 2: Subtitle
    ws.mergeCells(2, 1, 2, totalCols);
    const subCell = ws.getCell(2, 1);
    subCell.value = `Month wise Present Details From ${startDateStr} to ${endDateStr} Reports`;
    subCell.font = { name: "Arial", size: 10, bold: false, color: { argb: "FF475569" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 18;

    // Row 3: Blank separator
    ws.getRow(3).height = 6;

    // Row 4: Column Headers
    const headers = [
      "Sl.No",
      "Tkt.No",
      "Emp Name",
      "Dept",
      "DOJ",
      "Rs/Day",
      "Wages",
      ...months.map((m) => m.label),
      "Total",
    ];
    const headerRow = ws.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Dark slate
      };
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = {
        horizontal: colNumber === 3 ? "left" : colNumber >= 6 ? "right" : "center",
        vertical: "middle",
      };
      cell.border = thinBorder;
    });

    let currentExcelRow = 5;

    // Rows by Category
    for (const cat of categories) {
      // Category banner row
      ws.mergeCells(currentExcelRow, 1, currentExcelRow, totalCols);
      const catCell = ws.getCell(currentExcelRow, 1);
      catCell.value = cat.categoryName;
      catCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF1E3A8A" } };
      catCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" }, // Soft slate background
      };
      catCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      for (let c = 1; c <= totalCols; c++) {
        ws.getCell(currentExcelRow, c).border = thinBorder;
      }
      ws.getRow(currentExcelRow).height = 19;
      currentExcelRow++;

      // Employee Rows
      for (const emp of cat.employees) {
        const rowVals = [
          emp.slNo,
          emp.ticketNo,
          emp.empName,
          emp.dept,
          emp.doj,
          emp.rsPerDay,
          emp.wages,
          ...months.map((m) => (emp.monthDays[m.key] !== null ? emp.monthDays[m.key] : "-")),
          emp.total,
        ];
        const row = ws.addRow(rowVals);
        row.height = 17;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial", size: 8.5 };
          cell.border = thinBorder;

          if (colNumber === 1 || colNumber === 2 || colNumber === 4 || colNumber === 5) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (colNumber === 3) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else if (colNumber === 6 || colNumber === 7) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.numFmt = "#,##0.00";
          } else if (colNumber > 7 && colNumber < totalCols) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            if (typeof cell.value === "number") {
              cell.numFmt = "0.0";
            } else {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
          } else if (colNumber === totalCols) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.font = { name: "Arial", size: 8.5, bold: true };
            cell.numFmt = "0.0";
          }
        });
        currentExcelRow++;
      }
    }

    // Grand Totals Row
    const totalsRowVals = [
      "",
      "",
      "",
      "",
      "",
      "",
      "Total",
      ...months.map((m) => monthTotals[m.key] || 0),
      grandTotal,
    ];
    const totalRow = ws.addRow(totalsRowVals);
    totalRow.height = 20;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
      cell.border = {
        top: { style: "medium", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: thinBorder.left,
        right: thinBorder.right,
      };

      if (colNumber === 7) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (colNumber > 7) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "0.0";
      }
    });

    // Column widths
    ws.getColumn(1).width = 7; // Sl.No
    ws.getColumn(2).width = 11; // Tkt.No
    ws.getColumn(3).width = 26; // Emp Name
    ws.getColumn(4).width = 11; // Dept
    ws.getColumn(5).width = 13; // DOJ
    ws.getColumn(6).width = 11; // Rs/Day
    ws.getColumn(7).width = 13; // Wages
    for (let i = 0; i < months.length; i++) {
      ws.getColumn(8 + i).width = 9.5;
    }
    ws.getColumn(totalCols).width = 12; // Total

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[exportBonusReportExcel] Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/bonus-report/export/pdf ───────────────────────────
exports.exportBonusReportPdf = async (req, res) => {
  try {
    const data = await fetchBonusReportData(req.query);
    const { companyName, startDateStr, endDateStr, startYear, endYear, months, categories, monthTotals, grandTotal } = data;

    // Use A3 landscape for generous layout and readability
    const doc = new PDFDocument({
      size: "A3",
      layout: "landscape",
      margin: 25,
      bufferPages: true,
    });

    const filename =
      startYear === endYear
        ? `Bonus_Report_${startYear}.pdf`
        : `Bonus_Report_${startYear}_to_${endYear}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 50; // 1190.55 - 50 = ~1140 pt
    const startX = 25;
    let y = 25;

    // Dynamic column width allocation
    const colSl = 32;
    const colTkt = 52;
    const colName = 160;
    const colDept = 55;
    const colDoj = 65;
    const colRate = 54;
    const colWages = 60;
    const colTotal = 56;
    const fixedWidth = colSl + colTkt + colName + colDept + colDoj + colRate + colWages + colTotal; // 544 pt
    const remainingWidth = pageWidth - fixedWidth;
    const monthColWidth = Math.max(34, Math.floor(remainingWidth / months.length));

    const cols = [
      { key: "slNo", label: "Sl.No", width: colSl, align: "center" },
      { key: "ticketNo", label: "Tkt.No", width: colTkt, align: "center" },
      { key: "empName", label: "Emp Name", width: colName, align: "left" },
      { key: "dept", label: "Dept", width: colDept, align: "center" },
      { key: "doj", label: "DOJ", width: colDoj, align: "center" },
      { key: "rsPerDay", label: "Rs/Day", width: colRate, align: "right" },
      { key: "wages", label: "Wages", width: colWages, align: "right" },
      ...months.map((m) => ({ key: m.key, label: m.label, width: monthColWidth, align: "right" })),
      { key: "total", label: "Total", width: colTotal, align: "right" },
    ];

    const actualTableWidth = cols.reduce((sum, c) => sum + c.width, 0);

    const drawHeader = (isNew = false) => {
      if (isNew) {
        doc.addPage();
        y = 25;
      }

      // Title & Subtitle
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#0F172A").text(companyName, startX, y, {
        width: actualTableWidth,
        align: "center",
      });
      y += 15;

      doc.fontSize(8.5).font("Helvetica").fillColor("#475569").text(
        `Month wise Present Details From ${startDateStr} to ${endDateStr} Reports`,
        startX,
        y,
        { width: actualTableWidth, align: "center" }
      );
      y += 14;

      // Table Header Row
      let curX = startX;
      doc.fontSize(7.5).font("Helvetica-Bold");
      cols.forEach((c) => {
        doc.rect(curX, y, c.width, 16).fillAndStroke("#1E293B", "#1E293B");
        doc.fillColor("#FFFFFF").text(c.label, curX + 2, y + 4.5, {
          width: c.width - 4,
          align: c.align,
        });
        curX += c.width;
      });
      doc.fillColor("#000000");
      y += 16;
    };

    drawHeader();

    const pageBottomLimit = doc.page.height - 35; // ~807 pt

    for (const cat of categories) {
      if (y + 35 > pageBottomLimit) {
        drawHeader(true);
      }

      // Category Section Banner
      doc.rect(startX, y, actualTableWidth, 14).fillAndStroke("#E2E8F0", "#CBD5E1");
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#1E3A8A")
        .text(`${cat.categoryName}`, startX + 6, y + 3, {
          width: actualTableWidth - 12,
          align: "left",
        });
      y += 14;

      for (const emp of cat.employees) {
        if (y + 14 > pageBottomLimit) {
          drawHeader(true);
        }

        let curX = startX;
        doc.fontSize(7).font("Helvetica").fillColor("#1E293B");

        cols.forEach((c) => {
          doc.rect(curX, y, c.width, 13).stroke("#E2E8F0");

          let val = "";
          if (c.key === "slNo") val = String(emp.slNo);
          else if (c.key === "ticketNo") val = String(emp.ticketNo);
          else if (c.key === "empName") val = emp.empName;
          else if (c.key === "dept") val = emp.dept;
          else if (c.key === "doj") val = emp.doj;
          else if (c.key === "rsPerDay") val = emp.rsPerDay.toFixed(2);
          else if (c.key === "wages") val = emp.wages.toFixed(2);
          else if (c.key === "total") val = emp.total.toFixed(1);
          else {
            // Month column
            const mVal = emp.monthDays[c.key];
            val = mVal !== null && mVal !== undefined ? mVal.toFixed(1) : "-";
          }

          doc.text(val, curX + 2, y + 3, {
            width: c.width - 4,
            align: val === "-" ? "center" : c.align,
          });
          curX += c.width;
        });

        y += 13;
      }
    }

    // Totals Row
    if (y + 18 > pageBottomLimit) {
      drawHeader(true);
    }

    let curX = startX;
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#0F172A");

    cols.forEach((c, idx) => {
      doc.rect(curX, y, c.width, 16).fillAndStroke("#F1F5F9", "#94A3B8");

      let val = "";
      if (idx === 6) val = "Total";
      else if (idx === cols.length - 1) val = grandTotal.toFixed(1);
      else if (idx > 6) {
        const mTot = monthTotals[c.key];
        val = mTot !== undefined ? mTot.toFixed(1) : "-";
      }

      if (val) {
        doc.fillColor("#0F172A").text(val, curX + 2, y + 4.5, {
          width: c.width - 4,
          align: c.align,
        });
      }
      curX += c.width;
    });

    doc.end();
  } catch (err) {
    console.error("[exportBonusReportPdf] Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

