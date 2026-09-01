import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "../utils/apiCaller";

// ── Management grade list (mirrors payrollConfig.js) ──────────────────────────
const MANAGEMENT_GRADE_KEYWORDS = [
  "GM",
  "GM(T)",
  "SR.M",
  "SR.M (M)",
  "Sr.M (M)",
  "M (TRG)",
  "PM",
  "OM",
  "AM(Q)",
  "AM (Q)",
  "AM(Pers)",
  "AM (Pers)",
  "AM (Prod)",
  "AM(Prod)",
  "ELE (M)",
  "ELE(M)",
  "E E",
  "EE",
];
const isManagementGrade = (g = "") => {
  const n = g.toUpperCase().trim();
  return MANAGEMENT_GRADE_KEYWORDS.some(
    (kw) => n === kw.toUpperCase() || n.includes(kw.toUpperCase()),
  );
};

// ── Multi-select ───────────────────────────────────────────────────────────────
const MultiSelect = ({
  options,
  value = [],
  onChange,
  placeholder = "Select...",
  disabled,
  labelKey = "name",
  valueKey = "id",
  displayBadge,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter(
    (o) =>
      String(o[labelKey] || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (o.employeeCode &&
        o.employeeCode.toLowerCase().includes(search.toLowerCase())),
  );
  const toggle = (id) => {
    const n = Number(id);
    onChange(value.includes(n) ? value.filter((v) => v !== n) : [...value, n]);
  };
  const selectAll = () => onChange(filtered.map((o) => Number(o[valueKey])));
  const clearAll = () => onChange([]);

  const selectedLabels = value.map((v) => {
    const opt = options.find((o) => Number(o[valueKey]) === v);
    return opt ? (displayBadge ? displayBadge(opt) : opt[labelKey]) : v;
  });

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        style={{
          minHeight: 38,
          padding: "5px 10px",
          border: `1.5px solid ${open ? "#2563EB" : "#E2E8F0"}`,
          borderRadius: 8,
          background: disabled ? "#F8FAFC" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          alignItems: "center",
          opacity: disabled ? 0.6 : 1,
          boxSizing: "border-box",
        }}
      >
        {value.length === 0 ? (
          <span style={{ color: "#94A3B8", fontSize: 13 }}>{placeholder}</span>
        ) : (
          selectedLabels.slice(0, 3).map((lbl, i) => (
            <span
              key={i}
              style={{
                background: "#DBEAFE",
                color: "#1D4ED8",
                borderRadius: 4,
                padding: "2px 7px",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {lbl}
              <span
                style={{ cursor: "pointer", fontWeight: 800 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  toggle(value[i]);
                }}
              >
                ×
              </span>
            </span>
          ))
        )}
        {value.length > 3 && (
          <span
            style={{
              background: "#F1F5F9",
              color: "#64748B",
              borderRadius: 4,
              padding: "2px 7px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            +{value.length - 3}
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "#94A3B8", fontSize: 10 }}>
          ▼
        </span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #E2E8F0",
            borderRadius: 10,
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 240,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid #F1F5F9",
              flexShrink: 0,
            }}
          >
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                width: "100%",
                padding: "5px 10px",
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "5px 10px",
              flexShrink: 0,
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <button
              onClick={selectAll}
              style={{
                fontSize: 11,
                color: "#2563EB",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                padding: 0,
              }}
            >
              All ({filtered.length})
            </button>
            <span style={{ color: "#CBD5E1" }}>|</span>
            <button
              onClick={clearAll}
              style={{
                fontSize: 11,
                color: "#DC2626",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                padding: 0,
              }}
            >
              Clear
            </button>
            {value.length > 0 && (
              <span
                style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}
              >
                {value.length} selected
              </span>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((opt) => {
              const id = Number(opt[valueKey]);
              const checked = value.includes(id);
              return (
                <div
                  key={id}
                  onClick={() => toggle(id)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: checked ? "#EFF6FF" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 15,
                      height: 15,
                      border: `2px solid ${checked ? "#2563EB" : "#CBD5E1"}`,
                      borderRadius: 4,
                      background: checked ? "#2563EB" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <polyline
                          points="2 6 5 9 10 3"
                          stroke="#fff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: checked ? 600 : 400,
                        color: "#1E293B",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt[labelKey]}
                      {opt.employeeCode && (
                        <span
                          style={{
                            color: "#94A3B8",
                            fontSize: 11,
                            marginLeft: 5,
                          }}
                        >
                          ({opt.employeeCode})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const SalaryGenerationManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [totals, setTotals] = useState({});
  const [companyId, setCompanyId] = useState("");

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSalaryType, setFilterSalaryType] = useState("");
  const [filterPfType, setFilterPfType] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [activeTab, setActiveTab] = useState("All");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [salaryDetails, setSalaryDetails] = useState(null);

  const [genForm, setGenForm] = useState({
    companyId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    fromDate: "",
    toDate: "",
    useRange: false,
    departmentIds: [],
    categoryIds: [],
    employeeIds: [],
    employeeType: "", // "Staff" | "Worker" | ""
    staffType: "", // "manager" | "staff" | "" — only when employeeType=Staff
    workingType: "", // "Daily" | "Monthly" | ""
    pfType: "", // "pf" | "npf" | ""
  });

  const [payForm, setPayForm] = useState({
    paymentMethod: "Bank Transfer",
    paymentReference: "",
  });

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
  const YEARS = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );
  const TABS = ["All", "Generated", "Approved", "Paid"];
  const STATUS_COLORS = {
    Generated: { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
    Approved: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
    Paid: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
    Cancelled: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
    Draft: { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" },
  };

  const managementGrades = grades.filter((g) => isManagementGrade(g.name));

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchDepartments(companyId);
    fetchCategories(companyId);
    fetchEmployees(companyId);
    fetchGrades(companyId);
    setGenForm((p) => ({ ...p, companyId }));
  }, [companyId]);

  useEffect(() => {
    if (companyId) fetchSalaries();
  }, [
    companyId,
    filterMonth,
    filterYear,
    filterStatus,
    filterCategory,
    filterSalaryType,
    filterPfType,
    filterDept,
    fromDate,
    toDate,
  ]);

  const fetchCompanies = async () => {
    try {
      const r = await apiRequest("/companies");
      setCompanies(r || []);
      const id = r[0]?.id || "";
      setCompanyId(id);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchDepartments = async (cId) => {
    try {
      const r = await apiRequest(`/departments?companyId=${cId}`);
      setDepartments(r.data || []);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchCategories = async (cId) => {
    try {
      const r = await apiRequest(`/categories?companyId=${cId}`);
      setCategories(Array.isArray(r) ? r : r.categories || []);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchEmployees = async (cId) => {
    try {
      const r = await apiRequest(
        `/employees?companyId=${cId}&status=Active`,
      );
      setEmployees(r.employees || r || []);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchGrades = async (cId) => {
    try {
      const r = await apiRequest(`/employer-grades?companyId=${cId}`);
      setGrades(r || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSalaries = async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ companyId });
      if (fromDate && toDate) {
        p.set("fromDate", fromDate);
        p.set("toDate", toDate);
      } else {
        p.set("month", filterMonth);
        p.set("year", filterYear);
      }
      if (filterStatus) p.set("status", filterStatus);
      if (filterCategory) p.set("category", filterCategory);
      if (filterSalaryType) p.set("salaryType", filterSalaryType);
      if (filterPfType) p.set("pfType", filterPfType);
      if (filterDept) p.set("departmentId", filterDept);
      const r = await apiRequest(`/salary-generation?${p}`);
      setSalaries(r.salaries || []);
      setTotals(r.totals || {});
    } catch (e) {
      setError("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        companyId: Number(genForm.companyId),
        generatedBy: null,
        employeeIds: genForm.employeeIds.map(Number),
        departmentIds: genForm.departmentIds.map(Number),
        categoryIds: genForm.categoryIds.map(Number),
        employeeType: genForm.employeeType,
        staffType: genForm.staffType,
        workingType: genForm.workingType,
        pfType: genForm.pfType,
      };
      if (genForm.useRange && genForm.fromDate && genForm.toDate) {
        payload.fromDate = genForm.fromDate;
        payload.toDate = genForm.toDate;
      } else {
        payload.month = Number(genForm.month);
        payload.year = Number(genForm.year);
      }
      const r = await apiRequest("/salary-generation/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(
        `✅ Generated: ${r.results?.generated} | Skipped: ${r.results?.skipped} | Errors: ${r.results?.errors?.length}`,
      );
      setGenerateOpen(false);
      fetchSalaries();
    } catch (e) {
      const data = e.response?.data;
      if (data?.employees?.length)
        alert(
          `${data.message}\n\n${data.employees.map((emp) => `  • ${emp.name} — ${emp.absentDays} absent days`).join("\n")}`,
        );
      else alert(data?.message || e.message || "Generation failed");
      setError(data?.message || "Salary generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (salary) => {
    setLoading(true);
    try {
      const r = await apiRequest(`/salary-generation/${salary.id}`);
      setSalaryDetails(r);
      setDetailsOpen(true);
    } catch {
      setError("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (salaryId) => {
    if (!window.confirm("Approve this salary?")) return;
    setLoading(true);
    try {
      await apiRequest(`/salary-generation/${salaryId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approvedBy: 1 }),
      });
      fetchSalaries();
    } catch (e) {
      setError(e.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      await apiRequest(`/salary-generation/${selectedSalary.id}/pay`, {
        method: "PATCH",
        body: JSON.stringify({ ...payForm, paidBy: 1 }),
      });
      setSuccess("Marked as paid");
      setPayOpen(false);
      fetchSalaries();
    } catch (e) {
      setError(e.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (salaryId) => {
    if (!window.confirm("Delete this salary record?")) return;
    setLoading(true);
    try {
      await apiRequest(`/salary-generation/${salaryId}`, {
        method: "DELETE",
      });
      fetchSalaries();
    } catch (e) {
      setError(e.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  const fmtDec = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(n || 0);
  const monthLabel = (v) => MONTHS.find((m) => m.v === Number(v))?.l || v;
  const tabSalaries = () =>
    activeTab === "All"
      ? salaries
      : salaries.filter((s) => s.status === activeTab);
  const tabCount = (t) =>
    t === "All"
      ? salaries.length
      : salaries.filter((s) => s.status === t).length;

  const StatusBadge = ({ status }) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.Draft;
    return (
      <span
        style={{ background: c.bg, color: c.text }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      >
        <span
          style={{ background: c.dot }}
          className="w-1.5 h-1.5 rounded-full inline-block"
        />
        {status}
      </span>
    );
  };

  const TypeTags = ({ category, salaryType, pfType }) => (
    <div className="flex flex-wrap gap-1">
      {category && (
        <span
          style={{
            background: category === "staff" ? "#EDE9FE" : "#FFF7ED",
            color: category === "staff" ? "#5B21B6" : "#C2410C",
          }}
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
        >
          {category}
        </span>
      )}
      {salaryType && (
        <span
          style={{ background: "#F0FDF4", color: "#15803D" }}
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
        >
          {salaryType}
        </span>
      )}
      {pfType && (
        <span
          style={{
            background: pfType === "pf" ? "#EFF6FF" : "#F9FAFB",
            color: pfType === "pf" ? "#1D4ED8" : "#6B7280",
          }}
          className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
        >
          {pfType}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          background: "linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)",
          color: "#fff",
        }}
        className="px-8 py-5 flex items-center justify-between shadow-lg"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Salary Generation
          </h1>
          <p style={{ opacity: 0.75, fontSize: 12 }}>
            {fromDate && toDate
              ? `${fromDate} → ${toDate}`
              : `${monthLabel(filterMonth)} ${filterYear}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSalaries}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            ↺ Refresh
          </button>
          <button
            onClick={() => setGenerateOpen(true)}
            style={{ background: "#fff", color: "#1E3A5F" }}
            className="px-4 py-2 rounded-lg text-sm font-bold shadow-md"
          >
            + Generate Salary
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderLeft: "4px solid #EF4444",
            }}
            className="p-4 rounded-lg flex justify-between"
          >
            <span style={{ color: "#991B1B", fontSize: 14 }}>{error}</span>
            <button
              onClick={() => setError("")}
              style={{ color: "#EF4444" }}
              className="font-bold text-lg"
            >
              ×
            </button>
          </div>
        )}
        {success && (
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderLeft: "4px solid #22C55E",
            }}
            className="p-4 rounded-lg flex justify-between"
          >
            <span style={{ color: "#14532D", fontSize: 14 }}>{success}</span>
            <button
              onClick={() => setSuccess("")}
              style={{ color: "#22C55E" }}
              className="font-bold text-lg"
            >
              ×
            </button>
          </div>
        )}

        {/* FILTER PANEL */}
        <div
          style={{ background: "#fff", border: "1px solid #E2E8F0" }}
          className="rounded-xl p-5 shadow-sm"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 items-end">
            <FilterSelect
              label="Company"
              value={companyId}
              onChange={setCompanyId}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.companyName}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Month"
              value={filterMonth}
              onChange={setFilterMonth}
            >
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.l}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Year"
              value={filterYear}
              onChange={setFilterYear}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </FilterSelect>
            <div>
              <label style={labelSty}>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelSty}>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <FilterSelect
              label="Department"
              value={filterDept}
              onChange={setFilterDept}
            >
              <option value="">All Depts</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentname}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Type"
              value={filterCategory}
              onChange={setFilterCategory}
            >
              <option value="">All</option>
              <option value="staff">Staff</option>
              <option value="worker">Worker</option>
            </FilterSelect>
            <FilterSelect
              label="Work Mode"
              value={filterSalaryType}
              onChange={setFilterSalaryType}
            >
              <option value="">All</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </FilterSelect>
            <FilterSelect
              label="PF"
              value={filterPfType}
              onChange={setFilterPfType}
            >
              <option value="">All</option>
              <option value="pf">PF</option>
              <option value="npf">Non-PF</option>
            </FilterSelect>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Employees",
              value: salaries.length,
              color: "#1E3A5F",
              light: "#EFF6FF",
              fmt: (v) => v,
            },
            {
              label: "Total Gross",
              value: totals.totalGross,
              color: "#047857",
              light: "#ECFDF5",
              fmt,
            },
            {
              label: "Total PF",
              value: totals.totalPf,
              color: "#7C3AED",
              light: "#F5F3FF",
              fmt,
            },
            {
              label: "Total ESI",
              value: totals.totalEsi,
              color: "#B45309",
              light: "#FFFBEB",
              fmt,
            },
            {
              label: "Net Payable",
              value: totals.totalNet,
              color: "#DC2626",
              light: "#FEF2F2",
              fmt,
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "#fff",
                border: `1px solid ${card.light}`,
                borderTop: `3px solid ${card.color}`,
              }}
              className="rounded-xl p-4 shadow-sm"
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94A3B8",
                  letterSpacing: "0.08em",
                }}
                className="uppercase mb-1"
              >
                {card.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: card.color }}>
                {card.fmt(card.value)}
              </div>
            </div>
          ))}
        </div>

        {/* TABS + TABLE */}
        <div
          style={{ background: "#fff", border: "1px solid #E2E8F0" }}
          className="rounded-xl shadow-sm overflow-hidden"
        >
          <div style={{ borderBottom: "1px solid #E2E8F0" }} className="flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 20px",
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? "#2563EB" : "#64748B",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid #2563EB"
                      : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {tab}{" "}
                <span
                  style={{
                    marginLeft: 6,
                    background: activeTab === tab ? "#DBEAFE" : "#F1F5F9",
                    color: activeTab === tab ? "#1D4ED8" : "#64748B",
                    padding: "1px 7px",
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {tabCount(tab)}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: "3px solid #DBEAFE",
                  borderTop: "3px solid #2563EB",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ color: "#94A3B8" }}>Loading…</span>
            </div>
          ) : tabSalaries().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span style={{ color: "#94A3B8", fontSize: 14 }}>
                No salary records found
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead style={{ background: "#EFF6FF" }}>
                  <tr
                    style={{
                      background: "#EFF6FF",
                      borderBottom: "2px solid #BFDBFE",
                    }}
                  >
                    {[
                      "Employee",
                      "Period",
                      "Type",
                      "Days",
                      "Attendance",
                      "Gross",
                      "PF+ESI",
                      "Deductions",
                      "Net",
                      "Status",
                      "Actions",
                    ].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          background: "#EFF6FF",
                          padding: "12px 14px",
                          textAlign: i >= 4 && i <= 7 ? "right" : "left",
                          fontWeight: 700,
                          color: "#1E40AF",
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabSalaries().map((sal, idx) => (
                    <tr
                      key={sal.id}
                      style={{
                        background: idx % 2 === 0 ? "#fff" : "#FAFBFC",
                        borderBottom: "1px solid #F1F5F9",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#EFF6FF")
                      }
                      onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        idx % 2 === 0 ? "#fff" : "#FAFBFC")
                      }
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1E293B" }}>
                          {sal.employee?.firstName}
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>
                          {sal.employee?.employeeCode}
                        </div>
                        {sal.employee?.grade?.name && (
                          <div style={{ fontSize: 10, color: "#B0BEC5" }}>
                            {sal.employee.grade.name}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "#475569",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {monthLabel(sal.salaryMonth)} {sal.salaryYear}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <TypeTags
                          category={sal.empCategory}
                          salaryType={sal.empSalaryType}
                          pfType={sal.empPfType}
                        />
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          color: "#475569",
                        }}
                      >
                        {sal.totalDays || "—"}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            P:{sal.presentDays}
                          </span>
                          {" · "}
                          <span style={{ color: "#DC2626" }}>
                            A:{sal.absentDays}
                          </span>
                          {" · "}
                          <span style={{ color: "#0284C7" }}>
                            L:{sal.paidLeaveDays}
                          </span>
                        </div>
                        {sal.nhFhDays > 0 && (
                          <div style={{ fontSize: 10, color: "#7C3AED" }}>
                            NH/FH:{sal.nhFhDays}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: "#047857",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmt(sal.grossSalary)}
                        {sal.attnIncentive > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#7C3AED",
                              fontWeight: 400,
                            }}
                          >
                            +{fmt(sal.attnIncentive)} incv
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sal.pfAmount > 0 || sal.esiAmount > 0 ? (
                          <div style={{ fontSize: 12 }}>
                            <div style={{ color: "#7C3AED" }}>
                              PF:{fmt(sal.pfAmount)}
                            </div>
                            <div style={{ color: "#0284C7" }}>
                              ESI:{fmt(sal.esiAmount)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#CBD5E1", fontSize: 12 }}>
                            —
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          color: "#DC2626",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(sal.totalDeductions)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: 800,
                            color: "#1E3A5F",
                            fontSize: 14,
                          }}
                        >
                          {fmt(sal.netRounded || sal.netSalary)}
                        </div>
                        {sal.netRounded && sal.netRounded !== sal.netSalary && (
                          <div style={{ fontSize: 10, color: "#94A3B8" }}>
                            exact:{fmt(sal.netSalary)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <StatusBadge status={sal.status} />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div className="flex gap-1 justify-center">
                          <ActionBtn
                            title="View"
                            color="#2563EB"
                            onClick={() => handleViewDetails(sal)}
                          >
                            👁
                          </ActionBtn>
                          {sal.status === "Generated" && (
                            <ActionBtn
                              title="Approve"
                              color="#059669"
                              onClick={() => handleApprove(sal.id)}
                            >
                              ✓
                            </ActionBtn>
                          )}
                          {sal.status === "Approved" && (
                            <ActionBtn
                              title="Pay"
                              color="#7C3AED"
                              onClick={() => {
                                setSelectedSalary(sal);
                                setPayOpen(true);
                              }}
                            >
                              💳
                            </ActionBtn>
                          )}
                          {["Draft", "Generated"].includes(sal.status) && (
                            <ActionBtn
                              title="Delete"
                              color="#DC2626"
                              onClick={() => handleDelete(sal.id)}
                            >
                              🗑
                            </ActionBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* GENERATE DIALOG */}
      {generateOpen && (
        <Modal
          title="Generate Salary"
          subtitle="Configure payroll run"
          onClose={() => setGenerateOpen(false)}
          wide
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date mode toggle */}
            <div className="col-span-2">
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => setGenForm((p) => ({ ...p, useRange: false }))}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1.5px solid",
                    borderColor: !genForm.useRange ? "#2563EB" : "#E2E8F0",
                    background: !genForm.useRange ? "#EFF6FF" : "#fff",
                    color: !genForm.useRange ? "#2563EB" : "#64748B",
                  }}
                >
                  Single Month
                </button>
                <button
                  onClick={() => setGenForm((p) => ({ ...p, useRange: true }))}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1.5px solid",
                    borderColor: genForm.useRange ? "#2563EB" : "#E2E8F0",
                    background: genForm.useRange ? "#EFF6FF" : "#fff",
                    color: genForm.useRange ? "#2563EB" : "#64748B",
                  }}
                >
                  Date Range (Multi-month)
                </button>
              </div>
            </div>

            {!genForm.useRange ? (
              <>
                <div>
                  <FieldLabel>Month *</FieldLabel>
                  <FieldSelect
                    value={genForm.month}
                    onChange={(v) => setGenForm({ ...genForm, month: v })}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.v} value={m.v}>
                        {m.l}
                      </option>
                    ))}
                  </FieldSelect>
                </div>
                <div>
                  <FieldLabel>Year *</FieldLabel>
                  <FieldSelect
                    value={genForm.year}
                    onChange={(v) => setGenForm({ ...genForm, year: v })}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </FieldSelect>
                </div>
              </>
            ) : (
              <>
                <div>
                  <FieldLabel>From Date *</FieldLabel>
                  <input
                    type="date"
                    value={genForm.fromDate}
                    onChange={(e) =>
                      setGenForm({ ...genForm, fromDate: e.target.value })
                    }
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <FieldLabel>To Date *</FieldLabel>
                  <input
                    type="date"
                    value={genForm.toDate}
                    onChange={(e) =>
                      setGenForm({ ...genForm, toDate: e.target.value })
                    }
                    style={fieldStyle}
                  />
                  <FieldHint>
                    Will generate salary for each month in this range.
                  </FieldHint>
                </div>
              </>
            )}

            {/* Employee Type */}
            <div>
              <FieldLabel>Employee Type</FieldLabel>
              <FieldSelect
                value={genForm.employeeType}
                onChange={(v) =>
                  setGenForm({ ...genForm, employeeType: v, staffType: "" })
                }
              >
                <option value="">All (Staff + Worker)</option>
                <option value="Staff">Staff Only</option>
                <option value="Worker">Worker Only</option>
              </FieldSelect>
            </div>

            {/* Staff Sub-type — only relevant when Staff selected */}
            <div>
              <FieldLabel>Staff Type</FieldLabel>
              <FieldSelect
                value={genForm.staffType}
                disabled={genForm.employeeType !== "Staff"}
                onChange={(v) => setGenForm({ ...genForm, staffType: v })}
              >
                <option value="">All Staff</option>
                <option value="manager">Management Only</option>
                <option value="staff">Non-Management Staff</option>
              </FieldSelect>
              {genForm.staffType === "manager" &&
                managementGrades.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: "8px 10px",
                      background: "#EDE9FE",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#5B21B6",
                        marginBottom: 4,
                      }}
                    >
                      Management Grades:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {managementGrades.map((g) => (
                        <span
                          key={g.id}
                          style={{
                            background: "#7C3AED",
                            color: "#fff",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              <FieldHint>
                Grade-based split only applies to Management. All others use
                salary components directly.
              </FieldHint>
            </div>

            {/* Working Type */}
            <div>
              <FieldLabel>Working Type</FieldLabel>
              <FieldSelect
                value={genForm.workingType}
                onChange={(v) => setGenForm({ ...genForm, workingType: v })}
              >
                <option value="">All (Daily + Monthly)</option>
                <option value="Daily">Daily Rated</option>
                <option value="Monthly">Monthly Rated</option>
              </FieldSelect>
            </div>

            {/* PF Type */}
            <div>
              <FieldLabel>PF Type</FieldLabel>
              <FieldSelect
                value={genForm.pfType}
                onChange={(v) => setGenForm({ ...genForm, pfType: v })}
              >
                <option value="">All (PF + Non-PF)</option>
                <option value="pf">PF Employees</option>
                <option value="npf">Non-PF Employees</option>
              </FieldSelect>
            </div>

            {/* Department */}
            <div>
              <FieldLabel>Department(s)</FieldLabel>
              <MultiSelect
                options={departments.map((d) => ({
                  id: d.id,
                  name: d.departmentname,
                }))}
                value={genForm.departmentIds}
                onChange={(v) => setGenForm({ ...genForm, departmentIds: v })}
                placeholder="All Departments"
                disabled={!genForm.companyId}
              />
              <FieldHint>Empty = all departments.</FieldHint>
            </div>

            {/* Category */}
            <div>
              <FieldLabel>Category</FieldLabel>
              <MultiSelect
                options={categories}
                value={genForm.categoryIds}
                onChange={(v) => setGenForm({ ...genForm, categoryIds: v })}
                placeholder="All Categories"
                disabled={!genForm.companyId}
                labelKey="categoryName"
              />
              <FieldHint>Empty = all categories.</FieldHint>
            </div>

            {/* Employees */}
            <div className="col-span-2">
              <FieldLabel>Specific Employees</FieldLabel>
              <MultiSelect
                options={employees}
                value={genForm.employeeIds}
                onChange={(v) => setGenForm({ ...genForm, employeeIds: v })}
                placeholder="All active employees"
                disabled={!genForm.companyId}
                labelKey="firstName"
                displayBadge={(e) => e.firstName}
              />
              <FieldHint>
                Empty = all employees matching filters above.
              </FieldHint>
            </div>

            {/* Summary */}
            {(genForm.departmentIds.length > 0 ||
              genForm.categoryIds.length > 0 ||
              genForm.employeeIds.length > 0 ||
              genForm.employeeType ||
              genForm.workingType ||
              genForm.pfType) && (
                <div className="col-span-2">
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 12,
                      color: "#14532D",
                    }}
                  >
                    <strong>Will generate for:</strong>
                    {genForm.employeeType && (
                      <span>
                        {" "}
                        {genForm.employeeType}
                        {genForm.staffType ? ` (${genForm.staffType})` : ""}
                      </span>
                    )}
                    {genForm.workingType && (
                      <span> · {genForm.workingType} workers</span>
                    )}
                    {genForm.pfType && (
                      <span> · {genForm.pfType.toUpperCase()}</span>
                    )}
                    {genForm.departmentIds.length > 0 && (
                      <span> · {genForm.departmentIds.length} dept(s)</span>
                    )}
                    {genForm.categoryIds.length > 0 && (
                      <span> · {genForm.categoryIds.length} category(s)</span>
                    )}
                    {genForm.employeeIds.length > 0 && (
                      <span>
                        {" "}
                        · {genForm.employeeIds.length} specific employee(s)
                      </span>
                    )}
                    {genForm.useRange && genForm.fromDate && genForm.toDate && (
                      <span>
                        {" "}
                        · from {genForm.fromDate} to {genForm.toDate}
                      </span>
                    )}
                  </div>
                </div>
              )}
          </div>

          <div
            style={{
              borderTop: "1px solid #E2E8F0",
              marginTop: 20,
              paddingTop: 16,
            }}
            className="flex justify-end gap-3"
          >
            <button
              onClick={() => setGenerateOpen(false)}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !genForm.companyId}
              style={primaryBtnStyle}
            >
              {loading ? "⏳ Generating…" : "▶ Run Salary Generation"}
            </button>
          </div>
        </Modal>
      )}

      {/* DETAILS DIALOG */}
      {detailsOpen && salaryDetails && (
        <Modal
          title={`Payslip — ${salaryDetails.employee?.firstName}`}
          subtitle={`${monthLabel(salaryDetails.salaryMonth)} ${salaryDetails.salaryYear} · ${salaryDetails.employee?.employeeCode}`}
          onClose={() => setDetailsOpen(false)}
          wide
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              ["Calendar Days", salaryDetails.totalDays || "—"],
              ["Present", salaryDetails.presentDays],
              ["Absent", salaryDetails.absentDays],
              ["Paid Leave", salaryDetails.paidLeaveDays],
              ["Week Offs", salaryDetails.weekOffDays],
              ["NH/FH", salaryDetails.nhFhDays],
              ["OT Hrs", salaryDetails.overtimeHours || 0],
              ["Late", salaryDetails.lateCount || 0],
            ].map(([lbl, val]) => (
              <div
                key={lbl}
                style={{
                  background: "#F8FAFC",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#94A3B8",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  {lbl.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#1E293B",
                    marginTop: 2,
                  }}
                >
                  {val ?? 0}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            <TypeTags
              category={salaryDetails.empCategory}
              salaryType={salaryDetails.empSalaryType}
              pfType={salaryDetails.empPfType}
            />
            <StatusBadge status={salaryDetails.status} />
          </div>

          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: "#F1F5F9",
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
              }}
            >
              EARNINGS
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <th style={thStyle}>Component</th>
                  <th style={thStyle}>Type</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                  <th style={thStyle}>Formula</th>
                </tr>
              </thead>
              <tbody>
                {salaryDetails.details
                  ?.filter((d) => d.componentType === "Earning")
                  .map((d, i) => (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: i % 2 === 0 ? "#fff" : "#FAFBFC",
                      }}
                    >
                      <td style={tdStyle}>{d.componentName}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            background: "#D1FAE5",
                            color: "#065F46",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {d.calculationType}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#047857",
                        }}
                      >
                        {fmtDec(d.calculatedAmount)}
                      </td>
                      <td
                        style={{ ...tdStyle, fontSize: 11, color: "#94A3B8" }}
                      >
                        {d.formula || "—"}
                      </td>
                    </tr>
                  ))}
                <tr
                  style={{
                    background: "#F0FDF4",
                    borderTop: "2px solid #86EFAC",
                  }}
                >
                  <td
                    style={{ ...tdStyle, fontWeight: 800, color: "#047857" }}
                    colSpan={2}
                  >
                    Total Earnings
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 800,
                      color: "#047857",
                      fontSize: 15,
                    }}
                  >
                    {fmtDec(salaryDetails.totalEarnings)}
                  </td>
                  <td style={tdStyle} />
                </tr>
              </tbody>
            </table>
            <div
              style={{
                background: "#FEF2F2",
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                borderTop: "1px solid #E2E8F0",
              }}
            >
              DEDUCTIONS
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <tbody>
                {salaryDetails.details
                  ?.filter((d) => d.componentType === "Deduction")
                  .map((d, i) => (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: i % 2 === 0 ? "#fff" : "#FAFBFC",
                      }}
                    >
                      <td style={tdStyle}>{d.componentName}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            background: "#FEE2E2",
                            color: "#991B1B",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {d.calculationType}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#DC2626",
                        }}
                      >
                        {fmtDec(d.calculatedAmount)}
                      </td>
                      <td
                        style={{ ...tdStyle, fontSize: 11, color: "#94A3B8" }}
                      >
                        {d.formula || "—"}
                      </td>
                    </tr>
                  ))}
                <tr
                  style={{
                    background: "#FEF2F2",
                    borderTop: "2px solid #FCA5A5",
                  }}
                >
                  <td
                    style={{ ...tdStyle, fontWeight: 800, color: "#DC2626" }}
                    colSpan={2}
                  >
                    Total Deductions
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 800,
                      color: "#DC2626",
                      fontSize: 15,
                    }}
                  >
                    {fmtDec(salaryDetails.totalDeductions)}
                  </td>
                  <td style={tdStyle} />
                </tr>
              </tbody>
            </table>
            <div
              style={{
                background: "linear-gradient(135deg,#1E3A5F,#2563EB)",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  NET PAYABLE (ROUNDED TO ₹10)
                </div>
                <div style={{ color: "#fff", fontSize: 28, fontWeight: 900 }}>
                  {fmt(salaryDetails.netRounded || salaryDetails.netSalary)}
                </div>
              </div>
              <StatusBadge status={salaryDetails.status} />
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #E2E8F0",
              marginTop: 16,
              paddingTop: 14,
            }}
            className="flex justify-end"
          >
            <button
              onClick={() => setDetailsOpen(false)}
              style={cancelBtnStyle}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* PAY DIALOG */}
      {payOpen && selectedSalary && (
        <Modal
          title="Mark as Paid"
          subtitle={`${selectedSalary.employee?.firstName} — ${fmt(selectedSalary.netRounded || selectedSalary.netSalary)}`}
          onClose={() => setPayOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <FieldLabel>Payment Method *</FieldLabel>
              <FieldSelect
                value={payForm.paymentMethod}
                onChange={(v) => setPayForm({ ...payForm, paymentMethod: v })}
              >
                {["Bank Transfer", "Cash", "Cheque", "UPI", "Other"].map(
                  (m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ),
                )}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>Reference / UTR</FieldLabel>
              <input
                type="text"
                value={payForm.paymentReference}
                onChange={(e) =>
                  setPayForm({ ...payForm, paymentReference: e.target.value })
                }
                placeholder="e.g. UTR123456789"
                style={fieldStyle}
              />
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #E2E8F0",
              marginTop: 20,
              paddingTop: 16,
            }}
            className="flex justify-end gap-3"
          >
            <button onClick={() => setPayOpen(false)} style={cancelBtnStyle}>
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={loading}
              style={{
                ...primaryBtnStyle,
                background: "linear-gradient(135deg,#059669,#047857)",
              }}
            >
              {loading ? "⏳ Processing…" : "✓ Confirm Payment"}
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const Modal = ({ title, subtitle, onClose, children, wide }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 16,
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: wide ? 720 : 480,
        maxHeight: "92vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)",
          padding: "18px 24px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2
              style={{
                color: "#fff",
                fontSize: 17,
                fontWeight: 800,
                margin: 0,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  margin: "3px 0 0",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              color: "rgba(255,255,255,0.8)",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: "28px",
              textAlign: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div style={{ overflowY: "auto", padding: 24, flex: 1 }}>{children}</div>
    </div>
  </div>
);

const FilterSelect = ({ label, value, onChange, children }) => (
  <div>
    <label style={labelSty}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={fieldStyle}
    >
      {children}
    </select>
  </div>
);
const FieldLabel = ({ children }) => (
  <label
    style={{
      display: "block",
      fontSize: 12,
      fontWeight: 700,
      color: "#374151",
      marginBottom: 5,
    }}
  >
    {children}
  </label>
);
const FieldHint = ({ children }) => (
  <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{children}</p>
);
const FieldSelect = ({ value, onChange, disabled, children }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{ ...fieldStyle, opacity: disabled ? 0.5 : 1 }}
  >
    {children}
  </select>
);
const ActionBtn = ({ title, color, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 28,
      height: 28,
      border: `1.5px solid ${color}20`,
      borderRadius: 7,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color,
      background: `${color}10`,
      fontSize: 13,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = color;
      e.currentTarget.style.color = "#fff";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = `${color}10`;
      e.currentTarget.style.color = color;
    }}
  >
    {children}
  </button>
);

const labelSty = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#94A3B8",
  letterSpacing: "0.06em",
  marginBottom: 4,
  textTransform: "uppercase",
};
const fieldStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1.5px solid #E2E8F0",
  borderRadius: 8,
  fontSize: 13,
  color: "#1E293B",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};
const primaryBtnStyle = {
  padding: "9px 20px",
  background: "linear-gradient(135deg,#1E3A5F,#2563EB)",
  color: "#fff",
  border: "none",
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const cancelBtnStyle = {
  padding: "9px 20px",
  background: "#F1F5F9",
  color: "#475569",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const thStyle = {
  padding: "8px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};
const tdStyle = {
  padding: "9px 14px",
  color: "#374151",
  verticalAlign: "middle",
};

export default SalaryGenerationManagement;
