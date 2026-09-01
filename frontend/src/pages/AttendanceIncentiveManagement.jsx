import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "../utils/apiCaller";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CONFIG = {
  MIN_DAYS: 22,
  LOW_TIER_DAYS: 23,
  HIGH_TIER_DAYS: 24,
  MIN_COMBO_SHIFT_DAYS: 12,
  MALE_EXP_THRESHOLD: 3,
};

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
    label: (gradeKey || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "bg-slate-100 text-slate-600 border-slate-200"
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
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase()),
  );

  const isAllSelected =
    selectedIds.length === employees.length && employees.length > 0;
  const toggleAll = () =>
    onChange(isAllSelected ? [] : employees.map((e) => e.id));
  const toggle = (id) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
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
                    {emp.employeeName}
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
export default function AttendanceIncentiveManagement() {
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({
    companyId: "",
    categoryId: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  });
  const [categories, setCategories] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const [pending, setPending] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [activeTab, setActiveTab] = useState("calculate"); // "calculate" or "manual"
  const [manualCategoryId, setManualCategoryId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualShiftId, setManualShiftId] = useState("");
  const [manualRecords, setManualRecords] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [bulkDays, setBulkDays] = useState("");
  const [bulkSlabDays, setBulkSlabDays] = useState("");
  const [bulkOtDays, setBulkOtDays] = useState("");
  const [bulk8to8, setBulk8to8] = useState("");
  const [shiftTypes, setShiftTypes] = useState([]);

  // ── Packaging Incentive State ─────────────────────────────────────────────
  const [pkgDeptId, setPkgDeptId] = useState("");
  const [pkgDate, setPkgDate] = useState(new Date().toISOString().split("T")[0]);
  const [pkgShiftId, setPkgShiftId] = useState("");
  const [pkgRecords, setPkgRecords] = useState([]);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [bulkBags, setBulkBags] = useState("");
  const [bulkPkgRate, setBulkPkgRate] = useState("1.00");
  const [pkgDepartments, setPkgDepartments] = useState([]);

  const [conditionCategories, setConditionCategories] = useState([]);
  const [conditionDepartments, setConditionDepartments] = useState([]);

  useEffect(() => {
    if (!filters.companyId) {
      setShiftTypes([]);
      setPkgDepartments([]);
      setConditionCategories([]);
      setConditionDepartments([]);
      return;
    }
    apiRequest(`/shift-types?companyId=${filters.companyId}`)
      .then((d) => {
        const list = Array.isArray(d) ? d : d.data || d.shiftTypes || [];
        const filtered = list.filter((st) => !(st.name || st.code || "").toUpperCase().includes("GENERAL"));
        setShiftTypes(filtered);
      })
      .catch((e) => console.error("Error fetching shift types:", e));

    apiRequest(`/departments?companyId=${filters.companyId}`)
      .then((d) => {
        const list = Array.isArray(d) ? d : d.data || [];
        const packingDepts = list.filter((dept) =>
          (dept.departmentname || dept.name || "").toUpperCase().includes("PACK")
        );
        setPkgDepartments(packingDepts.length ? packingDepts : list);
        setConditionDepartments(list);
      })
      .catch((e) => console.error("Error fetching departments:", e));

    apiRequest(`/categories?companyId=${filters.companyId}`)
      .then((d) => {
        setConditionCategories(Array.isArray(d) ? d : d.data || []);
      })
      .catch((e) => console.error("Error fetching categories:", e));
  }, [filters.companyId]);

  const handleBulkPkgChange = (value) => {
    setBulkBags(value);
    const numBags = parseInt(value, 10) || 0;
    const rate = parseFloat(bulkPkgRate) || 1.0;
    setPkgRecords((prev) =>
      prev.map((r) => {
        if (r.selected) {
          const bags = numBags;
          const threshold = r.minBagsThreshold || 45;
          const incentiveAmount = bags >= threshold ? bags * (r.ratePerBag || rate) : 0;
          return { ...r, bagsPacked: bags, incentiveAmount };
        }
        return r;
      })
    );
  };

  const handlePkgRowSelectToggle = (empId) => {
    setPkgRecords((prev) =>
      prev.map((r) => {
        if (r.employeeId === empId) {
          const nextSelected = !r.selected;
          let bags = r.bagsPacked;
          if (nextSelected && bulkBags !== "") {
            bags = parseInt(bulkBags, 10) || 0;
          }
          const rate = parseFloat(r.ratePerBag) || 1.0;
          const threshold = r.minBagsThreshold || 45;
          const incentiveAmount = bags >= threshold ? bags * rate : 0;
          return {
            ...r,
            selected: nextSelected,
            bagsPacked: bags,
            incentiveAmount,
          };
        }
        return r;
      })
    );
  };

  const handlePkgSelectAll = (checkAll) => {
    const numBags = bulkBags !== "" ? (parseInt(bulkBags, 10) || 0) : null;
    setPkgRecords((prev) =>
      prev.map((r) => {
        let bags = r.bagsPacked;
        if (checkAll && numBags !== null) {
          bags = numBags;
        }
        const rate = parseFloat(r.ratePerBag) || 1.0;
        const threshold = r.minBagsThreshold || 45;
        const incentiveAmount = bags >= threshold ? bags * rate : 0;
        return {
          ...r,
          selected: checkAll,
          bagsPacked: bags,
          incentiveAmount,
        };
      })
    );
  };

  const handlePkgFieldChange = (empId, field, value) => {
    setPkgRecords((prev) =>
      prev.map((r) => {
        if (r.employeeId === empId) {
          const updated = { ...r, [field]: value };
          if (field === "bagsPacked" || field === "ratePerBag") {
            const bags = parseInt(field === "bagsPacked" ? value : updated.bagsPacked, 10) || 0;
            const rate = parseFloat(field === "ratePerBag" ? value : updated.ratePerBag) || 1.0;
            const threshold = updated.minBagsThreshold || 45;
            updated.incentiveAmount = bags >= threshold ? bags * rate : 0;
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleLoadPackaging = async () => {
    if (!filters.companyId || !pkgDate) {
      setError("Please select Company and Entry Date.");
      return;
    }
    setPkgLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const q = new URLSearchParams({
        companyId: filters.companyId,
        entryDate: pkgDate,
      });
      if (pkgDeptId) q.set("departmentId", pkgDeptId);
      if (pkgShiftId) q.set("shiftTypeId", pkgShiftId);

      const res = await apiRequest(`/attendance-incentives/packaging-entries?${q}`);
      setPkgRecords(res.records || []);
      if (!res.records || res.records.length === 0) {
        setError("No active packing workers found for the selected company/date.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPkgLoading(false);
    }
  };

  const handleSavePackaging = async () => {
    if (!filters.companyId || !pkgDate) {
      setError("Company and Entry Date are required.");
      return;
    }
    setPkgLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/attendance-incentives/packaging-entries", {
        method: "POST",
        body: JSON.stringify({
          companyId: filters.companyId,
          departmentId: pkgDeptId || null,
          entryDate: pkgDate,
          shiftTypeId: pkgShiftId || null,
          records: pkgRecords,
        }),
      });
      setSuccess("Packaging incentive entries saved successfully.");

      const q = new URLSearchParams({
        companyId: filters.companyId,
        entryDate: pkgDate,
      });
      if (pkgDeptId) q.set("departmentId", pkgDeptId);
      if (pkgShiftId) q.set("shiftTypeId", pkgShiftId);

      const res = await apiRequest(`/attendance-incentives/packaging-entries?${q}`);
      setPkgRecords(res.records || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setPkgLoading(false);
    }
  };

  const handleCancelPackaging = () => {
    setPkgRecords([]);
    setBulkBags("");
    setError(null);
    setSuccess(null);
  };

  const handleBulkChange = (field, value) => {
    if (field === "days") setBulkDays(value);
    else if (field === "slabDays") setBulkSlabDays(value);
    else if (field === "otDays") setBulkOtDays(value);
    else if (field === "slot") setBulk8to8(value);

    setManualRecords((prev) =>
      prev.map((r) => {
        if (r.selected) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleRowSelectToggle = (empId) => {
    setManualRecords((prev) =>
      prev.map((r) => {
        if (r.employeeId === empId) {
          const nextSelected = !r.selected;
          return {
            ...r,
            selected: nextSelected,
            ...(nextSelected && {
              days: bulkDays !== "" ? bulkDays : r.days,
              slabDays: bulkSlabDays !== "" ? bulkSlabDays : r.slabDays,
              otDays: bulkOtDays !== "" ? bulkOtDays : r.otDays,
              slot: bulk8to8 !== "" ? bulk8to8 : r.slot,
            }),
          };
        }
        return r;
      })
    );
  };

  const handleManualSelectAll = (checkAll) => {
    setManualRecords((prev) =>
      prev.map((r) => {
        const isMatch =
          !manualSearch ||
          (r.employeeName || "").toLowerCase().includes(manualSearch.toLowerCase()) ||
          (r.employeeCode || "").toLowerCase().includes(manualSearch.toLowerCase());

        if (!isMatch) return r;

        return {
          ...r,
          selected: checkAll,
          ...(checkAll && {
            days: bulkDays !== "" ? bulkDays : r.days,
            slabDays: bulkSlabDays !== "" ? bulkSlabDays : r.slabDays,
            otDays: bulkOtDays !== "" ? bulkOtDays : r.otDays,
            slot: bulk8to8 !== "" ? bulk8to8 : r.slot,
          }),
        };
      })
    );
  };

  const handleRowValueChange = (empId, field, value) => {
    setManualRecords((prev) =>
      prev.map((r) => {
        if (r.employeeId === empId) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleSaveManual = async () => {
    if (!filters.companyId || !manualCategoryId || !manualDate) {
      setError("Company, Category and Entry Date are required.");
      return;
    }
    setManualLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/attendance-incentives/daily-entries", {
        method: "POST",
        body: JSON.stringify({
          companyId: filters.companyId,
          categoryId: manualCategoryId,
          entryDate: manualDate,
          shiftTypeId: manualShiftId || null,
          records: manualRecords,
        }),
      });
      setSuccess("Daily incentive manual entries saved successfully.");

      const res = await apiRequest(`/attendance-incentives/daily-entries?companyId=${filters.companyId}&categoryId=${manualCategoryId}&entryDate=${manualDate}&shiftTypeId=${manualShiftId}`);
      setManualRecords(res.records || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setManualLoading(false);
    }
  };

  const handleCancelManual = () => {
    setManualRecords([]);
    setBulkDays("");
    setBulkSlabDays("");
    setBulkOtDays("");
    setBulk8to8("");
    setError(null);
    setSuccess(null);
  };

  // ─── Conditions State ────────────────────────────────────────────────────────
  const [conditions, setConditions] = useState([]);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [conditionSearch, setConditionSearch] = useState("");
  const [conditionFilterGrade, setConditionFilterGrade] = useState("ALL");
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [globalDefaults, setGlobalDefaults] = useState({
    minDays: 22,
    lowTierDays: 23,
    highTierDays: 24,
    minComboShiftDays: 12,
    maleExpThreshold: 3,
  });
  const [conditionForm, setConditionForm] = useState({
    gradeKey: "MIXING",
    gradeName: "Mixing",
    shiftRuleKey: "SHIFT_I",
    shiftLabel: "Day Shift Only",
    minDays: 22,
    lowTierDays: 23,
    lowTierRate: 15,
    highTierDays: 24,
    highTierRate: 20,
    minComboDays: 12,
    maleExpOverride: false,
    maleExpThreshold: 3,
    remarks: "",
  });
  const [conditionCombos, setConditionCombos] = useState([]);

  const fetchConditions = useCallback(async () => {
    setConditionsLoading(true);
    try {
      const q = filters.companyId ? `?companyId=${filters.companyId}` : "";
      const res = await apiRequest(`/attendance-incentives/conditions${q}`);
      if (res && res.conditions) {
        setConditions(res.conditions);
        if (res.globalDefaults) setGlobalDefaults(res.globalDefaults);
      }
    } catch (e) {
      console.error("Error fetching conditions:", e);
    } finally {
      setConditionsLoading(false);
    }
  }, [filters.companyId]);

  useEffect(() => {
    if (activeTab === "conditions") {
      fetchConditions();
    }
  }, [activeTab, fetchConditions]);

  const parseShiftRuleKeyToCombos = (ruleKey, minComboDays) => {
    if (!ruleKey) {
      return [{ id: String(Math.random()), I: { enabled: false, minDays: "" }, II: { enabled: false, minDays: "" }, III: { enabled: false, minDays: "" } }];
    }

    if (ruleKey.startsWith("[") || ruleKey.startsWith("{")) {
      try {
        const parsed = JSON.parse(ruleKey);
        if (Array.isArray(parsed)) {
          return parsed.map((combo) => ({
            id: String(Math.random()),
            I: { enabled: combo.hasOwnProperty("I"), minDays: combo.hasOwnProperty("I") ? String(combo.I) : "" },
            II: { enabled: combo.hasOwnProperty("II"), minDays: combo.hasOwnProperty("II") ? String(combo.II) : "" },
            III: { enabled: combo.hasOwnProperty("III"), minDays: combo.hasOwnProperty("III") ? String(combo.III) : "" },
          }));
        }
      } catch (e) {
        console.error("Error parsing ruleKey JSON:", e);
      }
    }

    const fallbackMin = minComboDays ? String(minComboDays) : "12";
    const combo = {
      id: String(Math.random()),
      I: { enabled: false, minDays: "" },
      II: { enabled: false, minDays: "" },
      III: { enabled: false, minDays: "" },
    };

    const upper = ruleKey.toUpperCase();
    if (upper.includes("ALL_SHIFTS") || upper.includes("ANY")) {
      combo.I = { enabled: true, minDays: fallbackMin };
      combo.II = { enabled: true, minDays: fallbackMin };
      combo.III = { enabled: true, minDays: fallbackMin };
    } else {
      if (upper.includes("SHIFT_I") || upper.includes("_I_") || upper.startsWith("I_")) {
        combo.I = { enabled: true, minDays: fallbackMin };
      }
      if (upper.includes("SHIFT_II") || upper.includes("_II") || upper.includes("II_")) {
        combo.II = { enabled: true, minDays: fallbackMin };
      }
      if (upper.includes("SHIFT_III") || upper.includes("_III")) {
        combo.III = { enabled: true, minDays: fallbackMin };
      }
    }

    if (!combo.I.enabled && !combo.II.enabled && !combo.III.enabled) {
      combo.I = { enabled: true, minDays: "" };
    }

    return [combo];
  };

  const serializeCombosToRuleKeyAndLabel = (combos) => {
    const activeCombos = [];
    const labelParts = [];

    for (const c of combos) {
      const activeCombo = {};
      const comboLabelParts = [];

      if (c.I.enabled) {
        const min = c.I.minDays ? parseInt(c.I.minDays, 10) : 1;
        activeCombo["I"] = min;
        comboLabelParts.push(`I >= ${min}d`);
      }
      if (c.II.enabled) {
        const min = c.II.minDays ? parseInt(c.II.minDays, 10) : 1;
        activeCombo["II"] = min;
        comboLabelParts.push(`II >= ${min}d`);
      }
      if (c.III.enabled) {
        const min = c.III.minDays ? parseInt(c.III.minDays, 10) : 1;
        activeCombo["III"] = min;
        comboLabelParts.push(`III >= ${min}d`);
      }

      if (Object.keys(activeCombo).length > 0) {
        activeCombos.push(activeCombo);
        labelParts.push(`(${comboLabelParts.join(" & ")})`);
      }
    }

    return {
      shiftRuleKey: JSON.stringify(activeCombos),
      shiftLabel: labelParts.join(" or ") || "No Shift Combo Configured",
    };
  };

  const handleAddConditionCombo = () => {
    setConditionCombos((prev) => [
      ...prev,
      {
        id: String(Math.random()),
        I: { enabled: false, minDays: "" },
        II: { enabled: false, minDays: "" },
        III: { enabled: false, minDays: "" },
      },
    ]);
  };

  const handleRemoveConditionCombo = (id) => {
    setConditionCombos((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleComboShift = (comboId, shiftType, isChecked) => {
    setConditionCombos((prev) =>
      prev.map((c) => {
        if (c.id === comboId) {
          return {
            ...c,
            [shiftType]: {
              enabled: isChecked,
              minDays: isChecked ? "12" : "",
            },
          };
        }
        return c;
      })
    );
  };

  const handleComboShiftMinDaysChange = (comboId, shiftType, value) => {
    setConditionCombos((prev) =>
      prev.map((c) => {
        if (c.id === comboId) {
          return {
            ...c,
            [shiftType]: {
              ...c[shiftType],
              minDays: value,
            },
          };
        }
        return c;
      })
    );
  };

  const handleOpenAddCondition = () => {
    setEditingCondition(null);
    setConditionForm({
      categoryId: "",
      departmentId: "",
      shiftTypeId: "",
      gender: "ALL",
      gradeKey: "MIXING",
      gradeName: "Mixing",
      shiftRuleKey: "SHIFT_I",
      shiftLabel: "Day Shift Only",
      minDays: 22,
      lowTierDays: 23,
      lowTierRate: 15,
      highTierDays: 24,
      highTierRate: 20,
      minComboDays: 12,
      maleExpOverride: false,
      maleExpThreshold: 3,
      remarks: "",
    });
    setConditionCombos([{
      id: "default",
      I: { enabled: true, minDays: "12" },
      II: { enabled: false, minDays: "" },
      III: { enabled: false, minDays: "" },
    }]);
    setShowConditionModal(true);
  };

  const handleOpenEditCondition = (cond) => {
    setEditingCondition(cond);
    setConditionForm({
      categoryId: cond.categoryId || "",
      departmentId: cond.departmentId || "",
      shiftTypeId: cond.shiftTypeId || "",
      gender: cond.gender || "ALL",
      gradeKey: cond.gradeKey,
      gradeName: cond.gradeName || cond.gradeKey,
      shiftRuleKey: cond.shiftRuleKey,
      shiftLabel: cond.shiftLabel,
      minDays: cond.minDays ?? 22,
      lowTierDays: cond.lowTierDays ?? 23,
      lowTierRate: cond.lowTierRate ?? 0,
      highTierDays: cond.highTierDays ?? 24,
      highTierRate: cond.highTierRate ?? 0,
      minComboDays: cond.minComboDays ?? 12,
      maleExpOverride: !!cond.maleExpOverride,
      maleExpThreshold: cond.maleExpThreshold ?? 3,
      remarks: cond.remarks || "",
    });
    setConditionCombos(parseShiftRuleKeyToCombos(cond.shiftRuleKey, cond.minComboDays));
    setShowConditionModal(true);
  };

  const handleSaveConditionSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { shiftRuleKey, shiftLabel } = serializeCombosToRuleKeyAndLabel(conditionCombos);
    if (!shiftRuleKey || shiftRuleKey === "[]") {
      setError("Please configure at least one active shift combination rule.");
      return;
    }

    if (!conditionForm.categoryId && !conditionForm.departmentId) {
      setError("Please select at least a Category or a Department.");
      return;
    }

    try {
      const payload = {
        ...conditionForm,
        shiftRuleKey,
        shiftLabel,
        companyId: filters.companyId || null,
      };

      if (editingCondition) {
        await apiRequest(`/attendance-incentives/conditions/${editingCondition.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Condition updated successfully.");
      } else {
        await apiRequest("/attendance-incentives/conditions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Condition added successfully.");
      }
      setShowConditionModal(false);
      fetchConditions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCondition = async (id) => {
    if (!window.confirm("Are you sure you want to delete this incentive condition rule?")) return;
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`/attendance-incentives/conditions/${id}`, {
        method: "DELETE",
      });
      setSuccess("Condition deleted successfully.");
      fetchConditions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetConditions = async () => {
    if (!window.confirm("Reset all incentive condition rules to factory defaults? Any custom modifications will be replaced.")) return;
    setError(null);
    setSuccess(null);
    try {
      await apiRequest("/attendance-incentives/conditions/reset", {
        method: "POST",
        body: JSON.stringify({ companyId: filters.companyId || null }),
      });
      setSuccess("Incentive conditions reset to factory defaults.");
      fetchConditions();
    } catch (err) {
      setError(err.message);
    }
  };

  const months = [
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
  const years = Array.from({ length: 5 }, (_, i) =>
    String(new Date().getFullYear() - i),
  );

  useEffect(() => {
    apiRequest("/companies")
      .then((d) => {
        const list = Array.isArray(d) ? d : d.companies || [];
        setCompanies(list);
        if (list.length > 0 && !filters.companyId) {
          setFilters((p) => ({ ...p, companyId: String(list[0].id) }));
        }
      })
      .catch((e) => setError(e.message));
  }, [filters.companyId]);

  useEffect(() => {
    if (!filters.companyId) return;
    setCategories([]);
    setAllEmployees([]);
    setRecords([]);
    setAdjustments({});
    setSelectedEmployeeIds([]);
    setManualCategoryId("");
    setManualRecords([]);
    setFilters((p) => ({ ...p, categoryId: "" }));
    apiRequest(`/categories?companyId=${filters.companyId}`)
      .then((d) => {
        const list = Array.isArray(d) ? d : d.data || [];
        const filtered = list.filter((c) => !(c.categoryName || c.name || "").toUpperCase().includes("STAFF"));
        setCategories(filtered);
      })
      .catch((e) => setError(e.message));
  }, [filters.companyId]);

  useEffect(() => {
    if (!filters.companyId) return;
    setLoadingEmps(true);
    setAllEmployees([]);
    setSelectedEmployeeIds([]);
    setRecords([]);
    const q = new URLSearchParams({
      companyId: filters.companyId,
      status: "Active",
    });
    if (filters.categoryId) q.set("categoryId", filters.categoryId);
    apiRequest(`/employees?${q}`)
      .then((d) => {
        const list = (Array.isArray(d) ? d : d.employees || []).map((e) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          employeeName: e.firstName,
        }));
        setAllEmployees(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingEmps(false));
  }, [filters.companyId, filters.categoryId]);

  const fetchRecords = useCallback(async () => {
    if (!filters.companyId || !filters.month || !filters.year) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setAdjustments({});
    try {
      const q = new URLSearchParams({
        companyId: filters.companyId,
        month: filters.month,
        year: filters.year,
      });
      if (filters.categoryId) q.set("categoryId", filters.categoryId);
      const isAll =
        selectedEmployeeIds.length === 0 ||
        selectedEmployeeIds.length === allEmployees.length;
      if (!isAll) q.set("employeeIds", selectedEmployeeIds.join(","));
      const data = await apiRequest(`/attendance-incentives?${q}`);
      setRecords(data.records || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedEmployeeIds, allEmployees.length]);

  const handleAdjust = (empId, newDays) =>
    setAdjustments((p) => ({ ...p, [empId]: newDays }));

  const handleRecalculate = async (emp) => {
    const adjDays =
      adjustments[emp.id] !== undefined
        ? adjustments[emp.id]
        : emp.adjustedDays;
    setPending((p) => ({ ...p, [emp.id]: true }));
    try {
      const slabDays = emp.slabDays || (adjDays > emp.rawDays ? adjDays - emp.rawDays : 0);
      const result = await apiRequest("/attendance-incentives/calculate", {
        method: "POST",
        body: JSON.stringify({
          employeeId: emp.id,
          companyId: filters.companyId,
          month: filters.month,
          year: filters.year,
          adjustedDays: adjDays,
          rawDays: emp.rawDays,
          slabDays,
        }),
      });
      const updatedRecord = {
        employeeId: emp.id,
        departmentId: emp.departmentId || null,
        categoryId: emp.categoryId || null,
        rawDays: result.rawDays ?? emp.rawDays,
        payableDays: result.payableDays ?? emp.rawDays,
        slabDays: result.slabDays ?? slabDays,
        adjustedDays: result.adjustedDays,
        incentive: result.incentive,
        ratePerDay: result.ratePerDay,
        shiftKey: result.shiftKey,
        shiftLabel: result.shiftLabel,
        tier: result.tier,
        maleOverrideApplied: result.maleOverrideApplied,
        shiftTypeId: emp.shiftTypeId || null,
      };
      setRecords((prev) =>
        prev.map((r) =>
          r.id === emp.id
            ? {
              ...r,
              rawDays: result.rawDays ?? emp.rawDays,
              payableDays: result.payableDays ?? emp.rawDays,
              slabDays: result.slabDays ?? slabDays,
              adjustedDays: result.adjustedDays,
              incentive: result.incentive,
              ratePerDay: result.ratePerDay,
              shiftKey: result.shiftKey,
              shiftLabel: result.shiftLabel,
              tier: result.tier,
              gradeKey: result.gradeKey,
              maleOverrideApplied: result.maleOverrideApplied,
              note: result.note,
            }
            : r,
        ),
      );
      setAdjustments((p) => {
        const n = { ...p };
        delete n[emp.id];
        return n;
      });
      await apiRequest("/attendance-incentives/save-one", {
        method: "POST",
        body: JSON.stringify({
          companyId: filters.companyId,
          month: filters.month,
          year: filters.year,
          record: updatedRecord,
        }),
      });
    } catch (e) {
      setError(`Recalculate failed for ${emp.employeeName}: ${e.message}`);
    } finally {
      setPending((p) => ({ ...p, [emp.id]: false }));
    }
  };

  const handleRecalculateAll = async () => {
    for (const emp of records.filter((r) => adjustments[r.id] !== undefined))
      await handleRecalculate(emp);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = records.map((r) => ({
        employeeId: r.id,
        departmentId: r.departmentId || null,
        categoryId: r.categoryId || null,
        shiftTypeId: r.shiftTypeId || null,
        adjustedDays: r.adjustedDays,
        incentive: r.incentive,
        ratePerDay: r.ratePerDay,
        shiftKey: r.shiftKey,
        shiftLabel: r.shiftLabel,
        tier: r.tier,
        maleOverrideApplied: r.maleOverrideApplied || false,
      }));
      await apiRequest("/attendance-incentives/bulk-save", {
        method: "POST",
        body: JSON.stringify({
          records: payload,
          month: filters.month,
          year: filters.year,
          companyId: filters.companyId,
        }),
      });
      setSuccess("All incentives saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!records || records.length === 0) {
      alert("No incentive records to export.");
      return;
    }

    const currentCompany = companies.find((c) => String(c.id) === String(filters.companyId));
    const compName = currentCompany ? currentCompany.companyName || currentCompany.name : "Company";
    const monthName = months[parseInt(filters.month, 10) - 1] || filters.month;
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
      "Raw Days",
      "Adjusted Days",
      "Tier",
      "Rate Per Day (INR)",
      "Incentive Amount (INR)",
      "Remarks / Notes"
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = dataToExport.map((r, idx) => {
      const shiftStr = r.shifts && typeof r.shifts === "object"
        ? Object.entries(r.shifts).map(([k, v]) => `${k}:${v}d`).join(", ")
        : (r.shiftKey || "");

      return [
        idx + 1,
        escapeCsv(r.employeeCode),
        escapeCsv(r.employeeName),
        escapeCsv(r.departmentName || r.department || ""),
        escapeCsv(r.categoryName || r.category || ""),
        escapeCsv(r.gradeKey || ""),
        escapeCsv(shiftStr),
        escapeCsv(r.shiftLabel || r.shiftKey || ""),
        r.rawDays !== undefined ? r.rawDays : (r.payableDays || 0),
        r.adjustedDays !== undefined ? r.adjustedDays : (r.totalDays || 0),
        escapeCsv(r.tier ? (r.tier === "high" ? "High" : "Low") : (r.incentive > 0 ? "Eligible" : "—")),
        r.ratePerDay || 0,
        r.incentive || 0,
        escapeCsv(r.note || (r.incentive === 0 ? "Not eligible" : "Eligible"))
      ].join(",");
    });

    const sumIncentive = dataToExport.reduce((s, r) => s + (parseFloat(r.incentive) || 0), 0);
    const sumEligible = dataToExport.filter((r) => (parseFloat(r.incentive) || 0) > 0).length;

    const summaryRows = [
      "",
      `"TOTAL EMPLOYEES: ${dataToExport.length}","","","","","","","","","","ELIGIBLE: ${sumEligible}","TOTAL INCENTIVE: INR",${sumIncentive},""`
    ];

    const csvContent = [
      `"${compName} - Attendance Incentive Report (${monthName} ${yearVal})"`,
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
    link.setAttribute("download", `Attendance_Incentive_Report_${monthName}_${yearVal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!records || records.length === 0) {
      alert("No incentive records to export.");
      return;
    }

    const currentCompany = companies.find((c) => String(c.id) === String(filters.companyId));
    const compName = currentCompany ? currentCompany.companyName || currentCompany.name : "Company";
    const monthName = months[parseInt(filters.month, 10) - 1] || filters.month;
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
    doc.text(`ATTENDANCE INCENTIVE REPORT  |  Period: ${monthName} ${yearVal}`, 14, 15);

    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageW - 14, 15, { align: "right" });

    // Summary Statistics Cards
    const sumIncentive = dataToExport.reduce((s, r) => s + (parseFloat(r.incentive) || 0), 0);
    const sumEligible = dataToExport.filter((r) => (parseFloat(r.incentive) || 0) > 0).length;
    const sumIneligible = dataToExport.length - sumEligible;
    const avgIncentive = sumEligible ? Math.round(sumIncentive / sumEligible) : 0;

    doc.setFillColor(241, 245, 249); // Slate-100
    doc.roundedRect(14, 24, pageW - 28, 14, 2, 2, "F");

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Employees: ${dataToExport.length}`, 20, 32);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`Eligible: ${sumEligible}`, 85, 32);
    doc.setTextColor(239, 68, 68); // Red
    doc.text(`Ineligible: ${sumIneligible}`, 140, 32);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(`Total Incentive: Rs. ${sumIncentive.toLocaleString("en-IN")}`, 195, 32);
    doc.setTextColor(124, 58, 237); // Violet
    doc.text(`Avg/Eligible: Rs. ${avgIncentive.toLocaleString("en-IN")}`, pageW - 20, 32, { align: "right" });

    // Table rows
    const tableRows = dataToExport.map((r, idx) => {
      const shiftStr = r.shifts && typeof r.shifts === "object"
        ? Object.entries(r.shifts).map(([k, v]) => `${k}:${v}d`).join(" ")
        : (r.shiftKey || "—");

      return [
        idx + 1,
        r.employeeCode || "—",
        r.employeeName || "—",
        r.departmentName || r.department || "—",
        r.categoryName || r.category || "—",
        r.gradeKey || "—",
        shiftStr,
        r.shiftLabel || r.shiftKey || "—",
        r.rawDays !== undefined ? String(r.rawDays) : "0",
        r.adjustedDays !== undefined ? String(r.adjustedDays) : "0",
        r.tier ? (r.tier === "high" ? "High" : "Low") : "—",
        r.ratePerDay ? `Rs. ${r.ratePerDay}` : "—",
        r.incentive ? `Rs. ${Number(r.incentive).toLocaleString("en-IN")}` : "0",
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [[
        "#",
        "Code",
        "Employee Name",
        "Dept",
        "Category",
        "Grade",
        "Shifts",
        "Shift Applied",
        "Raw",
        "Adj Days",
        "Tier",
        "Rate/Day",
        "Incentive"
      ]],
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 16, halign: "center", font: "courier" },
        2: { cellWidth: 42 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 20 },
        6: { cellWidth: 26, font: "courier" },
        7: { cellWidth: 28 },
        8: { cellWidth: 13, halign: "center" },
        9: { cellWidth: 15, halign: "center" },
        10: { cellWidth: 15, halign: "center" },
        11: { cellWidth: 18, halign: "right" },
        12: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const r = dataToExport[data.row.index];
          if (!r || r.incentive === 0) {
            data.cell.styles.textColor = [156, 163, 175];
          }
          if (data.column.index === 12 && r && r.incentive > 0) {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
      foot: [[
        "",
        "",
        `Total: ${dataToExport.length} emps`,
        "",
        "",
        "",
        "",
        "",
        "",
        `Eligible: ${sumEligible}`,
        "",
        "Total Incentive:",
        `Rs. ${sumIncentive.toLocaleString("en-IN")}`
      ]],
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
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          pageW / 2,
          pageH - 8,
          { align: "center" }
        );
      },
    });

    doc.save(`Attendance_Incentive_Report_${monthName}_${yearVal}.pdf`);
  };

  const filteredRecords = records.filter(
    (r) =>
      !tableSearch ||
      r.employeeName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(tableSearch.toLowerCase()),
  );
  const filteredManualRecords = manualRecords.filter(
    (r) =>
      !manualSearch ||
      r.employeeName.toLowerCase().includes(manualSearch.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(manualSearch.toLowerCase()),
  );
  const totalIncentive = records.reduce((s, r) => s + (r.incentive || 0), 0);
  const eligible = records.filter((r) => r.incentive > 0).length;
  const notEligible = records.length - eligible;
  const hasAdjustments = Object.keys(adjustments).length > 0;
  const gradeBreakdown = records.reduce((acc, r) => {
    if (r.gradeKey) acc[r.gradeKey] = (acc[r.gradeKey] || 0) + 1;
    return acc;
  }, {});
  const categoryBreakdown = records.reduce((acc, r) => {
    if (r.categoryName) acc[r.categoryName] = (acc[r.categoryName] || 0) + 1;
    return acc;
  }, {});

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
              Attendance Incentive
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Calculate & manage employee incentives
            </p>
          </div>
          {activeTab === "calculate" && records.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5 active:scale-95"
                title="Download report as CSV"
              >
                <span>📥</span> Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5 active:scale-95"
                title="Download report as PDF"
              >
                <span>📄</span> Export PDF
              </button>
              {hasAdjustments && (
                <button
                  onClick={handleRecalculateAll}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
                >
                  <span>⟳</span> Recalculate Adjusted (
                  {Object.keys(adjustments).length})
                </button>
              )}
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? "Saving…" : "💾 Save All"}
              </button>
            </div>
          )}
        </div>

        <div className="flex border-b border-slate-100 mb-6 bg-slate-50/50 p-1 rounded-xl w-fit gap-1 border">
          <button
            onClick={() => { setActiveTab("calculate"); setError(null); setSuccess(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "calculate"
                ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
          >
            📊 Incentive Calculation
          </button>
          <button
            onClick={() => { setActiveTab("manual"); setError(null); setSuccess(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "manual"
                ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
          >
            ✏️ Manual Incentive Entry
          </button>
          <button
            onClick={() => { setActiveTab("packaging"); setError(null); setSuccess(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "packaging"
                ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
          >
            📦 Packaging Incentive
          </button>
          <button
            onClick={() => { setActiveTab("conditions"); setError(null); setSuccess(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "conditions"
                ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
              }`}
          >
            ⚙️ Incentive Conditions
          </button>
        </div>

        {!showConditionModal && error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span>{error}</span>
          </div>
        )}
        {!showConditionModal && success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <span>{success}</span>
          </div>
        )}

        {activeTab === "calculate" && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Filters
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.categoryId || ""}
                    disabled={!filters.companyId}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, categoryId: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.categoryName || cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Employees
                    {loadingEmps && (
                      <span className="ml-1 text-indigo-400 text-xs">loading…</span>
                    )}
                  </label>
                  {allEmployees.length > 0 ? (
                    <EmployeeSelector
                      employees={allEmployees}
                      selectedIds={selectedEmployeeIds}
                      onChange={setSelectedEmployeeIds}
                    />
                  ) : (
                    <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 bg-slate-50">
                      {filters.companyId
                        ? loadingEmps
                          ? "Loading…"
                          : "No employees"
                        : "Select company first"}
                    </div>
                  )}
                </div>
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
                    {months.map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
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
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {records.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Search by name or code…"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition border border-emerald-200 flex items-center gap-1 shadow-sm"
                      title="Download CSV"
                    >
                      <span>📥</span> CSV
                    </button>
                    <button
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
                  onClick={fetchRecords}
                  disabled={!filters.companyId || loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 shadow-sm"
                >
                  {loading ? "Loading…" : "Fetch Records"}
                </button>
              </div>
            </div>

            {records.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <StatCard
                    label="Total Employees"
                    value={records.length}
                    colorClass="bg-slate-800 text-white"
                  />
                  <StatCard
                    label="Eligible"
                    value={eligible}
                    sub={`${notEligible} ineligible`}
                    colorClass="bg-emerald-600 text-white"
                  />
                  <StatCard
                    label="Total Incentive"
                    value={`₹${totalIncentive.toLocaleString("en-IN")}`}
                    colorClass="bg-indigo-600 text-white"
                  />
                  <StatCard
                    label="Avg per Employee"
                    value={
                      eligible
                        ? `₹${Math.round(totalIncentive / eligible).toLocaleString("en-IN")}`
                        : "—"
                    }
                    colorClass="bg-violet-600 text-white"
                  />
                </div>
                {Object.keys(categoryBreakdown).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs text-slate-500 self-center">
                      Category split:
                    </span>
                    {Object.entries(categoryBreakdown).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-slate-100 text-slate-600 border-slate-200"
                      >
                        {cat} <span className="opacity-60">× {count}</span>
                      </span>
                    ))}
                  </div>
                )}
                {Object.keys(gradeBreakdown).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="text-xs text-slate-500 self-center">
                      Grade split:
                    </span>
                    {Object.entries(gradeBreakdown).map(([key, count]) => {
                      const info = GRADE_LABELS[key];
                      if (!info) return null;
                      return (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${info.color}`}
                        >
                          {info.label} <span className="opacity-60">× {count}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </>
            )}

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
                          "Adjusted Days",
                          "Tier",
                          "Rate/Day",
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
                            className={`border-b border-slate-50 transition ${isDirty ? "bg-amber-50" : noIncentive ? "bg-red-50/30" : "hover:bg-slate-50/60"}`}
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
                                {rec.maleOverrideApplied && (
                                  <span className="bg-orange-100 text-orange-600 px-1 rounded text-xs">
                                    Exp Override
                                  </span>
                                )}
                                {rec.isSaved && (
                                  <span className="bg-teal-100 text-teal-600 px-1 rounded text-xs">
                                    Saved
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                              {rec.departmentName || "—"}
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap font-medium">
                              {rec.categoryName || "—"}
                            </td>
                            <td className="px-3 py-3">
                              <GradePill gradeKey={rec.gradeKey} />
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
                            <td className="px-3 py-3 text-center font-mono text-pink-700 font-semibold">
                              {rec.slotDays ? `+${rec.slotDays}d` : "0"}
                            </td>
                            <td className="px-3 py-3">
                              <DayAdjuster
                                rawDays={rec.rawDays}
                                adjustedDays={currentAdj}
                                onChange={(v) => handleAdjust(rec.id, v)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <TierBadge tier={rec.tier} />
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-700">
                              {rec.ratePerDay ? `₹${rec.ratePerDay}` : "—"}
                            </td>
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
                                  {rec.slabDays > 0 && (
                                    <div className="text-[11px] text-slate-500 font-medium font-mono">
                                      ({rec.payableDays || rec.rawDays} worked × ₹{rec.ratePerDay})
                                    </div>
                                  )}
                                </div>
                              )}
                              {rec.note && (
                                <div className="text-xs text-orange-500 mt-0.5 max-w-[140px] leading-tight">
                                  {rec.note}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {isDirty && (
                                <button
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
                            colSpan={16}
                            className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-100"
                          >
                            Total ({filteredRecords.length} employees)
                          </td>
                          <td className="px-3 py-3 font-bold text-emerald-700 font-mono text-sm whitespace-nowrap bg-slate-100">
                            ₹
                            {filteredRecords
                              .reduce((s, r) => s + (r.incentive || 0), 0)
                              .toLocaleString("en-IN")}
                          </td>
                          <td className="bg-slate-100" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block" />
                Adjusted row
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-100 inline-block" />
                No incentive (&lt;{CONFIG.MIN_DAYS} days)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200 inline-block" />
                High tier (≥{CONFIG.HIGH_TIER_DAYS} days)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200 inline-block" />
                Low tier ({CONFIG.LOW_TIER_DAYS} days)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-teal-100 text-teal-600 px-1 rounded text-xs">
                  Saved
                </span>{" "}
                Previously saved record
              </span>
            </div>
          </>
        )}

        {activeTab === "manual" && (
          <div className="space-y-5">
            {/* Filters & Bulk entry card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Manual Entry Controls
              </h2>

              {/* Row 1: Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 pb-6 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Company <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={filters.companyId}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, companyId: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={manualCategoryId}
                    onChange={(e) => setManualCategoryId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.categoryName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Entry Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Shift
                  </label>
                  <select
                    value={manualShiftId}
                    onChange={(e) => setManualShiftId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  >
                    <option value="">Select Shift</option>
                    {shiftTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name || st.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    onClick={async () => {
                      if (!filters.companyId || !manualCategoryId || !manualDate) {
                        setError("Please select both Category and Entry Date.");
                        return;
                      }
                      setManualLoading(true);
                      setError(null);
                      setSuccess(null);
                      try {
                        const res = await apiRequest(`/attendance-incentives/daily-entries?companyId=${filters.companyId}&categoryId=${manualCategoryId}&entryDate=${manualDate}&shiftTypeId=${manualShiftId}`);
                        setManualRecords(res.records || []);
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setManualLoading(false);
                      }
                    }}
                    disabled={!filters.companyId || manualLoading}
                    className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 shadow-sm flex items-center justify-center gap-1.5 h-[38px]"
                  >
                    {manualLoading ? "Loading…" : "🔍 Load Employees"}
                  </button>
                </div>
              </div>

              {/* Row 2: Bulk Entry Values */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                  ⚡ Bulk Entry (Applies to all selected rows)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Days</label>
                    <input
                      type="number"
                      step="any"
                      value={bulkDays}
                      onChange={(e) => handleBulkChange("days", e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Slab Days</label>
                    <input
                      type="number"
                      step="any"
                      value={bulkSlabDays}
                      onChange={(e) => handleBulkChange("slabDays", e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">OT Days</label>
                    <input
                      type="number"
                      step="any"
                      value={bulkOtDays}
                      onChange={(e) => handleBulkChange("otDays", e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">8 to 8</label>
                    <input
                      type="number"
                      step="any"
                      value={bulk8to8}
                      onChange={(e) => handleBulkChange("slot", e.target.value)}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Entries List Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {manualLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading records…
                </div>
              ) : manualRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">Select filters and click Load Employees</p>
                </div>
              ) : (
                <div>
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/30">
                    <div className="flex items-center gap-2">
                      <input
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        placeholder="Search employee by name or code…"
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium"
                      />
                      {manualSearch && (
                        <button
                          type="button"
                          onClick={() => setManualSearch("")}
                          className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const isAllSelected =
                            filteredManualRecords.length > 0 &&
                            filteredManualRecords.every((r) => r.selected);
                          handleManualSelectAll(!isAllSelected);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 active:scale-95"
                      >
                        {filteredManualRecords.length > 0 &&
                          filteredManualRecords.every((r) => r.selected)
                          ? "☒ Deselect All"
                          : "☑ Select All"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                        {manualRecords.filter((r) => r.selected).length} selected
                      </span>
                      <div className="text-xs text-slate-500 font-semibold font-mono bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200">
                        Showing {filteredManualRecords.length} of {manualRecords.length} employees
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-20 shadow-sm">
                        <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider w-12 bg-slate-800 sticky top-0 z-20">#</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">TicketNO</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">Emp Name</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">Day</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">Slab Days</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">OT Days</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">8to8</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold tracking-wider bg-slate-800 sticky top-0 z-20">Shift</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold tracking-wider w-20 bg-slate-800 sticky top-0 z-20">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold">Select</span>
                              <input
                                type="checkbox"
                                title="Select / Deselect All"
                                checked={
                                  filteredManualRecords.length > 0 &&
                                  filteredManualRecords.every((r) => r.selected)
                                }
                                onChange={(e) => handleManualSelectAll(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredManualRecords.map((rec, idx) => (
                          <tr
                            key={rec.employeeId}
                            className={`border-b border-slate-50 transition hover:bg-slate-50/50 ${rec.selected ? "bg-blue-50/20" : ""
                              }`}
                          >
                            <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{rec.employeeCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{rec.employeeName}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="any"
                                value={rec.days}
                                onChange={(e) => handleRowValueChange(rec.employeeId, "days", e.target.value)}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="any"
                                value={rec.slabDays}
                                onChange={(e) => handleRowValueChange(rec.employeeId, "slabDays", e.target.value)}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="any"
                                value={rec.otDays}
                                onChange={(e) => handleRowValueChange(rec.employeeId, "otDays", e.target.value)}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="any"
                                value={rec.slot}
                                onChange={(e) => handleRowValueChange(rec.employeeId, "slot", e.target.value)}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={rec.shiftTypeId || ""}
                                onChange={(e) => handleRowValueChange(rec.employeeId, "shiftTypeId", e.target.value)}
                                className="border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">No Shift</option>
                                {shiftTypes.map((st) => (
                                  <option key={st.id} value={st.id}>
                                    {st.name || st.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={!!rec.selected}
                                onChange={() => handleRowSelectToggle(rec.employeeId)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Save & Cancel Action Panel */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={handleCancelManual}
                      className="px-5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold transition"
                    >
                      ❌ Cancel
                    </button>
                    <button
                      onClick={handleSaveManual}
                      disabled={manualLoading}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
                    >
                      💾 Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: PACKAGING INCENTIVE ────────────────────────────────────── */}
        {activeTab === "packaging" && (
          <div className="space-y-5">
            {/* Rule Banner */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-amber-200">
                  📦
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    Packaging Incentive Rate & Workload Rule
                  </h3>
                  <p className="text-xs text-amber-800">
                    Incentive <strong>₹1.00 per Bag</strong> for all packing workers who achieved workload of <strong>45 Bags per day and above</strong> (Workload &lt; 45 bags receives ₹0).
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold">
                  Threshold: 45 Bags/day
                </span>
                <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold">
                  Rate: ₹1 / Bag
                </span>
              </div>
            </div>

            {/* Filters & Bulk entry card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Packaging Entry Controls
              </h2>

              {/* Row 1: Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 pb-6 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Company <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={filters.companyId}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, companyId: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50"
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Department
                  </label>
                  <select
                    value={pkgDeptId}
                    onChange={(e) => setPkgDeptId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  >
                    <option value="">All Packing Depts</option>
                    {pkgDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentname || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Entry Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={pkgDate}
                    onChange={(e) => setPkgDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Shift
                  </label>
                  <select
                    value={pkgShiftId}
                    onChange={(e) => setPkgShiftId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  >
                    <option value="">All Shifts</option>
                    {shiftTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name || st.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    onClick={handleLoadPackaging}
                    disabled={!filters.companyId || pkgLoading}
                    className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 shadow-sm flex items-center justify-center gap-1.5 h-[38px]"
                  >
                    {pkgLoading ? "Loading…" : "🔍 Load Packing Workers"}
                  </button>
                </div>
              </div>

              {/* Row 2: Bulk Entry Values */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                  ⚡ Bulk Workload Entry (Applies to all selected rows)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Bags Packed (Bulk)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={bulkBags}
                      onChange={(e) => handleBulkPkgChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Min Threshold (Bags)
                    </label>
                    <input
                      type="number"
                      value={45}
                      disabled
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-500 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Incentive Rate per Bag
                    </label>
                    <input
                      type="text"
                      value="₹1.00 / bag (if ≥ 45 bags)"
                      disabled
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-emerald-50 text-emerald-700 font-semibold border-emerald-200 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {pkgRecords.length > 0 && (
                <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                      <thead className="sticky top-0 z-20 shadow-sm">
                        <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-sm font-semibold">
                          <th className="px-4 py-4 w-12 text-left bg-slate-800 sticky top-0 z-20">#</th>
                          <th className="px-4 py-4 text-left bg-slate-800 sticky top-0 z-20">Ticket No</th>
                          <th className="px-4 py-4 text-left bg-slate-800 sticky top-0 z-20">Emp Name</th>
                          <th className="px-4 py-4 text-left bg-slate-800 sticky top-0 z-20">Department</th>
                          <th className="px-4 py-4 text-left w-32 font-semibold bg-slate-800 sticky top-0 z-20">Bags Packed</th>
                          <th className="px-4 py-4 text-left w-28 font-semibold bg-slate-800 sticky top-0 z-20">Rate / Bag</th>
                          <th className="px-4 py-4 text-left font-semibold bg-slate-800 sticky top-0 z-20">Workload Status</th>
                          <th className="px-4 py-4 text-left w-36 font-semibold bg-slate-800 sticky top-0 z-20">Incentive (₹)</th>
                          <th className="px-4 py-4 text-left font-semibold bg-slate-800 sticky top-0 z-20">Shift</th>
                          <th className="px-4 py-4 w-20 text-center bg-slate-800 sticky top-0 z-20">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold">Select</span>
                              <input
                                type="checkbox"
                                title="Select / Deselect All"
                                checked={
                                  pkgRecords.length > 0 &&
                                  pkgRecords.every((r) => r.selected)
                                }
                                onChange={(e) => handlePkgSelectAll(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pkgRecords.map((rec, index) => {
                          const isQualified = (rec.bagsPacked || 0) >= (rec.minBagsThreshold || 45);
                          return (
                            <tr
                              key={rec.employeeId}
                              className={`transition-colors ${rec.selected
                                  ? "bg-amber-50/40 hover:bg-amber-50/70"
                                  : "hover:bg-slate-50"
                                }`}
                            >
                              <td className="px-4 py-3 font-medium text-slate-400 text-xs">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {rec.employeeCode}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {rec.employeeName}
                              </td>
                              <td className="px-4 py-3 text-slate-600 text-xs">
                                {rec.departmentName}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={rec.bagsPacked}
                                  onChange={(e) =>
                                    handlePkgFieldChange(
                                      rec.employeeId,
                                      "bagsPacked",
                                      e.target.value
                                    )
                                  }
                                  className="w-24 border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                                />
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-600">
                                ₹{parseFloat(rec.ratePerBag || 1).toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                {isQualified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ Qualified (≥45 Bags)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                    Below 45 Bags (₹0)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm font-bold ${rec.incentiveAmount > 0
                                      ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                      : "text-slate-400"
                                    }`}
                                >
                                  ₹{parseFloat(rec.incentiveAmount || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={rec.shiftTypeId || ""}
                                  onChange={(e) =>
                                    handlePkgFieldChange(
                                      rec.employeeId,
                                      "shiftTypeId",
                                      e.target.value
                                    )
                                  }
                                  className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">No Shift</option>
                                  {shiftTypes.map((st) => (
                                    <option key={st.id} value={st.id}>
                                      {st.name || st.code}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!!rec.selected}
                                  onChange={() =>
                                    handlePkgRowSelectToggle(rec.employeeId)
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Save Action Panel */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6 text-xs text-slate-600">
                      <div>
                        Selected Workers:{" "}
                        <strong className="text-slate-800 text-sm">
                          {pkgRecords.filter((r) => r.selected).length}
                        </strong>{" "}
                        / {pkgRecords.length}
                      </div>
                      <div>
                        Total Bags:{" "}
                        <strong className="text-blue-700 text-sm">
                          {pkgRecords
                            .filter((r) => r.selected)
                            .reduce(
                              (sum, r) => sum + (parseInt(r.bagsPacked, 10) || 0),
                              0
                            )}
                        </strong>
                      </div>
                      <div>
                        Total Packaging Incentive:{" "}
                        <strong className="text-emerald-700 text-sm">
                          ₹
                          {pkgRecords
                            .filter((r) => r.selected)
                            .reduce(
                              (sum, r) =>
                                sum + (parseFloat(r.incentiveAmount) || 0),
                              0
                            )
                            .toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleCancelPackaging}
                        className="px-5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold transition"
                      >
                        ❌ Cancel
                      </button>
                      <button
                        onClick={handleSavePackaging}
                        disabled={pkgLoading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {pkgLoading ? "Saving…" : "💾 Save Packaging Entries"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: INCENTIVE CONDITIONS & RULES ────────────────────────────── */}
        {activeTab === "conditions" && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Grade Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Filter by Grade
                    </label>
                    <select
                      value={conditionFilterGrade}
                      onChange={(e) => setConditionFilterGrade(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                    >
                      <option value="ALL">All Grades ({conditions.length})</option>
                      {Array.from(new Set(conditions.map((c) => c.gradeKey))).map((gk) => (
                        <option key={gk} value={gk}>
                          {gk} ({conditions.filter((c) => c.gradeKey === gk).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Search Rule / Shift
                    </label>
                    <input
                      type="text"
                      placeholder="Search grade, shift, or notes…"
                      value={conditionSearch}
                      onChange={(e) => setConditionSearch(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 w-64"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleOpenAddCondition}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
                  >
                    <span>➕</span> Add Condition Rule
                  </button>
                </div>
              </div>
            </div>

            {/* Conditions Slabs Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Active Incentive Calculation Conditions & Slabs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">These rules determine daily rates and payout tiers during monthly attendance incentive calculation.</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                  {conditions.filter((c) => conditionFilterGrade === "ALL" || c.gradeKey === conditionFilterGrade).length} rules configured
                </span>
              </div>

              {conditionsLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading conditions…
                </div>
              ) : conditions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <p className="text-sm font-medium">No active incentive condition rules found.</p>
                  <p className="text-xs mt-1 text-slate-400">Click Add Condition Rule to create a rule.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-sm font-semibold">
                        <th className="px-5 py-4 w-12 text-left bg-slate-800 sticky top-0 z-20">#</th>
                        <th className="px-5 py-4 text-left bg-slate-800 sticky top-0 z-20">Grade / Name</th>
                        <th className="px-5 py-4 text-left bg-slate-800 sticky top-0 z-20">Shift Pattern</th>
                        <th className="px-5 py-4 text-center bg-slate-800 sticky top-0 z-20">Gender</th>
                        <th className="px-5 py-4 text-center bg-slate-800 sticky top-0 z-20">Min Days</th>
                        <th className="px-5 py-4 text-left bg-slate-800 sticky top-0 z-20">Low Tier Slab</th>
                        <th className="px-5 py-4 text-left bg-slate-800 sticky top-0 z-20">High Tier Slab</th>
                        <th className="px-5 py-4 text-left bg-slate-800 sticky top-0 z-20">Override Settings</th>
                        <th className="px-5 py-4 text-center bg-slate-800 sticky top-0 z-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {conditions
                        .filter((c) => {
                          const matchesGrade = conditionFilterGrade === "ALL" || c.gradeKey === conditionFilterGrade;
                          const matchesSearch =
                            !conditionSearch ||
                            (c.gradeName || c.gradeKey || "").toLowerCase().includes(conditionSearch.toLowerCase()) ||
                            (c.shiftLabel || c.shiftRuleKey || "").toLowerCase().includes(conditionSearch.toLowerCase()) ||
                            (c.remarks || "").toLowerCase().includes(conditionSearch.toLowerCase());
                          return matchesGrade && matchesSearch;
                        })
                        .map((cond, idx) => (
                          <tr key={cond.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-5 py-4 text-slate-400 text-xs font-mono">{idx + 1}</td>
                            <td className="px-5 py-4">
                              <GradePill gradeKey={cond.gradeKey} />
                              <span className="block text-xs font-semibold text-slate-700 mt-1">
                                {cond.gradeName || cond.gradeKey}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-semibold text-slate-800">{cond.shiftLabel}</span>
                              <span className="block text-xs font-mono text-slate-400 mt-0.5">{cond.shiftRuleKey}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cond.gender === "MALE"
                                  ? "bg-blue-50 text-blue-700"
                                  : cond.gender === "FEMALE"
                                    ? "bg-pink-50 text-pink-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}>
                                {cond.gender || "ALL"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center font-bold text-slate-700">
                              {cond.minDays ?? 22}d
                            </td>
                            <td className="px-5 py-4">
                              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                <span>{cond.lowTierDays}d</span>
                                <span>→</span>
                                <span className="font-bold font-mono">₹{parseFloat(cond.lowTierRate || 0).toFixed(2)}/d</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                <span>{cond.highTierDays}d+</span>
                                <span>→</span>
                                <span className="font-bold font-mono">₹{parseFloat(cond.highTierRate || 0).toFixed(2)}/d</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs">
                              {cond.maleExpOverride ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                  Male ≥{cond.maleExpThreshold || 3}yr → Day Rate
                                </span>
                              ) : cond.minComboDays ? (
                                <span className="text-slate-500 font-medium">
                                  Combo min: <span className="font-semibold text-slate-700">{cond.minComboDays}d</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditCondition(cond)}
                                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                  title="Edit Condition"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteCondition(cond.id)}
                                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                  title="Delete Condition"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Condition Modal (Add / Edit) */}
            {showConditionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        {editingCondition ? "✏️ Edit Incentive Condition Rule" : "➕ Add Incentive Condition Rule"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">All conditions, thresholds, rates, and eligibility rules are fully set by you.</p>
                    </div>
                    <button
                      onClick={() => setShowConditionModal(false)}
                      className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100"
                    >
                      ✕
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="text-red-400 mt-0.5">✕</span>
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{success}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveConditionSubmit} className="space-y-4">
                    {/* Row 1: Category & Department Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Category Selection
                        </label>
                        <select
                          value={conditionForm.categoryId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const cId = val ? parseInt(val, 10) : "";
                            const matched = conditionCategories.find((c) => c.id === cId);
                            const name = matched ? (matched.categoryName || matched.name) : "";

                            setConditionForm((p) => ({
                              ...p,
                              categoryId: cId,
                              gradeName: name ? name : p.gradeName,
                              gradeKey: name ? name.toUpperCase().replace(/[^A-Z0-9_]/g, "_") : p.gradeKey,
                            }));
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                        >
                          <option value="">-- Select Category --</option>
                          {conditionCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.categoryName || c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Department Selection
                        </label>
                        <select
                          value={conditionForm.departmentId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const dId = val ? parseInt(val, 10) : "";
                            const matched = conditionDepartments.find((d) => d.id === dId);
                            const name = matched ? (matched.departmentname || matched.name) : "";

                            setConditionForm((p) => ({
                              ...p,
                              departmentId: dId,
                              gradeName: !p.gradeName || p.gradeName === "Mixing" ? name : p.gradeName,
                              gradeKey: !p.gradeKey || p.gradeKey === "MIXING" ? name.toUpperCase().replace(/[^A-Z0-9_]/g, "_") : p.gradeKey,
                            }));
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                        >
                          <option value="">-- Select Department --</option>
                          {conditionDepartments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.departmentname || d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Display Name & Target Gender */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Grade / Rule Display Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={conditionForm.gradeName}
                          onChange={(e) => setConditionForm((p) => ({
                            ...p,
                            gradeName: e.target.value,
                            gradeKey: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
                          }))}
                          placeholder="e.g. Mixing, Spinning A, Packing Workers"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Target Gender
                        </label>
                        <select
                          value={conditionForm.gender || "ALL"}
                          onChange={(e) => setConditionForm((p) => ({ ...p, gender: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                        >
                          <option value="ALL">All Genders</option>
                          <option value="MALE">Male Only</option>
                          <option value="FEMALE">Female Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Shift Selection & Custom Combo */}
                    <div className="space-y-3">
                      <div className="block text-xs font-semibold text-slate-600 flex items-center justify-between">
                        <span>Active Shift Combinations (Satisfied if ANY combo matches)</span>
                        <button
                          type="button"
                          onClick={handleAddConditionCombo}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                        >
                          ➕ Add Shift Combo
                        </button>
                      </div>
                      <div className="space-y-3">
                        {conditionCombos.map((combo, idx) => (
                          <div key={combo.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 pb-2">
                              <span className="text-xs font-bold text-slate-500">Combo #{idx + 1}</span>
                              {conditionCombos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveConditionCombo(combo.id)}
                                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                                >
                                  🗑&nbsp;Remove
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Day (I) */}
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={combo.I.enabled}
                                    onChange={(e) => handleToggleComboShift(combo.id, "I", e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                  />
                                  <span>Day (I)</span>
                                </label>
                                {combo.I.enabled && (
                                  <input
                                    type="number"
                                    placeholder="Min Days"
                                    value={combo.I.minDays}
                                    onChange={(e) => handleComboShiftMinDaysChange(combo.id, "I", e.target.value)}
                                    className="w-20 border border-slate-200 rounded px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                                  />
                                )}
                              </div>

                              {/* Evening (II) */}
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={combo.II.enabled}
                                    onChange={(e) => handleToggleComboShift(combo.id, "II", e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                  />
                                  <span>Evening (II)</span>
                                </label>
                                {combo.II.enabled && (
                                  <input
                                    type="number"
                                    placeholder="Min Days"
                                    value={combo.II.minDays}
                                    onChange={(e) => handleComboShiftMinDaysChange(combo.id, "II", e.target.value)}
                                    className="w-20 border border-slate-200 rounded px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                                  />
                                )}
                              </div>

                              {/* Night (III) */}
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={combo.III.enabled}
                                    onChange={(e) => handleToggleComboShift(combo.id, "III", e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                  />
                                  <span>Night (III)</span>
                                </label>
                                {combo.III.enabled && (
                                  <input
                                    type="number"
                                    placeholder="Min Days"
                                    value={combo.III.minDays}
                                    onChange={(e) => handleComboShiftMinDaysChange(combo.id, "III", e.target.value)}
                                    className="w-20 border border-slate-200 rounded px-2.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Row 4: Day Thresholds & Rates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Min Days Required (Threshold)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          value={conditionForm.minDays}
                          onChange={(e) => setConditionForm((p) => ({ ...p, minDays: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Low Tier Days
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          value={conditionForm.lowTierDays}
                          onChange={(e) => setConditionForm((p) => ({ ...p, lowTierDays: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Low Tier Rate (₹/day) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={conditionForm.lowTierRate}
                          onChange={(e) => setConditionForm((p) => ({ ...p, lowTierRate: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono font-bold text-amber-700"
                        />
                      </div>
                    </div>

                    {/* Row 5: High Tier Days & Rate */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          High Tier Days
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          value={conditionForm.highTierDays}
                          onChange={(e) => setConditionForm((p) => ({ ...p, highTierDays: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          High Tier Rate (₹/day) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={conditionForm.highTierRate}
                          onChange={(e) => setConditionForm((p) => ({ ...p, highTierRate: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono font-bold text-emerald-700"
                        />
                      </div>
                    </div>

                    {/* Row 5: Experience Override Settings */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={conditionForm.maleExpOverride}
                          onChange={(e) => setConditionForm((p) => ({ ...p, maleExpOverride: e.target.checked }))}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Enable Experience Override (e.g. Male worker experience rule)</span>
                      </label>
                      {conditionForm.maleExpOverride && (
                        <div className="pl-6 pt-1 flex items-center gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">
                              Experience Threshold (Years)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={conditionForm.maleExpThreshold}
                              onChange={(e) => setConditionForm((p) => ({ ...p, maleExpThreshold: e.target.value }))}
                              className="w-32 border border-slate-200 rounded-lg px-2.5 py-1 text-sm bg-white"
                            />
                          </div>
                          <span className="text-xs text-slate-400 mt-4">
                            Workers exceeding this experience receive the base Day Shift rate.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Row 6: Remarks */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Remarks / Rule Description
                      </label>
                      <input
                        type="text"
                        value={conditionForm.remarks}
                        onChange={(e) => setConditionForm((p) => ({ ...p, remarks: e.target.value }))}
                        placeholder="e.g. Day Shift Only or Combo shift rules"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowConditionModal(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm font-semibold"
                      >
                        {editingCondition ? "Update Condition Rule" : "Save Condition Rule"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
