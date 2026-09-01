import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiRequest } from "../utils/apiCaller";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const CONFIG = {
  MIN_DAYS: 22,
  LOW_TIER_DAYS: 23,
  HIGH_TIER_DAYS: 24,
  MIN_COMBO_SHIFT_DAYS: 12,
  MALE_EXP_THRESHOLD: 3,
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const GRADE_LABELS = {
  MIXING: {
    label: "Mixing",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  OTHERS: {
    label: "Others",
    color: "bg-slate-100  text-slate-600  border-slate-200",
  },
  HOSTEL: {
    label: "Hostel",
    color: "bg-pink-100   text-pink-700   border-pink-200",
  },
  STAFF_MONTHLY: {
    label: "Staff Monthly",
    color: "bg-cyan-100   text-cyan-700   border-cyan-200",
  },
  MAISTRY: {
    label: "Maistry",
    color: "bg-yellow-100  text-yellow-700  border-yellow-200",
  },
  FITTER: {
    label: "Fitter",
    color: "bg-blue-100   text-blue-700   border-blue-200",
  },
  ELECTRICAL: {
    label: "Electrical",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  PLANT: {
    label: "Plant",
    color: "bg-teal-100    text-teal-700    border-teal-200",
  },
};

const TierBadge = ({ tier }) => {
  if (!tier) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${tier === "high"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700"
        }`}
    >
      {tier === "high" ? "★ High" : "Low"}
    </span>
  );
};

const GradePill = ({ gradeKey }) => {
  const info = GRADE_LABELS[gradeKey] || {
    label: (gradeKey || "Hostel").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "bg-pink-100 text-pink-700 border-pink-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${info.color}`}
    >
      {info.label}
    </span>
  );
};

const ShiftBreakdown = ({ breakdown }) => {
  if (!breakdown || !Object.keys(breakdown).length)
    return <span className="text-gray-400 text-xs">No data</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {Object.entries(breakdown).map(([shift, days]) => (
        <span
          key={shift}
          className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-1.5 py-0.5 rounded font-mono"
        >
          {shift}:{days}d
        </span>
      ))}
    </div>
  );
};

const DayAdjuster = ({ rawDays, adjustedDays, onChange }) => {
  const diff = adjustedDays - rawDays;
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, adjustedDays - 1))}
        className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm flex items-center justify-center transition"
      >
        −
      </button>
      <span
        className={`w-8 text-center font-bold text-sm tabular-nums ${adjustedDays < CONFIG.MIN_DAYS
          ? "text-red-500"
          : adjustedDays >= CONFIG.HIGH_TIER_DAYS
            ? "text-emerald-600"
            : "text-amber-600"
          }`}
      >
        {adjustedDays}
      </span>
      <button
        type="button"
        onClick={() => onChange(adjustedDays + 1)}
        className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 text-green-700 font-bold text-sm flex items-center justify-center transition"
      >
        +
      </button>
      {diff !== 0 && (
        <span
          className={`text-xs font-semibold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}
        >
          ({diff > 0 ? "+" : ""}
          {diff})
        </span>
      )}
    </div>
  );
};

const StatCard = ({ label, value, sub, colorClass }) => (
  <div className={`${colorClass} rounded-2xl p-4 shadow-sm`}>
    <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">
      {label}
    </p>
    <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
    {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
  </div>
);

// ─── Employee multi-select dropdown ──────────────────────────────────────────
const EmployeeSelector = ({ employees, selectedIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const filtered = employees.filter(
    (e) =>
      !search ||
      (e.employeeName || e.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.employeeCode || "").toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected =
    selectedIds.length === employees.length && employees.length > 0;
  const toggleAll = () =>
    onChange(isAllSelected ? [] : employees.map((e) => e.id));
  const toggle = (id) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );

  const label =
    selectedIds.length === 0 || isAllSelected
      ? "All employees"
      : `${selectedIds.length} employee${selectedIds.length > 1 ? "s" : ""} selected`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      >
        <span
          className={
            selectedIds.length === 0 || isAllSelected
              ? "text-slate-400"
              : "text-slate-800"
          }
        >
          {label}
        </span>
        <span className="text-slate-400 text-xs ml-2 shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code…"
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 select-none"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleAll}
          >
            <input
              type="checkbox"
              readOnly
              checked={isAllSelected}
              className="rounded pointer-events-none"
            />
            <span className="font-semibold text-slate-700">All employees</span>
            <span className="ml-auto text-xs text-slate-400">
              {employees.length} total
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer select-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(emp.id)}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selectedIds.includes(emp.id)}
                  className="rounded pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {emp.employeeName || emp.firstName}
                  </p>
                  <p className="text-xs text-slate-400">{emp.employeeCode}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">
                No employees found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HostelAttendanceIncentiveManagement() {
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [hostelEmployeesList, setHostelEmployeesList] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  const now = new Date();
  const [filters, setFilters] = useState({
    companyId: "",
    departmentId: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

  const [records, setRecords] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const [pending, setPending] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("calculate"); // "calculate" or "registration"

  // ---------------- REGISTRATION STATE ----------------
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [regRecords, setRegRecords] = useState([]);
  const [regEmployees, setRegEmployees] = useState([]);
  const [regFormData, setRegFormData] = useState({
    companyId: "",
    departmentId: "",
    employeeId: "",
    fromDate: "",
    toDate: "",
  });

  // Fetch Companies
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiRequest("/companies");
      const list = Array.isArray(data) ? data : data.companies || [];
      setCompanies(list);
      if (list.length > 0 && !filters.companyId) {
        setFilters((prev) => ({ ...prev, companyId: String(list[0].id) }));
      }
    } catch (e) {
      console.error("Error fetching companies:", e);
    }
  }, [filters.companyId]);

  // Fetch Departments
  const fetchDepartments = useCallback(async (companyId) => {
    if (!companyId) {
      setDepartments([]);
      return;
    }
    try {
      const data = await apiRequest(`/departments?companyId=${companyId}`);
      setDepartments(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error("Error fetching departments:", e);
      setDepartments([]);
    }
  }, []);

  // Fetch Hostel Employees for Selector
  const fetchHostelEmployees = useCallback(async (companyId, departmentId) => {
    if (!companyId) {
      setHostelEmployeesList([]);
      return;
    }
    setLoadingEmps(true);
    try {
      let url = `/employees?companyId=${companyId}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      const data = await apiRequest(url);
      const list = Array.isArray(data) ? data : data.employees || [];
      // Filter for hostel category
      const filtered = list.filter((emp) => {
        const catName = (emp.category?.categoryName || "").toUpperCase();
        return catName.includes("HOSTEL") || emp.isHostel === true;
      });
      setHostelEmployeesList(
        filtered.map((e) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          employeeName: e.firstName,
        }))
      );
    } catch (e) {
      console.error("Error fetching hostel employees:", e);
      setHostelEmployeesList([]);
    } finally {
      setLoadingEmps(false);
    }
  }, []);

  // Fetch Hostel Calculation Records
  const fetchCalculations = useCallback(async () => {
    if (!filters.companyId || !filters.month || !filters.year) return;
    setLoading(true);
    setError(null);
    try {
      let url = `/hostel-attendance-incentives/calculations?companyId=${filters.companyId}&month=${filters.month}&year=${filters.year}`;
      if (filters.departmentId) url += `&departmentId=${filters.departmentId}`;
      if (selectedEmployeeIds.length > 0) {
        url += `&employeeIds=${selectedEmployeeIds.join(",")}`;
      }

      const res = await apiRequest(url);
      if (res && res.success) {
        setRecords(res.records || []);
        setAdjustments({});
      }
    } catch (err) {
      console.error("Error fetching hostel calculations:", err);
      setError(err.message || "Failed to load hostel calculations");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filters.companyId, filters.departmentId, filters.month, filters.year, selectedEmployeeIds]);

  // Fetch Registration Records
  const fetchRegRecords = useCallback(async () => {
    try {
      const res = await apiRequest("/hostel-attendance-incentives");
      setRegRecords(res.records || []);
    } catch (e) {
      console.error("Error fetching registration records:", e);
      setRegRecords([]);
    }
  }, []);

  const fetchRegEmployees = useCallback(async (companyId, departmentId) => {
    if (!companyId) {
      setRegEmployees([]);
      return;
    }
    try {
      let url = `/employees?companyId=${companyId}`;
      if (departmentId) url += `&departmentId=${departmentId}`;
      const data = await apiRequest(url);
      setRegEmployees(Array.isArray(data) ? data : data.employees || []);
    } catch (e) {
      console.error("Error fetching reg employees:", e);
      setRegEmployees([]);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (filters.companyId) {
      fetchDepartments(filters.companyId);
      fetchHostelEmployees(filters.companyId, filters.departmentId);
    }
  }, [filters.companyId, filters.departmentId, fetchDepartments, fetchHostelEmployees]);

  useEffect(() => {
    if (activeTab === "calculate" && filters.companyId) {
      fetchCalculations();
    } else if (activeTab === "registration") {
      fetchRegRecords();
    }
  }, [activeTab, filters.companyId, filters.departmentId, filters.month, filters.year, fetchCalculations, fetchRegRecords]);

  // ---------------- DAY ADJUSTMENT & RECALCULATION ----------------
  const handleAdjust = (empId, newAdjustedDays) => {
    setAdjustments((prev) => ({ ...prev, [empId]: newAdjustedDays }));
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === empId) {
          const effective88Days = r.eightEightDays || 0;
          const eightEightPay = effective88Days * 100;
          const remainingDays = Math.max(0, newAdjustedDays - effective88Days);

          const minDays = 22;
          const highTierDays = 24;
          const isEligible = newAdjustedDays >= minDays;
          const tier = isEligible ? (newAdjustedDays >= highTierDays ? "high" : "low") : null;
          const ratePerDay = isEligible ? (tier === "high" ? 20 : 15) : 0;
          const regularIncentive = isEligible ? Math.round(remainingDays * ratePerDay * 100) / 100 : 0;
          const totalIncentive = Math.round((eightEightPay + regularIncentive) * 100) / 100;

          return {
            ...r,
            adjustedDays: newAdjustedDays,
            remainingDays,
            tier,
            ratePerDay,
            regularIncentive,
            incentive: totalIncentive,
            note:
              effective88Days > 0 && regularIncentive > 0
                ? `8-8 Days: ${effective88Days}d × ₹100 = ₹${eightEightPay} + Regular: ${remainingDays}d × ₹${ratePerDay} = ₹${regularIncentive}`
                : effective88Days > 0
                  ? `8-8 Days: ${effective88Days}d × ₹100 = ₹${eightEightPay}`
                  : regularIncentive > 0
                    ? `Regular: ${remainingDays}d × ₹${ratePerDay} = ₹${regularIncentive}`
                    : `Below minimum ${minDays} days – no incentive`,
          };
        }
        return r;
      })
    );
  };

  const handleRecalculate = async (emp) => {
    setPending((p) => ({ ...p, [emp.id]: true }));
    try {
      const adjusted = adjustments[emp.id] !== undefined ? adjustments[emp.id] : emp.adjustedDays;
      const res = await apiRequest("/hostel-attendance-incentives/calculate", {
        method: "POST",
        body: JSON.stringify({
          employeeId: emp.id,
          companyId: filters.companyId,
          month: filters.month,
          year: filters.year,
          adjustedDays: adjusted,
          rawDays: emp.rawDays,
          slabDays: emp.slabDays,
          eightEightDays: emp.eightEightDays,
        }),
      });

      if (res && res.success) {
        setRecords((prev) =>
          prev.map((r) => (r.id === emp.id ? { ...r, ...res.calculation } : r))
        );
        setAdjustments((p) => {
          const next = { ...p };
          delete next[emp.id];
          return next;
        });
      }
    } catch (e) {
      console.error("Error recalculating employee:", e);
    } finally {
      setPending((p) => ({ ...p, [emp.id]: false }));
    }
  };

  const handleRecalculateAll = async () => {
    for (const emp of records.filter((r) => adjustments[r.id] !== undefined)) {
      await handleRecalculate(emp);
    }
    setSuccess("Adjusted records recalculated successfully.");
  };

  // ---------------- SAVE ALL ----------------
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = records.map((r) => ({
        employeeId: r.id,
        departmentId: r.departmentId || null,
        categoryId: r.categoryId || null,
        shiftTypeId: r.shiftTypeId || null,
        adjustedDays: r.adjustedDays,
        slabDays: r.slabDays || 0,
        eightEightDays: r.eightEightDays || 0,
        incentive: r.incentive,
        ratePerDay: r.ratePerDay,
        shiftKey: r.shiftKey,
        shiftLabel: r.shiftLabel,
        tier: r.tier,
      }));

      await apiRequest("/hostel-attendance-incentives/bulk-save", {
        method: "POST",
        body: JSON.stringify({
          records: payload,
          month: filters.month,
          year: filters.year,
          companyId: filters.companyId,
        }),
      });

      setSuccess("All Hostel Attendance Incentives saved successfully.");
      fetchCalculations();
    } catch (e) {
      setError(e.message || "Failed to save incentives");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- FILTERED RECORDS ----------------
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!tableSearch) return true;
      const q = tableSearch.toLowerCase();
      return (
        r.employeeName?.toLowerCase().includes(q) ||
        r.employeeCode?.toLowerCase().includes(q) ||
        r.departmentName?.toLowerCase().includes(q) ||
        r.categoryName?.toLowerCase().includes(q)
      );
    });
  }, [records, tableSearch]);

  // Statistics
  const totalIncentive = records.reduce((s, r) => s + (r.incentive || 0), 0);
  const total88Days = records.reduce((s, r) => s + (r.eightEightDays || 0), 0);
  const total88Pay = records.reduce((s, r) => s + (r.eightEightPay || 0), 0);
  const totalRegularPay = records.reduce((s, r) => s + (r.regularIncentive || 0), 0);
  const eligible = records.filter((r) => (r.incentive || 0) > 0).length;
  const notEligible = records.length - eligible;
  const hasAdjustments = Object.keys(adjustments).length > 0;

  const categoryBreakdown = records.reduce((acc, r) => {
    if (r.categoryName) acc[r.categoryName] = (acc[r.categoryName] || 0) + 1;
    return acc;
  }, {});

  // ---------------- EXCEL EXPORT ----------------
  const handleExportExcel = () => {
    if (!records || records.length === 0) {
      alert("No hostel incentive records to export.");
      return;
    }

    const currentCompany = companies.find((c) => String(c.id) === String(filters.companyId));
    const compName = currentCompany ? currentCompany.companyName || currentCompany.name : "Company";
    const monthName = MONTHS[parseInt(filters.month, 10) - 1] || filters.month;
    const yearVal = filters.year;

    const dataToExport = filteredRecords.length > 0 ? filteredRecords : records;

    // Create worksheet data starting with Title info
    const titleRows = [
      [compName],
      [`Hostel Attendance Incentive Report (${monthName} ${yearVal})`],
      ["Rule: 8-8 Entry Days @ Rs. 100/day | Remaining Days based on Hostel Conditions"],
      [`Generated on: ${new Date().toLocaleString("en-IN")}`],
      [], // Empty spacing row
    ];

    const headers = [
      "Sl.No",
      "Employee Code",
      "Employee Name",
      "Department",
      "Category",
      "Grade",
      "Shifts Breakdown",
      "Shift Applied",
      "8-8 Days",
      "8-8 Pay (INR)",
      "Remaining Days",
      "Raw Days",
      "Adjusted Days",
      "Tier",
      "Rate Per Day (INR)",
      "Regular Pay (INR)",
      "Total Incentive (INR)",
      "Remarks / Notes",
    ];

    const dataRows = dataToExport.map((r, idx) => {
      const shiftStr =
        r.shiftBreakdown && typeof r.shiftBreakdown === "object"
          ? Object.entries(r.shiftBreakdown)
            .map(([k, v]) => `${k}:${v}d`)
            .join(", ")
          : "";

      return [
        idx + 1,
        r.employeeCode || "",
        r.employeeName || "",
        r.departmentName || "",
        r.categoryName || "HOSTEL",
        "Hostel",
        shiftStr,
        r.shiftLabel || r.shiftKey || "",
        r.eightEightDays || 0,
        r.eightEightPay || 0,
        r.remainingDays !== undefined ? r.remainingDays : 0,
        r.rawDays || 0,
        r.adjustedDays !== undefined ? r.adjustedDays : (r.rawDays || 0),
        r.tier ? (r.tier === "high" ? "High" : "Low") : (r.regularIncentive > 0 ? "Eligible" : "—"),
        r.ratePerDay || 0,
        r.regularIncentive || 0,
        r.incentive || 0,
        r.note || (r.incentive === 0 ? "Not eligible" : "Eligible"),
      ];
    });

    const sumIncentive = dataToExport.reduce((s, r) => s + (parseFloat(r.incentive) || 0), 0);
    const sum88 = dataToExport.reduce((s, r) => s + (r.eightEightDays || 0), 0);
    const sum88Pay = dataToExport.reduce((s, r) => s + (r.eightEightPay || 0), 0);
    const sumReg = dataToExport.reduce((s, r) => s + (r.regularIncentive || 0), 0);
    const sumEligible = dataToExport.filter((r) => (parseFloat(r.incentive) || 0) > 0).length;

    const summaryRows = [
      [], // Empty separator
      [
        "Total Employees",
        dataToExport.length,
        "Total 8-8 Days",
        sum88,
        "Total 8-8 Pay",
        sum88Pay,
        "Total Regular Pay",
        sumReg,
        "Total Incentive",
        sumIncentive,
        "Eligible Employees",
        sumEligible,
      ],
    ];

    const worksheetData = [...titleRows, headers, ...dataRows, ...summaryRows];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Merge title cells
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 17 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 17 } },
    ];

    // Auto-fit column widths
    const colWidths = headers.map((header, i) => {
      let max = header.length;
      dataRows.forEach((row) => {
        const valStr = String(row[i] || "");
        if (valStr.length > max) max = valStr.length;
      });
      return { wch: Math.min(Math.max(max + 3, 10), 35) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hostel Incentive");

    XLSX.writeFile(wb, `Hostel_Attendance_Incentive_Report_${monthName}_${yearVal}.xlsx`);
  };

  // ---------------- CSV EXPORT ----------------
  const handleExportCSV = () => {
    if (!records || records.length === 0) {
      alert("No hostel incentive records to export.");
      return;
    }

    const currentCompany = companies.find((c) => String(c.id) === String(filters.companyId));
    const compName = currentCompany ? currentCompany.companyName || currentCompany.name : "Company";
    const monthName = MONTHS[parseInt(filters.month, 10) - 1] || filters.month;
    const yearVal = filters.year;

    const dataToExport = filteredRecords.length > 0 ? filteredRecords : records;

    const headers = [
      "Sl.No",
      "Employee Code",
      "Employee Name",
      "Department",
      "Category",
      "Grade",
      "Shifts Breakdown",
      "Shift Applied",
      "8-8 Days",
      "8-8 Pay (INR)",
      "Remaining Days",
      "Raw Days",
      "Adjusted Days",
      "Tier",
      "Rate Per Day (INR)",
      "Regular Pay (INR)",
      "Total Incentive (INR)",
      "Remarks / Notes"
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = dataToExport.map((r, idx) => {
      const shiftStr =
        r.shiftBreakdown && typeof r.shiftBreakdown === "object"
          ? Object.entries(r.shiftBreakdown)
            .map(([k, v]) => `${k}:${v}d`)
            .join(" ")
          : "";

      return [
        idx + 1,
        escapeCsv(r.employeeCode),
        escapeCsv(r.employeeName),
        escapeCsv(r.departmentName || ""),
        escapeCsv(r.categoryName || "HOSTEL"),
        "Hostel",
        escapeCsv(shiftStr),
        escapeCsv(r.shiftLabel || r.shiftKey || ""),
        r.eightEightDays || 0,
        r.eightEightPay || 0,
        r.remainingDays !== undefined ? r.remainingDays : 0,
        r.rawDays || 0,
        r.adjustedDays !== undefined ? r.adjustedDays : (r.rawDays || 0),
        escapeCsv(r.tier ? (r.tier === "high" ? "High" : "Low") : (r.regularIncentive > 0 ? "Eligible" : "—")),
        r.ratePerDay || 0,
        r.regularIncentive || 0,
        r.incentive || 0,
        escapeCsv(r.note || (r.incentive === 0 ? "Not eligible" : "Eligible")),
      ].join(",");
    });

    const sumIncentive = dataToExport.reduce((s, r) => s + (parseFloat(r.incentive) || 0), 0);
    const sum88 = dataToExport.reduce((s, r) => s + (r.eightEightDays || 0), 0);
    const sum88Pay = dataToExport.reduce((s, r) => s + (r.eightEightPay || 0), 0);
    const sumReg = dataToExport.reduce((s, r) => s + (r.regularIncentive || 0), 0);
    const sumEligible = dataToExport.filter((r) => (parseFloat(r.incentive) || 0) > 0).length;

    const summaryRows = [
      "",
      `"TOTAL EMPLOYEES: ${dataToExport.length}","","","","","","","TOTAL 8-8 DAYS: ${sum88}","TOTAL 8-8 PAY: INR",${sum88Pay},"","","","TOTAL REGULAR PAY: INR",${sumReg},"TOTAL INCENTIVE: INR",${sumIncentive},"ELIGIBLE EMPLOYEES: ${sumEligible}"`
    ];

    const csvContent = [
      `"${compName} - Hostel Attendance Incentive Report (${monthName} ${yearVal})"`,
      `"Generated on: ${new Date().toLocaleString()}"`,
      "",
      headers.join(","),
      ...rows,
      ...summaryRows
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Hostel_Attendance_Incentive_Report_${monthName}_${yearVal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---------------- PDF EXPORT ----------------
  const handleExportPDF = () => {
    if (!records || records.length === 0) {
      alert("No hostel incentive records to export.");
      return;
    }

    const currentCompany = companies.find((c) => String(c.id) === String(filters.companyId));
    const compName = currentCompany ? currentCompany.companyName || currentCompany.name : "Company";
    const monthName = MONTHS[parseInt(filters.month, 10) - 1] || filters.month;
    const yearVal = filters.year;

    const dataToExport = filteredRecords.length > 0 ? filteredRecords : records;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Top Header Banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageW, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(compName, 14, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`HOSTEL ATTENDANCE INCENTIVE REPORT  |  Period: ${monthName} ${yearVal}`, 14, 15);

    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageW - 14, 15, { align: "right" });

    // Summary Statistics Cards
    const sumIncentive = dataToExport.reduce((s, r) => s + (parseFloat(r.incentive) || 0), 0);
    const sumEligible = dataToExport.filter((r) => (parseFloat(r.incentive) || 0) > 0).length;
    const sumIneligible = dataToExport.length - sumEligible;
    const sum88Days = dataToExport.reduce((s, r) => s + (r.eightEightDays || 0), 0);
    const sum88Pay = dataToExport.reduce((s, r) => s + (r.eightEightPay || 0), 0);
    const sumRegPay = dataToExport.reduce((s, r) => s + (r.regularIncentive || 0), 0);

    doc.setFillColor(241, 245, 249); // Slate-100
    doc.roundedRect(14, 24, pageW - 28, 14, 2, 2, "F");

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Hostel Employees: ${dataToExport.length}`, 20, 32);
    doc.setTextColor(190, 24, 93); // Pink
    doc.text(`8-8 Days: ${sum88Days} (Rs. ${sum88Pay.toLocaleString("en-IN")})`, 85, 32);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`Eligible: ${sumEligible}`, 155, 32);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(`Total Incentive: Rs. ${sumIncentive.toLocaleString("en-IN")}`, 205, 32);
    doc.setTextColor(124, 58, 237); // Violet
    doc.text(`Regular: Rs. ${sumRegPay.toLocaleString("en-IN")}`, pageW - 20, 32, { align: "right" });

    // Table rows
    const tableRows = dataToExport.map((r, idx) => {
      const shiftStr =
        r.shiftBreakdown && typeof r.shiftBreakdown === "object"
          ? Object.entries(r.shiftBreakdown)
            .map(([k, v]) => `${k}:${v}d`)
            .join(" ")
          : "—";

      return [
        idx + 1,
        r.employeeCode || "—",
        r.employeeName || "—",
        r.departmentName || "—",
        r.categoryName || "HOSTEL",
        "Hostel",
        shiftStr,
        r.shiftLabel || "I Shift only",
        r.eightEightDays ? `${r.eightEightDays}d` : "0",
        r.eightEightPay ? `Rs.${r.eightEightPay}` : "0",
        r.remainingDays !== undefined ? r.remainingDays : 0,
        r.adjustedDays !== undefined ? r.adjustedDays : (r.rawDays || 0),
        r.tier ? (r.tier === "high" ? "High" : "Low") : "—",
        r.ratePerDay ? `Rs.${r.ratePerDay}` : "—",
        r.regularIncentive ? `Rs.${r.regularIncentive}` : "0",
        `Rs. ${r.incentive || 0}`,
        r.note || "—",
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [
        [
          "#",
          "Code",
          "Employee",
          "Dept",
          "Category",
          "Grade",
          "Shifts",
          "Shift Applied",
          "8-8",
          "8-8 Pay",
          "Rem.",
          "Days",
          "Tier",
          "Rate",
          "Reg.Pay",
          "Incentive",
          "Remarks",
        ],
      ],
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: "middle",
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 14, halign: "center", font: "courier" },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 12 },
        6: { cellWidth: 20, font: "courier", fontSize: 6.5 },
        7: { cellWidth: 20 },
        8: { cellWidth: 10, halign: "center" },
        9: { cellWidth: 14, halign: "right" },
        10: { cellWidth: 10, halign: "center" },
        11: { cellWidth: 10, halign: "center" },
        12: { cellWidth: 10, halign: "center" },
        13: { cellWidth: 12, halign: "right" },
        14: { cellWidth: 14, halign: "right" },
        15: { cellWidth: 18, halign: "right", fontStyle: "bold" },
        16: { cellWidth: 26 },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const r = dataToExport[data.row.index];
          if (!r || r.incentive === 0) {
            data.cell.styles.textColor = [156, 163, 175];
          }
          if (data.column.index === 8 && r && r.eightEightDays > 0) {
            data.cell.styles.textColor = [190, 24, 93];
          }
          if (data.column.index === 15 && r && r.incentive > 0) {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      foot: [
        [
          "",
          "",
          `Total: ${dataToExport.length} emps`,
          "",
          "",
          "",
          "",
          "",
          `${sum88Days}d`,
          `Rs.${sum88Pay.toLocaleString("en-IN")}`,
          "",
          "",
          `Eligible: ${sumEligible}`,
          "",
          `Rs.${sumRegPay.toLocaleString("en-IN")}`,
          `Rs. ${sumIncentive.toLocaleString("en-IN")}`,
          "",
        ],
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 8,
        halign: "right",
      },
      margin: { left: 14, right: 14, bottom: 15 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageW / 2, pageH - 8, { align: "center" });
      },
    });

    doc.save(`Hostel_Attendance_Incentive_Report_${monthName}_${yearVal}.pdf`);
  };


  // ---------------- REGISTRATION CRUD HANDLERS ----------------
  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (
        !regFormData.companyId ||
        !regFormData.departmentId ||
        !regFormData.employeeId ||
        !regFormData.fromDate ||
        !regFormData.toDate
      ) {
        setError("Please fill all required fields in the registration form.");
        setSaving(false);
        return;
      }

      const url = editId
        ? `/hostel-attendance-incentives/${editId}`
        : `/hostel-attendance-incentives`;

      const method = editId ? "PUT" : "POST";
      await apiRequest(url, {
        method,
        body: JSON.stringify(regFormData),
      });

      alert(editId ? "Updated successfully ✅" : "Created successfully ✅");
      setRegFormData({
        companyId: "",
        departmentId: "",
        employeeId: "",
        fromDate: "",
        toDate: "",
      });
      setShowForm(false);
      setEditId(null);
      fetchRegRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegEdit = (record) => {
    setShowForm(true);
    setEditId(record.id);
    setRegFormData({
      companyId: record.companyId,
      departmentId: record.departmentId,
      employeeId: record.employeeId,
      fromDate: record.fromDate,
      toDate: record.toDate,
    });
    fetchDepartments(record.companyId);
    fetchRegEmployees(record.companyId, record.departmentId);
  };

  const handleRegDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this hostel record?")) return;
    try {
      await apiRequest(`/hostel-attendance-incentives/${id}`, { method: "DELETE" });
      alert("Deleted successfully 🗑️");
      fetchRegRecords();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
              className="text-3xl text-slate-800"
            >
              Hostel Attendance Incentive
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Calculate & manage hostel employee incentives (8-8 entry days @ ₹100/day + conditional remaining days)
            </p>
          </div>

          {activeTab === "calculate" && records.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5 active:scale-95"
                title="Download report as CSV"
              >
                <span>📥</span> Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5 active:scale-95"
                title="Download report as PDF"
              >
                <span>📄</span> Export PDF
              </button>
              {hasAdjustments && (
                <button
                  type="button"
                  onClick={handleRecalculateAll}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
                >
                  <span>⟳</span> Recalculate Adjusted ({Object.keys(adjustments).length})
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? "Saving…" : "💾 Save All"}
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 mb-6 bg-slate-50/50 p-1 rounded-xl w-fit gap-1 border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("calculate");
              setError(null);
              setSuccess(null);
            }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "calculate"
              ? "bg-white text-blue-600 shadow-sm border border-slate-100"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
          >
            📊 Incentive Calculation
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("registration");
              setError(null);
              setSuccess(null);
            }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "registration"
              ? "bg-white text-blue-600 shadow-sm border border-slate-100"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
          >
            📋 Hostel Employee Registrations
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: INCENTIVE CALCULATION */}
        {activeTab === "calculate" && (
          <>
            {/* Filter Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Filters
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Company */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Company <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={filters.companyId}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, companyId: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Department
                  </label>
                  <select
                    value={filters.departmentId || ""}
                    disabled={!filters.companyId}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, departmentId: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.departmentname || dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employees */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Employees
                    {loadingEmps && (
                      <span className="ml-1 text-indigo-400 text-xs">loading…</span>
                    )}
                  </label>
                  {hostelEmployeesList.length > 0 ? (
                    <EmployeeSelector
                      employees={hostelEmployeesList}
                      selectedIds={selectedEmployeeIds}
                      onChange={setSelectedEmployeeIds}
                    />
                  ) : (
                    <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 bg-slate-50">
                      {filters.companyId
                        ? loadingEmps
                          ? "Loading…"
                          : "No hostel employees"
                        : "Select company first"}
                    </div>
                  )}
                </div>

                {/* Month */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Month <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={filters.month}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, month: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Year <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={filters.year}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, year: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bottom bar inside Filter Card */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {records.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Search by name, code, dept…"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition border border-emerald-200 flex items-center gap-1 shadow-sm"
                      title="Download Excel"
                    >
                      <span>📥</span> Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition border border-rose-200 flex items-center gap-1 shadow-sm"
                      title="Download PDF"
                    >
                      <span>📄</span> PDF
                    </button>
                  </div>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={fetchCalculations}
                  disabled={!filters.companyId || loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 shadow-sm"
                >
                  {loading ? "Loading…" : "Fetch Records"}
                </button>
              </div>
            </div>

            {/* Stat Cards & Category Breakdown */}
            {records.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <StatCard
                    label="Hostel Employees"
                    value={records.length}
                    sub={`${eligible} eligible`}
                    colorClass="bg-slate-800 text-white"
                  />
                  <StatCard
                    label="8-8 Entry Days"
                    value={`${total88Days} d`}
                    sub={`Pay: ₹${total88Pay.toLocaleString("en-IN")}`}
                    colorClass="bg-pink-700 text-white"
                  />
                  <StatCard
                    label="Regular Incentive"
                    value={`₹${totalRegularPay.toLocaleString("en-IN")}`}
                    sub="Remaining worked days"
                    colorClass="bg-blue-600 text-white"
                  />
                  <StatCard
                    label="Total Incentive"
                    value={`₹${totalIncentive.toLocaleString("en-IN")}`}
                    sub="8-8 Pay + Regular Pay"
                    colorClass="bg-indigo-600 text-white"
                  />
                  <StatCard
                    label="Avg per Eligible"
                    value={
                      eligible
                        ? `₹${Math.round(totalIncentive / eligible).toLocaleString("en-IN")}`
                        : "—"
                    }
                    colorClass="bg-emerald-600 text-white"
                  />
                </div>

                {Object.keys(categoryBreakdown).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-slate-500 self-center">
                      Category split:
                    </span>
                    {Object.entries(categoryBreakdown).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-pink-50 text-pink-700 border-pink-200"
                      >
                        {cat} <span className="opacity-60">× {count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <svg
                    className="animate-spin w-6 h-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
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
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Loading records…
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <svg
                    className="w-10 h-10 mb-2 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-sm">Select filters and click Fetch Records</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                        {[
                          "#",
                          "Code",
                          "Employee",
                          "Dept",
                          "Category",
                          "Grade",
                          "Shifts",
                          "Shift Applied",
                          "Raw Days",
                          "Week Off",
                          "Slab Days",
                          "OT Days",
                          "8-8 Days",
                          "8-8 Pay",
                          "Rem. Days",
                          "Adjusted Days",
                          "Tier",
                          "Rate/Day",
                          "Reg. Pay",
                          "Incentive",
                          "Action",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-4 text-left text-sm font-semibold tracking-wider whitespace-nowrap bg-slate-800 sticky top-0 z-20"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((rec, idx) => {
                        const currentAdj =
                          adjustments[rec.id] !== undefined
                            ? adjustments[rec.id]
                            : rec.adjustedDays;
                        const isDirty = adjustments[rec.id] !== undefined;
                        const noIncentive = rec.incentive === 0;

                        return (
                          <tr
                            key={rec.id}
                            className={`border-b border-slate-50 transition ${isDirty
                              ? "bg-amber-50"
                              : noIncentive
                                ? "bg-red-50/30"
                                : "hover:bg-slate-50/60"
                              }`}
                          >
                            <td className="px-3 py-3 text-slate-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-600">
                              {rec.employeeCode}
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-slate-800 whitespace-nowrap">
                                {rec.employeeName}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                {rec.gender}
                                {rec.isSaved && (
                                  <span className="bg-teal-100 text-teal-600 px-1 rounded text-xs font-semibold">
                                    Saved
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                              {rec.departmentName || "—"}
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap font-medium">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                                {rec.categoryName || "HOSTEL"}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <GradePill gradeKey="HOSTEL" />
                            </td>
                            <td className="px-3 py-3">
                              <ShiftBreakdown breakdown={rec.shiftBreakdown} />
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                              {rec.shiftLabel || "—"}
                            </td>

                            <td className="px-3 py-3 text-center font-mono text-slate-600">
                              {rec.rawDays}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-red-500 font-semibold">
                              {rec.weekOffDays ? `-${rec.weekOffDays}d` : "0"}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-indigo-600 font-semibold">
                              {rec.slabDays ? `+${rec.slabDays}d` : "0"}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-amber-600 font-semibold">
                              {rec.otDays ? `+${rec.otDays}d` : "0"}
                            </td>

                            {/* 8-8 Days */}
                            <td className="px-3 py-3 text-center font-mono">
                              {rec.eightEightDays > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-pink-100 text-pink-800 text-xs border border-pink-200">
                                  {rec.eightEightDays}d
                                </span>
                              ) : (
                                <span className="text-slate-300">0</span>
                              )}
                            </td>

                            {/* 8-8 Pay */}
                            <td className="px-3 py-3 font-mono text-xs text-pink-700 font-semibold">
                              {rec.eightEightPay ? `₹${rec.eightEightPay}` : "—"}
                            </td>

                            {/* Remaining Days */}
                            <td className="px-3 py-3 text-center font-mono text-slate-600 text-xs">
                              {rec.remainingDays !== undefined ? rec.remainingDays : 0}d
                            </td>

                            {/* Adjusted Days */}
                            <td className="px-3 py-3">
                              <DayAdjuster
                                rawDays={rec.rawDays}
                                adjustedDays={currentAdj}
                                onChange={(v) => handleAdjust(rec.id, v)}
                              />
                            </td>

                            {/* Tier */}
                            <td className="px-3 py-3">
                              <TierBadge tier={rec.tier} />
                            </td>

                            {/* Rate/Day */}
                            <td className="px-3 py-3 font-mono text-xs text-slate-700">
                              {rec.ratePerDay ? `₹${rec.ratePerDay}` : "—"}
                            </td>

                            {/* Regular Pay */}
                            <td className="px-3 py-3 font-mono text-xs text-blue-700 font-semibold">
                              ₹{rec.regularIncentive || 0}
                            </td>

                            {/* Incentive */}
                            <td className="px-3 py-3">
                              {noIncentive ? (
                                <span className="text-red-400 text-xs font-semibold">
                                  No Incentive
                                </span>
                              ) : (
                                <div>
                                  <span className="font-bold text-emerald-700 font-mono text-sm">
                                    ₹{rec.incentive.toLocaleString("en-IN")}
                                  </span>
                                  {rec.eightEightDays > 0 && rec.regularIncentive > 0 && (
                                    <div className="text-[11px] text-slate-500 font-medium font-mono">
                                      (8-8: ₹{rec.eightEightPay} + Reg: ₹{rec.regularIncentive})
                                    </div>
                                  )}
                                </div>
                              )}
                              {rec.note && (
                                <div className="text-xs text-orange-500 mt-0.5 max-w-[180px] leading-tight">
                                  {rec.note}
                                </div>
                              )}
                            </td>

                            {/* Action */}
                            <td className="px-3 py-3">
                              {isDirty && (
                                <button
                                  type="button"
                                  onClick={() => handleRecalculate(rec)}
                                  disabled={pending[rec.id]}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap"
                                >
                                  {pending[rec.id] ? "…" : "Calculate"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredRecords.length > 0 && (
                      <tfoot className="sticky bottom-0 z-20 bg-slate-100 shadow-sm border-t-2 border-slate-300">
                        <tr className="bg-slate-100">
                          <td
                            colSpan={12}
                            className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right bg-slate-100"
                          >
                            Total ({filteredRecords.length} employees)
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-pink-700 text-xs bg-slate-100">
                            {filteredRecords.reduce((s, r) => s + (r.eightEightDays || 0), 0)}d
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-pink-700 text-xs bg-slate-100">
                            ₹{filteredRecords.reduce((s, r) => s + (r.eightEightPay || 0), 0).toLocaleString("en-IN")}
                          </td>
                          <td colSpan={4} className="bg-slate-100" />
                          <td className="px-3 py-3 font-bold text-blue-700 font-mono text-sm whitespace-nowrap bg-slate-100">
                            ₹{filteredRecords.reduce((s, r) => s + (r.regularIncentive || 0), 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-3 font-bold text-emerald-700 font-mono text-sm whitespace-nowrap bg-slate-100">
                            ₹{filteredRecords.reduce((s, r) => s + (r.incentive || 0), 0).toLocaleString("en-IN")}
                          </td>
                          <td className="bg-slate-100" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: HOSTEL REGISTRATIONS */}
        {activeTab === "registration" && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Hostel Employee Registrations
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage hostel allocation and residency records
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(!showForm);
                    setEditId(null);
                    setRegFormData({
                      companyId: "",
                      departmentId: "",
                      employeeId: "",
                      fromDate: "",
                      toDate: "",
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition shadow-sm"
                >
                  {showForm ? "Close Form ✖" : "+ Add Hostel Allocation"}
                </button>
              </div>

              {/* Form */}
              {showForm && (
                <form
                  onSubmit={handleRegSubmit}
                  className="border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50/50"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Company <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="companyId"
                      value={regFormData.companyId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setRegFormData((prev) => ({
                          ...prev,
                          companyId: cid,
                          departmentId: "",
                          employeeId: "",
                        }));
                        fetchDepartments(cid);
                        fetchRegEmployees(cid, "");
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="">Select Company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName || c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Department <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="departmentId"
                      value={regFormData.departmentId}
                      onChange={(e) => {
                        const did = e.target.value;
                        setRegFormData((prev) => ({
                          ...prev,
                          departmentId: did,
                          employeeId: "",
                        }));
                        fetchRegEmployees(regFormData.companyId, did);
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      disabled={!regFormData.companyId}
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.departmentname || d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Employee <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="employeeId"
                      value={regFormData.employeeId}
                      onChange={(e) =>
                        setRegFormData((prev) => ({
                          ...prev,
                          employeeId: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      disabled={!regFormData.companyId}
                    >
                      <option value="">Select Employee</option>
                      {regEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} ({emp.employeeCode || emp.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      From Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="fromDate"
                      value={regFormData.fromDate}
                      onChange={(e) =>
                        setRegFormData((prev) => ({
                          ...prev,
                          fromDate: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      To Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="toDate"
                      value={regFormData.toDate}
                      onChange={(e) =>
                        setRegFormData((prev) => ({
                          ...prev,
                          toDate: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition disabled:opacity-50"
                    >
                      {saving ? "Saving…" : editId ? "Update Allocation" : "Save Allocation"}
                    </button>
                  </div>
                </form>
              )}

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">From Date</th>
                      <th className="p-3">To Date</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regRecords.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center p-8 text-slate-400">
                          No hostel allocation records found.
                        </td>
                      </tr>
                    ) : (
                      regRecords.map((r, index) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="p-3 text-center text-slate-400 text-xs">{index + 1}</td>
                          <td className="p-3 font-medium text-slate-700">
                            {r.company?.name || r.company?.companyName || "—"}
                          </td>
                          <td className="p-3 text-slate-600">
                            {r.department?.departmentname || r.department?.name || "—"}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{r.employee?.firstName}</span>
                            <span className="text-xs text-slate-400 ml-1 font-mono">
                              ({r.employee?.employeeCode})
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-600">{r.fromDate}</td>
                          <td className="p-3 font-mono text-xs text-slate-600">{r.toDate}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRegEdit(r)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-xs font-semibold transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegDelete(r.id)}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-semibold transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
