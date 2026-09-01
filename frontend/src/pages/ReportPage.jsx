import React, { useState, useEffect, useRef } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem("authToken");
  const fullUrl = url.startsWith("http") ? url : `${apiUrl}${url}`;
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await fetch(fullUrl, { ...defaultOptions, ...options });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || `API Error: ${response.statusText}`);
  }
  return response.json();
};

// ─── Operators by field type ───
const OPERATORS = {
  string: [
    { value: "==", label: "Equals" },
    { value: "!=", label: "Not Equals" },
    { value: "contains", label: "Contains" },
  ],
  number: [
    { value: "==", label: "=" },
    { value: "!=", label: "\u2260" },
    { value: "<", label: "<" },
    { value: ">", label: ">" },
    { value: "<=", label: "\u2264" },
    { value: ">=", label: "\u2265" },
  ],
  date: [
    { value: "==", label: "=" },
    { value: "<", label: "Before" },
    { value: ">", label: "After" },
    { value: "<=", label: "On/Before" },
    { value: ">=", label: "On/After" },
  ],
  enum: [
    { value: "==", label: "Equals" },
    { value: "!=", label: "Not Equals" },
  ],
  boolean: [{ value: "==", label: "Equals" }],
  relation: [
    { value: "==", label: "Equals" },
    { value: "!=", label: "Not Equals" },
  ],
};

// ═══════════════════════════════════════════════════
//  Multi-Select Dropdown
// ═══════════════════════════════════════════════════
const MultiSelectDropdown = ({
  options,
  selected,
  onChange,
  placeholder,
  grouped = false,
  maxHeight = "280px",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allItems = grouped ? Object.values(options).flat() : options;
  const allKeys = allItems.map((i) => (typeof i === "string" ? i : i.key));
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.includes(k));
  const toggle = (k) =>
    onChange(
      selected.includes(k) ? selected.filter((s) => s !== k) : [...selected, k],
    );

  const filtered = grouped
    ? Object.entries(options).reduce((acc, [group, items]) => {
      const f = items.filter((i) =>
        i.label.toLowerCase().includes(search.toLowerCase()),
      );
      if (f.length) acc[group] = f;
      return acc;
    }, {})
    : options.filter((o) =>
      (typeof o === "string" ? o : o.label)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected
          .map((s) => {
            const it = allItems.find(
              (i) => (typeof i === "string" ? i : i.key) === s,
            );
            return typeof it === "string" ? it : it?.label || s;
          })
          .join(", ")
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2.5 border rounded-lg bg-white text-left cursor-pointer text-sm flex justify-between items-center transition-all outline-none ${open ? "border-indigo-500 ring-2 ring-indigo-100" : "border-gray-300 hover:border-gray-400"} ${selected.length ? "text-slate-800" : "text-gray-400"}`}
      >
        <span className="truncate">{displayText}</span>
        <span
          className={`text-xs text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          &#9660;
        </span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div className="px-2 py-1 border-b border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer px-1 py-1 text-xs font-semibold text-indigo-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onChange(allSelected ? [] : [...allKeys])}
                className="accent-indigo-600"
              />
              {allSelected ? "Deselect All" : "Select All"}
            </label>
          </div>
          <div style={{ maxHeight }} className="overflow-y-auto">
            {grouped
              ? Object.entries(filtered).map(([group, items]) => (
                <div key={group}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-gray-50">
                    {group}
                  </div>
                  {items.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 px-4 py-1.5 cursor-pointer text-sm text-slate-700 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(item.key)}
                        onChange={() => toggle(item.key)}
                        className="accent-indigo-600"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              ))
              : (Array.isArray(filtered) ? filtered : []).map((opt) => {
                const k = typeof opt === "string" ? opt : opt.key;
                const l = typeof opt === "string" ? opt : opt.label;
                return (
                  <label
                    key={k}
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm text-slate-700 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(k)}
                      onChange={() => toggle(k)}
                      className="accent-indigo-600"
                    />
                    {l}
                  </label>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════
//  Condition Row
// ═══════════════════════════════════════
const ConditionRow = ({
  condition,
  index,
  fields,
  companyId,
  onChange,
  onRemove,
}) => {
  const [distinctValues, setDistinctValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const selectedField = fields.find((f) => f.key === condition.field);
  const fieldType = selectedField?.type || "string";
  const operators = OPERATORS[fieldType] || OPERATORS.string;

  useEffect(() => {
    if (!condition.field) {
      setDistinctValues([]);
      return;
    }
    const fetchValues = async () => {
      setLoadingValues(true);
      try {
        if (selectedField?.values) {
          setDistinctValues(selectedField.values);
          setLoadingValues(false);
          return;
        }
        const data = await apiRequest(
          `/reports/distinct-values/${condition.field}?companyId=${companyId}`,
        );
        setDistinctValues(Array.isArray(data) ? data.map(String) : []);
      } catch (err) {
        console.error("Error fetching distinct values:", err);
      }
      setLoadingValues(false);
    };
    fetchValues();
  }, [condition.field, companyId]);

  return (
    <div className="grid grid-cols-[1fr_140px_1fr_40px] gap-3 items-end p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Field
        </label>
        <select
          value={condition.field || ""}
          onChange={(e) =>
            onChange(index, {
              ...condition,
              field: e.target.value,
              operator: "",
              values: [],
            })
          }
          className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm outline-none cursor-pointer focus:border-indigo-500 ${condition.field ? "text-slate-800" : "text-gray-400"}`}
        >
          <option value="" disabled>
            Select field...
          </option>
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Operator
        </label>
        <select
          value={condition.operator || ""}
          onChange={(e) =>
            onChange(index, { ...condition, operator: e.target.value })
          }
          className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm outline-none cursor-pointer focus:border-indigo-500 ${condition.operator ? "text-slate-800" : "text-gray-400"}`}
        >
          <option value="" disabled>
            Op...
          </option>
          {operators.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Value(s)
        </label>
        {loadingValues ? (
          <div className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-400">
            Loading...
          </div>
        ) : (
          <MultiSelectDropdown
            options={distinctValues.map((v) => ({ key: v, label: v }))}
            selected={condition.values}
            onChange={(vals) => onChange(index, { ...condition, values: vals })}
            placeholder="Select values..."
            maxHeight="180px"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        title="Remove condition"
        className="w-9 h-10 flex items-center justify-center rounded-lg cursor-pointer bg-red-100 text-red-500 hover:bg-red-200 transition-colors text-base font-bold border-none"
      >
        &times;
      </button>
    </div>
  );
};

// ═══════════════════════════════════════
//  Main Reports Page
// ═══════════════════════════════════════

const ReportsPage = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [fields, setFields] = useState([]);
  const [groupedFields, setGroupedFields] = useState({});
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [conditions, setConditions] = useState([
    { field: "", operator: "", values: [] },
  ]);
  const [reportData, setReportData] = useState(null);
  const [reportColumns, setReportColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await apiRequest("/companies");
        setCompanies(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedCompanyId(data[0].id);
          setSelectedCompanyName(data[0].name);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch field metadata on mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const data = await apiRequest("/reports/fields");
        setFields(data);
        const grouped = {};
        data.forEach((f) => {
          if (!grouped[f.category]) grouped[f.category] = [];
          grouped[f.category].push(f);
        });
        setGroupedFields(grouped);
      } catch (err) {
        console.error("Error fetching fields:", err);
      }
    };
    fetchFields();
  }, []);

  // Reset report when company changes
  useEffect(() => {
    setReportData(null);
    setReportColumns([]);
    setTotalCount(0);
  }, [selectedCompanyId]);

  const handleCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompanyId(id);
    const company = companies.find((c) => String(c.id) === String(id));
    setSelectedCompanyName(company ? company.name : "");
  };

  const updateCondition = (i, updated) => {
    const n = [...conditions];
    n[i] = updated;
    setConditions(n);
  };
  const removeCondition = (i) =>
    setConditions(conditions.filter((_, idx) => idx !== i));
  const addCondition = () =>
    setConditions([...conditions, { field: "", operator: "", values: [], connector: "AND" }]);

  // Generate Report
  const generateReport = async () => {
    if (!selectedColumns.length || !selectedCompanyId) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          columns: selectedColumns,
          conditions,
          companyId: selectedCompanyId,
        }),
      });
      setReportColumns(result.columns);
      setReportData(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message || "Failed to generate report");
    }
    setLoading(false);
  };

  // Download
  const downloadFile = async (format) => {
    if (!selectedColumns.length || !selectedCompanyId) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${apiUrl}/reports/download/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          columns: selectedColumns,
          conditions,
          companyId: selectedCompanyId,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Employee_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : "pdf"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        setError(`Failed to download ${format} report`);
      }
    } catch (err) {
      setError("Download failed. Please try again.");
    }
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-500 px-8 py-7 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
            &#128202;
          </div>
          <div className="flex-1">
            <h1 className="text-white text-2xl font-bold tracking-tight">
              Employee Reports
            </h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              Build custom reports with dynamic filters
            </p>
          </div>
          {/* Company Selector */}
          <div className="flex items-center gap-3">
            <label className="text-indigo-200 text-sm font-medium">
              Company:
            </label>
            <select
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              className="px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium outline-none cursor-pointer min-w-[200px] focus:ring-2 focus:ring-white/30"
            >
              <option value="" disabled className="text-gray-800">
                Select Company
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="text-gray-800">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Section 1: Column Selector */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-base">
              &#128203;
            </span>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-800">
                Select Report Columns
              </h2>
              <p className="text-xs text-gray-400">
                Choose the fields to display in the report
              </p>
            </div>
            {selectedColumns.length > 0 && (
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-semibold">
                {selectedColumns.length} fields
              </span>
            )}
          </div>
          <MultiSelectDropdown
            options={groupedFields}
            selected={selectedColumns}
            onChange={setSelectedColumns}
            placeholder="Click to select columns for your report..."
            grouped
            maxHeight="320px"
          />
          {selectedColumns.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedColumns.map((key) => {
                const f = fields.find((fi) => fi.key === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-medium"
                  >
                    {f?.label || key}
                    <button
                      onClick={() =>
                        setSelectedColumns(
                          selectedColumns.filter((s) => s !== key),
                        )
                      }
                      className="opacity-50 hover:opacity-100 text-xs leading-none cursor-pointer border-none bg-transparent text-indigo-700"
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Filter Conditions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-base">
              &#128269;
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Filter Conditions
              </h2>
              <p className="text-xs text-gray-400">
                Add one or more conditions with custom logic (AND/OR)
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {conditions.map((c, i) => (
              <div key={i}>
                {i > 0 && (
                  <div className="flex justify-center my-2">
                    <select
                      value={c.connector || "AND"}
                      onChange={(e) => {
                        const updatedConditions = [...conditions];
                        updatedConditions[i].connector = e.target.value;
                        setConditions(updatedConditions);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-200 transition-all"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}
                <ConditionRow
                  condition={c}
                  index={i}
                  fields={fields}
                  companyId={selectedCompanyId}
                  onChange={updateCondition}
                  onRemove={removeCondition}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCondition}
            className="mt-3 w-full py-2.5 border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50/30 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer"
          >
            + Add Condition
          </button>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={generateReport}
            disabled={!selectedColumns.length || !selectedCompanyId || loading}
            className={`px-12 py-3.5 rounded-xl text-base font-bold transition-all ${selectedColumns.length && selectedCompanyId && !loading
                ? "bg-gradient-to-r from-indigo-700 to-indigo-500 text-white shadow-lg shadow-indigo-300/40 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Section 3: Report Results */}
        {reportData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-gray-50/50 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-base">
                  &#128196;
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Report Results
                  </h2>
                  <p className="text-xs text-gray-400">
                    {totalCount} record{totalCount !== 1 ? "s" : ""} found
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => downloadFile("excel")}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-green-600 rounded-lg bg-green-50 text-green-600 text-sm font-semibold hover:bg-green-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  &#128215; Download Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile("pdf")}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-600 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  &#128213; Download PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-bold text-gray-500 text-[11px] uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">
                      #
                    </th>
                    {reportColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left font-bold text-gray-500 text-[11px] uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? (
                    reportData.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-gray-400 font-semibold text-xs">
                          {ri + 1}
                        </td>
                        {reportColumns.map((col) => (
                          <td
                            key={col.key}
                            className="px-4 py-2.5 text-slate-700 whitespace-nowrap"
                          >
                            {col.key === "employmentStatus" ? (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${row[col.key] === "Active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                              >
                                {row[col.key]}
                              </span>
                            ) : col.key === "basicSalary" &&
                              row[col.key] !== "" ? (
                              `\u20B9${Number(row[col.key]).toLocaleString("en-IN")}`
                            ) : (
                              row[col.key] || "\u2014"
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={reportColumns.length + 1}
                        className="px-4 py-10 text-center text-gray-400 text-sm"
                      >
                        No records match the selected conditions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {reportData.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>
                  Total: {totalCount} employee{totalCount !== 1 ? "s" : ""}
                </span>
                <span>{selectedColumns.length} columns displayed</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
