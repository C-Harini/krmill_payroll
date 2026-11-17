import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import API from "../api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText,
  Printer,
  XCircle,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Layers,
  FileSpreadsheet,
  Download,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const formatDMY = (dateStr) => {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const getDayKey = (d) => (typeof d === "object" && d ? (d.key || d.dateStr || d.label) : String(d));
const getDayLabel = (d) => (typeof d === "object" && d ? (d.label || d.dateStr) : String(d));

const DepartmentReports = () => {
  const navigate = useNavigate();

  // --- Core States ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // --- Input Settings ---
  const [reportCategory, setReportCategory] = useState("Attendance"); // 'Attendance' or 'OverTime'
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedReportType, setSelectedReportType] = useState("Department Attendance");
  const [selectedDeptIds, setSelectedDeptIds] = useState(new Set());
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [deptSearch, setDeptSearch] = useState("");

  const selectedCompany = companies.find((c) => String(c.id) === String(selectedCompanyId));

  // --- Bootstrap ---
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchShifts();
    }
  }, [selectedCompanyId]);

  // Handle report type auto adjustment when category changes
  useEffect(() => {
    if (reportCategory === "Attendance") {
      setSelectedReportType("Department Attendance");
    } else {
      setSelectedReportType("Over Time Report");
    }
    setReportResult(null);
    setCurrentPage(1);
  }, [reportCategory]);

  // --- Fetchers ---
  const fetchCompanies = async () => {
    try {
      const { data } = await API.get("/companies");
      const list = Array.isArray(data) ? data : data.data || [];
      setCompanies(list);
      if (list.length > 0) {
        setSelectedCompanyId(list[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load companies");
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await API.get("/departments", {
        params: { companyId: selectedCompanyId, limit: 200 }
      });
      const list = data.data || (Array.isArray(data) ? data : []);
      setDepartments(list);
      // No department selected by default on load
      setSelectedDeptIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load departments");
    }
  };

  const fetchShifts = async () => {
    try {
      const { data } = await API.get("/shift-types", {
        params: { companyId: selectedCompanyId }
      });
      const list = Array.isArray(data) ? data : data.data || [];
      setShifts(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shifts");
    }
  };

  // --- Department Checkbox Actions ---
  const toggleSelectDept = (id) => {
    setSelectedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected = () => {
    const filteredDepts = departments.filter((dept) =>
      dept.departmentname.toLowerCase().includes(deptSearch.toLowerCase())
    );
    if (filteredDepts.length === 0) return false;
    return filteredDepts.every((dept) => selectedDeptIds.has(dept.id));
  };

  const handleSelectAllDepts = () => {
    const filteredDepts = departments.filter((dept) =>
      dept.departmentname.toLowerCase().includes(deptSearch.toLowerCase())
    );
    const allFilteredSelected = isAllFilteredSelected();

    setSelectedDeptIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredDepts.forEach((dept) => next.delete(dept.id));
      } else {
        filteredDepts.forEach((dept) => next.add(dept.id));
      }
      return next;
    });
  };

  // --- Generate Report ---
  const handleGenerate = async () => {
    if (!fromDate || !toDate) {
      toast.warning("Please choose a valid date range.");
      return;
    }

    setLoading(true);
    setReportResult(null);
    setCurrentPage(1);

    try {
      const deptArray = selectedDeptIds.size > 0 ? Array.from(selectedDeptIds) : departments.map((d) => d.id);
      const payload = {
        companyId: selectedCompanyId,
        reportType: selectedReportType,
        fromDate,
        toDate,
        departments: deptArray,
        shift: selectedShiftId
      };

      let url = "/reports/attendance";
      if (reportCategory === "OverTime") {
        if (selectedReportType === "Over Time Report (Hours wise)") {
          url = "/reports/overtime/hours-wise";
        } else if (selectedReportType === "Over Time Report (Day wise)") {
          url = "/reports/overtime/day-wise";
        } else if (selectedReportType === "Over Time Report (Abstract)") {
          url = "/reports/overtime/abstract";
        } else {
          url = "/reports/overtime";
        }
      }
      const { data } = await API.post(url, payload);

      const selectedCompany = companies.find((c) => String(c.id) === String(selectedCompanyId));
      const companyName = data.companyName || selectedCompany?.name || "Test Company";

      if (data.success) {
        setReportResult({
          type: selectedReportType,
          category: reportCategory,
          data: data.data || [],
          shifts: data.shifts || [],
          flatRows: data.flatRows || data.data || [],
          grandTotals: data.grandTotals || {},
          grandTotalHrs: data.grandTotalHrs != null ? data.grandTotalHrs : 0,
          grandTotalDays: data.grandTotalDays != null ? data.grandTotalDays : (data.grandTotals?.totalDays != null ? data.grandTotals.totalDays : (data.grandTotal || 0)),
          totalEmployees: data.totalEmployees || 0,
          days: data.days || [],
          dayCols: data.dayCols || [],
          dayTotals: data.dayTotals || {},
          grandTotal: data.grandTotal != null ? data.grandTotal : 0,
          shiftName: data.shiftName || "ALL",
          reportTitle: data.reportTitle || "Attendance Report for Production",
          companyName,
          meta: { fromDate, toDate }
        });
        toast.success("Report generated successfully!");
      } else {
        toast.error("Failed to load report data.");
      }
    } catch (err) {
      console.error("Report generation error:", err);
      toast.error(err.response?.data?.error || "Error occurred generating report.");
    } finally {
      setLoading(false);
    }
  };

  // --- PDF Document Generator ---
  const generatePDFDoc = () => {
    const selectedCompany = companies.find((c) => String(c.id) === String(selectedCompanyId));
    const companyName = reportResult?.companyName || selectedCompany?.name || "Test Company";

    if (reportResult.type === "Over Time Report (Day wise)") {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Centered Company Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(companyName, pageW / 2, 16, { align: "center" });

      // Subtitle
      const subTitle = `${reportResult.reportTitle || "OT Report for Production"} - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(subTitle, 14, 25);

      const days = reportResult.days || [];
      const dayTotals = reportResult.dayTotals || {};
      const grandTotal = reportResult.grandTotal != null ? reportResult.grandTotal : 0;

      const N = days.length;
      const isWide = N > 12;
      const isVeryWide = N > 22;
      const marginX = isWide ? 8 : 14;
      const availW = pageW - (marginX * 2);

      let tktWidth, nameWidth, totWidth, dayColWidth, fontSize, cellPadding;

      if (N <= 10) {
        tktWidth = 24;
        nameWidth = 60;
        totWidth = 16;
        dayColWidth = Math.min(16, (availW - tktWidth - nameWidth - totWidth) / Math.max(N, 1));
        fontSize = 8;
        cellPadding = 2;
      } else if (N <= 20) {
        tktWidth = 20;
        nameWidth = 50;
        totWidth = 14;
        dayColWidth = (availW - tktWidth - nameWidth - totWidth) / Math.max(N, 1);
        fontSize = 7;
        cellPadding = 1.2;
      } else {
        // Full month or more (21 to 35+ days)
        tktWidth = 16;
        nameWidth = 38;
        totWidth = 13;
        dayColWidth = Math.max(5.8, (availW - tktWidth - nameWidth - totWidth) / Math.max(N, 1));
        fontSize = 6;
        cellPadding = { top: 1.2, bottom: 1.2, left: 0.3, right: 0.3 };
      }

      // Header row: Tkt.No, Employee Name, day numbers (each column), Total
      const head = [
        [
          { content: "Tkt.No", styles: { halign: "left", fontStyle: "bold", textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Employee Name", styles: { halign: "left", fontStyle: "bold", textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] } },
          ...days.map((d) => ({
            content: getDayLabel(d),
            styles: { halign: "center", fontStyle: "bold", textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] }
          })),
          {
            content: "Total",
            styles: { halign: "center", fontStyle: "bold", textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] }
          }
        ]
      ];

      // Body rows
      const body = (reportResult.data || []).map((row) => [
        { content: String(row.ticketNo || ""), styles: { halign: "left" } },
        { content: String(row.employeeName || "").toUpperCase(), styles: { halign: "left" } },
        ...days.map((d) => {
          const k = getDayKey(d);
          const lbl = getDayLabel(d);
          const hrs = row.dailyHours ? (row.dailyHours[k] ?? row.dailyHours[lbl]) : null;
          return {
            content: hrs != null ? String(hrs) : "",
            styles: { halign: "center" }
          };
        }),
        {
          content: row.total != null ? String(row.total) : "0",
          styles: { halign: "center", fontStyle: "bold" }
        }
      ]);

      // Footer Total row
      const foot = [
        [
          { content: "Total", colSpan: 2, styles: { halign: "left", fontStyle: "bold", textColor: [0, 0, 0] } },
          ...days.map((d) => {
            const k = getDayKey(d);
            const lbl = getDayLabel(d);
            const sum = dayTotals ? (dayTotals[k] ?? dayTotals[lbl]) : 0;
            return {
              content: String(sum != null ? sum : 0),
              styles: { halign: "center", fontStyle: "bold", textColor: [0, 0, 0] }
            };
          }),
          {
            content: String(grandTotal),
            styles: { halign: "center", fontStyle: "bold", textColor: [0, 0, 0] }
          }
        ]
      ];

      const colStyles = {
        0: { cellWidth: tktWidth },
        1: { cellWidth: nameWidth }
      };
      days.forEach((_, idx) => {
        colStyles[2 + idx] = { cellWidth: dayColWidth };
      });
      colStyles[2 + days.length] = { cellWidth: totWidth };

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 28,
        margin: { left: marginX, right: marginX, top: 24, bottom: 24 },
        tableWidth: "wrap",
        theme: "plain",
        showFoot: "lastPage",
        styles: {
          fontSize,
          cellPadding,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          font: "helvetica"
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        columnStyles: colStyles,
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0, 1]
      });

      // Signatures on last page
      const numPages = doc.internal.getNumberOfPages();
      doc.setPage(numPages);
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 120;

      // Position signatures with comfortable space above, anchored near page bottom
      let sigY = Math.max(finalY + 16, pageH - 18);
      if (sigY > pageH - 10) {
        doc.addPage();
        sigY = pageH - 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("HOD", marginX + 10, sigY);
      doc.text("PM", pageW / 2, sigY, { align: "center" });
      doc.text("DGM", pageW - marginX - 10, sigY, { align: "right" });

      return doc;
    }

    if (reportResult.type === "Over Time Report (Hours wise)") {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 14;

      // Centered Company Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(companyName, pageW / 2, 16, { align: "center" });

      // Subtitle
      const subTitle = `${reportResult.reportTitle || "OT Report for Production"} - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(subTitle, marginX, 25);

      const head = [
        [
          { content: "SL.No", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Department", rowSpan: 2, styles: { halign: "left", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Sl.No", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Ticket No", rowSpan: 2, styles: { halign: "left", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Employee Name", rowSpan: 2, styles: { halign: "left", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Shift", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Overtime", colSpan: 3, styles: { halign: "center", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "OUT", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Category", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } }
        ],
        [
          { content: "IN", styles: { halign: "center", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "OUT", styles: { halign: "center", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } },
          { content: "Hrs", styles: { halign: "center", fontStyle: "bold", lineWidth: 0.15, lineColor: [0, 0, 0] } }
        ]
      ];

      const body = [];
      const flat = reportResult.flatRows || reportResult.data || [];
      flat.forEach((r) => {
        if (r.isShiftHeader) {
          body.push([
            { content: String(r.shiftName || ""), styles: { halign: "center", fontStyle: "bold", textColor: [30, 58, 138], lineWidth: 0 } },
            { content: "", colSpan: 10, styles: { lineWidth: 0 } }
          ]);
        } else if (r.isShiftSubtotal) {
          body.push([
            {
              content: "",
              colSpan: 8,
              styles: {
                lineWidth: { top: 0.15, right: 0, bottom: 0.15, left: 0.15 },
                lineColor: [0, 0, 0]
              }
            },
            {
              content: String(r.shiftTotalHrs != null ? (r.shiftTotalHrs.toFixed ? r.shiftTotalHrs.toFixed(1) : r.shiftTotalHrs) : 0),
              styles: {
                halign: "center",
                fontStyle: "bold",
                lineWidth: 0.15,
                lineColor: [0, 0, 0]
              }
            },
            {
              content: "",
              colSpan: 2,
              styles: {
                lineWidth: { top: 0.15, right: 0.15, bottom: 0.15, left: 0 },
                lineColor: [0, 0, 0]
              }
            }
          ]);
        } else {
          if (r.isFirstInDept !== false) {
            body.push([
              { content: String(r.deptSlNo || ""), rowSpan: r.deptCount || 1, styles: { halign: "center", valign: "top" } },
              { content: String(r.department || ""), rowSpan: r.deptCount || 1, styles: { halign: "left", valign: "top" } },
              { content: String(r.empSlNo || ""), styles: { halign: "center" } },
              { content: String(r.ticketNo || ""), styles: { halign: "left" } },
              { content: String(r.employeeName || "").toUpperCase(), styles: { halign: "left" } },
              { content: String(r.shift || ""), styles: { halign: "center" } },
              { content: String(r.otIn || ""), styles: { halign: "center" } },
              { content: String(r.otOut || ""), styles: { halign: "center" } },
              { content: String(r.otHours != null ? (r.otHours.toFixed ? r.otHours.toFixed(1) : r.otHours) : ""), styles: { halign: "center" } },
              { content: String(r.punchOut || ""), styles: { halign: "center" } },
              { content: String(r.category || ""), styles: { halign: "center" } }
            ]);
          } else {
            // Subsequent employees in the same department: omit columns 0 and 1 because they are spanned by rowSpan
            body.push([
              { content: String(r.empSlNo || ""), styles: { halign: "center" } },
              { content: String(r.ticketNo || ""), styles: { halign: "left" } },
              { content: String(r.employeeName || "").toUpperCase(), styles: { halign: "left" } },
              { content: String(r.shift || ""), styles: { halign: "center" } },
              { content: String(r.otIn || ""), styles: { halign: "center" } },
              { content: String(r.otOut || ""), styles: { halign: "center" } },
              { content: String(r.otHours != null ? (r.otHours.toFixed ? r.otHours.toFixed(1) : r.otHours) : ""), styles: { halign: "center" } },
              { content: String(r.punchOut || ""), styles: { halign: "center" } },
              { content: String(r.category || ""), styles: { halign: "center" } }
            ]);
          }
        }
      });

      const foot = [
        [
          {
            content: "",
            colSpan: 8,
            styles: {
              lineWidth: { top: 0.15, right: 0, bottom: 0.15, left: 0.15 },
              lineColor: [0, 0, 0]
            }
          },
          {
            content: String(reportResult.grandTotalHrs != null ? (reportResult.grandTotalHrs.toFixed ? reportResult.grandTotalHrs.toFixed(1) : reportResult.grandTotalHrs) : 0),
            styles: {
              halign: "center",
              fontStyle: "bold",
              textColor: [0, 0, 0],
              lineWidth: 0.15,
              lineColor: [0, 0, 0]
            }
          },
          {
            content: "",
            colSpan: 2,
            styles: {
              lineWidth: { top: 0.15, right: 0.15, bottom: 0.15, left: 0 },
              lineColor: [0, 0, 0]
            }
          }
        ]
      ];

      const colStyles = {
        0: { cellWidth: 14 },
        1: { cellWidth: 43 },
        2: { cellWidth: 14 },
        3: { cellWidth: 24 },
        4: { cellWidth: 54 },
        5: { cellWidth: 14 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
        8: { cellWidth: 18 },
        9: { cellWidth: 22 },
        10: { cellWidth: 20 }
      };

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 28,
        margin: { left: marginX, right: marginX, top: 24, bottom: 24 },
        theme: "plain",
        showFoot: "lastPage",
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          font: "helvetica"
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        columnStyles: colStyles
      });

      // Signatures on last page
      const numPages = doc.internal.getNumberOfPages();
      doc.setPage(numPages);
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 120;
      let sigY = Math.max(finalY + 16, pageH - 18);
      if (sigY > pageH - 10) {
        doc.addPage();
        sigY = pageH - 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("HOD", marginX + 10, sigY);
      doc.text("PM", pageW / 2, sigY, { align: "center" });
      doc.text("DGM", pageW - marginX - 10, sigY, { align: "right" });

      return doc;
    }

    if (reportResult.type === "Department Attendance") {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 14;

      // Centered Company Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(companyName, pageW / 2, 16, { align: "center" });

      // Subtitle
      const subTitle = `Attendance Report for Production - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(subTitle, marginX, 24);

      // Top horizontal black rule
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      doc.line(marginX, 26, pageW - marginX, 26);

      const head = [
        [
          { content: "Department", styles: { halign: "left", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "SL.No", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Ticket No", styles: { halign: "left", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Employee Name", styles: { halign: "left", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Shift", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Category", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Days", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } }
        ]
      ];

      const body = [];
      const flat = reportResult.flatRows || reportResult.data || [];

      flat.forEach((r) => {
        if (r.isGroupSubtotal) {
          body.push([
            {
              content: "",
              colSpan: 6,
              styles: {
                lineWidth: 0
              }
            },
            {
              content: r.groupTotalDays != null ? Number(r.groupTotalDays).toFixed(2) : "0.00",
              styles: {
                halign: "right",
                fontStyle: "bold",
                lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 },
                lineColor: [0, 0, 0]
              }
            }
          ]);
        } else if (r.isDeptSubtotal) {
          body.push([
            {
              content: "",
              colSpan: 6,
              styles: {
                lineWidth: 0
              }
            },
            {
              content: r.deptTotalDays != null ? Number(r.deptTotalDays).toFixed(2) : "0.00",
              styles: {
                halign: "right",
                fontStyle: "bold",
                lineWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 },
                lineColor: [0, 0, 0]
              }
            }
          ]);
        } else {
          if (r.isFirstInDept !== false) {
            body.push([
              { content: String(r.department || ""), rowSpan: r.deptCount || 1, styles: { halign: "left", valign: "top", fontStyle: "bold", lineWidth: 0 } },
              { content: String(r.empSlNo || ""), styles: { halign: "center", lineWidth: 0 } },
              { content: String(r.ticketNo || ""), styles: { halign: "left", lineWidth: 0 } },
              { content: String(r.employeeName || "").toUpperCase(), styles: { halign: "left", lineWidth: 0 } },
              { content: String(r.shift || ""), styles: { halign: "center", lineWidth: 0 } },
              { content: String(r.category || ""), styles: { halign: "center", lineWidth: 0 } },
              { content: r.days != null ? Number(r.days).toFixed(2) : "1.00", styles: { halign: "right", lineWidth: 0 } }
            ]);
          } else {
            body.push([
              { content: String(r.empSlNo || ""), styles: { halign: "center", lineWidth: 0 } },
              { content: String(r.ticketNo || ""), styles: { halign: "left", lineWidth: 0 } },
              { content: String(r.employeeName || "").toUpperCase(), styles: { halign: "left", lineWidth: 0 } },
              { content: String(r.shift || ""), styles: { halign: "center", lineWidth: 0 } },
              { content: String(r.category || ""), styles: { halign: "center", lineWidth: 0 } },
              { content: r.days != null ? Number(r.days).toFixed(2) : "1.00", styles: { halign: "right", lineWidth: 0 } }
            ]);
          }
        }
      });

      const foot = [
        [
          {
            content: "Grand Total",
            colSpan: 6,
            styles: {
              halign: "left",
              fontStyle: "bold",
              lineWidth: { top: 0.3, right: 0, bottom: 0.6, left: 0 },
              lineColor: [0, 0, 0]
            }
          },
          {
            content: reportResult.grandTotalDays != null ? Number(reportResult.grandTotalDays).toFixed(2) : "0.00",
            styles: {
              halign: "right",
              fontStyle: "bold",
              lineWidth: { top: 0.3, right: 0, bottom: 0.6, left: 0 },
              lineColor: [0, 0, 0]
            }
          }
        ]
      ];

      const colStyles = {
        0: { cellWidth: 44 },
        1: { cellWidth: 14 },
        2: { cellWidth: 24 },
        3: { cellWidth: 56 },
        4: { cellWidth: 14 },
        5: { cellWidth: 16 },
        6: { cellWidth: 16 }
      };

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 28,
        margin: { left: marginX, right: marginX, top: 24, bottom: 24 },
        theme: "plain",
        showFoot: "lastPage",
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1 },
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0,
          font: "helvetica"
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        columnStyles: colStyles,
        willDrawCell: (data) => {
          const isFirstCol = data.column.index === 0;
          const isLastCol = data.column.index === data.table.columns.length - 1;
          const isHead = data.section === "head";
          const isFoot = data.section === "foot";

          const left = isFirstCol ? 0.35 : 0;
          const right = isLastCol ? 0.35 : 0.2;

          let top = 0;
          let bottom = 0;

          if (isHead) {
            top = 0.35;
            bottom = 0.35;
          } else if (isFoot) {
            top = 0.25;
            bottom = 0.6;
          }

          const existingLW = data.cell.styles.lineWidth;
          if (existingLW && typeof existingLW === "object") {
            if (existingLW.top != null) top = existingLW.top;
            if (existingLW.bottom != null) bottom = existingLW.bottom;
          } else if (typeof existingLW === "number" && existingLW > 0) {
            top = existingLW;
            bottom = existingLW;
          }

          data.cell.styles.lineWidth = { top, bottom, left, right };
          data.cell.styles.lineColor = [0, 0, 0];
        }
      });

      // Signatures on last page
      const numPages = doc.internal.getNumberOfPages();
      doc.setPage(numPages);
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 120;
      let sigY = Math.max(finalY + 16, pageH - 18);
      if (sigY > pageH - 10) {
        doc.addPage();
        sigY = pageH - 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("HOD", marginX + 10, sigY);
      doc.text("PM", pageW / 2, sigY, { align: "center" });
      doc.text("DGM", pageW - marginX - 10, sigY, { align: "right" });

      return doc;
    }

    if (reportResult.type === "Attendance Shift Wise Detail") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [612, 1008] });
      const pageW = 1008;
      const pageH = 612;
      const marginX = 20;

      // Centered Company Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(companyName, pageW / 2, 22, { align: "center" });

      // Subtitle
      const subTitle = `Shift wise Attendance Detail - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(subTitle, marginX, 35);

      // Top horizontal black rule
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(marginX, 39, pageW - marginX, 39);

      const dayCols = reportResult.dayCols && reportResult.dayCols.length === 31
        ? reportResult.dayCols
        : Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

      const head = [
        [
          { content: "Tkt.No", styles: { halign: "center", fontStyle: "bold" } },
          { content: "empname", styles: { halign: "left", fontStyle: "bold" } },
          { content: "Dept", styles: { halign: "center", fontStyle: "bold" } },
          { content: "DOJ", styles: { halign: "center", fontStyle: "bold" } },
          ...dayCols.map((d) => ({ content: d, styles: { halign: "center", fontStyle: "bold" } })),
          { content: "A", styles: { halign: "center", fontStyle: "bold" } },
          { content: "B", styles: { halign: "center", fontStyle: "bold" } },
          { content: "C", styles: { halign: "center", fontStyle: "bold" } },
          { content: "T", styles: { halign: "center", fontStyle: "bold" } }
        ]
      ];

      const body = [];
      const flat = reportResult.flatRows || reportResult.data || [];

      flat.forEach((r) => {
        if (r.isDeptHeader) {
          body.push([
            {
              content: r.deptAcronym || r.department || "",
              colSpan: 4 + 31 + 4,
              styles: {
                halign: "left",
                fontStyle: "bold",
                textColor: [0, 0, 0],
                lineWidth: 0.15,
                lineColor: [0, 0, 0]
              }
            }
          ]);
        } else if (r.isEmployeeRow) {
          body.push([
            { content: String(r.ticketNo || ""), styles: { halign: "center" } },
            { content: String(r.employeeName || "").toUpperCase(), styles: { halign: "left" } },
            { content: String(r.deptAcronym || r.department || ""), styles: { halign: "center" } },
            { content: String(r.doj || ""), styles: { halign: "center" } },
            ...dayCols.map((d) => ({
              content: String(r.dailyShifts?.[d] || ""),
              styles: { halign: "center" }
            })),
            { content: r.shiftA > 0 ? Number(r.shiftA).toFixed(1) : "-", styles: { halign: "center" } },
            { content: r.shiftB > 0 ? Number(r.shiftB).toFixed(1) : "-", styles: { halign: "center" } },
            { content: r.shiftC > 0 ? Number(r.shiftC).toFixed(1) : "-", styles: { halign: "center" } },
            { content: r.totalDays > 0 ? Number(r.totalDays).toFixed(1) : "-", styles: { halign: "center", fontStyle: "bold" } }
          ]);
        }
      });

      const colStyles = {
        0: { cellWidth: 32 },
        1: { cellWidth: 125 },
        2: { cellWidth: 44 },
        3: { cellWidth: 54 },
      };
      dayCols.forEach((_, idx) => {
        colStyles[4 + idx] = { cellWidth: 19 };
      });
      const shiftStartIdx = 4 + 31;
      colStyles[shiftStartIdx] = { cellWidth: 26 };
      colStyles[shiftStartIdx + 1] = { cellWidth: 26 };
      colStyles[shiftStartIdx + 2] = { cellWidth: 26 };
      colStyles[shiftStartIdx + 3] = { cellWidth: 28 };

      autoTable(doc, {
        head,
        body,
        startY: 42,
        margin: { left: marginX, right: marginX, top: 30, bottom: 20 },
        theme: "plain",
        styles: {
          fontSize: 6.5,
          cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          font: "helvetica"
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.15
        },
        columnStyles: colStyles
      });

      return doc;
    }

    if (reportResult.type === "Over Time Report (Abstract)") {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 14;

      // Centered Company Name
      const compName = reportResult.companyName || companyName || "Test Company";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(compName, pageW / 2, 16, { align: "center" });

      // Subtitle
      const subTitle = `OT Report for Production - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(subTitle, marginX, 24);

      const head = [
        [
          { content: "", styles: { halign: "center", fontStyle: "bold" } },
          { content: "Department", styles: { halign: "left", fontStyle: "bold" } },
          { content: "Sl.No", styles: { halign: "center", fontStyle: "bold" } },
          { content: "Ticket No", styles: { halign: "left", fontStyle: "bold" } },
          { content: "Employee Name", styles: { halign: "left", fontStyle: "bold" } },
          { content: "Hrs", styles: { halign: "right", fontStyle: "bold" } },
          { content: "Category", styles: { halign: "center", fontStyle: "bold" } }
        ]
      ];

      const body = [];
      const flat = reportResult.flatRows || reportResult.data || [];

      flat.forEach((r) => {
        if (r.isShiftSubtotal) {
          body.push([
            { content: "", colSpan: 5, styles: { lineWidth: 0 } },
            {
              content: r.shiftTotalHrs != null ? Number(r.shiftTotalHrs).toFixed(1) : "0.0",
              styles: {
                halign: "right",
                fontStyle: "bold",
                lineWidth: { top: 0.2, bottom: 0.2, left: 0, right: 0 },
                lineColor: [0, 0, 0]
              }
            },
            { content: "", styles: { lineWidth: 0 } }
          ]);
        } else if (r.isEmployeeRow) {
          body.push([
            {
              content: r.isFirstInShift ? r.shift : "",
              styles: { halign: "center", fontStyle: "bold", textColor: [30, 58, 138] }
            },
            {
              content: r.department || "",
              styles: { halign: "left" }
            },
            {
              content: String(r.slNo || ""),
              styles: { halign: "center" }
            },
            {
              content: String(r.ticketNo || ""),
              styles: { halign: "left", fontStyle: "bold" }
            },
            {
              content: r.employeeName || "",
              styles: { halign: "left" }
            },
            {
              content: r.otHours != null ? Number(r.otHours).toFixed(1) : "0.0",
              styles: { halign: "right" }
            },
            {
              content: r.category || "",
              styles: { halign: "center" }
            }
          ]);
        }
      });

      const foot = [
        [
          {
            content: "",
            colSpan: 5,
            styles: {
              lineWidth: { top: 0.2, bottom: 0.2, left: 0, right: 0 },
              lineColor: [0, 0, 0]
            }
          },
          {
            content: (reportResult.grandTotalHrs != null ? reportResult.grandTotalHrs : 0).toFixed(1),
            styles: {
              halign: "right",
              fontStyle: "bold",
              lineWidth: { top: 0.2, bottom: 0.2, left: 0, right: 0 },
              lineColor: [0, 0, 0]
            }
          },
          {
            content: "",
            styles: {
              lineWidth: { top: 0.2, bottom: 0.2, left: 0, right: 0 },
              lineColor: [0, 0, 0]
            }
          }
        ]
      ];

      const colStyles = {
        0: { cellWidth: 12 },
        1: { cellWidth: 44 },
        2: { cellWidth: 14 },
        3: { cellWidth: 24 },
        4: { cellWidth: 54 },
        5: { cellWidth: 16 },
        6: { cellWidth: 18 }
      };

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 28,
        margin: { left: marginX, right: marginX, top: 24, bottom: 24 },
        theme: "plain",
        showFoot: "lastPage",
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1 },
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0,
          font: "helvetica"
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        columnStyles: colStyles,
        willDrawCell: (data) => {
          const isFirstCol = data.column.index === 0;
          const isLastCol = data.column.index === data.table.columns.length - 1;
          const isHead = data.section === "head";
          const isFoot = data.section === "foot";

          const LINE_W = 0.2; // uniform normal line width

          const left = isFirstCol ? LINE_W : 0;
          const right = isLastCol ? LINE_W : LINE_W;

          let top = 0;
          let bottom = 0;

          if (isHead) {
            top = LINE_W;
            bottom = LINE_W;
          } else if (isFoot) {
            top = LINE_W;
            bottom = LINE_W;
          }

          const existingLW = data.cell.styles.lineWidth;
          if (existingLW && typeof existingLW === "object") {
            if (existingLW.top != null) top = existingLW.top;
            if (existingLW.bottom != null) bottom = existingLW.bottom;
          } else if (typeof existingLW === "number" && existingLW > 0) {
            top = existingLW;
            bottom = existingLW;
          }

          data.cell.styles.lineWidth = { top, bottom, left, right };
          data.cell.styles.lineColor = [0, 0, 0];
        }
      });

      // Signatures on last page
      const numPages = doc.internal.getNumberOfPages();
      doc.setPage(numPages);
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 120;
      let sigY = Math.max(finalY + 16, pageH - 18);
      if (sigY > pageH - 10) {
        doc.addPage();
        sigY = pageH - 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("HOD", marginX + 10, sigY);
      doc.text("PM", pageW / 2, sigY, { align: "center" });
      doc.text("DGM", pageW - marginX - 10, sigY, { align: "right" });

      return doc;
    }

    if (reportResult.type === "Attendance Shift Wise Abstract") {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 14;

      const compName = reportResult.companyName || companyName || "Test Company";
      const subTitle = `Attendance Shift wise Abstract - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`;

      const head = [
        [
          { content: "Sl.No", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Tkt No", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Employee", styles: { halign: "left", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Department", styles: { halign: "left", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "DOJ", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Category", styles: { halign: "center", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "A", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "B", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "C", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Abs", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: "Total", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 }, lineColor: [0, 0, 0] } }
        ]
      ];

      const body = [];
      const flat = reportResult.flatRows || reportResult.data || [];

      flat.forEach((r) => {
        if (r.isDeptHeader) {
          body.push([
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            {
              content: r.deptAcronym || r.department || "",
              styles: {
                fontStyle: "bold",
                fontSize: 9,
                halign: "left",
                textColor: [0, 0, 0],
                lineWidth: { top: 0, bottom: 0.35, left: 0, right: 0 },
                lineColor: [0, 0, 0]
              }
            },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } },
            { content: "", styles: { lineWidth: 0 } }
          ]);
        } else if (r.isEmployeeRow) {
          body.push([
            { content: String(r.slNo || ""), styles: { halign: "center" } },
            { content: String(r.ticketNo || ""), styles: { halign: "center", fontStyle: "bold" } },
            { content: String(r.employeeName || ""), styles: { halign: "left" } },
            { content: String(r.deptAcronym || r.department || ""), styles: { halign: "left" } },
            { content: String(r.doj || "-"), styles: { halign: "center" } },
            { content: String(r.category || "-"), styles: { halign: "center" } },
            { content: r.shiftA > 0 ? Number(r.shiftA).toFixed(1) : "-", styles: { halign: "right" } },
            { content: r.shiftB > 0 ? Number(r.shiftB).toFixed(1) : "-", styles: { halign: "right" } },
            { content: r.shiftC > 0 ? Number(r.shiftC).toFixed(1) : "-", styles: { halign: "right" } },
            { content: r.absDays > 0 ? Number(r.absDays).toFixed(1) : "-", styles: { halign: "right" } },
            { content: r.totalDays > 0 ? Number(r.totalDays).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold" } }
          ]);
        } else if (r.isDeptSubtotal) {
          body.push([
            { content: "", styles: { lineWidth: { top: 0, bottom: 0, left: 0, right: 0 } } },
            { content: "", styles: { lineWidth: { top: 0, bottom: 0, left: 0, right: 0 } } },
            { content: "", styles: { lineWidth: { top: 0, bottom: 0, left: 0, right: 0 } } },
            { content: "", styles: { lineWidth: { top: 0, bottom: 0, left: 0, right: 0 } } },
            { content: "", styles: { lineWidth: { top: 0, bottom: 0, left: 0, right: 0 } } },
            { content: "", styles: { lineWidth: { top: 0, bottom: 0, left: 0, right: 0 } } },
            { content: r.shiftA > 0 ? Number(r.shiftA).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
            { content: r.shiftB > 0 ? Number(r.shiftB).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
            { content: r.shiftC > 0 ? Number(r.shiftC).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
            { content: r.absDays > 0 ? Number(r.absDays).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
            { content: r.totalDays > 0 ? Number(r.totalDays).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }, lineColor: [0, 0, 0] } }
          ]);
        }
      });

      const gt = reportResult.grandTotals || {};
      const foot = [
        [
          { content: "", colSpan: 6, styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.6, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: gt.shiftA > 0 ? Number(gt.shiftA).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.6, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: gt.shiftB > 0 ? Number(gt.shiftB).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.6, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: gt.shiftC > 0 ? Number(gt.shiftC).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.6, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: gt.absDays > 0 ? Number(gt.absDays).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.6, left: 0, right: 0 }, lineColor: [0, 0, 0] } },
          { content: gt.totalDays > 0 ? Number(gt.totalDays).toFixed(1) : "-", styles: { halign: "right", fontStyle: "bold", lineWidth: { top: 0.25, bottom: 0.6, left: 0, right: 0 }, lineColor: [0, 0, 0] } }
        ]
      ];

      const colStyles = {
        0: { cellWidth: 12 },
        1: { cellWidth: 14 },
        2: { cellWidth: 42 },
        3: { cellWidth: 22 },
        4: { cellWidth: 20 },
        5: { cellWidth: 16 },
        6: { cellWidth: 11 },
        7: { cellWidth: 11 },
        8: { cellWidth: 11 },
        9: { cellWidth: 11 },
        10: { cellWidth: 12 }
      };

      autoTable(doc, {
        head,
        body,
        foot,
        startY: 28,
        margin: { left: marginX, right: marginX, top: 20, bottom: 15 },
        theme: "plain",
        showFoot: "lastPage",
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1 },
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0,
          font: "helvetica"
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0
        },
        columnStyles: colStyles,
        willDrawCell: (data) => {
          const isFirstCol = data.column.index === 0;
          const isLastCol = data.column.index === data.table.columns.length - 1;
          const isHead = data.section === "head";
          const isFoot = data.section === "foot";

          const left = isFirstCol ? 0.35 : 0;
          const right = isLastCol ? 0.35 : 0.2;

          let top = 0;
          let bottom = 0;

          if (isHead) {
            top = 0.35;
            bottom = 0.35;
          } else if (isFoot) {
            top = 0.25;
            bottom = 0.6;
          }

          const existingLW = data.cell.styles.lineWidth;
          if (existingLW && typeof existingLW === "object") {
            if (existingLW.top != null) top = existingLW.top;
            if (existingLW.bottom != null) bottom = existingLW.bottom;
          } else if (typeof existingLW === "number" && existingLW > 0) {
            top = existingLW;
            bottom = existingLW;
          }

          data.cell.styles.lineWidth = { top, bottom, left, right };
          data.cell.styles.lineColor = [0, 0, 0];
        },
        didDrawPage: (data) => {
          if (data.pageNumber === 1) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(compName, pageW / 2, 14, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.text(subTitle, marginX, 22);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(0, 0, 0);
            doc.text(subTitle, marginX, 12);
          }
        }
      });

      return doc;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Header banner
    doc.setFillColor(30, 58, 138); // Dark Indigo
    doc.rect(0, 0, pageW, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 14, 9);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(reportResult.type, 14, 16);

    doc.setFontSize(8);
    doc.text(`Period: ${reportResult.meta.fromDate} to ${reportResult.meta.toDate}`, pageW - 14, 9, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, 16, { align: "right" });

    let columns = [];
    let rows = [];

    if (reportResult.type === "Over Time Report") {
      columns = [
        { header: "Tk.No", dataKey: "ticketNo" },
        { header: "Employee Name", dataKey: "employeeName" },
        { header: "Department", dataKey: "department" },
        { header: "Date", dataKey: "date" },
        { header: "Shift", dataKey: "shift" },
        { header: "OT Hours", dataKey: "otHours" },
        { header: "Remarks", dataKey: "remarks" }
      ];
      rows = reportResult.data;
    } else if (reportResult.type === "Over Time Report (Hours wise)") {
      columns = [
        { header: "OT Hours", dataKey: "otHours" },
        { header: "Number of Employees", dataKey: "numEmployees" }
      ];
      rows = reportResult.data;
    } else if (reportResult.type === "Over Time Report (Day wise)") {
      columns = [
        { header: "Date", dataKey: "date" },
        { header: "Employee Name", dataKey: "employeeName" },
        { header: "Department", dataKey: "department" },
        { header: "OT Hours", dataKey: "otHours" }
      ];
      rows = reportResult.data;
    } else if (reportResult.type === "Over Time Report (Abstract)") {
      columns = [
        { header: "Department", dataKey: "department" },
        { header: "Employees", dataKey: "employees" },
        { header: "Total OT Hours", dataKey: "totalOtHours" }
      ];
      rows = reportResult.data;
    } else {
      // Department Attendance / Attendance Shift Wise Detail
      columns = [
        { header: "Tk.No", dataKey: "ticketNo" },
        { header: "Employee Name", dataKey: "employeeName" },
        { header: "Department", dataKey: "department" },
        { header: "Date", dataKey: "date" },
        { header: "Shift", dataKey: "shift" },
        { header: "Status", dataKey: "statusDisplay" },
        { header: "In Time", dataKey: "inTime" },
        { header: "Out Time", dataKey: "outTime" }
      ];
      rows = reportResult.data.map((r) => ({
        ...r,
        statusDisplay: r.entryType === "BIOMETRIC_WITHOUT_HR" ? "Absent (No HR Entry)" : r.status
      }));
    }

    autoTable(doc, {
      columns,
      body: rows,
      startY: 25,
      margin: { left: 14, right: 14, bottom: 12 },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontStyle: "bold",
        halign: "left"
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: function (data) {
        if (data.row.raw && data.row.raw.entryType === "BIOMETRIC_WITHOUT_HR") {
          if (data.column.dataKey === "statusDisplay" || data.column.dataKey === "inTime" || data.column.dataKey === "outTime") {
            data.cell.styles.textColor = [225, 29, 72]; // Rose/Red
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
    }

    return doc;
  };

  // --- PDF Export ---
  const handleExportPDF = () => {
    if (!reportResult || !reportResult.data || reportResult.data.length === 0) {
      toast.warning("No data available to export.");
      return;
    }

    try {
      const doc = generatePDFDoc();
      const cleanFileName = `${reportResult.type.replace(/[^a-zA-Z0-9]/g, "_")}_${reportResult.meta.fromDate}_to_${reportResult.meta.toDate}.pdf`;
      doc.save(cleanFileName);
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("Error exporting PDF:", err);
      toast.error("Failed to generate PDF file.");
    }
  };

  // --- Excel Export ---
  const handleExportExcel = () => {
    if (!reportResult || !reportResult.data || reportResult.data.length === 0) {
      toast.warning("No data available to export.");
      return;
    }

    try {
      const selectedCompany = companies.find((c) => String(c.id) === String(selectedCompanyId));
      const companyName = reportResult.companyName || selectedCompany?.name || "Test Company";

      let headers = [];
      let dataRows = [];

      if (reportResult.type === "Attendance Shift Wise Abstract") {
        headers = ["Sl.No", "Tkt No", "Employee", "Department", "DOJ", "Category", "A", "B", "C", "Abs", "Total"];
        dataRows = [];
        const flat = reportResult.flatRows || reportResult.data || [];
        flat.forEach((r) => {
          if (r.isDeptHeader) {
            dataRows.push(["", "", r.deptAcronym || r.department || "", "", "", "", "", "", "", "", ""]);
          } else if (r.isEmployeeRow) {
            dataRows.push([
              r.slNo,
              r.ticketNo,
              r.employeeName,
              r.deptAcronym || r.department || "",
              r.doj || "-",
              r.category || "-",
              r.shiftA > 0 ? Number(r.shiftA).toFixed(1) : "-",
              r.shiftB > 0 ? Number(r.shiftB).toFixed(1) : "-",
              r.shiftC > 0 ? Number(r.shiftC).toFixed(1) : "-",
              r.absDays > 0 ? Number(r.absDays).toFixed(1) : "-",
              r.totalDays > 0 ? Number(r.totalDays).toFixed(1) : "-"
            ]);
          } else if (r.isDeptSubtotal) {
            dataRows.push([
              "",
              "",
              "",
              "",
              "",
              "",
              r.shiftA > 0 ? Number(r.shiftA).toFixed(1) : "-",
              r.shiftB > 0 ? Number(r.shiftB).toFixed(1) : "-",
              r.shiftC > 0 ? Number(r.shiftC).toFixed(1) : "-",
              r.absDays > 0 ? Number(r.absDays).toFixed(1) : "-",
              r.totalDays > 0 ? Number(r.totalDays).toFixed(1) : "-"
            ]);
          }
        });
        if (reportResult.grandTotals) {
          dataRows.push([
            "Grand Total",
            "",
            "",
            "",
            "",
            "",
            reportResult.grandTotals.shiftA > 0 ? Number(reportResult.grandTotals.shiftA).toFixed(1) : "-",
            reportResult.grandTotals.shiftB > 0 ? Number(reportResult.grandTotals.shiftB).toFixed(1) : "-",
            reportResult.grandTotals.shiftC > 0 ? Number(reportResult.grandTotals.shiftC).toFixed(1) : "-",
            reportResult.grandTotals.absDays > 0 ? Number(reportResult.grandTotals.absDays).toFixed(1) : "-",
            reportResult.grandTotals.totalDays > 0 ? Number(reportResult.grandTotals.totalDays).toFixed(1) : "-"
          ]);
        }
      } else if (reportResult.type === "Over Time Report") {
        headers = ["Tk.No", "Employee Name", "Department", "Date", "Shift", "OT Hours", "Remarks"];
        dataRows = reportResult.data.map((r) => [
          r.ticketNo,
          r.employeeName,
          r.department,
          r.date,
          r.shift,
          r.otHours,
          r.remarks
        ]);
      } else if (reportResult.type === "Over Time Report (Hours wise)") {
        headers = ["SL.No", "Department", "Sl.No", "Ticket No", "Employee Name", "Shift", "Overtime IN", "Overtime OUT", "Overtime Hrs", "Punch OUT", "Category"];
        const flat = reportResult.flatRows || reportResult.data || [];
        dataRows = [];
        flat.forEach((r) => {
          if (r.isShiftHeader) {
            dataRows.push([r.shiftName, "", "", "", "", "", "", "", "", "", ""]);
          } else if (r.isShiftSubtotal) {
            dataRows.push(["", "", "", "", "", "", "", "", r.shiftTotalHrs != null ? (r.shiftTotalHrs.toFixed ? r.shiftTotalHrs.toFixed(1) : r.shiftTotalHrs) : 0, "", ""]);
          } else {
            dataRows.push([
              r.deptSlNo || "",
              r.department || "",
              r.empSlNo || "",
              r.ticketNo || "",
              r.employeeName || "",
              r.shift || "",
              r.otIn || "",
              r.otOut || "",
              r.otHours != null ? (r.otHours.toFixed ? r.otHours.toFixed(1) : r.otHours) : "",
              r.punchOut || "",
              r.category || ""
            ]);
          }
        });
        dataRows.push(["", "", "", "", "", "", "", "", reportResult.grandTotalHrs != null ? (reportResult.grandTotalHrs.toFixed ? reportResult.grandTotalHrs.toFixed(1) : reportResult.grandTotalHrs) : 0, "", ""]);
      } else if (reportResult.type === "Over Time Report (Day wise)") {
        const days = reportResult.days || [];
        const dayTotals = reportResult.dayTotals || {};
        const grandTotal = reportResult.grandTotal != null ? reportResult.grandTotal : 0;

        headers = ["Tkt.No", "Employee Name", ...days.map(d => getDayLabel(d)), "Total"];
        dataRows = (reportResult.data || []).map((r) => [
          r.ticketNo || "",
          r.employeeName || "",
          ...days.map((d) => {
            const k = getDayKey(d);
            const lbl = getDayLabel(d);
            return r.dailyHours ? (r.dailyHours[k] ?? r.dailyHours[lbl] ?? "") : "";
          }),
          r.total != null ? r.total : 0
        ]);

        dataRows.push([
          "Total",
          "",
          ...days.map((d) => {
            const k = getDayKey(d);
            const lbl = getDayLabel(d);
            return dayTotals ? (dayTotals[k] ?? dayTotals[lbl] ?? 0) : 0;
          }),
          grandTotal
        ]);
      } else if (reportResult.type === "Over Time Report (Abstract)") {
        headers = ["Shift", "Department", "Sl.No", "Ticket No", "Employee Name", "Hrs", "Category"];
        const flat = reportResult.flatRows || reportResult.data || [];
        dataRows = [];
        flat.forEach((r) => {
          if (r.isShiftSubtotal) {
            dataRows.push(["", "", "", "", `Shift ${r.shift} Total`, r.shiftTotalHrs != null ? Number(r.shiftTotalHrs).toFixed(1) : "0.0", ""]);
          } else if (r.isEmployeeRow) {
            dataRows.push([
              r.shift || "",
              r.department || "",
              r.slNo || "",
              r.ticketNo || "",
              r.employeeName || "",
              r.otHours != null ? Number(r.otHours).toFixed(1) : "0.0",
              r.category || ""
            ]);
          }
        });
        dataRows.push(["", "", "", "", "Grand Total", (reportResult.grandTotalHrs != null ? reportResult.grandTotalHrs : 0).toFixed(1), ""]);
      } else if (reportResult.type === "Department Attendance") {
        headers = ["Department", "SL.No", "Ticket No", "Employee Name", "Shift", "Category", "Days"];
        const flat = reportResult.flatRows || reportResult.data || [];
        dataRows = [];
        flat.forEach((r) => {
          if (r.isGroupSubtotal) {
            dataRows.push(["", "", "", "", "", "Group Total", r.groupTotalDays != null ? Number(r.groupTotalDays).toFixed(2) : "0.00"]);
          } else if (r.isDeptSubtotal) {
            dataRows.push(["", "", "", "", "", "Total", r.deptTotalDays != null ? Number(r.deptTotalDays).toFixed(2) : "0.00"]);
          } else {
            dataRows.push([
              r.department || "",
              r.empSlNo || "",
              r.ticketNo || "",
              r.employeeName || "",
              r.shift || "",
              r.category || "",
              r.days != null ? Number(r.days).toFixed(2) : "1.00"
            ]);
          }
        });
        dataRows.push(["Grand Total", "", "", "", "", "", reportResult.grandTotalDays != null ? Number(reportResult.grandTotalDays).toFixed(2) : "0.00"]);
      } else if (reportResult.type === "Attendance Shift Wise Detail") {
        const dayCols = reportResult.dayCols && reportResult.dayCols.length === 31
          ? reportResult.dayCols
          : Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
        headers = ["Tkt.No", "empname", "Dept", "DOJ", ...dayCols, "A", "B", "C", "T"];
        const flat = reportResult.flatRows || reportResult.data || [];
        dataRows = [];
        flat.forEach((r) => {
          if (r.isDeptHeader) {
            dataRows.push([r.deptAcronym || r.department || "", ...Array(38).fill("")]);
          } else if (r.isEmployeeRow) {
            dataRows.push([
              r.ticketNo || "",
              r.employeeName || "",
              r.deptAcronym || r.department || "",
              r.doj || "",
              ...dayCols.map((d) => r.dailyShifts?.[d] || ""),
              r.shiftA > 0 ? Number(r.shiftA).toFixed(1) : "-",
              r.shiftB > 0 ? Number(r.shiftB).toFixed(1) : "-",
              r.shiftC > 0 ? Number(r.shiftC).toFixed(1) : "-",
              r.totalDays > 0 ? Number(r.totalDays).toFixed(1) : "-"
            ]);
          }
        });
      } else {
        headers = ["Tk.No", "Employee Name", "Department", "Date", "Shift", "Status", "HR Verified", "In Time", "Out Time"];
        dataRows = reportResult.data.map((r) => [
          r.ticketNo,
          r.employeeName,
          r.department,
          r.date,
          r.shift,
          r.entryType === "BIOMETRIC_WITHOUT_HR" ? "Absent (No HR Entry)" : r.status,
          r.isHrVerified ? "Yes" : "No",
          r.inTime,
          r.outTime
        ]);
      }

      const subTitle = (reportResult.type === "Over Time Report (Day wise)" || reportResult.type === "Department Attendance" || reportResult.type === "Attendance Shift Wise Detail")
        ? `${reportResult.reportTitle || "Attendance Report"} - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
        : reportResult.type;

      const sheetData = [
        [companyName],
        [subTitle],
        [`Period: ${reportResult.meta.fromDate} to ${reportResult.meta.toDate}`],
        [`Generated on: ${new Date().toLocaleString()}`],
        [],
        headers,
        ...dataRows
      ];

      if (reportResult.type === "Over Time Report (Day wise)" || reportResult.type === "Department Attendance" || reportResult.type === "Over Time Report (Hours wise)") {
        sheetData.push([], ["HOD", "", "", "PM", "", "", "DGM"]);
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        dataRows.forEach((row) => {
          const cellLen = String(row[i] || "").length;
          if (cellLen > maxLen) maxLen = cellLen;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");

      const cleanFileName = `${reportResult.type.replace(/[^a-zA-Z0-9]/g, "_")}_${reportResult.meta.fromDate}_to_${reportResult.meta.toDate}.xlsx`;
      XLSX.writeFile(wb, cleanFileName);
      toast.success("Excel downloaded successfully!");
    } catch (err) {
      console.error("Error exporting Excel:", err);
      toast.error("Failed to export Excel file.");
    }
  };

  // --- Safe Print Function (PDF based to prevent browser DOM OOM crashes) ---
  const handlePrint = () => {
    if (!reportResult || !reportResult.data || reportResult.data.length === 0) {
      toast.warning("No data available to print.");
      return;
    }

    try {
      const doc = generatePDFDoc();
      doc.autoPrint();
      const pdfBlobUrl = doc.output("bloburl");
      const printWindow = window.open(pdfBlobUrl, "_blank");
      if (!printWindow) {
        // Pop-up blocked fallback: save file directly
        doc.save(`${reportResult.type.replace(/[^a-zA-Z0-9]/g, "_")}_print.pdf`);
        toast.info("Pop-up blocked. PDF downloaded for printing.");
      }
    } catch (err) {
      console.error("Error generating print PDF:", err);
      window.print();
    }
  };

  const handleExit = () => {
    if (window.confirm("Return to home?")) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans print:p-0 print:bg-white">
      {/* Print CSS styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-report-area, #printable-report-area * {
              visibility: visible;
            }
            #printable-report-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
          }
        `
      }} />
      {/* Header title */}
      <div className="mb-6 bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl shadow-xl p-6 text-white flex justify-between items-center transition-all duration-300 hover:shadow-2xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Department Reports</h1>
          <p className="text-blue-100 text-sm mt-1">HR Management System — Generate Attendance & Overtime Reports</p>
        </div>
        <div className="flex items-center gap-3">
          {companies.length > 1 && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:bg-indigo-900 transition-all cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="text-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
            HR Department Active
          </span>
        </div>
      </div>

      {/* Main Configurations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left Side Options & Fields (8 columns) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-md p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2 border-b pb-3 border-slate-100">
              <Filter size={18} className="text-indigo-600" />
              Report Configurations
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Report Type Category Radio Buttons */}
              <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Report Category
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="reportCategory"
                      value="Attendance"
                      checked={reportCategory === "Attendance"}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 focus:ring-indigo-500 cursor-pointer"
                    />
                    Attendance
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="reportCategory"
                      value="OverTime"
                      checked={reportCategory === "OverTime"}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 focus:ring-indigo-500 cursor-pointer"
                    />
                    Over Time
                  </label>
                </div>
              </div>

              {/* Date Ranges & Type dropdowns (8 columns) */}
              <div className="md:col-span-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* From Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Select Report Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Select Report Type
                  </label>
                  {reportCategory === "Attendance" ? (
                    <select
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Department Attendance">Department Attendance</option>
                      <option value="Attendance Shift Wise Abstract">Attendance Shift Wise Abstract</option>
                      <option value="Attendance Shift Wise Detail">Attendance Shift Wise Detail</option>
                    </select>
                  ) : (
                    <select
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Over Time Report">Over Time Report</option>
                      <option value="Over Time Report (Hours wise)">Over Time Report (Hours wise)</option>
                      <option value="Over Time Report (Day wise)">Over Time Report (Day wise)</option>
                      <option value="Over Time Report (Abstract)">Over Time Report (Abstract)</option>
                    </select>
                  )}
                </div>

                {/* Shift Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Select Shift (Optional)
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Shifts</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-4 border-t border-slate-100 pt-5 mt-6 justify-end">
            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-all active:scale-95 shadow-sm"
            >
              <XCircle size={15} />
              Exit
            </button>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FileText size={15} />
              )}
              OK
            </button>
          </div>
        </div>

        {/* Right Side Checklist: Departments (4 columns) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col max-h-[420px]">
          <div className="flex justify-between items-center border-b border-slate-150 pb-3 mb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Layers size={16} className="text-indigo-600" />
              Departments
            </h3>
            <button
              onClick={handleSelectAllDepts}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-855 flex items-center gap-1 focus:outline-none"
            >
              {isAllFilteredSelected() ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Department search box */}
          <div className="relative mb-3 flex items-center">
            <input
              type="text"
              placeholder="Search departments..."
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <Search size={14} className="absolute left-3 text-slate-400" />
          </div>

          {/* Department checklist */}
          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {departments
              .filter((dept) =>
                dept.departmentname.toLowerCase().includes(deptSearch.toLowerCase())
              )
              .map((dept) => {
                const isChecked = selectedDeptIds.has(dept.id);
                return (
                  <div
                    key={dept.id}
                    onClick={() => toggleSelectDept(dept.id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200"
                  >
                    {isChecked ? (
                      <CheckSquare size={17} className="text-indigo-600 fill-indigo-50" />
                    ) : (
                      <Square size={17} className="text-slate-400" />
                    )}
                    <span className="text-xs font-semibold text-slate-700 select-none">
                      {dept.departmentname}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Generated Report View Area */}
      {reportResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 mb-6">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-250 flex flex-wrap gap-3 justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {reportResult.type === "Department Attendance" || reportResult.type === "Attendance Shift Wise Detail" || reportResult.type === "Attendance Shift Wise Abstract" || reportResult.type === "Over Time Report (Abstract)"
                  ? (reportResult.companyName || selectedCompany?.name || "Test Company")
                  : reportResult.type}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {reportResult.type === "Over Time Report (Abstract)"
                  ? `OT Report for Production - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
                  : reportResult.type === "Attendance Shift Wise Abstract"
                    ? `Attendance Shift wise Abstract - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
                    : `Period: ${reportResult.meta.fromDate} to ${reportResult.meta.toDate}`} &bull; Total:{" "}
                <span className="font-bold text-slate-700">
                  {reportResult.type === "Department Attendance" || reportResult.type === "Attendance Shift Wise Detail" || reportResult.type === "Attendance Shift Wise Abstract"
                    ? `${reportResult.totalEmployees || 0} employees (${reportResult.grandTotalDays != null ? Number(reportResult.grandTotalDays).toFixed(1) : (reportResult.grandTotals?.totalDays != null ? Number(reportResult.grandTotals.totalDays).toFixed(1) : "0.0")} days)`
                    : reportResult.type === "Over Time Report (Abstract)"
                      ? `${reportResult.data?.length || 0} employees (${reportResult.grandTotalHrs != null ? Number(reportResult.grandTotalHrs).toFixed(1) : "0.0"} hrs)`
                      : `${reportResult.data?.length || 0} records`}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow"
                title="Download full report as Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} />
                Download Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow"
                title="Download full report as Adobe PDF (.pdf)"
              >
                <Download size={15} />
                Download PDF
              </button>
            </div>
          </div>

          {/* Printable Container */}
          <div id="printable-report-area" className="p-6">
            {/* Print Friendly Header */}
            <div className="hidden print:block text-center border-b pb-4 mb-6">
              <h1 className="text-2xl font-bold uppercase tracking-wide">
                {reportResult.companyName || selectedCompany?.name || "Test Company"}
              </h1>
              <h2 className="text-base font-semibold text-slate-600 mt-1">
                {reportResult.type === "Department Attendance"
                  ? `Attendance Report for Production - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
                  : reportResult.type === "Attendance Shift Wise Detail"
                    ? `Shift wise Attendance Detail - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
                    : reportResult.type === "Attendance Shift Wise Abstract"
                      ? `Attendance Shift wise Abstract - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
                      : reportResult.type === "Over Time Report (Abstract)"
                        ? `OT Report for Production - (${formatDMY(reportResult.meta.fromDate)}-${formatDMY(reportResult.meta.toDate)}) - Shift : ${reportResult.shiftName || "ALL"}`
                        : reportResult.type}
              </h2>
              {reportResult.type !== "Department Attendance" && reportResult.type !== "Attendance Shift Wise Detail" && reportResult.type !== "Attendance Shift Wise Abstract" && reportResult.type !== "Over Time Report (Abstract)" && (
                <p className="text-xs text-slate-500 mt-0.5">
                  From Date: {reportResult.meta.fromDate} | To Date: {reportResult.meta.toDate}
                </p>
              )}
            </div>

            {/* Attendance Status Legend Tag Bar */}
            {reportCategory === "Attendance" && reportResult.type !== "Department Attendance" && reportResult.type !== "Attendance Shift Wise Detail" && reportResult.type !== "Attendance Shift Wise Abstract" && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-4 text-xs font-semibold print:border-slate-300">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Legend:</span>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    ✓ Present (HR Verified)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-800 border-b-2 border-b-rose-600 border-x border-t border-rose-200 font-bold underline decoration-rose-600 decoration-2">
                    ⚠ Absent (Biometric Punch Only — No HR Entry)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                    Absent
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                    Leave / Half Day / Week Off
                  </span>
                </div>
              </div>
            )}

            {reportResult.data.length > 0 ? (
              <>
                {/* Paginated rows computation */}
                {(() => {
                  const totalRows = reportResult.data.length;
                  const totalPages = pageSize === "All" ? 1 : Math.ceil(totalRows / Number(pageSize)) || 1;
                  const paginatedData =
                    pageSize === "All" ||
                      reportResult.type === "Department Attendance" ||
                      reportResult.type === "Attendance Shift Wise Detail" ||
                      reportResult.type === "Attendance Shift Wise Abstract" ||
                      reportResult.type === "Over Time Report (Abstract)"
                      ? (reportResult.flatRows || reportResult.data)
                      : reportResult.data.slice(
                        (currentPage - 1) * Number(pageSize),
                        currentPage * Number(pageSize)
                      );

                  return (
                    <div>
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto print:max-h-none print:overflow-visible border border-slate-350 rounded-lg">
                        {reportResult.type === "Attendance Shift Wise Abstract" ? (
                          <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[50px]">Sl.No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[65px]">Tkt No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2 border border-slate-300 text-left min-w-[170px]">Employee</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[75px]">Department</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[85px]">DOJ</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[65px]">Category</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-right min-w-[45px]">A</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-right min-w-[45px]">B</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-right min-w-[45px]">C</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-right min-w-[45px]">Abs</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-right min-w-[55px]">Total</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-800 divide-y divide-slate-200">
                              {(reportResult.flatRows || reportResult.data || []).map((row, index) => {
                                if (row.isDeptHeader) {
                                  return (
                                    <tr key={`dept-hdr-${index}`} className="bg-white">
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-3 py-1.5 border border-slate-300 text-left">
                                        <span className="font-extrabold text-slate-900 text-sm border-b-2 border-slate-900 pb-0.5 inline-block uppercase tracking-wide">
                                          {row.deptAcronym || row.department}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                      <td className="px-2 py-1.5 border border-slate-300"></td>
                                    </tr>
                                  );
                                }
                                if (row.isEmployeeRow) {
                                  return (
                                    <tr key={`emp-${row.slNo || index}`} className="hover:bg-slate-50/50 font-medium text-xs">
                                      <td className="px-2 py-1 border border-slate-300 text-center text-slate-600">{row.slNo}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-center font-bold text-slate-900">{row.ticketNo}</td>
                                      <td className="px-3 py-1 border border-slate-300 text-left font-semibold text-slate-900 uppercase whitespace-nowrap">{row.employeeName}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-center font-semibold text-slate-700">{row.deptAcronym || row.department}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-center text-slate-600 whitespace-nowrap">{row.doj || "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-center font-bold text-slate-700">{row.category || "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-semibold text-slate-800">{row.shiftA > 0 ? Number(row.shiftA).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-semibold text-slate-800">{row.shiftB > 0 ? Number(row.shiftB).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-semibold text-slate-800">{row.shiftC > 0 ? Number(row.shiftC).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-semibold text-slate-800">{row.absDays > 0 ? Number(row.absDays).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-bold text-slate-900">{row.totalDays > 0 ? Number(row.totalDays).toFixed(1) : "-"}</td>
                                    </tr>
                                  );
                                }
                                if (row.isDeptSubtotal) {
                                  return (
                                    <tr key={`dept-sub-${index}`} className="bg-slate-50 font-bold border-t border-b-2 border-slate-300 text-xs">
                                      <td colSpan={6} className="px-3 py-1 border border-slate-300"></td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-bold text-slate-900">{row.shiftA > 0 ? Number(row.shiftA).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-bold text-slate-900">{row.shiftB > 0 ? Number(row.shiftB).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-bold text-slate-900">{row.shiftC > 0 ? Number(row.shiftC).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-bold text-slate-900">{row.absDays > 0 ? Number(row.absDays).toFixed(1) : "-"}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-right font-black text-slate-900">{row.totalDays > 0 ? Number(row.totalDays).toFixed(1) : "-"}</td>
                                    </tr>
                                  );
                                }
                                return null;
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300 text-xs" style={{ backgroundColor: "#f1f5f9" }}>
                                <td colSpan={6} className="px-3 py-2 border border-slate-300 text-right font-bold text-slate-800 uppercase tracking-wider bg-slate-100" style={{ backgroundColor: "#f1f5f9", opacity: 1 }}>
                                  Grand Total
                                </td>
                                <td className="px-2 py-2 border border-slate-300 text-right font-bold text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9", opacity: 1 }}>
                                  {(reportResult.grandTotals?.shiftA != null && reportResult.grandTotals.shiftA > 0) ? Number(reportResult.grandTotals.shiftA).toFixed(1) : "-"}
                                </td>
                                <td className="px-2 py-2 border border-slate-300 text-right font-bold text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9", opacity: 1 }}>
                                  {(reportResult.grandTotals?.shiftB != null && reportResult.grandTotals.shiftB > 0) ? Number(reportResult.grandTotals.shiftB).toFixed(1) : "-"}
                                </td>
                                <td className="px-2 py-2 border border-slate-300 text-right font-bold text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9", opacity: 1 }}>
                                  {(reportResult.grandTotals?.shiftC != null && reportResult.grandTotals.shiftC > 0) ? Number(reportResult.grandTotals.shiftC).toFixed(1) : "-"}
                                </td>
                                <td className="px-2 py-2 border border-slate-300 text-right font-bold text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9", opacity: 1 }}>
                                  {(reportResult.grandTotals?.absDays != null && reportResult.grandTotals.absDays > 0) ? Number(reportResult.grandTotals.absDays).toFixed(1) : "-"}
                                </td>
                                <td className="px-2 py-2 border border-slate-300 text-right font-black text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9", opacity: 1 }}>
                                  {(reportResult.grandTotals?.totalDays != null && reportResult.grandTotals.totalDays > 0) ? Number(reportResult.grandTotals.totalDays).toFixed(1) : "-"}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        ) : reportResult.type === "Over Time Report" ? (
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Tk.No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Employee Name</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Department</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Date</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Shift</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">OT Hours</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-200">
                              {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 border border-slate-300 font-bold">{row.ticketNo}</td>
                                  <td className="px-4 py-3 border border-slate-300">{row.employeeName}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-xs font-semibold">{row.department}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-xs">{row.date}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-xs font-bold text-indigo-750">{row.shift}</td>
                                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-800">{row.otHours}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-xs text-slate-500 italic">{row.remarks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : reportResult.type === "Over Time Report (Hours wise)" ? (
                          <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                                <th rowSpan={2} className="px-2 py-2 border border-slate-300 w-12">SL.No</th>
                                <th rowSpan={2} className="px-3 py-2 border border-slate-300 text-left min-w-[130px]">Department</th>
                                <th rowSpan={2} className="px-2 py-2 border border-slate-300 w-12">Sl.No</th>
                                <th rowSpan={2} className="px-3 py-2 border border-slate-300 text-left min-w-[90px]">Ticket No</th>
                                <th rowSpan={2} className="px-3 py-2 border border-slate-300 text-left min-w-[160px]">Employee Name</th>
                                <th rowSpan={2} className="px-2 py-2 border border-slate-300 w-12">Shift</th>
                                <th colSpan={3} className="px-2 py-1.5 border border-slate-300 text-center font-bold">Overtime</th>
                                <th rowSpan={2} className="px-3 py-2 border border-slate-300 min-w-[70px]">OUT</th>
                                <th rowSpan={2} className="px-2 py-2 border border-slate-300 min-w-[60px]">Category</th>
                              </tr>
                              <tr className="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                                <th className="px-2 py-1.5 border border-slate-300 min-w-[65px]">IN</th>
                                <th className="px-2 py-1.5 border border-slate-300 min-w-[65px]">OUT</th>
                                <th className="px-2 py-1.5 border border-slate-300 min-w-[50px]">Hrs</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-800 divide-y divide-slate-200">
                              {(reportResult.flatRows || reportResult.data || []).map((row, index) => {
                                if (row.isShiftHeader) {
                                  return (
                                    <tr key={`sh-${index}`} className="bg-slate-50/80">
                                      <td className="px-2 py-2 text-center font-black text-indigo-700 text-sm border-0">
                                        {row.shiftName}
                                      </td>
                                      <td colSpan={10} className="px-3 py-2 border-0"></td>
                                    </tr>
                                  );
                                }
                                if (row.isShiftSubtotal) {
                                  return (
                                    <tr key={`sub-${index}`} className="font-bold">
                                      <td colSpan={8} className="border-b border-l border-slate-300"></td>
                                      <td className="px-2 py-2 border border-slate-400 text-center font-black text-slate-900 bg-slate-100">
                                        {row.shiftTotalHrs != null ? (row.shiftTotalHrs.toFixed ? row.shiftTotalHrs.toFixed(1) : row.shiftTotalHrs) : 0}
                                      </td>
                                      <td colSpan={2} className="border-b border-r border-slate-300"></td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={`row-${row.empSlNo || index}`} className="hover:bg-slate-50/50 font-medium">
                                    {row.isFirstInDept !== false && (
                                      <>
                                        <td
                                          rowSpan={row.deptCount || 1}
                                          className="px-2 py-1.5 border border-slate-300 text-center font-bold align-top bg-white"
                                        >
                                          {row.deptSlNo}
                                        </td>
                                        <td
                                          rowSpan={row.deptCount || 1}
                                          className="px-3 py-1.5 border border-slate-300 uppercase font-semibold text-slate-700 align-top bg-white"
                                        >
                                          {row.department}
                                        </td>
                                      </>
                                    )}
                                    <td className="px-2 py-1.5 border border-slate-300 text-center text-slate-600">{row.empSlNo}</td>
                                    <td className="px-3 py-1.5 border border-slate-300 font-bold text-slate-900">{row.ticketNo}</td>
                                    <td className="px-3 py-1.5 border border-slate-300 uppercase whitespace-nowrap">{row.employeeName}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center font-semibold text-indigo-700">{row.shift}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center text-slate-700">{row.otIn}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center text-slate-700">{row.otOut}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-900">
                                      {row.otHours != null ? (row.otHours.toFixed ? row.otHours.toFixed(1) : row.otHours) : ""}
                                    </td>
                                    <td className="px-3 py-1.5 border border-slate-300 text-center text-slate-700">{row.punchOut}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700">{row.category}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300" style={{ backgroundColor: "#f1f5f9" }}>
                                <td
                                  colSpan={8}
                                  className="px-3 py-2.5 border border-slate-300 text-left font-bold text-slate-800 uppercase tracking-wider bg-slate-100"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                >
                                  Grand Total
                                </td>
                                <td
                                  className="px-2 py-2.5 border border-slate-300 text-center font-black text-slate-900 text-sm bg-slate-100"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                >
                                  {reportResult.grandTotalHrs != null ? (reportResult.grandTotalHrs.toFixed ? reportResult.grandTotalHrs.toFixed(1) : reportResult.grandTotalHrs) : 0}
                                </td>
                                <td
                                  colSpan={2}
                                  className="border border-slate-300 bg-slate-100"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                ></td>
                              </tr>
                            </tfoot>
                          </table>
                        ) : reportResult.type === "Over Time Report (Day wise)" ? (
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Tkt.No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300 min-w-[160px]">Employee Name</th>
                                {(reportResult.days || []).map((d) => (
                                  <th key={getDayKey(d)} className="sticky top-0 bg-slate-100 z-10 px-2 py-3 border border-slate-300 text-center font-bold text-slate-800 min-w-[36px]">
                                    {getDayLabel(d)}
                                  </th>
                                ))}
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300 text-center font-bold text-slate-800 min-w-[60px]">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-200">
                              {paginatedData.map((row, index) => (
                                <tr key={row.employeeId || index} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2 border border-slate-300 font-bold text-slate-800">{row.ticketNo}</td>
                                  <td className="px-4 py-2 border border-slate-300 uppercase whitespace-nowrap">{row.employeeName}</td>
                                  {(reportResult.days || []).map((d) => {
                                    const k = getDayKey(d);
                                    const lbl = getDayLabel(d);
                                    const hrs = row.dailyHours ? (row.dailyHours[k] ?? row.dailyHours[lbl]) : null;
                                    return (
                                      <td key={k} className="px-2 py-2 border border-slate-300 text-center font-bold text-slate-800">
                                        {hrs != null ? hrs : ""}
                                      </td>
                                    );
                                  })}
                                  <td className="px-4 py-2 border border-slate-300 text-center font-bold text-indigo-750">
                                    {row.total != null ? row.total : 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300" style={{ backgroundColor: "#f1f5f9" }}>
                                <td
                                  colSpan={2}
                                  className="px-4 py-3 border border-slate-300 text-left font-bold uppercase tracking-wider bg-slate-100 text-slate-800"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                >
                                  Total
                                </td>
                                {(reportResult.days || []).map((d) => {
                                  const k = getDayKey(d);
                                  const lbl = getDayLabel(d);
                                  const sum = reportResult.dayTotals ? (reportResult.dayTotals[k] ?? reportResult.dayTotals[lbl]) : 0;
                                  return (
                                    <td
                                      key={k}
                                      className="px-2 py-3 border border-slate-300 text-center font-bold text-slate-900 bg-slate-100"
                                      style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                    >
                                      {sum != null ? sum : 0}
                                    </td>
                                  );
                                })}
                                <td
                                  className="px-4 py-3 border border-slate-300 text-center font-black text-slate-900 bg-slate-100"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                >
                                  {reportResult.grandTotal != null ? reportResult.grandTotal : 0}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        ) : reportResult.type === "Over Time Report (Abstract)" ? (
                          <>
                            <table className="w-full border-collapse border border-slate-300 text-xs">
                              <thead>
                                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                  <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center w-12">Shift</th>
                                  <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2 border border-slate-300 text-left min-w-[130px]">Department</th>
                                  <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center w-12">Sl.No</th>
                                  <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2 border border-slate-300 text-left min-w-[90px]">Ticket No</th>
                                  <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2 border border-slate-300 text-left min-w-[160px]">Employee Name</th>
                                  <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2 border border-slate-300 text-right min-w-[70px]">Hrs</th>
                                  <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[70px]">Category</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-800 divide-y divide-slate-200">
                                {(reportResult.flatRows || []).map((row, index) => {
                                  if (row.isShiftSubtotal) {
                                    return (
                                      <tr key={`sub-${index}`} className="font-bold">
                                        <td colSpan={5} className="border-b border-l border-slate-300"></td>
                                        <td className="px-3 py-1.5 border border-slate-400 text-right font-black text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9" }}>
                                          {row.shiftTotalHrs != null ? Number(row.shiftTotalHrs).toFixed(1) : "0.0"}
                                        </td>
                                        <td className="border-b border-r border-slate-300"></td>
                                      </tr>
                                    );
                                  }
                                  if (row.isEmployeeRow) {
                                    return (
                                      <tr key={`row-${index}`} className="hover:bg-slate-50/50 font-medium">
                                        {row.isFirstInShift !== false && (
                                          <td
                                            rowSpan={row.shiftCount || 1}
                                            className="px-2 py-2 border border-slate-300 text-center font-bold text-indigo-700 align-top bg-white"
                                          >
                                            {row.shift}
                                          </td>
                                        )}
                                        <td className="px-3 py-1.5 border border-slate-300 uppercase font-semibold text-slate-700">{row.department}</td>
                                        <td className="px-2 py-1.5 border border-slate-300 text-center text-slate-600">{row.slNo}</td>
                                        <td className="px-3 py-1.5 border border-slate-300 font-bold text-slate-900">{row.ticketNo}</td>
                                        <td className="px-3 py-1.5 border border-slate-300 uppercase whitespace-nowrap">{row.employeeName}</td>
                                        <td className="px-3 py-1.5 border border-slate-300 text-right font-bold text-slate-800">
                                          {row.otHours != null ? Number(row.otHours).toFixed(1) : "0.0"}
                                        </td>
                                        <td className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700">{row.category}</td>
                                      </tr>
                                    );
                                  }
                                  return null;
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300" style={{ backgroundColor: "#f1f5f9" }}>
                                  <td
                                    colSpan={5}
                                    className="px-3 py-2.5 border border-slate-300 text-left font-bold text-slate-800 uppercase tracking-wider bg-slate-100"
                                    style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                  >
                                    Grand Total
                                  </td>
                                  <td
                                    className="px-3 py-2.5 border border-slate-300 text-right font-black text-slate-900 text-sm bg-slate-100"
                                    style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                  >
                                    {(reportResult.grandTotalHrs != null ? reportResult.grandTotalHrs : 0).toFixed(1)}
                                  </td>
                                  <td
                                    className="border border-slate-300 bg-slate-100"
                                    style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                  ></td>
                                </tr>
                              </tfoot>
                            </table>

                            {/* Signatures matching reference image */}
                            <div className="flex justify-between items-center px-12 pt-8 pb-4 text-xs font-bold text-slate-700 uppercase tracking-wider">
                              <div>HOD</div>
                              <div>PM</div>
                              <div>DGM</div>
                            </div>
                          </>
                        ) : reportResult.type === "Department Attendance" ? (
                          <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2.5 border border-slate-300 text-left min-w-[140px]">Department</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2.5 border border-slate-300 text-center w-14">SL.No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2.5 border border-slate-300 text-left min-w-[90px]">Ticket No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2.5 border border-slate-300 text-left min-w-[180px]">Employee Name</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2.5 border border-slate-300 text-center w-14">Shift</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2.5 border border-slate-300 text-center min-w-[70px]">Category</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2.5 border border-slate-300 text-right min-w-[70px]">Days</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-800 divide-y divide-slate-200">
                              {(reportResult.flatRows || reportResult.data || []).map((row, index) => {
                                if (row.isGroupSubtotal) {
                                  return (
                                    <tr key={`grp-${index}`} className="font-bold">
                                      <td colSpan={6} className="border-b border-l border-slate-300"></td>
                                      <td className="px-3 py-1.5 border border-slate-400 text-right font-black text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9" }}>
                                        {row.groupTotalDays != null ? Number(row.groupTotalDays).toFixed(2) : "0.00"}
                                      </td>
                                    </tr>
                                  );
                                }
                                if (row.isDeptSubtotal) {
                                  return (
                                    <tr key={`sub-${index}`} className="font-bold">
                                      <td colSpan={6} className="border-b border-l border-slate-300"></td>
                                      <td className="px-3 py-1.5 border border-slate-400 text-right font-black text-slate-900 bg-slate-100" style={{ backgroundColor: "#f1f5f9" }}>
                                        {row.deptTotalDays != null ? Number(row.deptTotalDays).toFixed(2) : "0.00"}
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={`row-${row.empSlNo || index}`} className="hover:bg-slate-50/50 font-medium">
                                    {row.isFirstInDept !== false && (
                                      <td
                                        rowSpan={row.deptCount || 1}
                                        className="px-3 py-1.5 border border-slate-300 uppercase font-bold text-slate-800 align-top bg-white"
                                      >
                                        {row.department}
                                      </td>
                                    )}
                                    <td className="px-2 py-1.5 border border-slate-300 text-center text-slate-600">{row.empSlNo}</td>
                                    <td className="px-3 py-1.5 border border-slate-300 font-bold text-slate-900">{row.ticketNo}</td>
                                    <td className="px-3 py-1.5 border border-slate-300 uppercase whitespace-nowrap">{row.employeeName}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center font-semibold text-indigo-700">{row.shift}</td>
                                    <td className="px-2 py-1.5 border border-slate-300 text-center font-bold text-slate-700">{row.category}</td>
                                    <td className="px-3 py-1.5 border border-slate-300 text-right font-semibold text-slate-900">
                                      {row.days != null ? Number(row.days).toFixed(2) : "1.00"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300" style={{ backgroundColor: "#f1f5f9" }}>
                                <td
                                  colSpan={6}
                                  className="px-3 py-2.5 border border-slate-300 text-left font-bold text-slate-800 uppercase tracking-wider bg-slate-100"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                >
                                  Grand Total
                                </td>
                                <td
                                  className="px-3 py-2.5 border border-slate-300 text-right font-black text-slate-900 text-sm bg-slate-100"
                                  style={{ backgroundColor: "#f1f5f9", opacity: 1 }}
                                >
                                  {reportResult.grandTotalDays != null ? Number(reportResult.grandTotalDays).toFixed(2) : "0.00"}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        ) : reportResult.type === "Attendance Shift Wise Detail" ? (
                          <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[55px]">Tkt.No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-3 py-2 border border-slate-300 text-left min-w-[150px]">empname</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[65px]">Dept</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[80px]">DOJ</th>
                                {(reportResult.dayCols && reportResult.dayCols.length === 31 ? reportResult.dayCols : Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))).map((d) => (
                                  <th key={d} className="sticky top-0 bg-slate-100 z-10 px-1 py-2 border border-slate-300 text-center min-w-[24px]">
                                    {d}
                                  </th>
                                ))}
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[32px]">A</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[32px]">B</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[32px]">C</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-2 py-2 border border-slate-300 text-center min-w-[34px]">T</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-800 divide-y divide-slate-200">
                              {(reportResult.flatRows || reportResult.data || []).map((row, index) => {
                                if (row.isDeptHeader) {
                                  return (
                                    <tr key={`dept-${index}`} className="bg-slate-100 font-extrabold">
                                      <td colSpan={39} className="px-3 py-1.5 text-indigo-900 border border-slate-300 text-xs tracking-wider uppercase font-bold" style={{ backgroundColor: "#f1f5f9" }}>
                                        {row.deptAcronym || row.department}
                                      </td>
                                    </tr>
                                  );
                                }
                                if (row.isEmployeeRow) {
                                  const dayCols = reportResult.dayCols && reportResult.dayCols.length === 31
                                    ? reportResult.dayCols
                                    : Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
                                  return (
                                    <tr key={`emp-${row.ticketNo || index}`} className="hover:bg-slate-50/50 font-medium">
                                      <td className="px-2 py-1 border border-slate-300 text-center font-bold text-slate-900">{row.ticketNo}</td>
                                      <td className="px-3 py-1 border border-slate-300 uppercase whitespace-nowrap text-slate-800">{row.employeeName}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-center font-semibold text-slate-700">{row.deptAcronym || row.department}</td>
                                      <td className="px-2 py-1 border border-slate-300 text-center text-slate-600 whitespace-nowrap">{row.doj || "—"}</td>
                                      {dayCols.map((d) => (
                                        <td key={d} className="px-1 py-1 border border-slate-300 text-center font-bold text-slate-800">
                                          {row.dailyShifts?.[d] || ""}
                                        </td>
                                      ))}
                                      <td className="px-1.5 py-1 border border-slate-300 text-center font-bold text-slate-800">{row.shiftA > 0 ? Number(row.shiftA).toFixed(1) : "-"}</td>
                                      <td className="px-1.5 py-1 border border-slate-300 text-center font-bold text-slate-800">{row.shiftB > 0 ? Number(row.shiftB).toFixed(1) : "-"}</td>
                                      <td className="px-1.5 py-1 border border-slate-300 text-center font-bold text-slate-800">{row.shiftC > 0 ? Number(row.shiftC).toFixed(1) : "-"}</td>
                                      <td className="px-1.5 py-1 border border-slate-300 text-center font-black text-indigo-700 bg-slate-50">{row.totalDays > 0 ? Number(row.totalDays).toFixed(1) : "-"}</td>
                                    </tr>
                                  );
                                }
                                return null;
                              })}
                            </tbody>
                          </table>
                        ) : (
                          // Fallback table
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Tk.No</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Employee Name</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Department</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Date</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Shift</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Status</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">In Time</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Out Time</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-200">
                              {paginatedData.map((row, index) => {
                                const isBiometricWithoutHr = row.entryType === "BIOMETRIC_WITHOUT_HR";
                                return (
                                  <tr key={index} className={`hover:bg-slate-50/50 ${isBiometricWithoutHr ? "bg-rose-50/20" : ""}`}>
                                    <td className="px-4 py-3 border border-slate-300 font-bold">{row.ticketNo}</td>
                                    <td className="px-4 py-3 border border-slate-300">
                                      <span className={isBiometricWithoutHr ? "font-semibold text-slate-900" : ""}>
                                        {row.employeeName}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 border border-slate-300 text-xs font-semibold">{row.department}</td>
                                    <td className="px-4 py-3 border border-slate-300 text-xs">{row.date}</td>
                                    <td className="px-4 py-3 border border-slate-300 text-xs font-bold text-indigo-750">{row.shift}</td>
                                    <td className="px-4 py-3 border border-slate-300">
                                      {isBiometricWithoutHr ? (
                                        <span className="inline-block px-2.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 font-bold text-xs underline decoration-rose-600 decoration-2 rounded shadow-2xs" title="Punched in biometric device but not verified in HR Multiple Entry">
                                          Absent <span className="text-[10px] font-normal text-rose-600 block">(No HR Entry)</span>
                                        </span>
                                      ) : String(row.status).toLowerCase() === "present" || String(row.status).toLowerCase() === "pr" ? (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-full text-xs font-bold">
                                          {row.status}
                                        </span>
                                      ) : String(row.status).toLowerCase() === "absent" || String(row.status).toLowerCase() === "ab" ? (
                                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-250 rounded-full text-xs font-bold">
                                          {row.status}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-250 rounded-full text-xs font-bold">
                                          {row.status}
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-4 py-3 border border-slate-300 text-xs font-semibold ${isBiometricWithoutHr ? "text-rose-700 underline decoration-rose-500 decoration-1 font-bold" : "text-slate-600"}`}>
                                      {row.inTime}
                                    </td>
                                    <td className={`px-4 py-3 border border-slate-300 text-xs font-semibold ${isBiometricWithoutHr ? "text-rose-700 underline decoration-rose-500 decoration-1 font-bold" : "text-slate-600"}`}>
                                      {row.outTime}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Pagination Controls Footer */}
                      {totalRows > 0 && reportResult.type !== "Over Time Report (Hours wise)" && reportResult.type !== "Department Attendance" && reportResult.type !== "Attendance Shift Wise Detail" && reportResult.type !== "Attendance Shift Wise Abstract" && reportResult.type !== "Over Time Report (Abstract)" && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200 text-xs text-slate-600 print:hidden">
                          <div className="flex items-center gap-2">
                            <span>Show</span>
                            <select
                              value={pageSize}
                              onChange={(e) => {
                                setPageSize(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="border border-slate-300 rounded-lg px-2 py-1 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                              <option value={250}>250</option>
                              <option value={500}>500</option>
                              <option value="All">All ({totalRows})</option>
                            </select>
                            <span>records per page</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-semibold text-slate-700">
                              Showing{" "}
                              {pageSize === "All"
                                ? `1 to ${totalRows}`
                                : `${(currentPage - 1) * Number(pageSize) + 1} to ${Math.min(
                                  currentPage * Number(pageSize),
                                  totalRows
                                )}`}{" "}
                              of {totalRows} records
                            </span>
                          </div>

                          {pageSize !== "All" && totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-all cursor-pointer"
                                title="Previous Page"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span className="px-3 py-1 font-bold text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-200 select-none">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-all cursor-pointer"
                                title="Next Page"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm font-medium">
                No matching reports generated for the selected parameters.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentReports;
