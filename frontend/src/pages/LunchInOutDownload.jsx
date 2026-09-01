import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import API from "../api";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Download,
  UploadCloud,
  FileText,
  AlertOctagon,
  Clock,
  Search,
  Filter,
  CheckSquare,
  Square,
  Layers,
  ChevronRight
} from "lucide-react";

const LunchInOutDownload = () => {
  // --- Core States ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // --- Form & Filter States ---
  const [downloadDate, setDownloadDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedDeptIds, setSelectedDeptIds] = useState(new Set());
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");

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
      console.error("Error fetching companies:", err);
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
    } catch (err) {
      console.error("Error fetching departments:", err);
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
      console.error("Error fetching shifts:", err);
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

  const handleSelectAllDepts = () => {
    if (selectedDeptIds.size === departments.length) {
      setSelectedDeptIds(new Set());
    } else {
      setSelectedDeptIds(new Set(departments.map((d) => d.id)));
    }
  };

  // --- API Action Triggers ---

  // Log Download: downloads raw biometric lunch logs
  const handleLogDownload = async () => {
    if (!downloadDate) {
      toast.warning("Please select a date for downloading logs.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/lunch/download", {
        date: downloadDate,
        companyId: selectedCompanyId
      });
      if (data.success) {
        toast.success(data.message || "Biometric lunch logs downloaded successfully.");
      } else {
        toast.error(data.message || "Failed to download logs.");
      }
    } catch (err) {
      console.error("Log download error:", err);
      toast.error(err.response?.data?.message || "Error occurred during download.");
    } finally {
      setLoading(false);
    }
  };

  // Posting: processes raw logs into lunch attendance records
  const handlePosting = async () => {
    if (!downloadDate) {
      toast.warning("Please select a date for posting logs.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post("/lunch/post", {
        date: downloadDate,
        companyId: selectedCompanyId
      });
      if (data.success) {
        toast.success(data.message || "Lunch logs posted successfully!");
        // Refresh grid
        handleGenerateReport();
      } else {
        toast.error(data.message || "Failed to post lunch logs.");
      }
    } catch (err) {
      console.error("Posting error:", err);
      toast.error(err.response?.data?.message || "Error occurred during posting.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to build request query params
  const buildQueryParams = () => {
    const params = {
      companyId: selectedCompanyId,
      from: fromDate,
      to: toDate
    };
    if (selectedDeptIds.size > 0) {
      params.departments = Array.from(selectedDeptIds).join(",");
    }
    if (selectedShiftId) {
      params.shiftId = selectedShiftId;
    }
    return params;
  };

  // Report Button: loads general report data
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/lunch", { params: buildQueryParams() });
      if (data.success) {
        let filtered = data.data || [];
        // Apply local query search if employeeName/Code is specified
        if (employeeQuery.trim() !== "") {
          const q = employeeQuery.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.employee?.employeeCode.toLowerCase().includes(q) ||
              r.employee?.firstName.toLowerCase().includes(q)
          );
        }
        setReportData(filtered);
      } else {
        toast.error("Failed to load report data");
      }
    } catch (err) {
      console.error("Fetch report error:", err);
      toast.error("Failed to load lunch records.");
    } finally {
      setLoading(false);
    }
  };

  // Employee Wise Button: fetches a single employee's lunch data
  const handleEmployeeWiseReport = async () => {
    if (!employeeQuery.trim()) {
      toast.warning("Please enter an Employee ID or Name to search.");
      return;
    }
    setLoading(true);
    try {
      // First generate regular report
      const { data } = await API.get("/lunch", {
        params: {
          companyId: selectedCompanyId,
          from: fromDate,
          to: toDate
        }
      });
      if (data.success) {
        const q = employeeQuery.toLowerCase();
        const filtered = (data.data || []).filter(
          (r) =>
            r.employee?.employeeCode.toLowerCase().includes(q) ||
            r.employee?.firstName.toLowerCase().includes(q)
        );
        setReportData(filtered);
        toast.info(`Found ${filtered.length} matching employee record(s).`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading employee wise report.");
    } finally {
      setLoading(false);
    }
  };

  // No Punch Button: loads employees who missed lunch punches
  const handleNoPunchReport = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/lunch/no-punch", { params: buildQueryParams() });
      if (data.success) {
        setReportData(data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load missed punches report.");
    } finally {
      setLoading(false);
    }
  };

  // Late IN Button: loads employees who returned late from lunch
  const handleLateInReport = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/lunch/late-in", { params: buildQueryParams() });
      if (data.success) {
        setReportData(data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load late return report.");
    } finally {
      setLoading(false);
    }
  };

  // --- Export Actions ---

  // Export to CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.warning("No records to export.");
      return;
    }
    
    const headers = ["Sl.No", "Tkt No", "Employee Name", "Date", "Lunch Out", "Lunch In", "Break Duration", "Shift", "Status"];
    const csvRows = [
      `Lunch In/Out Report`,
      `Period: ${fromDate} to ${toDate}`,
      "",
      headers.join(","),
    ];

    reportData.forEach((row, idx) => {
      const duration = getBreakDuration(row.lunchOutTime, row.lunchInTime);
      const shiftName = row.shift?.name || "-";
      csvRows.push([
        idx + 1,
        `"${row.employee?.employeeCode || ""}"`,
        `"${row.employee?.firstName || ""}"`,
        `"${formatDateDisplay(row.date)}"`,
        `"${row.lunchOutTime || "-"}"`,
        `"${row.lunchInTime || "-"}"`,
        `"${duration}"`,
        `"${shiftName}"`,
        `"${row.status}"`,
      ].join(","));
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Lunch_InOut_Report_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded successfully!");
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (reportData.length === 0) {
      toast.warning("No records to export.");
      return;
    }
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(30, 58, 138); 
    doc.rect(0, 0, pageW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("LUNCH IN/OUT REPORT", 14, 11);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${fromDate} to ${toDate}  |  Generated: ${new Date().toLocaleString()}`, pageW - 14, 11, { align: "right" });

    // Table rows mapping
    const tableRows = reportData.map((row, idx) => {
      const duration = getBreakDuration(row.lunchOutTime, row.lunchInTime);
      const shiftName = row.shift?.name || "-";
      return [
        idx + 1,
        row.employee?.employeeCode || "",
        row.employee?.firstName || "",
        formatDateDisplay(row.date),
        row.lunchOutTime || "-",
        row.lunchInTime || "-",
        duration,
        shiftName,
        row.status,
      ];
    });

    autoTable(doc, {
      startY: 22,
      head: [["Sl.No", "Tkt No", "Employee Name", "Date", "Lunch Out", "Lunch In", "Break Duration", "Shift", "Status"]],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 60 },
        3: { cellWidth: 24, halign: "center" },
        4: { cellWidth: 24, halign: "center" },
        5: { cellWidth: 24, halign: "center" },
        6: { cellWidth: 26, halign: "center" },
        7: { cellWidth: 22, halign: "center" },
        8: { cellWidth: 24, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 8) {
          const val = data.cell.raw;
          if (val === "Late IN") {
            data.cell.styles.textColor = [185, 28, 28]; // Red
            data.cell.styles.fontStyle = "bold";
          } else if (val === "No Punch") {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Normal") {
            data.cell.styles.textColor = [16, 185, 129]; // Green
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    }

    doc.save(`Lunch_InOut_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success("PDF report downloaded successfully!");
  };

  // Status badges colors
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Normal":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Late IN":
        return "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
      case "No Punch":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Helper to format date as DD/MM/YYYY
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  // Helper to calculate break duration display
  const getBreakDuration = (outTime, inTime) => {
    if (!outTime || !inTime) return "-";
    
    const parseTimeToMinutes = (timeStr) => {
      const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      
      if (ampm === "PM" && hours !== 12) {
        hours += 12;
      } else if (ampm === "AM" && hours === 12) {
        hours = 0;
      }
      return hours * 60 + minutes;
    };
    
    const outMin = parseTimeToMinutes(outTime);
    const inMin = parseTimeToMinutes(inTime);
    
    if (outMin === null || inMin === null) return "-";
    
    let diff = inMin - outMin;
    if (diff < 0) {
      diff += 24 * 60; // handle potential overnight crossover
    }
    return `${diff} mins`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Header title */}
      <div className="mb-6 bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl shadow-xl p-6 text-white flex justify-between items-center hover:shadow-2xl transition-all">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Lunch IN/OUT Download</h1>
          <p className="text-blue-100 text-sm mt-1">HR Management System — Biometric Lunch Logs Monitoring</p>
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
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
            HR Department Active
          </span>
        </div>
      </div>

      {/* Top Section: Biometric Logs Downloader */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Download size={18} className="text-indigo-600" />
          Biometric Lunch Logs Synchronizer
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Select Download Date
            </label>
            <input
              type="date"
              value={downloadDate}
              onChange={(e) => setDownloadDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto mt-6">
            <button
              onClick={handleLogDownload}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Download size={16} />
              Log Download
            </button>

            <button
              onClick={handlePosting}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <UploadCloud size={16} />
              Posting
            </button>
          </div>
        </div>
      </div>

      {/* Middle Grid: Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left Side Checklist: Departments (4 columns) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-md border border-slate-200 p-5 flex flex-col max-h-[420px]">
          <div className="flex justify-between items-center border-b border-slate-150 pb-3 mb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Layers size={16} className="text-indigo-600" />
              Departments
            </h3>
            <button
              onClick={handleSelectAllDepts}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              {selectedDeptIds.size === departments.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Department Scrollable list */}
          <div className="overflow-y-auto flex-1 space-y-2.5 pr-1.5">
            {departments.map((dept) => {
              const isChecked = selectedDeptIds.has(dept.id);
              return (
                <div
                  key={dept.id}
                  onClick={() => toggleSelectDept(dept.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
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

        {/* Right Side Options & Inputs: (8 columns) */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-md border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-150 pb-3 mb-4 flex items-center gap-1.5">
            <Filter size={16} className="text-indigo-600" />
            Report Search Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* From Date */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                From Date
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
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Employee Search */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Employee (Search ID or Name)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type ID or Name..."
                  value={employeeQuery}
                  onChange={(e) => setEmployeeQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-slate-50/20"
                />
                <Search size={16} className="absolute left-3.5 text-slate-400" />
              </div>
            </div>

            {/* Shift Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Shift
              </label>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Select Shift (All)</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleEmployeeWiseReport}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-xs transition-all active:scale-95"
            >
              <ChevronRight size={14} />
              Employee wise
            </button>
          </div>
        </div>
      </div>

      {/* Reports Display Table Grid */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            Report Results
          </h3>
          <div className="flex items-center gap-3">
            {reportData.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-xs transition-all active:scale-95 shadow-sm"
                >
                  <Download size={13} />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg text-xs transition-all active:scale-95 shadow-sm"
                >
                  <FileText size={13} />
                  Export PDF
                </button>
                <span className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                  {reportData.length} records loaded
                </span>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-left">
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-16">Sl.No</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-28">Tk.No</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase">Employee Name</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-28">Date</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-32">Lunch Out</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-32">Lunch In</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-36">Break Duration</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-24">Shift</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : reportData.length > 0 ? (
                reportData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {row.employee?.employeeCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {row.employee?.firstName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {formatDateDisplay(row.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {row.lunchOutTime || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {row.lunchInTime || "-"}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {getBreakDuration(row.lunchOutTime, row.lunchInTime)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-indigo-700">
                      {row.shift?.name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 border text-xs font-bold rounded-full ${getStatusBadgeClass(
                        row.status
                      )}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center text-slate-400 text-sm">
                    No lunch records loaded. Click Report, No Punch, or Late IN to populate reports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Action Buttons */}
      <div className="flex gap-4 bg-white p-5 rounded-2xl shadow-md border border-slate-200 justify-end">
        <button
          onClick={handleGenerateReport}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow active:scale-95"
        >
          <FileText size={16} />
          Report
        </button>

        <button
          onClick={handleNoPunchReport}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-all shadow active:scale-95"
        >
          <AlertOctagon size={16} />
          No Punch
        </button>

        <button
          onClick={handleLateInReport}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow active:scale-95"
        >
          <Clock size={16} />
          Late IN
        </button>
      </div>
    </div>
  );
};

export default LunchInOutDownload;
