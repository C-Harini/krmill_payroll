import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest } from "../utils/apiCaller";

// ─── API helper ───────────────────────────────────────────────────────────────


// ─── PDF Generator (unchanged logic) ─────────────────────────────────────────
const generatePDF = (reportData, reportType, startDate, endDate) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const reportTitles = {
    shift_report: "Shift Report",
    with_el: "Shift Report — With Earned Leave",
    without_el: "Shift Report — Without Earned Leave",
    with_weekoff: "Shift Report — With Week Off",
    without_weekoff: "Shift Report — Without Week Off",
  };

  const title = reportTitles[reportType] || "Shift Report";
  const periodText = `Period: ${startDate}  →  ${endDate}`;
  const generatedText = `Generated: ${new Date().toLocaleString()}`;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(periodText, pageW - 14, 8, { align: "right" });
  doc.text(generatedText, pageW - 14, 14, { align: "right" });

  if (reportType === "with_el") {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(8);
    doc.roundedRect(14, 22, 30, 6, 1, 1, "F");
    doc.text("✓ EL Included", 29, 26.5, { align: "center" });
  } else if (reportType === "without_el") {
    doc.setFillColor(255, 237, 213);
    doc.setTextColor(194, 65, 12);
    doc.setFontSize(8);
    doc.roundedRect(14, 22, 32, 6, 1, 1, "F");
    doc.text("✗ EL Excluded", 30, 26.5, { align: "center" });
  } else if (reportType === "with_weekoff") {
    doc.setFillColor(237, 233, 254);
    doc.setTextColor(109, 40, 217);
    doc.setFontSize(8);
    doc.roundedRect(14, 22, 36, 6, 1, 1, "F");
    doc.text("+ Week Off Added", 32, 26.5, { align: "center" });
  } else if (reportType === "without_weekoff") {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(146, 64, 14);
    doc.setFontSize(8);
    doc.roundedRect(14, 22, 40, 6, 1, 1, "F");
    doc.text("− Week Off Subtracted", 34, 26.5, { align: "center" });
  }

  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  const showEL = reportType === "with_el" || reportType === "without_el";
  const showWO =
    reportType === "with_weekoff" || reportType === "without_weekoff";
  const totalEL = reportData.summary.reduce(
    (s, e) => s + (e.earnedLeaveDays || 0),
    0,
  );
  const totalWO = reportData.summary.reduce(
    (s, e) => s + (e.weekOffDays || 0),
    0,
  );
  const totalShiftDays = reportData.summary.reduce(
    (s, e) => s + (e.totalDaysAllShifts || 0),
    0,
  );
  const totalGrand = reportData.summary.reduce(
    (s, e) => s + (e.grandTotalDays || e.totalDaysAllShifts || 0),
    0,
  );

  doc.setFont("helvetica", "bold");
  doc.text(`Employees: ${reportData.totalEmployees}`, 14, 33);
  doc.text(`Total Shift Days: ${totalShiftDays}`, 55, 33);
  if (showEL) doc.text(`EL Days: ${totalEL.toFixed(2)}`, 120, 33);
  if (showWO) doc.text(`Week Off Days: ${totalWO}`, 120, 33);
  doc.text(`Grand Total: ${totalGrand}`, 175, 33);

  const shiftCols = (reportData.allShiftNames || []).map((name) => ({
    header: name,
    dataKey: `shift_${name}`,
  }));
  const elCol = showEL
    ? [
        {
          header: reportType === "with_el" ? "EL Days (+)" : "EL Days",
          dataKey: "el",
        },
      ]
    : [];
  const woCol = showWO
    ? [
        {
          header:
            reportType === "with_weekoff" ? "Week Off (+)" : "Week Off (−)",
          dataKey: "wo",
        },
      ]
    : [];

  const columns = [
    { header: "Emp Code", dataKey: "code" },
    { header: "Name", dataKey: "name" },
    { header: "Type", dataKey: "type" },
    ...(showWO ? [{ header: "Weekly Off", dataKey: "weeklyOffLabel" }] : []),
    ...shiftCols,
    { header: "Shift Days", dataKey: "shiftDays" },
    ...elCol,
    ...woCol,
    { header: "Total Days", dataKey: "total" },
    { header: "Work Hrs", dataKey: "workHrs" },
    { header: "OT Hrs", dataKey: "otHrs" },
  ];

  const rows = reportData.summary.map((emp) => {
    const row = {
      code: emp.employeeCode,
      name: emp.employeeName,
      type: emp.employeeType,
      weeklyOffLabel: emp.weeklyOff || "—",
      shiftDays: emp.totalDaysAllShifts,
      el:
        emp.earnedLeaveDays != null
          ? reportType === "with_el"
            ? `+${emp.earnedLeaveDays}`
            : String(emp.earnedLeaveDays)
          : "—",
      wo:
        emp.weekOffDays != null
          ? reportType === "with_weekoff"
            ? `+${emp.weekOffDays}`
            : `−${emp.weekOffDays}`
          : "—",
      total: emp.grandTotalDays ?? emp.totalDaysAllShifts,
      workHrs: emp.totalWorkingHoursAllShifts,
      otHrs: emp.totalOvertimeHoursAllShifts,
    };
    (reportData.allShiftNames || []).forEach((name) => {
      const found = emp.shifts?.find((s) => s.shiftName === name);
      row[`shift_${name}`] = found ? found.totalDays : 0;
    });
    return row;
  });

  const totalsRow = {
    code: "TOTAL",
    name: "",
    type: "",
    weeklyOffLabel: "",
    shiftDays: totalShiftDays,
    el: totalEL.toFixed(2),
    wo: totalWO,
    total: totalGrand,
    workHrs: reportData.summary
      .reduce((s, e) => s + parseFloat(e.totalWorkingHoursAllShifts || 0), 0)
      .toFixed(2),
    otHrs: reportData.summary
      .reduce((s, e) => s + parseFloat(e.totalOvertimeHoursAllShifts || 0), 0)
      .toFixed(2),
  };
  (reportData.allShiftNames || []).forEach((name) => {
    totalsRow[`shift_${name}`] = reportData.summary.reduce((s, e) => {
      const found = e.shifts?.find((sh) => sh.shiftName === name);
      return s + (found ? found.totalDays : 0);
    }, 0);
  });

  autoTable(doc, {
    columns,
    body: [...rows, totalsRow],
    startY: 37,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [229, 231, 235],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      code: { fontStyle: "bold", halign: "left" },
      name: { halign: "left" },
      type: { halign: "left" },
      shiftDays: { halign: "center" },
      el: {
        halign: "center",
        textColor: reportType === "with_el" ? [21, 128, 61] : [194, 65, 12],
        fontStyle: "bold",
      },
      wo: {
        halign: "center",
        textColor:
          reportType === "with_weekoff" ? [109, 40, 217] : [146, 64, 14],
        fontStyle: "bold",
      },
      total: { halign: "center", textColor: [37, 99, 235], fontStyle: "bold" },
      workHrs: { halign: "center" },
      otHrs: { halign: "center" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: function(data) {
      if (data.row.raw && String(data.row.raw.code || "").toUpperCase() === "TOTAL") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [239, 246, 255];
        data.cell.styles.textColor = [29, 78, 216];
      }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" },
    );
  }
  doc.save(`shift-report_${reportType}_${startDate}_to_${endDate}.pdf`);
};

const generateMonthlyAttendancePDF = (reportData, startDate, endDate) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const title = "Monthly Attendance Report";
  const periodText = `Period: ${startDate}  →  ${endDate}`;
  const generatedText = `Generated: ${new Date().toLocaleString()}`;

  // Header band
  doc.setFillColor(79, 70, 229); // Indigo theme for monthly attendance
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(periodText, pageW - 14, 8, { align: "right" });
  doc.text(generatedText, pageW - 14, 14, { align: "right" });

  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Employees: ${reportData.totalEmployees}`, 14, 30);

  // Columns definition
  const columns = [
    { header: "S.No", dataKey: "sNo" },
    { header: "T.No", dataKey: "tNo" },
    { header: "Employee Name", dataKey: "name" },
    { header: "Dept", dataKey: "dept" },
    ...(reportData.days || []).map(day => ({ header: day, dataKey: `day_${day}` })),
    { header: "P", dataKey: "totP" },
    { header: "A", dataKey: "totA" },
    { header: "L", dataKey: "totL" },
    { header: "W", dataKey: "totW" },
    { header: "NH", dataKey: "totNH" },
    { header: "CWH", dataKey: "totCWH" },
    { header: "EL", dataKey: "totEL" },
  ];

  // Rows definition
  const rows = reportData.summary.map((emp, idx) => {
    const row = {
      sNo: String(idx + 1),
      name: emp.employeeName,
      dept: emp.departmentAcronym,
      tNo: emp.employeeCode,
      totP: String(emp.totals.P),
      totA: String(emp.totals.A),
      totL: String(emp.totals.L),
      totW: String(emp.totals.W),
      totNH: String(emp.totals.NH),
      totCWH: String(emp.totals.CWH),
      totEL: String(emp.totals.EL),
    };

    // Add days
    (reportData.dates || []).forEach((dateStr, dIdx) => {
      const dayNum = reportData.days[dIdx];
      const dayData = emp.dailyAttendance[dateStr] || { status: "-", shiftCode: "" };
      row[`day_${dayNum}`] = dayData.shiftCode
        ? `${dayData.status}\n${dayData.shiftCode}`
        : dayData.status;
    });

    return row;
  });

  // Totals row definition
  const sumP = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.P || 0), 0).toFixed(1);
  const sumA = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.A || 0), 0).toFixed(1);
  const sumL = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.L || 0), 0).toFixed(1);
  const sumW = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.W || 0), 0).toFixed(1);
  const sumNH = reportData.summary.reduce((s, e) => s + (typeof e.totals.NH === 'number' ? e.totals.NH : 0), 0);
  const sumEL = reportData.summary.reduce((s, e) => s + (typeof e.totals.EL === 'number' ? e.totals.EL : 0), 0);

  const totalsRow = {
    sNo: "Total",
    name: "",
    dept: "",
    tNo: "",
    totP: sumP,
    totA: sumA,
    totL: sumL,
    totW: sumW,
    totNH: String(sumNH),
    totCWH: "-",
    totEL: String(sumEL),
  };

  (reportData.days || []).forEach(day => {
    totalsRow[`day_${day}`] = "";
  });

  autoTable(doc, {
    columns,
    body: [...rows, totalsRow],
    startY: 34,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 6,
      cellPadding: 1,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      halign: "center",
      valign: "middle"
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold"
    },
    columnStyles: {
      sNo: { halign: "left", cellWidth: 8 },
      tNo: { halign: "center", cellWidth: 12 },
      name: { halign: "left", fontStyle: "bold", cellWidth: 28 },
      dept: { halign: "center", cellWidth: 10 },
      totP: { fontStyle: "bold", fillColor: [239, 246, 255] },
      totA: { fontStyle: "bold", fillColor: [254, 242, 242] },
      totL: { fontStyle: "bold", fillColor: [255, 247, 237] },
      totW: { fontStyle: "bold", fillColor: [243, 232, 255] },
      totEL: { fontStyle: "bold", fillColor: [240, 253, 250] },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didParseCell: function(data) {
      if (data.row.raw && String(data.row.raw.sNo || "").toUpperCase() === "TOTAL") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [243, 244, 246];
        data.cell.styles.textColor = [31, 41, 55];
      }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }
  doc.save(`monthly-attendance-report_${startDate}_to_${endDate}.pdf`);
};

// ─── Report tab config ────────────────────────────────────────────────────────
const REPORT_TABS = [
  {
    key: "shift_report",
    label: "Shift Report",
    shortLabel: "Basic",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    color: "blue",
    desc: "Basic date-range shift summary with work hours and OT",
  },
  {
    key: "with_el",
    label: "With Earned Leave",
    shortLabel: "+ EL",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "green",
    desc: "Approved earned leave days are added to the shift total",
  },
  {
    key: "without_el",
    label: "Without Earned Leave",
    shortLabel: "− EL",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "orange",
    desc: "EL is shown as a separate column but not added to total",
  },
  {
    key: "with_weekoff",
    label: "With Week Off",
    shortLabel: "+ WO",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    color: "purple",
    desc: "Week-off days in the period are added to each employee's total",
  },
  {
    key: "without_weekoff",
    label: "Without Week Off",
    shortLabel: "− WO",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
    color: "amber",
    desc: "Week-off days are subtracted, showing net working days only",
  },
  {
    key: "monthly_attendance",
    label: "Monthly Attendance",
    shortLabel: "Monthly",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    color: "indigo",
    desc: "Grid of daily attendance status and shift code for each day of the month",
  },
];

const TAB_STYLES = {
  blue: {
    active: "bg-blue-600 text-white border-blue-600",
    inactive: "text-blue-700 border-blue-200 hover:bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700",
    header: "from-blue-700 to-blue-500",
    elColor: "",
    infoBox: "bg-blue-50 border-blue-200 text-blue-800",
  },
  green: {
    active: "bg-green-600 text-white border-green-600",
    inactive: "text-green-700 border-green-200 hover:bg-green-50",
    badge: "bg-green-100 text-green-700",
    btn: "bg-green-600 hover:bg-green-700",
    header: "from-green-700 to-green-500",
    elColor: "text-green-700 bg-green-50",
    infoBox: "bg-green-50 border-green-200 text-green-800",
  },
  orange: {
    active: "bg-orange-500 text-white border-orange-500",
    inactive: "text-orange-700 border-orange-200 hover:bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    btn: "bg-orange-500 hover:bg-orange-600",
    header: "from-orange-600 to-orange-400",
    elColor: "text-orange-600 bg-orange-50",
    infoBox: "bg-orange-50 border-orange-200 text-orange-800",
  },
  purple: {
    active: "bg-purple-600 text-white border-purple-600",
    inactive: "text-purple-700 border-purple-200 hover:bg-purple-50",
    badge: "bg-purple-100 text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700",
    header: "from-purple-700 to-purple-500",
    elColor: "text-purple-700 bg-purple-50",
    infoBox: "bg-purple-50 border-purple-200 text-purple-800",
  },
  amber: {
    active: "bg-amber-500 text-white border-amber-500",
    inactive: "text-amber-700 border-amber-200 hover:bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    btn: "bg-amber-500 hover:bg-amber-600",
    header: "from-amber-600 to-amber-400",
    elColor: "text-amber-700 bg-amber-50",
    infoBox: "bg-amber-50 border-amber-200 text-amber-800",
  },
  indigo: {
    active: "bg-indigo-600 text-white border-indigo-600",
    inactive: "text-indigo-700 border-indigo-200 hover:bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700",
    btn: "bg-indigo-600 hover:bg-indigo-700",
    header: "from-indigo-700 to-indigo-500",
    elColor: "text-indigo-700 bg-indigo-50",
    infoBox: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
};

// ─── Single Report Panel ──────────────────────────────────────────────────────
const ReportPanel = ({ tab, companyId, employees }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);

  const showEL = tab.key === "with_el" || tab.key === "without_el";
  const showWO = tab.key === "with_weekoff" || tab.key === "without_weekoff";
  const style = TAB_STYLES[tab.color];

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("End date must be after start date.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setReportData(null);
      const query = new URLSearchParams({
        companyId,
        startDate,
        endDate,
        reportType: tab.key,
        ...(employeeId && { employeeId }),
      });
      const res = await apiRequest(
        `/employee-shifts/shift-report?${query}`,
      );
      setReportData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData) return;
    setPdfLoading(true);
    try {
      if (tab.key === "monthly_attendance") {
        generateMonthlyAttendancePDF(reportData, startDate, endDate);
      } else {
        generatePDF(reportData, tab.key, startDate, endDate);
      }
    } catch (err) {
      setError("PDF generation failed: " + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!reportData) return;
    
    let csvContent = "\ufeff"; // BOM for Excel
    csvContent += `Monthly Attendance Report,Period: ${startDate} to ${endDate},Generated: ${new Date().toLocaleString()}\n\n`;
    
    const headers = ["S.No", "T.No", "Employee Name", "Dept"];
    reportData.days.forEach(day => headers.push(day));
    headers.push("P", "A", "L", "W", "NH", "CWH", "EL");
    csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
    
    reportData.summary.forEach((emp, idx) => {
      const row = [
        idx + 1,
        emp.employeeCode,
        emp.employeeName,
        emp.departmentAcronym
      ];
      
      reportData.dates.forEach(dateStr => {
        const dayData = emp.dailyAttendance[dateStr] || { status: "-", shiftCode: "" };
        const displayVal = dayData.shiftCode 
          ? `${dayData.status} (Shift ${dayData.shiftCode})` 
          : dayData.status;
        row.push(displayVal);
      });
      
      row.push(
        emp.totals.P,
        emp.totals.A,
        emp.totals.L,
        emp.totals.W,
        emp.totals.NH,
        emp.totals.CWH,
        emp.totals.EL
      );
      
      csvContent += row.map(val => `"${val}"`).join(",") + "\n";
    });
    
    const sumP = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.P || 0), 0).toFixed(1);
    const sumA = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.A || 0), 0).toFixed(1);
    const sumL = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.L || 0), 0).toFixed(1);
    const sumW = reportData.summary.reduce((s, e) => s + parseFloat(e.totals.W || 0), 0).toFixed(1);
    const sumNH = reportData.summary.reduce((s, e) => s + (typeof e.totals.NH === 'number' ? e.totals.NH : 0), 0);
    const sumEL = reportData.summary.reduce((s, e) => s + (typeof e.totals.EL === 'number' ? e.totals.EL : 0), 0);
    
    const totalsRow = ["Total", "", "", ""];
    reportData.dates.forEach(() => totalsRow.push(""));
    totalsRow.push(sumP, sumA, sumL, sumW, sumNH, "-", sumEL);
    csvContent += totalsRow.map(val => `"${val}"`).join(",") + "\n";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `monthly-attendance-report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Info banner for WO reports */}
      {showWO && (
        <div
          className={`rounded-xl px-4 py-3 text-sm border flex items-start gap-3 ${style.infoBox}`}
        >
          <svg
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <strong className="block mb-0.5">
              {tab.key === "with_weekoff"
                ? "Week Off days are added to total"
                : "Week Off days are subtracted from total"}
            </strong>
            <p className="text-xs leading-relaxed opacity-80">
              {tab.key === "with_weekoff"
                ? "Each employee's weekly off day(s) in the date range are counted and added to shift total. E.g., 4 Sundays = +4 days."
                : "Each employee's weekly off day(s) are subtracted from shift total, giving net working days only."}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Employee
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} - {emp.firstName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`flex-1 ${style.btn} disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
            {reportData && (
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={pdfLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                  PDF
                </button>
                {tab.key === "monthly_attendance" && (
                  <button
                    onClick={handleDownloadCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    CSV
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {!reportData && !loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center">
          <div className="text-5xl mb-3 opacity-20">📋</div>
          <p className="text-gray-400 font-medium text-sm">
            Select a date range and click Generate
          </p>
        </div>
      )}

      {/* Results */}
      {reportData && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Meta bar */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-600">
                <span className="text-gray-400">Period:</span>{" "}
                <span className="font-semibold">
                  {startDate} → {endDate}
                </span>
              </span>
              {showEL && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${reportData.includesEarnedLeave ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                >
                  {reportData.includesEarnedLeave
                    ? "✓ EL Included in Total"
                    : "✗ EL Shown but Not Added"}
                </span>
              )}
              {showWO && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tab.key === "with_weekoff" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {tab.key === "with_weekoff"
                    ? "+ Week Off Added to Total"
                    : "− Week Off Subtracted from Total"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Summary chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  {reportData.totalEmployees} employee
                  {reportData.totalEmployees !== 1 ? "s" : ""}
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  Shift days:{" "}
                  {reportData.summary.reduce(
                    (s, e) => s + (e.totalDaysAllShifts || 0),
                    0,
                  )}
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                  Grand total:{" "}
                  {reportData.summary.reduce(
                    (s, e) =>
                      s + (e.grandTotalDays || e.totalDaysAllShifts || 0),
                    0,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Single employee stat cards */}
          {reportData.summary?.length === 1 &&
            (() => {
              const emp = reportData.summary[0];
              return (
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {emp.employeeName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {emp.employeeName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {emp.employeeCode} • {emp.employeeType}
                        {showWO && emp.weeklyOff && (
                          <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                            Weekly off: {emp.weeklyOff}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      {
                        label: "Shift Days",
                        value: emp.totalDaysAllShifts,
                        cls: "bg-blue-50   border-blue-100   text-blue-700",
                      },
                      {
                        label: "Work Hrs",
                        value: `${emp.totalWorkingHoursAllShifts}h`,
                        cls: "bg-green-50  border-green-100  text-green-700",
                      },
                      {
                        label: "OT Hrs",
                        value: `${emp.totalOvertimeHoursAllShifts}h`,
                        cls: "bg-orange-50 border-orange-100 text-orange-700",
                      },
                      showEL
                        ? {
                            label: "EL Days",
                            value: emp.earnedLeaveDays ?? 0,
                            cls: "bg-emerald-50 border-emerald-100 text-emerald-700",
                          }
                        : null,
                      showWO
                        ? {
                            label: "Week Off Days",
                            value: emp.weekOffDays ?? 0,
                            cls: "bg-purple-50 border-purple-100 text-purple-700",
                          }
                        : null,
                      {
                        label: "Total Days",
                        value: emp.grandTotalDays ?? emp.totalDaysAllShifts,
                        cls: "bg-indigo-50 border-indigo-100 text-indigo-700",
                      },
                    ]
                      .filter(Boolean)
                      .map((stat) => (
                        <div
                          key={stat.label}
                          className={`rounded-xl p-3.5 border ${stat.cls}`}
                        >
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <div className="text-xs mt-0.5 font-medium opacity-70">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()}

          {/* Table */}
          {tab.key === "monthly_attendance" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-250">
                    <th 
                      style={{ width: "50px", minWidth: "50px", maxWidth: "50px", left: "0px" }}
                      className="px-2 py-3 text-left font-semibold text-gray-600 border border-gray-200 sticky bg-gray-50 z-10 whitespace-nowrap"
                    >
                      S.No
                    </th>
                    <th 
                      style={{ width: "80px", minWidth: "80px", maxWidth: "80px", left: "50px" }}
                      className="px-2 py-3 text-center font-semibold text-gray-600 border border-gray-200 sticky bg-gray-50 z-10 whitespace-nowrap"
                    >
                      T.No
                    </th>
                    <th 
                      style={{ width: "220px", minWidth: "220px", maxWidth: "220px", left: "130px" }}
                      className="px-3 py-3 text-left font-semibold text-gray-600 border border-gray-200 sticky bg-gray-50 z-10 whitespace-nowrap"
                    >
                      Employee Name
                    </th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-600 border border-gray-200 whitespace-nowrap">
                      Dept
                    </th>
                    {reportData.days?.map((day) => (
                      <th
                        key={day}
                        className="px-1 py-3 text-center font-semibold text-gray-600 border border-gray-200 whitespace-nowrap w-8"
                      >
                        {day}
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 bg-blue-50/50 whitespace-nowrap">P</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 bg-red-50/50 whitespace-nowrap">A</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 bg-orange-50/50 whitespace-nowrap">L</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 bg-purple-50/50 whitespace-nowrap">W</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 whitespace-nowrap">NH</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 whitespace-nowrap">CWH</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-705 border border-gray-200 bg-green-50/50 whitespace-nowrap">EL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.summary?.map((emp, idx) => (
                    <tr
                      key={emp.employeeId}
                      className={`hover:bg-blue-50 ${idx % 2 === 1 ? "bg-slate-50" : "bg-white"}`}
                    >
                      <td 
                        style={{ width: "50px", minWidth: "50px", maxWidth: "50px", left: "0px" }}
                        className="px-2 py-2 border border-gray-200 text-left sticky bg-inherit whitespace-nowrap font-medium text-gray-500"
                      >
                        {idx + 1}
                      </td>
                      <td 
                        style={{ width: "80px", minWidth: "80px", maxWidth: "80px", left: "50px" }}
                        className="px-2 py-2 border border-gray-200 text-center sticky bg-inherit whitespace-nowrap text-gray-600"
                      >
                        {emp.employeeCode}
                      </td>
                      <td 
                        style={{ width: "220px", minWidth: "220px", maxWidth: "220px", left: "130px" }}
                        className="px-3 py-2 border border-gray-200 text-left sticky bg-inherit whitespace-nowrap font-semibold text-gray-850"
                      >
                        {emp.employeeName}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap font-semibold text-slate-600">
                        {emp.departmentAcronym}
                      </td>
                      {reportData.dates?.map((dateStr) => {
                        const dayData = emp.dailyAttendance[dateStr] || { status: "-", shiftCode: "" };
                        return (
                          <td
                            key={dateStr}
                            className="px-1 py-1 border border-gray-200 text-center align-middle whitespace-nowrap"
                          >
                            <div className="font-bold text-slate-805 leading-tight">{dayData.status}</div>
                            <div className="text-[9px] text-blue-600 font-bold leading-none mt-0.5">{dayData.shiftCode || "\u00A0"}</div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 border border-gray-200 text-center font-bold text-blue-700 bg-blue-50/30">
                        {emp.totals.P}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center font-bold text-red-700 bg-red-50/30">
                        {emp.totals.A}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center font-bold text-orange-700 bg-orange-50/30">
                        {emp.totals.L}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center font-bold text-purple-700 bg-purple-50/30">
                        {emp.totals.W}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center text-gray-700">
                        {emp.totals.NH}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center text-gray-700">
                        {emp.totals.CWH}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-center font-bold text-green-700 bg-green-50/30 font-bold">
                        {emp.totals.EL}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-300 font-bold text-slate-850">
                    <td colSpan={4} className="px-3 py-3 border border-gray-200 text-right sticky left-0 bg-blue-50">
                      Total
                    </td>
                    {reportData.dates?.map((dateStr) => (
                      <td key={dateStr} className="px-1 py-2 border border-gray-200 text-center text-gray-400">
                        -
                      </td>
                    ))}
                    <td className="px-2 py-3 border border-gray-200 text-center text-blue-900 bg-blue-50">
                      {reportData.summary?.reduce((acc, emp) => acc + parseFloat(emp.totals.P || 0), 0).toFixed(1)}
                    </td>
                    <td className="px-2 py-3 border border-gray-200 text-center text-red-900 bg-red-50">
                      {reportData.summary?.reduce((acc, emp) => acc + parseFloat(emp.totals.A || 0), 0).toFixed(1)}
                    </td>
                    <td className="px-2 py-3 border border-gray-200 text-center text-orange-900 bg-orange-50">
                      {reportData.summary?.reduce((acc, emp) => acc + parseFloat(emp.totals.L || 0), 0).toFixed(1)}
                    </td>
                    <td className="px-2 py-3 border border-gray-200 text-center text-purple-900 bg-purple-50">
                      {reportData.summary?.reduce((acc, emp) => acc + parseFloat(emp.totals.W || 0), 0).toFixed(1)}
                    </td>
                    <td className="px-2 py-3 border border-gray-200 text-center text-gray-800">
                      {reportData.summary?.reduce((acc, emp) => acc + (typeof emp.totals.NH === 'number' ? emp.totals.NH : 0), 0)}
                    </td>
                    <td className="px-2 py-3 border border-gray-200 text-center text-gray-850">
                      -
                    </td>
                    <td className="px-2 py-3 border border-gray-200 text-center text-green-900 bg-green-50 font-bold">
                      {reportData.summary?.reduce((acc, emp) => acc + (typeof emp.totals.EL === 'number' ? emp.totals.EL : 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 whitespace-nowrap">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Type
                    </th>
                    {showWO && (
                      <th className="px-4 py-3 text-center font-semibold text-gray-500 whitespace-nowrap">
                        Weekly Off
                      </th>
                    )}
                    {reportData.allShiftNames?.map((s) => (
                      <th
                        key={s}
                        className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap"
                      >
                        {s}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 whitespace-nowrap">
                      Shift Days
                    </th>
                    {showEL && (
                      <th
                        className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${style.elColor || (tab.key === "with_el" ? "text-green-700 bg-green-50" : "text-orange-700 bg-orange-50")}`}
                      >
                        EL Days {tab.key === "with_el" ? "(+)" : ""}
                      </th>
                    )}
                    {showWO && (
                      <th
                        className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${tab.key === "with_weekoff" ? "text-purple-700 bg-purple-50" : "text-amber-700 bg-amber-50"}`}
                      >
                        Week Off {tab.key === "with_weekoff" ? "(+)" : "(−)"}
                      </th>
                    )}
                    <th className="px-4 py-3 text-center font-semibold text-blue-700 bg-blue-50 whitespace-nowrap">
                      Total Days
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">
                      Work Hrs
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">
                      OT Hrs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportData.summary?.map((emp, idx) => (
                    <tr
                      key={emp.employeeId}
                      className={`transition-colors hover:bg-blue-50 ${idx % 2 === 1 ? "bg-slate-50" : "bg-white"}`}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-inherit">
                        <div className="font-semibold text-gray-800">
                          {emp.employeeName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {emp.employeeCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {emp.employeeType}
                        </span>
                      </td>
                      {showWO && (
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {emp.weeklyOff || "—"}
                          </span>
                        </td>
                      )}
                      {reportData.allShiftNames?.map((shiftName) => {
                        const found = emp.shifts?.find(
                          (s) => s.shiftName === shiftName,
                        );
                        return (
                          <td
                            key={shiftName}
                            className="px-4 py-3 text-center text-gray-700"
                          >
                            {found ? found.totalDays : 0}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {emp.totalDaysAllShifts}
                      </td>
                      {showEL && (
                        <td
                          className={`px-4 py-3 text-center font-semibold ${tab.key === "with_el" ? "text-green-700 bg-green-50/60" : "text-orange-600 bg-orange-50/60"}`}
                        >
                          {tab.key === "with_el" ? "+" : ""}
                          {emp.earnedLeaveDays ?? 0}
                        </td>
                      )}
                      {showWO && (
                        <td
                          className={`px-4 py-3 text-center font-semibold ${tab.key === "with_weekoff" ? "text-purple-700 bg-purple-50/60" : "text-amber-700 bg-amber-50/60"}`}
                        >
                          {tab.key === "with_weekoff" ? "+" : "−"}
                          {emp.weekOffDays ?? 0}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center font-bold text-blue-700 bg-blue-50/60">
                        {emp.grandTotalDays ?? emp.totalDaysAllShifts}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {emp.totalWorkingHoursAllShifts}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {emp.totalOvertimeHoursAllShifts}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {reportData.summary?.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td
                        colSpan={
                          2 +
                          (showWO ? 1 : 0) +
                          (reportData.allShiftNames?.length || 0)
                        }
                        className="px-4 py-3 text-right font-bold text-blue-800"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-800 bg-blue-100/50">
                        {reportData.summary
                          .reduce((s, e) => s + (e.totalDaysAllShifts || 0), 0)
                          .toFixed(1)}
                      </td>
                      {showEL && (
                        <td className="px-4 py-3 text-center font-bold text-green-800 bg-green-100/50">
                          {reportData.summary
                            .reduce((s, e) => s + (e.earnedLeaveDays || 0), 0)
                            .toFixed(1)}
                        </td>
                      )}
                      {showWO && (
                        <td className="px-4 py-3 text-center font-bold text-purple-800 bg-purple-100/50">
                          {reportData.summary
                            .reduce((s, e) => s + (e.weekOffDays || 0), 0)
                            .toFixed(1)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">
                        {reportData.summary
                          .reduce(
                            (s, e) =>
                              s + (e.grandTotalDays ?? e.totalDaysAllShifts ?? 0),
                            0,
                          )
                          .toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">
                        {reportData.summary
                          .reduce(
                            (s, e) =>
                              s + parseFloat(e.totalWorkingHoursAllShifts || 0),
                            0,
                          )
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">
                        {reportData.summary
                          .reduce(
                            (s, e) =>
                              s + parseFloat(e.totalOvertimeHoursAllShifts || 0),
                            0,
                          )
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ShiftReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Accept context passed from EmployeeShiftManagement via navigate state
  const passedState = location.state || {};

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    passedState.companyId || "",
  );
  const [employees, setEmployees] = useState(passedState.employees || []);
  const [activeTab, setActiveTab] = useState("shift_report");

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await apiRequest("/companies");
        setCompanies(data);
        if (!selectedCompanyId && data.length > 0)
          setSelectedCompanyId(data[0].id);
      } catch {}
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const fetchEmployees = async () => {
      try {
        const data = await apiRequest(
          `/employees?companyId=${selectedCompanyId}`,
        );
        setEmployees(data.filter((e) => e.status === "Active"));
      } catch {}
    };
    fetchEmployees();
  }, [selectedCompanyId]);

  const currentTab = REPORT_TABS.find((t) => t.key === activeTab);
  const style = TAB_STYLES[currentTab.color];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Page header */}
      <div className={`bg-gradient-to-r ${style.header} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-white text-opacity-80 hover:text-opacity-100 text-sm font-medium transition-opacity"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Shift Summary
              </button>
              <span className="text-white text-opacity-30">|</span>
              <div>
                <h1 className="text-xl font-bold text-white">Shift Reports</h1>
                <p className="text-white text-opacity-70 text-xs mt-0.5">
                  Generate and download detailed shift reports
                </p>
              </div>
            </div>

            {/* Company selector */}
            <div className="flex items-center gap-3">
              <label className="text-white text-opacity-80 text-sm font-medium whitespace-nowrap">
                Company
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-3 py-1.5 bg-white bg-opacity-20 border border-white border-opacity-30 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 backdrop-blur-sm"
              >
                {companies.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="text-gray-800 bg-white"
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
            {REPORT_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-all border-t border-l border-r ${
                    isActive
                      ? "bg-white text-gray-800 border-white"
                      : "bg-white bg-opacity-10 text-white border-transparent hover:bg-opacity-20"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="inline md:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab description */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${style.badge}`}>
            {currentTab.icon}
          </div>
          <div>
            <span className="font-semibold text-gray-800 text-sm">
              {currentTab.label}
            </span>
            <span className="text-gray-400 text-sm ml-2">
              — {currentTab.desc}
            </span>
          </div>
        </div>
      </div>

      {/* Panel content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <ReportPanel
          key={activeTab}
          tab={currentTab}
          companyId={selectedCompanyId}
          employees={employees}
        />
      </div>
    </div>
  );
};

export default ShiftReportPage;
