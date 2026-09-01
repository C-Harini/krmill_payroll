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

      if (data.success) {
        setReportResult({
          type: selectedReportType,
          category: reportCategory,
          data: data.data || [],
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
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    const selectedCompany = companies.find((c) => String(c.id) === String(selectedCompanyId));
    const companyName = selectedCompany?.name || "KAYAAR EXPORTS (P) LTD";

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

    if (reportResult.type === "Attendance Shift Wise Abstract") {
      columns = [
        { header: "Shift", dataKey: "shift" },
        { header: "Present", dataKey: "present" },
        { header: "Absent", dataKey: "absent" },
        { header: "Leave", dataKey: "leave" }
      ];
      rows = reportResult.data;
    } else if (reportResult.type === "Over Time Report") {
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
      const companyName = selectedCompany?.name || "KAYAAR EXPORTS (P) LTD";

      let headers = [];
      let dataRows = [];

      if (reportResult.type === "Attendance Shift Wise Abstract") {
        headers = ["Shift", "Present", "Absent", "Leave"];
        dataRows = reportResult.data.map((r) => [r.shift, r.present, r.absent, r.leave]);
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
        headers = ["OT Hours", "Number of Employees"];
        dataRows = reportResult.data.map((r) => [r.otHours, r.numEmployees]);
      } else if (reportResult.type === "Over Time Report (Day wise)") {
        headers = ["Date", "Employee Name", "Department", "OT Hours"];
        dataRows = reportResult.data.map((r) => [r.date, r.employeeName, r.department, r.otHours]);
      } else if (reportResult.type === "Over Time Report (Abstract)") {
        headers = ["Department", "Employees", "Total OT Hours"];
        dataRows = reportResult.data.map((r) => [r.department, r.employees, r.totalOtHours]);
      } else {
        // Department Attendance / Attendance Shift Wise Detail
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

      const sheetData = [
        [companyName],
        [reportResult.type],
        [`Period: ${reportResult.meta.fromDate} to ${reportResult.meta.toDate}`],
        [`Generated on: ${new Date().toLocaleString()}`],
        [],
        headers,
        ...dataRows
      ];

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
              <h3 className="text-base font-bold text-slate-800">{reportResult.type}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Period: {reportResult.meta.fromDate} to {reportResult.meta.toDate} &bull; Total:{" "}
                <span className="font-bold text-slate-700">{reportResult.data?.length || 0}</span> records
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
              <h1 className="text-2xl font-bold uppercase tracking-wide">KAYAAR EXPORTS (P) LTD</h1>
              <h2 className="text-base font-semibold text-slate-600 mt-1">{reportResult.type}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                From Date: {reportResult.meta.fromDate} | To Date: {reportResult.meta.toDate}
              </p>
            </div>

            {/* Attendance Status Legend Tag Bar */}
            {reportCategory === "Attendance" && (
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
                    pageSize === "All"
                      ? reportResult.data
                      : reportResult.data.slice(
                        (currentPage - 1) * Number(pageSize),
                        currentPage * Number(pageSize)
                      );

                  return (
                    <div>
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto print:max-h-none print:overflow-visible border border-slate-350 rounded-lg">
                        {reportResult.type === "Attendance Shift Wise Abstract" ? (
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-6 py-3 border border-slate-300">Shift</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-6 py-3 border border-slate-300 text-emerald-750">Present</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-6 py-3 border border-slate-300 text-rose-750">Absent</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-6 py-3 border border-slate-300 text-amber-750">Leave</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-semibold divide-y divide-slate-200">
                              {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-3.5 border border-slate-300 font-bold text-indigo-700">{row.shift}</td>
                                  <td className="px-6 py-3.5 border border-slate-300 text-emerald-600">{row.present}</td>
                                  <td className="px-6 py-3.5 border border-slate-300 text-rose-600">{row.absent}</td>
                                  <td className="px-6 py-3.5 border border-slate-300 text-amber-600">{row.leave}</td>
                                </tr>
                              ))}
                            </tbody>
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
                                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-800">{row.otHours} hrs</td>
                                  <td className="px-4 py-3 border border-slate-300 text-xs text-slate-500 italic">{row.remarks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : reportResult.type === "Over Time Report (Hours wise)" ? (
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">OT Hours</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Number of Employees</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-200">
                              {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 border border-slate-300 font-bold">{row.otHours}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-slate-800">{row.numEmployees}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : reportResult.type === "Over Time Report (Day wise)" ? (
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Date</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Employee</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Department</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">OT Hours</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-200">
                              {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 border border-slate-300 font-bold text-xs">{row.date}</td>
                                  <td className="px-4 py-3 border border-slate-300">{row.employeeName}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-xs font-semibold">{row.department}</td>
                                  <td className="px-4 py-3 border border-slate-300 font-bold text-slate-800">{row.otHours} hrs</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : reportResult.type === "Over Time Report (Abstract)" ? (
                          <table className="w-full border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 text-slate-750 text-xs font-bold text-left border-b border-slate-300 print:bg-slate-100">
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Department</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Employees</th>
                                <th className="sticky top-0 bg-slate-100 z-10 px-4 py-3 border border-slate-300">Total OT Hours</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-200">
                              {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 border border-slate-300 font-bold">{row.department}</td>
                                  <td className="px-4 py-3 border border-slate-300 text-slate-800">{row.employees}</td>
                                  <td className="px-4 py-3 border border-slate-300 font-bold text-indigo-750">{row.totalOtHours} hrs</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          // Department Attendance / Attendance Shift Wise Detail
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
                      {totalRows > 0 && (
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
