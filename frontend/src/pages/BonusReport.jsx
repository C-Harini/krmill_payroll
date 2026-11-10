// ============================================================
// frontend/src/pages/BonusReport.jsx
// ============================================================
import React, { useState, useEffect, useMemo } from "react";
import { apiRequest } from "../utils/apiCaller";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => currentYear - 7 + i); // e.g. 2019 to 2033

export default function BonusReport() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  // Easy Month & Year selection: default Oct 2025 to Sep 2026
  const [startMonth, setStartMonth] = useState(10); // October
  const [startYear, setStartYear] = useState(2025);
  const [endMonth, setEndMonth] = useState(9); // September
  const [endYear, setEndYear] = useState(2026);

  const [loading, setLoading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");

  // ── Load Companies on mount ──────────────────────────────────
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await apiRequest("/companies");
        const list = Array.isArray(res) ? res : res?.data || [];
        setCompanies(list);
        if (list.length > 0) {
          setCompanyId(String(list[0].id));
        }
      } catch (err) {
        console.error("Failed to load companies:", err);
      }
    }
    fetchCompanies();
  }, []);

  // ── Load Categories when Company changes ────────────────────
  useEffect(() => {
    if (!companyId) {
      setCategories([]);
      setSelectedCategoryIds([]);
      return;
    }
    async function fetchCategories() {
      try {
        const res = await apiRequest(`/categories?companyId=${companyId}`);
        const list = Array.isArray(res) ? res : res?.data || [];
        setCategories(list);
        // By default, select all categories
        setSelectedCategoryIds(list.map((c) => c.id));
      } catch (err) {
        console.error("Failed to load categories:", err);
        setCategories([]);
        setSelectedCategoryIds([]);
      }
    }
    fetchCategories();
  }, [companyId]);

  // ── Category Multi-select helpers ───────────────────────────
  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategoryIds(categories.map((c) => c.id));
  };

  const clearAllCategories = () => {
    setSelectedCategoryIds([]);
  };

  const getStartMonthStr = () => `${startYear}-${String(startMonth).padStart(2, "0")}`;
  const getEndMonthStr = () => `${endYear}-${String(endMonth).padStart(2, "0")}`;

  // ── Fetch Report Data ───────────────────────────────────────
  const fetchReport = async () => {
    if (!companyId) {
      setError("Please select a company.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams({
        companyId,
        startMonth: getStartMonthStr(),
        endMonth: getEndMonthStr(),
      });
      if (selectedCategoryIds.length > 0) {
        params.append("categoryIds", selectedCategoryIds.join(","));
      }

      const res = await apiRequest(`/bonus-report?${params.toString()}`);
      if (res?.success) {
        setReportData(res.data);
      } else {
        setError(res?.message || "Failed to generate report.");
      }
    } catch (err) {
      console.error("Error fetching bonus report:", err);
      setError(err?.message || "Server error while generating report.");
    } finally {
      setLoading(false);
    }
  };

  // ── Download File Helper ────────────────────────────────────
  const downloadFile = async (format) => {
    if (!companyId) {
      setError("Please select a company.");
      return;
    }
    if (format === "excel") setDownloadingExcel(true);
    if (format === "pdf") setDownloadingPdf(true);

    try {
      const params = new URLSearchParams({
        companyId,
        startMonth: getStartMonthStr(),
        endMonth: getEndMonthStr(),
      });
      if (selectedCategoryIds.length > 0) {
        params.append("categoryIds", selectedCategoryIds.join(","));
      }

      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");
      const rawBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
      const endpoint = format === "excel" ? "/bonus-report/export/excel" : "/bonus-report/export/pdf";
      const fullUrl = `${rawBase}${endpoint}?${params.toString()}`;

      const res = await fetch(fullUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Download failed with status ${res.status}`);
      }

      // Resolve filename from content-disposition
      let filename = `Bonus_Report_${startYear}_to_${endYear}.${format === "excel" ? "xlsx" : "pdf"}`;
      const disposition = res.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "").trim();
        }
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(`Export ${format} error:`, err);
      alert(`Export ${format.toUpperCase()} failed: ` + (err.message || "Unknown error"));
    } finally {
      if (format === "excel") setDownloadingExcel(false);
      if (format === "pdf") setDownloadingPdf(false);
    }
  };

  // ── Filtered Categories for Table View ───────────────────────
  const filteredCategories = useMemo(() => {
    if (!reportData?.categories) return [];
    if (!searchFilter.trim()) return reportData.categories;

    const q = searchFilter.toLowerCase().trim();
    return reportData.categories
      .map((cat) => ({
        ...cat,
        employees: cat.employees.filter(
          (e) =>
            e.ticketNo.toLowerCase().includes(q) ||
            e.empName.toLowerCase().includes(q) ||
            e.dept.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.employees.length > 0);
  }, [reportData, searchFilter]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl">🎁</span>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bonus Report</h1>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadFile("excel")}
            disabled={!reportData || downloadingExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingExcel ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <span>📊</span>
            )}
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => downloadFile("pdf")}
            disabled={!reportData || downloadingPdf}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingPdf ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <span>📄</span>
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Company Selector */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Company <span className="text-rose-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Multi-select Dropdown */}
          <div className="lg:col-span-3 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Employee Category (one or more)
            </label>
            <button
              type="button"
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <span className="truncate">
                {selectedCategoryIds.length === 0
                  ? "All Categories Selected"
                  : selectedCategoryIds.length === categories.length
                  ? `All Categories (${categories.length})`
                  : `${selectedCategoryIds.length} of ${categories.length} selected`}
              </span>
              <span className="ml-2 text-slate-400">▾</span>
            </button>

            {/* Dropdown Menu */}
            {isCatDropdownOpen && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1 text-xs font-semibold text-blue-600">
                  <button type="button" onClick={selectAllCategories} className="hover:underline">
                    Select All
                  </button>
                  <button type="button" onClick={clearAllCategories} className="hover:underline text-slate-500">
                    Clear
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                      />
                      <span className="truncate">{cat.categoryName}</span>
                    </label>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-xs text-slate-400 py-1 text-center">No categories found</p>
                  )}
                </div>
                <div className="pt-1 border-t border-slate-100 text-right">
                  <button
                    type="button"
                    onClick={() => setIsCatDropdownOpen(false)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Start Month & Year (Easy dropdowns) */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Start Month & Year <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* End Month & Year (Easy dropdowns) */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              End Month & Year <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <span>🔍</span>
            )}
            <span>Generate Report</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── Report Output ── */}
      {reportData && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5">
          {/* Header Banner */}
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-wide uppercase">
              {reportData.companyName}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Month wise Present Details From {reportData.startDateStr} to {reportData.endDateStr} Reports
            </p>
          </div>

          {/* Quick Metrics & Search Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 flex-wrap">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                👥 Employees: <strong className="text-slate-800">{reportData.totalEmployees}</strong>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                🗓️ Months: <strong className="text-slate-800">{reportData.months.length}</strong>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                ⭐ Grand Total Days: <strong className="text-blue-700 font-bold">{reportData.grandTotal}</strong>
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search employee, ticket, dept..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              {/* Header */}
              <thead>
                <tr className="bg-slate-800 text-white font-semibold">
                  <th className="px-3 py-2.5 text-center border-r border-slate-700 w-12 whitespace-nowrap">Sl.No</th>
                  <th className="px-3 py-2.5 text-center border-r border-slate-700 w-16 whitespace-nowrap">Tkt.No</th>
                  <th className="px-4 py-2.5 text-left border-r border-slate-700 min-w-[160px] whitespace-nowrap">
                    Emp Name
                  </th>
                  <th className="px-3 py-2.5 text-center border-r border-slate-700 w-16 whitespace-nowrap">Dept</th>
                  <th className="px-3 py-2.5 text-center border-r border-slate-700 w-24 whitespace-nowrap">DOJ</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-700 w-20 whitespace-nowrap">Rs/Day</th>
                  <th className="px-3 py-2.5 text-right border-r border-slate-700 w-24 whitespace-nowrap">Wages</th>
                  {reportData.months.map((m) => (
                    <th
                      key={m.key}
                      className="px-2.5 py-2.5 text-center border-r border-slate-700 w-16 whitespace-nowrap font-medium"
                    >
                      {m.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-bold w-20 whitespace-nowrap bg-slate-900">Total</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredCategories.map((cat) => (
                  <React.Fragment key={cat.categoryName}>
                    {/* Category Banner Row */}
                    <tr className="bg-slate-200/80 font-bold text-slate-800 border-t-2 border-b border-slate-300">
                      <td
                        colSpan={7 + reportData.months.length + 1}
                        className="px-4 py-2 uppercase tracking-wide text-xs text-blue-900"
                      >
                        {cat.categoryName}
                      </td>
                    </tr>

                    {/* Employee Rows */}
                    {cat.employees.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-blue-50/50 transition">
                        <td className="px-3 py-1.5 text-center border-r border-slate-100 text-slate-500 font-mono">
                          {emp.slNo}
                        </td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-100 font-mono font-semibold text-slate-800">
                          {emp.ticketNo}
                        </td>
                        <td className="px-4 py-1.5 text-left border-r border-slate-100 font-medium text-slate-900 whitespace-nowrap">
                          {emp.empName}
                        </td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-100 font-semibold text-slate-700 whitespace-nowrap">
                          {emp.dept || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-100 text-slate-600 whitespace-nowrap">
                          {emp.doj}
                        </td>
                        <td className="px-3 py-1.5 text-right border-r border-slate-100 font-mono text-slate-700">
                          {emp.rsPerDay.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-right border-r border-slate-100 font-mono font-semibold text-slate-800">
                          {emp.wages.toFixed(2)}
                        </td>

                        {/* Month columns */}
                        {reportData.months.map((m) => {
                          const val = emp.monthDays[m.key];
                          return (
                            <td
                              key={m.key}
                              className={`px-2.5 py-1.5 text-right border-r border-slate-100 font-mono ${
                                val === null || val === 0 ? "text-slate-300 text-center" : "text-slate-700"
                              }`}
                            >
                              {val !== null && val !== undefined ? val.toFixed(1) : "-"}
                            </td>
                          );
                        })}

                        {/* Total Column */}
                        <td className="px-3 py-1.5 text-right font-bold font-mono text-blue-700 bg-blue-50/40">
                          {emp.total.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {filteredCategories.length === 0 && (
                  <tr>
                    <td
                      colSpan={7 + reportData.months.length + 1}
                      className="px-6 py-8 text-center text-slate-400 text-sm"
                    >
                      No employee records found matching your selection.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Summary / Totals Footer */}
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={6} className="px-4 py-2.5 text-right uppercase text-xs tracking-wider">
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono border-r border-slate-200">
                    -
                  </td>
                  {reportData.months.map((m) => (
                    <td
                      key={m.key}
                      className="px-2.5 py-2.5 text-right font-mono border-r border-slate-200 text-slate-800"
                    >
                      {reportData.monthTotals[m.key] ? reportData.monthTotals[m.key].toFixed(1) : "0.0"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-mono text-sm text-blue-800 bg-blue-100/60 font-extrabold">
                    {reportData.grandTotal.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
