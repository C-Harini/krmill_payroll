// controllers/salaryReportsController.js
// ================================================================
//  SALARY REPORTS CONTROLLER  – v6
//  NEW in v6:
//    getSalaryReport now accepts reportType:
//      "salary_report"    – base (existing behaviour)
//      "with_el"          – grandTotalDays = shiftDays + earnedLeaveDays
//      "without_el"       – earnedLeaveDays shown separately, not added
//      "with_weekoff"     – grandTotalDays = shiftDays + weekOffDays
//      "without_weekoff"  – grandTotalDays = shiftDays – weekOffDays
//
//    downloadSalaryReportExcel and downloadSalaryReportPDF also
//    honour the same reportType, adding an extra column + adjusted
//    total in the output.
// ================================================================

"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const SalaryGeneration = db.SalaryGeneration;
const SalaryGenerationDetail = db.SalaryGenerationDetail;
const Employee = db.Employee;
const Department = db.Department;
const Company = db.Company;
const Designation = db.Designation;
const EmployeeSalaryMaster = db.EmployeeSalaryMaster;

/* ================================================================
   HELPERS
================================================================ */
const toNum = (v) => parseFloat(v) || 0;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const getMonthName = (m) => MONTH_NAMES[parseInt(m) - 1] || "";

// ── Valid report types ──────────────────────────────────────────
const SALARY_REPORT_TYPES = [
  "salary_report",
  "with_el",
  "without_el",
  "with_weekoff",
  "without_weekoff",
];

/**
 * Compute the "grand total days" for a salary record depending on
 * the selected report type.
 *
 * salary_report  → presentDays (base, no adjustment)
 * with_el        → presentDays + paidLeaveDays
 * without_el     → presentDays  (EL shown in separate col, not added)
 * with_weekoff   → presentDays + weekOffDays
 * without_weekoff → Math.max(0, presentDays - weekOffDays)
 */
const computeGrandTotal = (r, reportType) => {
  const present = toNum(r.presentDays);
  const el = toNum(r.paidLeaveDays);
  const wo = toNum(r.weekOffDays);
  switch (reportType) {
    case "with_el":
      return present + el;
    case "without_el":
      return present; // EL column separate
    case "with_weekoff":
      return present + wo;
    case "without_weekoff":
      return Math.max(0, present - wo);
    default:
      return present; // salary_report
  }
};

/* Pull component amounts from SalaryGenerationDetail rows */
const buildBreakdown = (details = [], attnIncentive = 0) => {
  const earnings = {};
  const deductions = {};

  details.forEach((d) => {
    const name = (d.componentName || "").toLowerCase().trim();
    const amt = toNum(d.calculatedAmount);
    if (d.componentType === "Earning") {
      if (name === "basic" || name === "basic salary" || name === "basic pay")
        earnings.basic = (earnings.basic || 0) + amt;
      else if (name === "hra") earnings.hra = (earnings.hra || 0) + amt;
      else if (name.includes("spl") || name.includes("special"))
        earnings.spl = (earnings.spl || 0) + amt;
      else if (name.includes("conv"))
        earnings.conv = (earnings.conv || 0) + amt;
      else if (name.includes("nh") || name.includes("fh"))
        earnings.nhfh = (earnings.nhfh || 0) + amt;
      else if (name.includes("incentive"))
        earnings.incentive = (earnings.incentive || 0) + amt;
      else if (name.includes("ent")) earnings.ent = (earnings.ent || 0) + amt;
      else if (name.includes("arrear"))
        earnings.arrears = (earnings.arrears || 0) + amt;
      else earnings.other = (earnings.other || 0) + amt;
    } else if (d.componentType === "Deduction") {
      if (name.includes("pf") || name.includes("provident"))
        deductions.pf = (deductions.pf || 0) + amt;
      else if (name.includes("esi"))
        deductions.esi = (deductions.esi || 0) + amt;
      else if (name.includes("adv") || name.includes("advance"))
        deductions.adv = (deductions.adv || 0) + amt;
      else if (name.includes("mess"))
        deductions.mess = (deductions.mess || 0) + amt;
      else if (name.includes("store"))
        deductions.store = (deductions.store || 0) + amt;
      else if (name === "eb") deductions.eb = (deductions.eb || 0) + amt;
      else if (name.includes("loan"))
        deductions.loan = (deductions.loan || 0) + amt;
      else deductions.other = (deductions.other || 0) + amt;
    }
  });

  if (!earnings.incentive && toNum(attnIncentive) > 0) {
    earnings.incentive = toNum(attnIncentive);
  }

  return { earnings, deductions };
};

const salaryIncludes = (empWhere = {}) => [
  {
    model: Employee,
    as: "employee",
    where: Object.keys(empWhere).length ? empWhere : undefined,
    required: !!Object.keys(empWhere).length,
    attributes: [
      "id",
      "employeeCode",
      "firstName",
      "lastName",
      "bankAccountNumber",
      "bankName",
      "ifscCode",
      "workingType",
      "providentFundNumber",
      "basicSalary",
    ],
  },
  {
    model: Company,
    as: "company",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: EmployeeSalaryMaster,
    as: "salaryMaster",
    attributes: ["id", "grossSalary", "basicSalary", "netSalary"],
    required: false,
  },
  { model: SalaryGenerationDetail, as: "details", required: false },
];

const baseOrder = [["employeeId", "ASC"]];

const enrichWithDeptDesig = async (records) => {
  const empIds = [...new Set(records.map((r) => r.employeeId).filter(Boolean))];
  if (!empIds.length) return records;

  const employees = await Employee.findAll({
    where: { id: empIds },
    attributes: ["id"],
    include: [
      {
        model: Department,
        as: "department",
        attributes: ["id", "departmentname"],
        required: false,
      },
      {
        model: Designation,
        as: "designation",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });

  const empMap = {};
  employees.forEach((e) => {
    empMap[e.id] = {
      department: e.department || null,
      designation: e.designation || null,
    };
  });

  return records.map((r) => {
    const extra = empMap[r.employeeId] || {};
    if (r.employee) {
      r.employee.department = extra.department || null;
      r.employee.designation = extra.designation || null;
    }
    return r;
  });
};

const buildWhere = (query) => {
  const { companyId, month, year, category, pfType, salaryType, status } =
    query;
  const w = {};
  if (companyId) w.companyId = companyId;
  if (month) w.salaryMonth = month;
  if (year) w.salaryYear = year;
  if (category) w.empCategory = category;
  if (pfType) w.empPfType = pfType;
  if (salaryType) w.empSalaryType = salaryType;
  w.status = status ? status : { [Op.in]: ["Generated", "Approved", "Paid"] };
  return w;
};

const groupByDept = (rows) => {
  const map = {};
  rows.forEach((r) => {
    const dept = r.employee?.department?.departmentname || "Unassigned";
    if (!map[dept]) map[dept] = { records: [], total: 0 };
    map[dept].records.push(r);
    map[dept].total += toNum(r.netSalary);
  });
  return map;
};

/* ================================================================
   1. GET SALARY REPORT  (JSON — now reportType-aware)
================================================================ */
exports.getSalaryReport = async (req, res) => {
  try {
    const {
      departmentId,
      month,
      year,
      page = 1,
      limit = 100,
      reportType = "salary_report",
    } = req.query;

    if (!SALARY_REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reportType. Must be one of: ${SALARY_REPORT_TYPES.join(", ")}`,
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const count = await SalaryGeneration.count({
      where,
      include: salaryIncludes(empWhere).filter(inc => inc.as !== "details"),
      distinct: true,
      col: "id",
    });

    const rows = await SalaryGeneration.findAll({
      where,
      include: salaryIncludes(empWhere),
      order: baseOrder,
      limit: parseInt(limit),
      offset,
    });


    const enrichedRows = await enrichWithDeptDesig(rows);

    // Determine column visibility flags for the client
    const showEL = reportType === "with_el" || reportType === "without_el";
    const showWO =
      reportType === "with_weekoff" || reportType === "without_weekoff";

    const enriched = enrichedRows.map((r) => {
      const { earnings, deductions } = buildBreakdown(
        r.details || [],
        r.attnIncentive,
      );

      const grandTotalDays = computeGrandTotal(r, reportType);

      const isDaily =
        (r.empSalaryType || "").toLowerCase() === "daily" ||
        (r.employee?.workingType || "").toLowerCase() === "daily";
      const workedDays = toNum(r.presentDays) + toNum(r.paidLeaveDays);
      const earnedBasicSpl = toNum(r.basicSalary) + toNum(earnings.spl || 0);
      const computedDailyWage =
        toNum(r.salaryMaster?.grossSalary) ||
        toNum(r.salaryMaster?.basicSalary) ||
        toNum(r.employee?.basicSalary) ||
        (workedDays > 0 ? Math.round(earnedBasicSpl / workedDays) : 0);

      const computedMonthlySalary =
        toNum(r.salaryMaster?.grossSalary) ||
        toNum(r.salaryMaster?.monthlySalary) ||
        toNum(r.employee?.basicSalary) ||
        toNum(r.totalEarnings);

      const displaySalary = isDaily ? computedDailyWage : computedMonthlySalary;

      return {
        id: r.id,
        employeeId: r.employeeId,
        status: r.status,
        salaryMonth: r.salaryMonth,
        salaryYear: r.salaryYear,
        empCategory: r.empCategory,
        empSalaryType: r.empSalaryType,
        empPfType: r.empPfType,
        workingDays: r.workingDays,
        presentDays: toNum(r.presentDays),
        absentDays: toNum(r.absentDays),
        paidLeaveDays: toNum(r.paidLeaveDays), // EL days
        unpaidLeaveDays: toNum(r.unpaidLeaveDays),
        weekOffDays: toNum(r.weekOffDays),
        nhFhDays: toNum(r.nhFhDays),
        grandTotalDays, // adjusted total
        dailyWage: computedDailyWage,
        monthlySalary: displaySalary,
        salaryRate: displaySalary,
        basicSalary: toNum(r.basicSalary),
        grossSalary: toNum(r.grossSalary),
        pfAmount: toNum(r.pfAmount),
        esiAmount: toNum(r.esiAmount),
        attnIncentive: toNum(r.attnIncentive),
        totalDeductions: toNum(r.totalDeductions),
        netSalary: toNum(r.netSalary),
        netRounded: toNum(r.netRounded),
        earnings,
        deductions,
        employee: r.employee,
        company: r.company,
      };
    });

    const grouped = groupByDept(enriched);

    const grandTotal = await SalaryGeneration.sum("netSalary", { where });
    const prevMonth = parseInt(month) - 1 === 0 ? 12 : parseInt(month) - 1;
    const prevYear =
      parseInt(month) - 1 === 0 ? parseInt(year) - 1 : parseInt(year);
    const prevWhere = buildWhere({
      ...req.query,
      month: prevMonth,
      year: prevYear,
    });
    const prevTotal =
      (await SalaryGeneration.sum("netSalary", { where: prevWhere })) || 0;

    return res.json({
      success: true,
      reportType,
      meta: {
        showEL,
        showWO,
        elLabel: reportType === "with_el" ? "EL Days (+)" : "EL Days",
        woLabel:
          reportType === "with_weekoff" ? "Week Off (+)" : "Week Off (−)",
        totalLabel:
          reportType === "salary_report"
            ? "Present Days"
            : reportType === "with_el"
              ? "Total (+ EL)"
              : reportType === "without_el"
                ? "Present Days"
                : reportType === "with_weekoff"
                  ? "Total (+ WO)"
                  : "Total (− WO)",
      },
      data: grouped,
      records: enriched,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
      summary: {
        recordsCount: count,
        pageTotal: enriched.reduce((s, r) => s + r.netSalary, 0),
        grandTotal: grandTotal || 0,
        totalELDays: enriched.reduce((s, r) => s + r.paidLeaveDays, 0),
        totalWODays: enriched.reduce((s, r) => s + r.weekOffDays, 0),
        grandTotalAdjustedDays: enriched.reduce(
          (s, r) => s + r.grandTotalDays,
          0,
        ),
      },
      comparison: {
        currentMonth: grandTotal || 0,
        previousMonth: prevTotal,
        difference: (grandTotal || 0) - prevTotal,
        percentageChange:
          prevTotal > 0
            ? ((((grandTotal || 0) - prevTotal) / prevTotal) * 100).toFixed(2)
            : 0,
      },
    });
  } catch (err) {
    console.error("getSalaryReport:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   2. DOWNLOAD SALARY REPORT – EXCEL  (reportType-aware)
================================================================ */
exports.downloadSalaryReportExcel = async (req, res) => {
  try {
    const {
      month,
      year,
      departmentId,
      reportType = "salary_report",
    } = req.query;
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const rows = await SalaryGeneration.findAll({
      where,
      include: salaryIncludes(empWhere),
      order: baseOrder,
    });

    if (!rows.length) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No salary data found for the selected filters.",
        });
    }

    const enrichedRows = await enrichWithDeptDesig(rows);

    const records = enrichedRows.map((r) => {
      const { earnings, deductions } = buildBreakdown(
        r.details || [],
        r.attnIncentive,
      );
      return {
        ...r.toJSON(),
        earnings,
        deductions,
        grandTotalDays: computeGrandTotal(r, reportType),
        employee: {
          ...r.toJSON().employee,
          department: r.employee?.department || null,
          designation: r.employee?.designation || null,
        },
      };
    });

    const name = rows[0]?.company?.name || "Company";
    const monthLabel = `${getMonthName(month)} ${year}`;

    const showEL = reportType === "with_el" || reportType === "without_el";
    const showWO =
      reportType === "with_weekoff" || reportType === "without_weekoff";

    // Group by employee type
    const groups = {
      staffManagement: records.filter(
        (r) =>
          r.empCategory === "staff" &&
          r.empPfType === "pf" &&
          isManagement(r.employee?.designation?.name),
      ),
      staffPf: records.filter(
        (r) =>
          r.empCategory === "staff" &&
          r.empPfType === "pf" &&
          !isManagement(r.employee?.designation?.name),
      ),
      staffNpf: records.filter(
        (r) => r.empCategory === "staff" && r.empPfType === "npf",
      ),
      workerPfDaily: records.filter(
        (r) =>
          r.empCategory === "worker" &&
          r.empPfType === "pf" &&
          r.empSalaryType === "daily",
      ),
      workerPfMonthly: records.filter(
        (r) =>
          r.empCategory === "worker" &&
          r.empPfType === "pf" &&
          r.empSalaryType === "monthly",
      ),
      workerNpfDaily: records.filter(
        (r) =>
          r.empCategory === "worker" &&
          r.empPfType === "npf" &&
          r.empSalaryType === "daily",
      ),
      workerNpfMonthly: records.filter(
        (r) =>
          r.empCategory === "worker" &&
          r.empPfType === "npf" &&
          r.empSalaryType === "monthly",
      ),
    };

    const workbook = new ExcelJS.Workbook();

    const opts = { showEL, showWO, reportType, monthLabel, name };
    if (groups.staffManagement.length)
      addStaffSheet(
        workbook,
        "Staff Management",
        groups.staffManagement,
        name,
        monthLabel,
        true,
        opts,
      );
    if (groups.staffPf.length)
      addStaffSheet(
        workbook,
        "Staff PF",
        groups.staffPf,
        name,
        monthLabel,
        false,
        opts,
      );
    if (groups.staffNpf.length)
      addStaffSheet(
        workbook,
        "Staff NPF",
        groups.staffNpf,
        name,
        monthLabel,
        false,
        opts,
      );
    if (groups.workerPfDaily.length)
      addWorkerSheet(
        workbook,
        "Worker PF Daily",
        groups.workerPfDaily,
        name,
        monthLabel,
        opts,
      );
    if (groups.workerPfMonthly.length)
      addWorkerSheet(
        workbook,
        "Worker PF Monthly",
        groups.workerPfMonthly,
        name,
        monthLabel,
        opts,
      );
    if (groups.workerNpfDaily.length)
      addWorkerSheet(
        workbook,
        "Worker NPF Daily",
        groups.workerNpfDaily,
        name,
        monthLabel,
        opts,
      );
    if (groups.workerNpfMonthly.length)
      addWorkerSheet(
        workbook,
        "Worker NPF Monthly",
        groups.workerNpfMonthly,
        name,
        monthLabel,
        opts,
      );

    if (!workbook.worksheets.length)
      addWorkerSheet(
        workbook,
        "Salary Report",
        records,
        name,
        monthLabel,
        opts,
      );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=salary-report-${reportType}-${month}-${year}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("downloadSalaryReportExcel:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── STAFF sheet builder ─────────────────────────────────────── */
function addStaffSheet(
  wb,
  sheetName,
  records,
  name,
  monthLabel,
  isMgmt,
  opts = {},
) {
  const { showEL, showWO, reportType } = opts;
  const ws = wb.addWorksheet(sheetName);

  ws.mergeCells("A1:Z1");
  setCell(ws, "A1", name, { bold: true, size: 13 }, "center");
  ws.mergeCells("A2:Z2");
  setCell(
    ws,
    "A2",
    `Salary for the month of ${monthLabel} [${reportTypeLabel(reportType)}]`,
    { size: 11 },
    "center",
  );
  ws.addRow([]);

  // Build extra column for EL or WO
  const elCol = showEL
    ? [reportType === "with_el" ? "EL Days (+)" : "EL Days"]
    : [];
  const woCol = showWO
    ? [reportType === "with_weekoff" ? "Week Off (+)" : "Week Off (−)"]
    : [];
  const totCol = showEL || showWO ? ["Adjusted Days"] : [];

  const headers = [
    "S. No",
    "Name",
    "T. No",
    "Desig",
    "Per Month Salary",
    "W.Days",
    "NH/FH",
    "EL",
    "CL",
    "AB",
    "WH",
    "Basic Pay",
    "HRA",
    "Spl. Allo",
    "Conv",
    ...(isMgmt ? ["Ent. Allo"] : []),
    "NH/FH Salary",
    "Attn Incentive",
    "Earnings",
    "PF",
    "ESI",
    "Adv",
    "Mess",
    "Store",
    "Other",
    "EB",
    "Total Dedu",
    ...elCol,
    ...woCol,
    ...totCol,
    "Net",
  ];

  const headerRow = ws.addRow(headers);
  styleHeaderRow(headerRow, "#1F3864");
  ws.getRow(4).height = 22;
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  for (let i = 6; i <= headers.length; i++) ws.getColumn(i).width = 11;

  let sno = 1;
  records.forEach((r) => {
    const e = r.earnings || {};
    const d = r.deductions || {};
    const earnings =
      (e.basic || 0) +
      (e.hra || 0) +
      (e.spl || 0) +
      (e.conv || 0) +
      (isMgmt ? e.ent || 0 : 0) +
      (e.nhfh || 0) +
      (e.incentive || 0);
    const totalDedu =
      (d.pf || 0) +
      (d.esi || 0) +
      (d.adv || 0) +
      (d.mess || 0) +
      (d.store || 0) +
      (d.other || 0) +
      (d.eb || 0) +
      (d.loan || 0);

    const elVal = showEL ? [toNum(r.paidLeaveDays)] : [];
    const woVal = showWO ? [toNum(r.weekOffDays)] : [];
    const totVal = showEL || showWO ? [toNum(r.grandTotalDays)] : [];

    const isDaily =
      (r.empSalaryType || "").toLowerCase() === "daily" ||
      (r.employee?.workingType || "").toLowerCase() === "daily";
    const workedDays = toNum(r.presentDays) + toNum(r.paidLeaveDays);
    const earnedBasicSpl = toNum(r.basicSalary) + toNum(e.spl || 0);
    const dailyWageVal =
      toNum(r.salaryMaster?.grossSalary) ||
      toNum(r.salaryMaster?.basicSalary) ||
      toNum(r.employee?.basicSalary) ||
      (workedDays > 0 ? Math.round(earnedBasicSpl / workedDays) : 0);
    const monthlySalVal =
      toNum(r.salaryMaster?.grossSalary) ||
      toNum(r.salaryMaster?.monthlySalary) ||
      toNum(r.employee?.basicSalary) ||
      toNum(r.totalEarnings);
    const salaryVal = isDaily ? dailyWageVal : monthlySalVal;

    const rowData = [
      sno++,
      r.employee?.firstName || "",
      r.employee?.employeeCode || "",
      r.employee?.designation?.name || "",
      salaryVal,
      toNum(r.presentDays),
      toNum(r.nhFhDays),
      toNum(r.paidLeaveDays),
      0,
      toNum(r.absentDays),
      toNum(r.weekOffDays),
      e.basic || 0,
      e.hra || 0,
      e.spl || 0,
      e.conv || 0,
      ...(isMgmt ? [e.ent || 0] : []),
      e.nhfh || 0,
      e.incentive || 0,
      earnings,
      d.pf || 0,
      d.esi || 0,
      d.adv || 0,
      d.mess || 0,
      d.store || 0,
      (d.other || 0) + (d.loan || 0),
      d.eb || 0,
      totalDedu,
      ...elVal,
      ...woVal,
      ...totVal,
      toNum(r.netSalary),
    ];
    const row = ws.addRow(rowData);
    styleDataRow(row, sno % 2 === 0);
    row.eachCell((cell, colNum) => {
      if (colNum >= 5) cell.alignment = { horizontal: "right" };
    });

    // Colour-code EL / WO cells
    const baseColCount = 26 + (isMgmt ? 1 : 0);
    if (showEL) {
      const elCellIdx = baseColCount + 1;
      row.getCell(elCellIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: reportType === "with_el" ? "FFD1FAE5" : "FFFFF7ED" },
      };
      row.getCell(elCellIdx).font = {
        bold: true,
        color: { argb: reportType === "with_el" ? "FF065F46" : "FF92400E" },
      };
    }
    if (showWO) {
      const woCellIdx = baseColCount + (showEL ? 2 : 1);
      row.getCell(woCellIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: reportType === "with_weekoff" ? "FFEDE9FE" : "FFFEF3C7",
        },
      };
      row.getCell(woCellIdx).font = {
        bold: true,
        color: {
          argb: reportType === "with_weekoff" ? "FF5B21B6" : "FF92400E",
        },
      };
    }
  });

  const dataEnd = ws.rowCount;
  const totalRow = ws.addRow(["Total", ...Array(headers.length - 1).fill("")]);
  for (let col = 5; col <= headers.length; col++) {
    const letter = colToLetter(col);
    totalRow.getCell(col).value = {
      formula: `SUM(${letter}5:${letter}${dataEnd})`,
    };
  }
  styleHeaderRow(totalRow, "#2E4057");
  totalRow.getCell(1).alignment = { horizontal: "left" };

  const grandNet = records.reduce((s, r) => s + toNum(r.netSalary), 0);
  const wordsRow = ws.addRow([numberToWords(grandNet) + " ONLY"]);
  ws.mergeCells(`A${ws.rowCount}:Z${ws.rowCount}`);
  wordsRow.getCell(1).font = { italic: true, size: 9 };
}

/* ── WORKER sheet builder ────────────────────────────────────── */
function addWorkerSheet(wb, sheetName, records, name, monthLabel, opts = {}) {
  const { showEL, showWO, reportType } = opts;
  const ws = wb.addWorksheet(sheetName);

  ws.mergeCells("A1:AC1");
  setCell(ws, "A1", name, { bold: true, size: 13 }, "center");
  ws.mergeCells("A2:AC2");
  setCell(
    ws,
    "A2",
    `Worker wages for the month of ${monthLabel} [${reportTypeLabel(reportType)}]`,
    { size: 11 },
    "center",
  );
  ws.addRow([]);

  const elCol = showEL
    ? [reportType === "with_el" ? "EL Days (+)" : "EL Days"]
    : [];
  const woCol = showWO
    ? [reportType === "with_weekoff" ? "Week Off (+)" : "Week Off (−)"]
    : [];
  const totCol = showEL || showWO ? ["Adjusted Days"] : [];

  const headers = [
    "S. No",
    "Name",
    "T. No",
    "Dept",
    "Wages/Day",
    "W.Days",
    "NH/FH",
    "EL",
    "CL",
    "AB",
    "WH",
    "Basic Pay",
    "HRA",
    "Spl. Allo",
    "Conv",
    "NH/FH Salary",
    "Attn Incentive",
    "Earnings",
    "PF",
    "ESI",
    "Adv",
    "Mess",
    "Store",
    "Other",
    "EB",
    "Total Dedu",
    ...elCol,
    ...woCol,
    ...totCol,
    "Net",
    "Net (Round)",
  ];

  const headerRow = ws.addRow(headers);
  styleHeaderRow(headerRow, "#1F3864");
  ws.getRow(4).height = 22;
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 14;
  for (let i = 5; i <= headers.length; i++) ws.getColumn(i).width = 11;

  let sno = 1;
  records.forEach((r) => {
    const e = r.earnings || {};
    const d = r.deductions || {};
    const earnings =
      (e.basic || 0) +
      (e.hra || 0) +
      (e.spl || 0) +
      (e.conv || 0) +
      (e.nhfh || 0) +
      (e.incentive || 0) +
      (e.arrears || 0);
    const totalDedu =
      (d.pf || 0) +
      (d.esi || 0) +
      (d.adv || 0) +
      (d.mess || 0) +
      (d.store || 0) +
      (d.other || 0) +
      (d.eb || 0) +
      (d.loan || 0);

    const isDaily =
      (r.empSalaryType || "").toLowerCase() === "daily" ||
      (r.employee?.workingType || "").toLowerCase() === "daily";
    const workedDays = toNum(r.presentDays) + toNum(r.paidLeaveDays);
    const earnedBasicSpl = toNum(r.basicSalary) + toNum(e.spl || 0);
    const wagesPerDay =
      toNum(r.salaryMaster?.grossSalary) ||
      toNum(r.salaryMaster?.basicSalary) ||
      toNum(r.employee?.basicSalary) ||
      (workedDays > 0 ? Math.round(earnedBasicSpl / workedDays) : 0);

    const elVal = showEL ? [toNum(r.paidLeaveDays)] : [];
    const woVal = showWO ? [toNum(r.weekOffDays)] : [];
    const totVal = showEL || showWO ? [toNum(r.grandTotalDays)] : [];

    const rowData = [
      sno++,
      r.employee?.firstName || "",
      r.employee?.employeeCode || "",
      r.employee?.department?.departmentname || "",
      wagesPerDay,
      toNum(r.presentDays),
      toNum(r.nhFhDays),
      toNum(r.paidLeaveDays),
      0,
      toNum(r.absentDays),
      toNum(r.weekOffDays),
      e.basic || 0,
      e.hra || 0,
      e.spl || 0,
      e.conv || 0,
      e.nhfh || 0,
      e.incentive || 0,
      earnings,
      d.pf || 0,
      d.esi || 0,
      d.adv || 0,
      d.mess || 0,
      d.store || 0,
      (d.other || 0) + (d.loan || 0),
      d.eb || 0,
      totalDedu,
      ...elVal,
      ...woVal,
      ...totVal,
      toNum(r.netSalary),
      toNum(r.netRounded),
    ];
    const row = ws.addRow(rowData);
    styleDataRow(row, sno % 2 === 0);
    row.eachCell((cell, colNum) => {
      if (colNum >= 5) cell.alignment = { horizontal: "right" };
    });

    const baseColCount = 28;
    if (showEL) {
      const elCellIdx = baseColCount + 1;
      row.getCell(elCellIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: reportType === "with_el" ? "FFD1FAE5" : "FFFFF7ED" },
      };
      row.getCell(elCellIdx).font = {
        bold: true,
        color: { argb: reportType === "with_el" ? "FF065F46" : "FF92400E" },
      };
    }
    if (showWO) {
      const woCellIdx = baseColCount + (showEL ? 2 : 1);
      row.getCell(woCellIdx).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: reportType === "with_weekoff" ? "FFEDE9FE" : "FFFEF3C7",
        },
      };
      row.getCell(woCellIdx).font = {
        bold: true,
        color: {
          argb: reportType === "with_weekoff" ? "FF5B21B6" : "FF92400E",
        },
      };
    }
  });

  const dataEnd = ws.rowCount;
  const totalRow = ws.addRow(["Total", ...Array(headers.length - 1).fill("")]);
  for (let col = 5; col <= headers.length; col++) {
    const letter = colToLetter(col);
    totalRow.getCell(col).value = {
      formula: `SUM(${letter}5:${letter}${dataEnd})`,
    };
  }
  styleHeaderRow(totalRow, "#2E4057");
  totalRow.getCell(1).alignment = { horizontal: "left" };

  const grandNet = records.reduce(
    (s, r) => s + toNum(r.netRounded || r.netSalary),
    0,
  );
  const wordsRow = ws.addRow([numberToWords(grandNet) + " ONLY"]);
  ws.mergeCells(`A${ws.rowCount}:AC${ws.rowCount}`);
  wordsRow.getCell(1).font = { italic: true, size: 9 };
}

/* ================================================================
   3. DOWNLOAD SALARY REPORT – PDF  (reportType-aware)
================================================================ */
exports.downloadSalaryReportPDF = async (req, res) => {
  try {
    const {
      month,
      year,
      departmentId,
      reportType = "salary_report",
    } = req.query;
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const rows = await SalaryGeneration.findAll({
      where,
      include: salaryIncludes(empWhere),
      order: baseOrder,
    });

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "No data found." });
    }

    const enrichedRows = await enrichWithDeptDesig(rows);

    const records = enrichedRows.map((r) => {
      const { earnings, deductions } = buildBreakdown(
        r.details || [],
        r.attnIncentive,
      );
      return {
        ...r.toJSON(),
        earnings,
        deductions,
        grandTotalDays: computeGrandTotal(r, reportType),
        employee: {
          ...r.toJSON().employee,
          department: r.employee?.department || null,
          designation: r.employee?.designation || null,
        },
      };
    });

    const showEL = reportType === "with_el" || reportType === "without_el";
    const showWO =
      reportType === "with_weekoff" || reportType === "without_weekoff";

    const name = rows[0]?.company?.name || "Company";
    const doc = new PDFDocument({
      size: "A3",
      layout: "landscape",
      margin: 25,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=salary-report-${reportType}-${month}-${year}.pdf`,
    );
    doc.pipe(res);

    // Build column definitions dynamically
    const baseCols = [
      { label: "S.No", width: 26 },
      { label: "Name", width: 105 },
      { label: "T.No", width: 42 },
      { label: "Desig/Dept", width: 68 },
      { label: "Sal/Day", width: 52 },
      { label: "W.Days", width: 38 },
      { label: "NH/FH", width: 34 },
      { label: "EL", width: 26 },
      { label: "AB", width: 26 },
      { label: "WH", width: 26 },
      { label: "Basic", width: 52 },
      { label: "HRA", width: 42 },
      { label: "Spl", width: 48 },
      { label: "Conv", width: 42 },
      { label: "Earnings", width: 55 },
      { label: "PF", width: 40 },
      { label: "ESI", width: 36 },
      { label: "Adv", width: 36 },
      { label: "Mess", width: 36 },
      { label: "Store", width: 38 },
      { label: "Other", width: 38 },
      { label: "EB", width: 32 },
      { label: "T.Dedu", width: 46 },
    ];

    const extraCols = [];
    if (showEL)
      extraCols.push({
        label: reportType === "with_el" ? "EL (+)" : "EL Days",
        width: 40,
        type: "el",
      });
    if (showWO)
      extraCols.push({
        label: reportType === "with_weekoff" ? "WO (+)" : "WO (−)",
        width: 40,
        type: "wo",
      });
    if (showEL || showWO)
      extraCols.push({ label: "Adj.Days", width: 44, type: "adj" });

    const cols = [...baseCols, ...extraCols, { label: "Net", width: 55 }];

    let y = 30;

    const drawHeader = (isNew = false) => {
      if (isNew) {
        doc.addPage();
        y = 30;
      }
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(name, 25, y, { align: "center" });
      y += 15;
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          `Salary Report – ${getMonthName(month)} ${year}  [${reportTypeLabel(reportType)}]`,
          25,
          y,
          { align: "center" },
        );
      y += 12;
      drawColHeaders();
    };

    const drawColHeaders = () => {
      let x = 25;
      doc.fontSize(6.5).font("Helvetica-Bold");
      cols.forEach((c) => {
        doc.rect(x, y, c.width, 15).fillAndStroke("#1F3864", "#1F3864");
        doc
          .fillColor("white")
          .text(c.label, x + 2, y + 3.5, {
            width: c.width - 4,
            align: "center",
          });
        x += c.width;
      });
      doc.fillColor("black");
      y += 15;
    };

    drawHeader();

    const grouped = groupByDept(records);
    let sno = 1;
    let grandNet = 0;

    Object.entries(grouped).forEach(([dept, { records: dRec }]) => {
      if (y > 510) drawHeader(true);
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .fillColor("#1F3864")
        .text(`Department: ${dept}`, 25, y + 2);
      y += 13;

      dRec.forEach((r) => {
        if (y > 510) drawHeader(true);
        const e = r.earnings || {};
        const d = r.deductions || {};
        const earnings =
          (e.basic || 0) +
          (e.hra || 0) +
          (e.spl || 0) +
          (e.conv || 0) +
          (e.nhfh || 0) +
          (e.incentive || 0);
        const totalDedu =
          (d.pf || 0) +
          (d.esi || 0) +
          (d.adv || 0) +
          (d.mess || 0) +
          (d.store || 0) +
          (d.other || 0) +
          (d.eb || 0) +
          (d.loan || 0);

        const isDaily =
          (r.empCategory || "").toLowerCase() === "worker" ||
          (r.empSalaryType || "").toLowerCase() === "daily" ||
          (r.employee?.workingType || "").toLowerCase() === "daily";
        const workedDays = toNum(r.presentDays) + toNum(r.paidLeaveDays);
        const earnedBasicSpl = toNum(r.basicSalary) + toNum(e.spl || 0);
        const dailyWageVal =
          toNum(r.salaryMaster?.grossSalary) ||
          toNum(r.salaryMaster?.basicSalary) ||
          toNum(r.employee?.basicSalary) ||
          (workedDays > 0 ? Math.round(earnedBasicSpl / workedDays) : 0);
        const monthlySalVal =
          toNum(r.salaryMaster?.grossSalary) ||
          toNum(r.salaryMaster?.monthlySalary) ||
          toNum(r.employee?.basicSalary) ||
          toNum(r.totalEarnings);
        const salaryVal = isDaily ? dailyWageVal : monthlySalVal;

        const baseCells = [
          sno,
          r.employee?.firstName || "",
          r.employee?.employeeCode || "",
          r.employee?.designation?.name ||
            r.employee?.department?.departmentname ||
            "",
          salaryVal,
          toNum(r.presentDays),
          toNum(r.nhFhDays),
          toNum(r.paidLeaveDays),
          toNum(r.absentDays),
          toNum(r.weekOffDays),
          e.basic || 0,
          e.hra || 0,
          e.spl || 0,
          e.conv || 0,
          earnings,
          d.pf || 0,
          d.esi || 0,
          d.adv || 0,
          d.mess || 0,
          d.store || 0,
          (d.other || 0) + (d.loan || 0),
          d.eb || 0,
          totalDedu,
        ];
        const extraVals = extraCols.map((ec) => {
          if (ec.type === "el") return toNum(r.paidLeaveDays);
          if (ec.type === "wo") return toNum(r.weekOffDays);
          if (ec.type === "adj") return toNum(r.grandTotalDays);
          return "";
        });
        const cells = [...baseCells, ...extraVals, toNum(r.netSalary)];

        const bg = sno % 2 === 0 ? "#F0F4FF" : "#FFFFFF";
        let x = 25;
        doc.fontSize(6.5).font("Helvetica");
        cells.forEach((val, ci) => {
          const col = cols[ci];
          const isEl = col?.type === "el";
          const isWo = col?.type === "wo";
          const cellBg = isEl
            ? reportType === "with_el"
              ? "#D1FAE5"
              : "#FFF7ED"
            : isWo
              ? reportType === "with_weekoff"
                ? "#EDE9FE"
                : "#FEF3C7"
              : bg;

          doc.rect(x, y, col.width, 13).fillAndStroke(cellBg, "#D0D0D0");
          doc
            .fillColor(
              isEl
                ? reportType === "with_el"
                  ? "#065F46"
                  : "#92400E"
                : isWo
                  ? reportType === "with_weekoff"
                    ? "#5B21B6"
                    : "#92400E"
                  : "black",
            )
            .text(
              ci <= 3
                ? String(val)
                : val !== 0
                  ? val.toLocaleString("en-IN")
                  : "-",
              x + 2,
              y + 3,
              { width: col.width - 4, align: ci <= 3 ? "left" : "right" },
            );
          x += col.width;
        });
        y += 13;
        sno++;
        grandNet += toNum(r.netSalary);
      });

      const dTotal = dRec.reduce((s, r) => s + toNum(r.netSalary), 0);
      if (y > 510) drawHeader(true);
      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(`Dept Total: ₹${dTotal.toLocaleString("en-IN")}`, 25, y + 2, {
          align: "right",
        });
      y += 15;
    });

    if (y > 510) {
      doc.addPage();
      y = 30;
    }
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#1F3864")
      .text(
        `Grand Total Net Pay: ₹${grandNet.toLocaleString("en-IN")}`,
        25,
        y + 5,
        { align: "right" },
      );
    y += 20;
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        `Generated: ${new Date().toLocaleString()}  |  Total Employees: ${rows.length}  |  Report: ${reportTypeLabel(reportType)}`,
        25,
        y,
      );

    doc.end();
  } catch (err) {
    console.error("downloadSalaryReportPDF:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   4. GET BANK STATEMENT  (unchanged)
================================================================ */
exports.getBankStatement = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const rows = await SalaryGeneration.findAll({
      where,
      include: salaryIncludes(empWhere),
      order: baseOrder,
    });
    const enrichedRows = await enrichWithDeptDesig(rows);

    const records = enrichedRows.map((r) => ({
      ...r.toJSON(),
      netSalary: toNum(r.netSalary),
      netRounded: toNum(r.netRounded),
      employee: {
        ...r.toJSON().employee,
        department: r.employee?.department || null,
        designation: r.employee?.designation || null,
      },
    }));

    const grouped = groupByDept(records);
    const grandTotal = records.reduce((s, r) => s + r.netRounded, 0);

    return res.json({
      success: true,
      data: grouped,
      summary: {
        grandTotal,
        totalEmployees: records.length,
        totalDepartments: Object.keys(grouped).length,
      },
    });
  } catch (err) {
    console.error("getBankStatement:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   5. DOWNLOAD BANK STATEMENT – PDF  (unchanged)
================================================================ */
exports.downloadBankStatementPDF = async (req, res) => {
  try {
    const { month, year, departmentId } = req.query;
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const rows = await SalaryGeneration.findAll({
      where,
      include: salaryIncludes(empWhere),
      order: baseOrder,
    });
    if (!rows.length)
      return res.status(404).json({ success: false, message: "No data." });

    const enrichedRows = await enrichWithDeptDesig(rows);
    const name = rows[0]?.company?.name || "Company";
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bank-statement-${month}-${year}.pdf`,
    );
    doc.pipe(res);

    doc.fontSize(14).font("Helvetica-Bold").text(name, { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Bank Statement – ${getMonthName(month)} ${year}`, {
        align: "center",
      });
    doc.moveDown(0.5);

    const COL = [50, 50, 80, 145, 120, 80, 80];
    const HDR = [
      "S.No",
      "T.No",
      "Emp Code",
      "Employee Name",
      "Bank Account",
      "Net Pay",
      "Net (Rnd)",
    ];
    let y = doc.y;

    const drawBankHeader = (isNew = false) => {
      if (isNew) {
        doc.addPage();
        y = 50;
      }
      let x = 30;
      doc.fontSize(8).font("Helvetica-Bold");
      HDR.forEach((h, i) => {
        doc.rect(x, y, COL[i], 16).fillAndStroke("#1F3864", "#1F3864");
        doc
          .fillColor("white")
          .text(h, x + 2, y + 4, { width: COL[i] - 4, align: "center" });
        x += COL[i];
      });
      doc.fillColor("black");
      y += 16;
    };

    const mappedRows = enrichedRows.map((r) => ({
      ...r.toJSON(),
      netSalary: toNum(r.netSalary),
      netRounded: toNum(r.netRounded),
      employee: {
        ...r.toJSON().employee,
        department: r.employee?.department || null,
      },
    }));

    const grouped = groupByDept(mappedRows);
    let sno = 1,
      grandTotal = 0;
    drawBankHeader();

    Object.entries(grouped).forEach(([dept, { records: dRec }]) => {
      if (y > 720) drawBankHeader(true);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#1F3864")
        .text(`Department: ${dept}`, 30, y + 2);
      y += 14;
      let dTotal = 0;
      dRec.forEach((r) => {
        if (y > 720) drawBankHeader(true);
        const cells = [
          sno,
          r.employee?.employeeCode || "",
          r.employee?.employeeCode || "",
          r.employee?.firstName || "",
          r.employee?.bankAccountNumber || "N/A",
          `₹${r.netSalary.toLocaleString("en-IN")}`,
          `₹${r.netRounded.toLocaleString("en-IN")}`,
        ];
        const bg = sno % 2 === 0 ? "#F5F5F5" : "#FFFFFF";
        let x = 30;
        doc.fontSize(7).font("Helvetica");
        cells.forEach((val, ci) => {
          doc.rect(x, y, COL[ci], 14).fillAndStroke(bg, "#D0D0D0");
          doc
            .fillColor("black")
            .text(String(val), x + 2, y + 3, {
              width: COL[ci] - 4,
              align: ci >= 5 ? "right" : "left",
            });
          x += COL[ci];
        });
        y += 14;
        sno++;
        dTotal += r.netRounded;
        grandTotal += r.netRounded;
      });
      if (y > 720) drawBankHeader(true);
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(`Dept Total: ₹${dTotal.toLocaleString("en-IN")}`, 30, y + 2, {
          align: "right",
        });
      y += 16;
    });

    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#1F3864")
      .text(`Grand Total: ₹${grandTotal.toLocaleString("en-IN")}`, 30, y + 5, {
        align: "right",
      });
    y += 20;
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        `Generated: ${new Date().toLocaleString()}  |  Employees: ${rows.length}`,
        30,
        y,
      );
    doc.end();
  } catch (err) {
    console.error("downloadBankStatementPDF:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   6. DOWNLOAD BANK STATEMENT – EXCEL  (unchanged)
================================================================ */
exports.downloadBankStatementExcel = async (req, res) => {
  try {
    const { month, year, departmentId } = req.query;
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const rows = await SalaryGeneration.findAll({
      where,
      include: salaryIncludes(empWhere),
      order: baseOrder,
    });
    if (!rows.length)
      return res.status(404).json({ success: false, message: "No data." });

    const enrichedRows = await enrichWithDeptDesig(rows);
    const name = rows[0]?.company?.name || "Company";
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Bank Statement");

    ws.mergeCells("A1:G1");
    setCell(ws, "A1", name, { bold: true, size: 13 }, "center");
    ws.mergeCells("A2:G2");
    setCell(
      ws,
      "A2",
      `Bank Statement – ${getMonthName(month)} ${year}`,
      { size: 11 },
      "center",
    );
    ws.addRow([]);

    const hdr = ws.addRow([
      "S.No",
      "T.No",
      "Emp Code",
      "Employee Name",
      "Bank Account",
      "Net Pay",
      "Net (Round)",
    ]);
    styleHeaderRow(hdr, "#1F3864");
    ws.columns = [
      { width: 6 },
      { width: 9 },
      { width: 12 },
      { width: 28 },
      { width: 22 },
      { width: 14 },
      { width: 14 },
    ];

    const mappedRows = enrichedRows.map((r) => ({
      ...r.toJSON(),
      netSalary: toNum(r.netSalary),
      netRounded: toNum(r.netRounded),
      employee: {
        ...r.toJSON().employee,
        department: r.employee?.department || null,
      },
    }));

    const grouped = groupByDept(mappedRows);
    let sno = 1,
      grandTotal = 0;

    Object.entries(grouped).forEach(([dept, { records: dRec }]) => {
      const dr = ws.addRow([`Department: ${dept}`]);
      ws.mergeCells(`A${ws.rowCount}:G${ws.rowCount}`);
      dr.getCell(1).font = { bold: true, color: { argb: "FF1F3864" } };
      dr.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD6E4F7" },
      };

      let dTotal = 0;
      dRec.forEach((r) => {
        const row = ws.addRow([
          sno++,
          r.employee?.employeeCode || "",
          r.employee?.employeeCode || "",
          r.employee?.firstName || "",
          r.employee?.bankAccountNumber || "N/A",
          toNum(r.netSalary),
          toNum(r.netRounded),
        ]);
        row.getCell(6).numFmt = "₹#,##0.00";
        row.getCell(7).numFmt = "₹#,##0.00";
        styleDataRow(row, sno % 2 === 0);
        dTotal += toNum(r.netRounded);
      });

      const tr = ws.addRow(["", "", "", "Dept Total:", "", dTotal, dTotal]);
      tr.getCell(4).font = { bold: true };
      tr.getCell(4).alignment = { horizontal: "right" };
      tr.getCell(6).numFmt = "₹#,##0.00";
      tr.getCell(6).font = { bold: true };
      tr.getCell(7).numFmt = "₹#,##0.00";
      tr.getCell(7).font = { bold: true };
      tr.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCE4D6" },
      };
      grandTotal += dTotal;
    });

    ws.addRow([]);
    const gtRow = ws.addRow([
      "",
      "",
      "",
      "Grand Total:",
      "",
      grandTotal,
      grandTotal,
    ]);
    ws.mergeCells(`A${ws.rowCount}:D${ws.rowCount}`);
    gtRow.getCell(4).font = { bold: true, size: 12 };
    gtRow.getCell(4).alignment = { horizontal: "right" };
    gtRow.getCell(6).numFmt = "₹#,##0.00";
    gtRow.getCell(6).font = { bold: true, size: 12 };
    gtRow.getCell(7).numFmt = "₹#,##0.00";
    gtRow.getCell(7).font = { bold: true, size: 12 };
    gtRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD6E4F7" },
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bank-statement-${month}-${year}.xlsx`,
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("downloadBankStatementExcel:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   7. DOWNLOAD PAYSLIP – PDF  (unchanged)
================================================================ */
exports.downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await SalaryGeneration.findByPk(id, {
      include: [
        { model: Employee, as: "employee" },
        { model: Company, as: "company" },
        { model: SalaryGenerationDetail, as: "details" },
      ],
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Record not found." });

    const [enriched] = await enrichWithDeptDesig([record]);
    const emp = enriched.employee;
    const { earnings, deductions } = buildBreakdown(
      record.details || [],
      record.attnIncentive,
    );
    const doc = new PDFDocument({ margin: 45, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payslip-${emp.employeeCode}-${record.salaryMonth}-${record.salaryYear}.pdf`,
    );
    doc.pipe(res);

    doc.rect(45, 40, 505, 60).fill("#1F3864");
    doc
      .fillColor("white")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(record.company?.name || "Company", 55, 52, {
        width: 485,
        align: "center",
      });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `SALARY SLIP – ${getMonthName(record.salaryMonth)} ${record.salaryYear}`,
        55,
        72,
        { width: 485, align: "center" },
      );

    let y = 115;
    doc.rect(45, y, 505, 90).stroke("#CCCCCC");
    doc
      .fillColor("#000")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Employee Details", 55, y + 8);
    doc
      .moveTo(55, y + 20)
      .lineTo(545, y + 20)
      .stroke("#CCCCCC");
    doc.font("Helvetica").fontSize(9);
    const left = [
      ["Name", emp.firstName || ""],
      ["Emp Code", emp.employeeCode],
      ["Designation", emp.designation?.name || "-"],
    ];
    const right = [
      [
        "Pay Period",
        `${getMonthName(record.salaryMonth)} ${record.salaryYear}`,
      ],
      ["Working Days", record.workingDays],
      ["Present Days", record.presentDays],
    ];
    left.forEach(([label, val], i) => {
      doc.fillColor("#555").text(label + ":", 55, y + 28 + i * 16);
      doc.fillColor("#000").text(String(val), 140, y + 28 + i * 16);
    });
    right.forEach(([label, val], i) => {
      doc.fillColor("#555").text(label + ":", 310, y + 28 + i * 16);
      doc.fillColor("#000").text(String(val), 415, y + 28 + i * 16);
    });

    y += 100;
    const attCols = [
      ["Paid Leave", record.paidLeaveDays],
      ["Unpaid Leave", record.unpaidLeaveDays],
      ["Absent", record.absentDays],
      ["Week Off", record.weekOffDays],
      ["NH/FH", record.nhFhDays],
    ];
    doc.rect(45, y, 505, 24).fill("#EBF2FF");
    doc.fillColor("#000").fontSize(8).font("Helvetica-Bold");
    attCols.forEach(([label, val], i) => {
      const x = 55 + i * 101;
      doc.text(label, x, y + 4, { width: 95, align: "center" });
      doc
        .font("Helvetica")
        .text(String(toNum(val)), x, y + 13, { width: 95, align: "center" });
      doc.font("Helvetica-Bold");
    });

    y += 32;
    const earningItems = [
      ["Basic Salary", earnings.basic || 0],
      ["HRA", earnings.hra || 0],
      ["Special Allowance", earnings.spl || 0],
      ["Conveyance", earnings.conv || 0],
      ["Ent. Allowance", earnings.ent || 0],
      ["NH/FH Wages", earnings.nhfh || 0],
      ["Attn. Incentive", earnings.incentive || 0],
    ].filter((i) => i[1] > 0);

    const deductItems = [
      ["Provident Fund (12%)", deductions.pf || 0],
      ["ESI (0.75%)", deductions.esi || 0],
      ["Advance", deductions.adv || 0],
      ["Mess", deductions.mess || 0],
      ["Store", deductions.store || 0],
      ["Loan EMI", deductions.loan || 0],
      ["EB", deductions.eb || 0],
      ["Other", deductions.other || 0],
    ].filter((i) => i[1] > 0);

    doc.rect(45, y, 250, 18).fill("#1F3864");
    doc.rect(300, y, 250, 18).fill("#1F3864");
    doc
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("EARNINGS", 50, y + 5, { width: 155 })
      .text("AMOUNT (₹)", 170, y + 5, { width: 120, align: "right" })
      .text("DEDUCTIONS", 305, y + 5, { width: 155 })
      .text("AMOUNT (₹)", 425, y + 5, { width: 120, align: "right" });
    y += 18;

    const maxRows = Math.max(earningItems.length, deductItems.length);
    for (let i = 0; i < maxRows; i++) {
      const bg = i % 2 === 0 ? "#FFFFFF" : "#F5F8FF";
      doc.rect(45, y, 250, 16).fillAndStroke(bg, "#E0E0E0");
      doc.rect(300, y, 250, 16).fillAndStroke(bg, "#E0E0E0");
      doc.fillColor("black").fontSize(8).font("Helvetica");
      if (earningItems[i]) {
        doc.text(earningItems[i][0], 50, y + 4, { width: 155 });
        doc.text(
          `₹${toNum(earningItems[i][1]).toLocaleString("en-IN")}`,
          170,
          y + 4,
          { width: 120, align: "right" },
        );
      }
      if (deductItems[i]) {
        doc.text(deductItems[i][0], 305, y + 4, { width: 155 });
        doc.text(
          `₹${toNum(deductItems[i][1]).toLocaleString("en-IN")}`,
          425,
          y + 4,
          { width: 120, align: "right" },
        );
      }
      y += 16;
    }

    doc.rect(45, y, 250, 20).fill("#D6E4F7");
    doc.rect(300, y, 250, 20).fill("#FCE4D6");
    doc
      .fillColor("#000")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("GROSS EARNINGS", 50, y + 5)
      .text(
        `₹${toNum(record.grossSalary).toLocaleString("en-IN")}`,
        170,
        y + 5,
        { width: 120, align: "right" },
      )
      .text("TOTAL DEDUCTIONS", 305, y + 5)
      .text(
        `₹${toNum(record.totalDeductions).toLocaleString("en-IN")}`,
        425,
        y + 5,
        { width: 120, align: "right" },
      );
    y += 28;

    doc.rect(45, y, 505, 36).fill("#1F3864");
    doc
      .fillColor("white")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("NET PAY", 55, y + 11)
      .text(
        `₹${toNum(record.netRounded || record.netSalary).toLocaleString("en-IN")}`,
        55,
        y + 11,
        { width: 490, align: "right" },
      );
    y += 44;

    doc
      .fillColor("#333")
      .fontSize(8)
      .font("Helvetica")
      .text(
        `(${numberToWords(toNum(record.netRounded || record.netSalary))} Only)`,
        45,
        y,
        { width: 505, align: "center" },
      );
    y += 22;
    doc.rect(45, y, 505, 1).fill("#CCCCCC");
    y += 8;
    doc
      .fillColor("gray")
      .fontSize(7.5)
      .text(
        "This is a computer-generated payslip and does not require a signature.",
        45,
        y,
        { width: 505, align: "center" },
      );
    doc.text(`Generated: ${new Date().toLocaleString()}`, 45, y + 12, {
      width: 505,
      align: "center",
    });
    doc.end();
  } catch (err) {
    console.error("downloadPayslip:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   GET PAYSLIP LIST  (unchanged)
================================================================ */
exports.getPayslipList = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = buildWhere(req.query);
    const empWhere = {};
    if (departmentId) empWhere.departmentId = departmentId;

    const rows = await SalaryGeneration.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          where: Object.keys(empWhere).length ? empWhere : undefined,
          attributes: ["id", "employeeCode", "firstName", "lastName"],
        },
      ],
      order: baseOrder,
    });

    const enrichedRows = await enrichWithDeptDesig(rows);
    return res.json({ success: true, salaries: enrichedRows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ================================================================
   EXCEL / PDF STYLING HELPERS
================================================================ */
function styleHeaderRow(row, color = "#1F3864") {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color.replace("#", "FF") },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

function styleDataRow(row, alternate = false) {
  const bg = alternate ? "FFF0F4FF" : "FFFFFFFF";
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.font = { size: 9 };
    cell.border = {
      top: { style: "hair" },
      bottom: { style: "hair" },
      left: { style: "hair" },
      right: { style: "hair" },
    };
  });
}

function setCell(ws, addr, value, fontProps = {}, align = "left") {
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.font = fontProps;
  cell.alignment = { horizontal: align, vertical: "middle" };
}

function colToLetter(col) {
  let letter = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function reportTypeLabel(rt) {
  const m = {
    salary_report: "Basic Salary Report",
    with_el: "With Earned Leave",
    without_el: "Without Earned Leave",
    with_weekoff: "With Week Off",
    without_weekoff: "Without Week Off",
  };
  return m[rt] || rt;
}

const MGMT = [
  "GM",
  "Sr.M (M)",
  "M (TRG)",
  "PM",
  "OM",
  "AM(Q)",
  "AM (Pers)",
  "AM (Prod)",
  "ELE (M)",
  "E E",
];
const isManagement = (name = "") => MGMT.includes((name || "").trim());

/* ================================================================
   NUMBER TO WORDS
================================================================ */
function numberToWords(amount) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function cvt(n) {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + cvt(n % 100) : "")
    );
  }
  const r = Math.floor(toNum(amount));
  if (r === 0) return "Zero Rupees";
  const cr = Math.floor(r / 10000000);
  const la = Math.floor((r % 10000000) / 100000);
  const th = Math.floor((r % 100000) / 1000);
  const re = r % 1000;
  let res = "";
  if (cr) res += cvt(cr) + " Crore ";
  if (la) res += cvt(la) + " Lakh ";
  if (th) res += cvt(th) + " Thousand ";
  if (re) res += cvt(re);
  return res.trim() + " Rupees";
}

module.exports = exports;
