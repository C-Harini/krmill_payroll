import React, { useState, useEffect } from "react";
import axios from "../api";



/* ── helpers ─────────────────────────────────────────────────── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const MONTHS = [
  { v: 1, l: "January" },
  { v: 2, l: "February" },
  { v: 3, l: "March" },
  { v: 4, l: "April" },
  { v: 5, l: "May" },
  { v: 6, l: "June" },
  { v: 7, l: "July" },
  { v: 8, l: "August" },
  { v: 9, l: "September" },
  { v: 10, l: "October" },
  { v: 11, l: "November" },
  { v: 12, l: "December" },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const STATUS_BADGE = {
  Generated: "bg-amber-100 text-amber-700 border border-amber-300",
  Approved: "bg-blue-100 text-blue-700 border border-blue-300",
  Paid: "bg-green-100 text-green-700 border border-green-300",
};

// ── Salary report sub-types ────────────────────────────────────
const SALARY_REPORT_TYPES = [
  {
    key: "salary_report",
    label: "Basic",
    full: "Salary Report",
    desc: "Standard salary summary by department",
    color: "blue",
    badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700",
    header: "from-blue-700 to-blue-800",
  },
  {
    key: "with_el",
    label: "+ EL",
    full: "With Earned Leave",
    desc: "Earned leave days added to present days",
    color: "green",
    badge: "bg-green-100 text-green-700",
    btn: "bg-green-600 hover:bg-green-700",
    header: "from-green-700 to-green-800",
  },
  {
    key: "without_el",
    label: "− EL",
    full: "Without Earned Leave",
    desc: "EL shown separately, not added to total",
    color: "orange",
    badge: "bg-orange-100 text-orange-700",
    btn: "bg-orange-500 hover:bg-orange-600",
    header: "from-orange-600 to-orange-700",
  },
  {
    key: "with_weekoff",
    label: "+ WO",
    full: "With Week Off",
    desc: "Week-off days added to present days",
    color: "purple",
    badge: "bg-purple-100 text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700",
    header: "from-purple-700 to-purple-800",
  },
  {
    key: "without_weekoff",
    label: "− WO",
    full: "Without Week Off",
    desc: "Week-off days subtracted from total",
    color: "amber",
    badge: "bg-amber-100 text-amber-700",
    btn: "bg-amber-500 hover:bg-amber-600",
    header: "from-amber-600 to-amber-700",
  },
];

/* ── Download helper ─────────────────────────────────────────── */
const download = async (url, params, filename) => {
  const res = await axios.get(url, { params, responseType: "blob" });
  const href = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = href;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(href);
};

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function SalaryReports() {
  const [tab, setTab] = useState("salary");

  // salary report has its own sub-tab for report type
  const [salaryReportType, setSalaryReportType] = useState("salary_report");

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [filters, setFilters] = useState({
    companyId: "",
    departmentId: "",
    category: "",
    pfType: "",
    salaryType: "",
    status: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const [salaryReport, setSalaryReport] = useState(null);
  const [bankStatement, setBankStatement] = useState(null);
  const [payslipList, setPayslipList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Init ──────────────────────────────────────────────────── */
  useEffect(() => {
    axios
      .get(`/companies`)
      .then((r) => {
        const list = (r.data || []).map((c) => ({
          ...c,
          companyName: c.companyName || c.name || "Unknown",
        }));
        setCompanies(list);
        if (list.length) setFilters((f) => ({ ...f, companyId: list[0].id }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.companyId) return;
    axios
      .get(`/departments`, { params: { companyId: filters.companyId } })
      .then((r) =>
        setDepartments(Array.isArray(r.data) ? r.data : r.data?.data || []),
      )
      .catch(() => setDepartments([]));
  }, [filters.companyId]);

  useEffect(() => {
    if (tab === "payslips" && filters.companyId) fetchPayslips();
  }, [
    tab,
    filters.companyId,
    filters.month,
    filters.year,
    filters.departmentId,
  ]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({
      ...f,
      [name]: value,
      ...(name === "companyId" ? { departmentId: "" } : {}),
    }));
  };

  const cleanParams = (extra = {}) => {
    const p = { ...filters, ...extra };
    Object.keys(p).forEach((k) => {
      if (p[k] === "" || p[k] == null) delete p[k];
    });
    return p;
  };

  /* ── Fetch salary report ───────────────────────────────────── */
  const fetchSalary = async (rt = salaryReportType) => {
    setLoading(true);
    setError("");
    setSalaryReport(null);
    try {
      const r = await axios.get(`/salary-reports/salary-report`, {
        params: cleanParams({ reportType: rt, page: 1, limit: 10000 }),
      });
      setSalaryReport(r.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to fetch salary report");
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch bank statement ──────────────────────────────────── */
  const fetchBank = async () => {
    setLoading(true);
    setError("");
    setBankStatement(null);
    try {
      const r = await axios.get(`/salary-reports/bank-statement`, {
        params: cleanParams(),
      });
      setBankStatement(r.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to fetch bank statement");
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch payslips ────────────────────────────────────────── */
  const fetchPayslips = async () => {
    setLoading(true);
    setError("");
    setPayslipList([]);
    try {
      const r = await axios.get(`/salary-reports/payslip-list`, {
        params: cleanParams(),
      });
      setPayslipList(r.data?.salaries || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to fetch payslips");
    } finally {
      setLoading(false);
    }
  };

  /* ── Search ────────────────────────────────────────────────── */
  const handleSearch = () => {
    if (tab === "salary") fetchSalary(salaryReportType);
    else if (tab === "bank") fetchBank();
    else fetchPayslips();
  };

  /* ── Switch salary sub-type ────────────────────────────────── */
  const switchSalaryType = (rt) => {
    setSalaryReportType(rt);
    setSalaryReport(null);
    setError("");
  };

  /* ── Switch main tab ───────────────────────────────────────── */
  const switchTab = (t) => {
    setTab(t);
    setSalaryReport(null);
    setBankStatement(null);
    setPayslipList([]);
    setError("");
  };

  /* ── Downloads ─────────────────────────────────────────────── */
  const dlSalaryExcel = async () => {
    setDlLoading(true);
    try {
      await download(
        `/salary-reports/salary-report/download/excel`,
        cleanParams({ reportType: salaryReportType }),
        `salary-report-${salaryReportType}-${filters.month}-${filters.year}.xlsx`,
      );
    } catch {
      alert("Excel download failed");
    } finally {
      setDlLoading(false);
    }
  };
  const dlSalaryPdf = async () => {
    setDlLoading(true);
    try {
      await download(
        `/salary-reports/salary-report/download/pdf`,
        cleanParams({ reportType: salaryReportType }),
        `salary-report-${salaryReportType}-${filters.month}-${filters.year}.pdf`,
      );
    } catch {
      alert("PDF download failed");
    } finally {
      setDlLoading(false);
    }
  };
  const dlBankExcel = async () => {
    setDlLoading(true);
    try {
      await download(
        `/salary-reports/bank-statement/download/excel`,
        cleanParams(),
        `bank-statement-${filters.month}-${filters.year}.xlsx`,
      );
    } catch {
      alert("Excel download failed");
    } finally {
      setDlLoading(false);
    }
  };
  const dlBankPdf = async () => {
    setDlLoading(true);
    try {
      await download(
        `/salary-reports/bank-statement/download/pdf`,
        cleanParams(),
        `bank-statement-${filters.month}-${filters.year}.pdf`,
      );
    } catch {
      alert("PDF download failed");
    } finally {
      setDlLoading(false);
    }
  };
  const dlPayslip = async (id, empCode) => {
    setDlLoading(true);
    try {
      await download(
        `/salary-reports/payslip/${id}/download`,
        {},
        `payslip-${empCode}-${filters.month}-${filters.year}.pdf`,
      );
    } catch {
      alert("Payslip download failed");
    } finally {
      setDlLoading(false);
    }
  };

  const activeSRT = SALARY_REPORT_TYPES.find((t) => t.key === salaryReportType);
  const hasData =
    salaryReport && Object.keys(salaryReport.data || {}).length > 0;

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-screen-2xl mx-auto space-y-4">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Salary Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            Generate & download salary reports, bank statements and payslips
          </p>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow p-1 w-fit">
          {[
            { key: "salary", label: "Salary Report" },
            { key: "bank", label: "Bank Statement" },
            { key: "payslips", label: "Payslips" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                tab === key
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── SALARY REPORT SUB-TABS ─────────────────────────────────── */}
        {tab === "salary" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* Sub-tab header */}
            <div className={`bg-gradient-to-r ${activeSRT.header} px-5 pt-4`}>
              <div className="flex items-end gap-1 overflow-x-auto pb-0">
                {SALARY_REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.key}
                    onClick={() => switchSalaryType(rt.key)}
                    title={rt.desc}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-sm font-semibold whitespace-nowrap transition-all border-t border-l border-r ${
                      salaryReportType === rt.key
                        ? "bg-white text-slate-800 border-white"
                        : "bg-white/10 text-white border-transparent hover:bg-white/20"
                    }`}
                  >
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-bold ${
                        salaryReportType === rt.key
                          ? rt.badge
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {rt.label}
                    </span>
                    <span className="hidden md:inline">{rt.full}</span>
                    <span className="inline md:hidden">{rt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tab description bar */}
            <div className="border-b border-slate-100 px-5 py-2.5 flex items-center gap-3 bg-slate-50">
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${activeSRT.badge}`}
              >
                {activeSRT.label}
              </span>
              <span className="text-slate-500 text-sm">{activeSRT.desc}</span>
              {salaryReport?.meta && (
                <div className="ml-auto flex items-center gap-2">
                  {salaryReport.meta.showEL && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        salaryReportType === "with_el"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {salaryReportType === "with_el"
                        ? "✓ EL Added to Total"
                        : "✗ EL Shown Separately"}
                    </span>
                  )}
                  {salaryReport.meta.showWO && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        salaryReportType === "with_weekoff"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {salaryReportType === "with_weekoff"
                        ? "+ Week Off Added"
                        : "− Week Off Subtracted"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Filters inside the salary card */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 items-end">
                <FilterField
                  label="Company"
                  name="companyId"
                  value={filters.companyId}
                  onChange={onChange}
                  className="col-span-2"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Department"
                  name="departmentId"
                  value={filters.departmentId}
                  onChange={onChange}
                >
                  <option value="">All Depts</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentname || "Unknown"}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Category"
                  name="category"
                  value={filters.category}
                  onChange={onChange}
                >
                  <option value="">All</option>
                  <option value="staff">Staff</option>
                  <option value="worker">Worker</option>
                </FilterField>
                <FilterField
                  label="PF Type"
                  name="pfType"
                  value={filters.pfType}
                  onChange={onChange}
                >
                  <option value="">All</option>
                  <option value="pf">PF</option>
                  <option value="npf">NPF</option>
                </FilterField>
                <FilterField
                  label="Salary Type"
                  name="salaryType"
                  value={filters.salaryType}
                  onChange={onChange}
                >
                  <option value="">All</option>
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                </FilterField>
                <FilterField
                  label="Month"
                  name="month"
                  value={filters.month}
                  onChange={onChange}
                >
                  {MONTHS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.l}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Year"
                  name="year"
                  value={filters.year}
                  onChange={onChange}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Status"
                  name="status"
                  value={filters.status}
                  onChange={onChange}
                >
                  <option value="">All</option>
                  <option value="Generated">Generated</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                </FilterField>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    &nbsp;
                  </label>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className={`w-full ${activeSRT.btn} disabled:bg-slate-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors`}
                  >
                    {loading ? "⏳" : "Search"}
                  </button>
                </div>
              </div>
            </div>

            {/* Salary report content */}
            <div className="p-5">
              <SalaryTab
                report={salaryReport}
                loading={loading}
                dlLoading={dlLoading}
                onPdf={dlSalaryPdf}
                onExcel={dlSalaryExcel}
                reportType={salaryReportType}
                activeSRT={activeSRT}
                hasData={hasData}
                filters={filters}
              />
            </div>
          </div>
        )}

        {/* ── BANK + PAYSLIP TABS ──────────────────────────────────────── */}
        {tab !== "salary" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 items-end">
                <FilterField
                  label="Company"
                  name="companyId"
                  value={filters.companyId}
                  onChange={onChange}
                  className="col-span-2"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Department"
                  name="departmentId"
                  value={filters.departmentId}
                  onChange={onChange}
                >
                  <option value="">All Depts</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentname || "Unknown"}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Category"
                  name="category"
                  value={filters.category}
                  onChange={onChange}
                >
                  <option value="">All</option>
                  <option value="staff">Staff</option>
                  <option value="worker">Worker</option>
                </FilterField>
                <FilterField
                  label="PF Type"
                  name="pfType"
                  value={filters.pfType}
                  onChange={onChange}
                >
                  <option value="">All</option>
                  <option value="pf">PF</option>
                  <option value="npf">NPF</option>
                </FilterField>
                <FilterField
                  label="Month"
                  name="month"
                  value={filters.month}
                  onChange={onChange}
                >
                  {MONTHS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.l}
                    </option>
                  ))}
                </FilterField>
                <FilterField
                  label="Year"
                  name="year"
                  value={filters.year}
                  onChange={onChange}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </FilterField>
                {tab !== "bank" && (
                  <FilterField
                    label="Status"
                    name="status"
                    value={filters.status}
                    onChange={onChange}
                  >
                    <option value="">All</option>
                    <option value="Generated">Generated</option>
                    <option value="Approved">Approved</option>
                    <option value="Paid">Paid</option>
                  </FilterField>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    &nbsp;
                  </label>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    {loading ? "⏳" : "Search"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Bank & payslip tab content */}
        {tab === "bank" && (
          <BankTab
            data={bankStatement}
            loading={loading}
            dlLoading={dlLoading}
            onPdf={dlBankPdf}
            onExcel={dlBankExcel}
          />
        )}
        {tab === "payslips" && (
          <PayslipsTab
            list={payslipList}
            loading={loading}
            dlLoading={dlLoading}
            onDownload={dlPayslip}
          />
        )}
      </div>
    </div>
  );
}

/* ================================================================
   SALARY REPORT TAB
================================================================ */
function SalaryTab({
  report,
  reportType,
  activeSRT,
  loading,
  dlLoading,
  hasData,
  onPdf,
  onExcel,
  filters,
}) {
  const showEL = report?.meta?.showEL;
  const showWO = report?.meta?.showWO;

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {report?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                label="Employees"
                value={report.summary.recordsCount || 0}
                color="blue"
              />
              <SummaryCard
                label="Grand Total Net"
                value={`₹${fmt(report.summary.grandTotal)}`}
                color="green"
              />
              {showEL && (
                <SummaryCard
                  label="Total EL Days"
                  value={report.summary.totalELDays || 0}
                  color="emerald"
                />
              )}
              {showWO && (
                <SummaryCard
                  label="Total WO Days"
                  value={report.summary.totalWODays || 0}
                  color="purple"
                />
              )}
              {!showEL && !showWO && (
                <>
                  <SummaryCard
                    label="Prev Month"
                    value={`₹${fmt(report.comparison?.previousMonth)}`}
                    color="slate"
                  />
                  <SummaryCard
                    label="Change"
                    value={`${report.comparison?.difference >= 0 ? "▲" : "▼"} ₹${fmt(Math.abs(report.comparison?.difference))}`}
                    color={report.comparison?.difference >= 0 ? "green" : "red"}
                  />
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onPdf}
            disabled={dlLoading || !hasData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
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
          <button
            onClick={onExcel}
            disabled={dlLoading || !hasData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
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
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* Department tables */}
      {hasData ? (
        Object.entries(report.data).map(([dept, { records }]) => {
          const isDailyReport =
            filters?.salaryType === "daily" ||
            filters?.category === "worker" ||
            (records &&
              records.length > 0 &&
              records.every(
                (r) =>
                  r.empSalaryType === "daily" ||
                  (r.employee?.workingType || "").toLowerCase() === "daily",
              ));
          const salHeader = isDailyReport ? "Daily Wages" : "Month Sal";

          return (
            <div
              key={dept}
              className="bg-white rounded-xl shadow overflow-hidden border border-slate-100"
            >
              <div
                className={`bg-gradient-to-r ${activeSRT.header} px-5 py-3 flex items-center justify-between`}
              >
                <span className="text-white font-bold">{dept}</span>
                <span className="text-white/70 text-sm">
                  {records.length} employees · Net: ₹
                  {fmt(records.reduce((s, r) => s + (r.netSalary || 0), 0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {/* Fixed columns */}
                      {[
                        "S.No",
                        "Name",
                        "T.No",
                        "Desig",
                        salHeader,
                        "W.Days",
                        "NH/FH",
                        "EL",
                        "AB",
                        "WH",
                        "Basic",
                        "HRA",
                        "Spl",
                        "Conv",
                        "NH Wages",
                        "Incentive",
                        "Earnings",
                        "PF",
                        "ESI",
                        "Adv",
                        "Mess",
                        "Store",
                        "Other",
                        "EB",
                        "T.Dedu",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}

                      {/* EL column */}
                      {showEL && (
                        <th
                          className={`px-2 py-2 text-center font-semibold whitespace-nowrap ${
                            reportType === "with_el"
                              ? "text-green-700 bg-green-50"
                              : "text-orange-700 bg-orange-50"
                          }`}
                        >
                          {report.meta.elLabel}
                        </th>
                      )}

                      {/* WO column */}
                      {showWO && (
                        <th
                          className={`px-2 py-2 text-center font-semibold whitespace-nowrap ${
                            reportType === "with_weekoff"
                              ? "text-purple-700 bg-purple-50"
                              : "text-amber-700 bg-amber-50"
                          }`}
                        >
                          {report.meta.woLabel}
                        </th>
                      )}

                      {/* Adjusted / total days column */}
                      {(showEL || showWO) && (
                        <th className="px-2 py-2 text-center font-semibold text-indigo-700 bg-indigo-50 whitespace-nowrap">
                          {report.meta.totalLabel}
                        </th>
                      )}

                      <th className="px-2 py-2 text-right font-semibold text-green-700 bg-green-50 whitespace-nowrap">
                        Net
                      </th>
                      <th className="px-2 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">
                        Net(Rnd)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.map((r, i) => {
                      const e = r.earnings || {};
                      const d = r.deductions || {};
                      const earnings =
                        (e.basic || 0) +
                        (e.hra || 0) +
                        (e.spl || 0) +
                        (e.conv || 0) +
                        (e.nhfh || 0) +
                        (e.incentive || 0) +
                        (e.ent || 0);
                      const tDedu =
                        (d.pf || 0) +
                        (d.esi || 0) +
                        (d.adv || 0) +
                        (d.mess || 0) +
                        (d.store || 0) +
                        (d.other || 0) +
                        (d.eb || 0) +
                        (d.loan || 0);

                      const isDailyRow =
                        (r.empSalaryType || "").toLowerCase() === "daily" ||
                        (r.employee?.workingType || "").toLowerCase() === "daily" ||
                        filters?.salaryType === "daily" ||
                        filters?.category === "worker";
                      const workedDays =
                        (Number(r.presentDays) || 0) + (Number(r.paidLeaveDays) || 0);
                      const totalDailyBase =
                        (Number(r.basicSalary) || 0) + (Number(e.spl) || 0);
                      const calcDailyWage =
                        r.dailyWage ??
                        (workedDays > 0
                          ? Math.round(totalDailyBase / workedDays)
                          : r.monthlySalary || 0);
                      const displaySalary = isDailyRow ? calcDailyWage : r.monthlySalary;

                      return (
                        <tr
                          key={r.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                        >
                          <td className="px-2 py-1.5 text-slate-500">{i + 1}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap font-medium text-slate-800">
                            {r.employee?.firstName}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-slate-600">
                            {r.employee?.employeeCode}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">
                            {r.employee?.designation?.name || "-"}
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium text-slate-700">
                            {displaySalary != null && displaySalary !== ""
                              ? Number(displaySalary).toLocaleString("en-IN")
                              : "-"}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {r.presentDays}
                          </td>
                          <td className="px-2 py-1.5 text-right">{r.nhFhDays}</td>
                          <td className="px-2 py-1.5 text-right">
                            {r.paidLeaveDays}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {r.absentDays}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {r.weekOffDays}
                          </td>
                          <Num v={e.basic} /> <Num v={e.hra} /> <Num v={e.spl} />
                          <Num v={e.conv} /> <Num v={e.nhfh} />{" "}
                          <Num v={e.incentive} />
                          <td className="px-2 py-1.5 text-right font-semibold text-blue-700 bg-blue-50/60">
                            {earnings.toLocaleString("en-IN")}
                          </td>
                          <Num v={d.pf} /> <Num v={d.esi} /> <Num v={d.adv} />
                          <Num v={d.mess} /> <Num v={d.store} />
                          <Num v={(d.other || 0) + (d.loan || 0)} />{" "}
                          <Num v={d.eb} />
                          <td className="px-2 py-1.5 text-right font-semibold text-red-700 bg-red-50/60">
                            {tDedu.toLocaleString("en-IN")}
                          </td>
                          {/* EL cell */}
                          {showEL && (
                            <td
                              className={`px-2 py-1.5 text-center font-bold ${
                                reportType === "with_el"
                                  ? "text-green-700 bg-green-50/70"
                                  : "text-orange-700 bg-orange-50/70"
                              }`}
                            >
                              {reportType === "with_el" ? "+" : ""}
                              {r.paidLeaveDays ?? 0}
                            </td>
                          )}
                          {/* WO cell */}
                          {showWO && (
                            <td
                              className={`px-2 py-1.5 text-center font-bold ${
                                reportType === "with_weekoff"
                                  ? "text-purple-700 bg-purple-50/70"
                                  : "text-amber-700 bg-amber-50/70"
                              }`}
                            >
                              {reportType === "with_weekoff" ? "+" : "−"}
                              {r.weekOffDays ?? 0}
                            </td>
                          )}
                          {/* Adjusted days */}
                          {(showEL || showWO) && (
                            <td className="px-2 py-1.5 text-center font-bold text-indigo-700 bg-indigo-50/60">
                              {r.grandTotalDays ?? r.presentDays}
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-right font-bold text-green-700 bg-green-50/60">
                            {r.netSalary?.toLocaleString("en-IN")}
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold">
                            {r.netRounded?.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Dept totals */}
                  <tfoot>
                    <tr className="bg-slate-200/70 font-bold text-xs border-t border-slate-300">
                      <td
                        colSpan={16}
                        className="px-2 py-2 text-right text-slate-700"
                      >
                        Dept Total
                      </td>
                      <td className="px-2 py-2 text-right text-blue-700">
                        {records
                          .reduce((s, r) => s + (r.grossSalary || 0), 0)
                          .toLocaleString("en-IN")}
                      </td>
                      <td colSpan={7}></td>
                      <td className="px-2 py-2 text-right text-red-700">
                        {records
                          .reduce((s, r) => s + (r.totalDeductions || 0), 0)
                          .toLocaleString("en-IN")}
                      </td>
                      {showEL && (
                        <td
                          className={`px-2 py-2 text-center ${reportType === "with_el" ? "text-green-700" : "text-orange-700"}`}
                        >
                          {records.reduce(
                            (s, r) => s + (r.paidLeaveDays || 0),
                            0,
                          )}
                        </td>
                      )}
                      {showWO && (
                        <td
                          className={`px-2 py-2 text-center ${reportType === "with_weekoff" ? "text-purple-700" : "text-amber-700"}`}
                        >
                          {records.reduce((s, r) => s + (r.weekOffDays || 0), 0)}
                        </td>
                      )}
                      {(showEL || showWO) && (
                        <td className="px-2 py-2 text-center text-indigo-700">
                          {records.reduce(
                            (s, r) =>
                              s + (r.grandTotalDays || r.presentDays || 0),
                            0,
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right text-green-700">
                        {records
                          .reduce((s, r) => s + (r.netSalary || 0), 0)
                          .toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {records
                          .reduce((s, r) => s + (r.netRounded || 0), 0)
                          .toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState
          loading={loading}
          msg={`Select filters and click Search to generate the "${activeSRT.full}" report.`}
        />
      )}
    </div>
  );
}

/* ================================================================
   BANK STATEMENT TAB  (unchanged from original)
================================================================ */
function BankTab({ data, loading, dlLoading, onPdf, onExcel }) {
  const hasData = data && Object.keys(data.data || {}).length > 0;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-bold text-slate-800">
          Department-wise Bank Statement
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onPdf}
            disabled={dlLoading || !hasData}
            className="px-4 py-2 bg-red-600   hover:bg-red-700   disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            PDF
          </button>
          <button
            onClick={onExcel}
            disabled={dlLoading || !hasData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Excel
          </button>
        </div>
      </div>
      {data?.summary && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="Total Employees"
            value={data.summary.totalEmployees}
            color="blue"
          />
          <SummaryCard
            label="Departments"
            value={data.summary.totalDepartments}
            color="slate"
          />
          <SummaryCard
            label="Grand Total"
            value={`₹${fmt(data.summary.grandTotal)}`}
            color="green"
          />
        </div>
      )}
      {hasData ? (
        Object.entries(data.data).map(([dept, { records, total }]) => (
          <div
            key={dept}
            className="bg-white rounded-xl shadow overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-5 py-3 flex items-center justify-between">
              <span className="text-white font-bold">{dept}</span>
              <span className="text-blue-200 text-sm">
                Total: ₹{fmt(total)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {[
                      "S.No",
                      "T.No",
                      "Employee Name",
                      "Bank Account",
                      "Bank Name",
                      "IFSC Code",
                      "Net Pay",
                      "Net (Round)",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-slate-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r, i) => (
                    <tr
                      key={r.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.employee?.employeeCode}
                      </td>
                      <td className="px-3 py-2">
                        {r.employee?.firstName}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.employee?.bankAccountNumber || "N/A"}
                      </td>
                      <td className="px-3 py-2">
                        {r.employee?.bankName || "N/A"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.employee?.ifscCode || "N/A"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">
                        ₹{fmt(r.netSalary)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold bg-green-50 text-green-700">
                        ₹{fmt(r.netRounded)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 font-bold text-sm">
                    <td colSpan={6} className="px-3 py-2 text-right">
                      Dept Total
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">
                      ₹{fmt(total)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">
                      ₹{fmt(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          loading={loading}
          msg="No bank statement data. Apply filters and click Search."
        />
      )}
    </div>
  );
}

/* ================================================================
   PAYSLIPS TAB  (unchanged from original)
================================================================ */
function PayslipsTab({ list, loading, dlLoading, onDownload }) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-bold text-slate-800">Employee Payslips</h2>
        <p className="text-slate-500 text-sm mt-1">
          Download individual payslips
        </p>
      </div>
      {list.length > 0 ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
                <tr>
                  {[
                    "S.No",
                    "T.No",
                    "Employee Name",
                    "Department",
                    "Designation",
                    "Category",
                    "PF Type",
                    "Gross",
                    "Net Pay",
                    "Net (Rnd)",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left font-semibold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((r, i) => (
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.employee?.employeeCode}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.employee?.firstName}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.employee?.department?.departmentname || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.employee?.designation?.name || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.empCategory === "staff" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                      >
                        {r.empCategory}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.empPfType === "pf" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}
                      >
                        {r.empPfType?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      ₹{fmt(r.grossSalary)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">
                      ₹{fmt(r.netSalary)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold bg-green-50 text-green-700">
                      ₹{fmt(r.netRounded)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          onDownload(r.id, r.employee?.employeeCode)
                        }
                        disabled={dlLoading}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          loading={loading}
          msg="No payslips found for the selected period and filters."
        />
      )}
    </div>
  );
}

/* ── Shared small components ─────────────────────────────────── */
const COLOR_MAP = {
  blue: "border-blue-500 text-blue-700",
  green: "border-green-500 text-green-700",
  emerald: "border-emerald-500 text-emerald-700",
  purple: "border-purple-500 text-purple-700",
  slate: "border-slate-400 text-slate-700",
  red: "border-red-500 text-red-700",
};

function SummaryCard({ label, value, color = "blue" }) {
  return (
    <div
      className={`bg-white rounded-xl shadow p-4 border-l-4 ${COLOR_MAP[color] || COLOR_MAP.blue}`}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${COLOR_MAP[color]}`}>{value}</p>
    </div>
  );
}

function Num({ v }) {
  const n = Number(v) || 0;
  return (
    <td className="px-2 py-1.5 text-right text-slate-600">
      {n !== 0 ? (
        n.toLocaleString("en-IN")
      ) : (
        <span className="text-slate-300">-</span>
      )}
    </td>
  );
}

function EmptyState({ loading, msg }) {
  return (
    <div className="bg-white rounded-xl shadow p-14 text-center">
      <div className="text-4xl mb-2 opacity-20">📊</div>
      <p className="text-slate-400 text-sm">{loading ? "⏳ Loading…" : msg}</p>
    </div>
  );
}

function FilterField({
  label,
  name,
  value,
  onChange,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
      >
        {children}
      </select>
    </div>
  );
}
