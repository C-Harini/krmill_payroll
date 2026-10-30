import React, { useEffect, useState, useRef, useMemo } from "react";
import { apiRequest } from "../utils/apiCaller";

// ─── Single Employee Search & Select (Form) ──────────────────────────────────
// Matches the visual style shown in picture 2 (search name or code, name + code)
const EmployeeSearchSelect = ({ employees, selectedId, onSelect, disabled }) => {
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

  // Close on Escape key
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

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const term = search.toLowerCase().trim();
    return employees.filter((e) => {
      const name = (
        e.employeeName ||
        e.fullName ||
        `${e.firstName || ""} ${e.lastName || ""}`
      ).toLowerCase();
      const code = (e.employeeCode || e.curEmployeeCode || "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [employees, search]);

  const selectedEmp = employees.find((e) => String(e.id) === String(selectedId));

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[40px] disabled:opacity-50"
      >
        <div className="flex-1 min-w-0 pr-2">
          {selectedEmp ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 truncate">
                {selectedEmp.employeeName ||
                  selectedEmp.fullName ||
                  selectedEmp.firstName}
              </span>
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono">
                {selectedEmp.employeeCode || selectedEmp.curEmployeeCode}
              </span>
            </div>
          ) : (
            <span className="text-gray-400">Search or select employee...</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedEmp && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              className="text-gray-400 hover:text-red-500 text-sm px-1 cursor-pointer"
              title="Clear selection"
            >
              ✕
            </span>
          )}
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-xl max-h-72 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-white">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code..."
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex justify-between select-none">
            <span>Direct Employee Selection</span>
            <span>{filtered.length} total</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {filtered.map((emp) => {
              const isSelected = String(selectedId) === String(emp.id);
              return (
                <div
                  key={emp.id}
                  className={`flex items-center justify-between px-3 py-2.5 hover:bg-blue-50/70 cursor-pointer select-none text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-50 font-semibold text-blue-900"
                      : "text-slate-800"
                  }`}
                  onClick={() => {
                    onSelect(emp);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {emp.employeeName || emp.fullName || emp.firstName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {emp.employeeCode || emp.curEmployeeCode}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-blue-600 text-xs font-bold shrink-0">
                      ✓ Selected
                    </span>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">
                No employees found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Multi-select Employee Filter for List Table (Matches Picture 2) ─────────
const TableEmployeeFilter = ({ employees, selectedIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

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

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const term = search.toLowerCase().trim();
    return employees.filter((e) => {
      const name = (
        e.employeeName ||
        e.fullName ||
        `${e.firstName || ""} ${e.lastName || ""}`
      ).toLowerCase();
      const code = (e.employeeCode || e.curEmployeeCode || "").toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [employees, search]);

  const isAllSelected =
    selectedIds.length === 0 || selectedIds.length === employees.length;

  const toggleAll = () => {
    onChange([]);
  };

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const label =
    selectedIds.length === 0 || isAllSelected
      ? "All employees"
      : `${selectedIds.length} employee${selectedIds.length > 1 ? "s" : ""} selected`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[38px]"
      >
        <span
          className={
            selectedIds.length === 0 || isAllSelected
              ? "text-gray-500"
              : "text-gray-800 font-medium"
          }
        >
          {label}
        </span>
        <span className="text-gray-400 text-xs ml-2 shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-white border border-gray-300 rounded-xl shadow-xl max-h-72 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-white">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code..."
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 select-none bg-slate-50/50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleAll}
          >
            <input
              type="checkbox"
              readOnly
              checked={selectedIds.length === 0}
              className="rounded pointer-events-none"
            />
            <span className="font-semibold text-slate-700">All employees</span>
            <span className="ml-auto text-xs text-gray-400">
              {employees.length} total
            </span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {filtered.map((emp) => {
              const isChecked = selectedIds.includes(emp.id);
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer select-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(emp.id)}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={isChecked}
                    className="rounded pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {emp.employeeName || emp.fullName || emp.firstName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {emp.employeeCode || emp.curEmployeeCode}
                    </p>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">
                No employees found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const AdditionalSalaryManagement = () => {
  // ---------------- STATES ----------------
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [salaryComponents, setSalaryComponents] = useState([]);

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Table filter state
  const [tableSelectedEmpIds, setTableSelectedEmpIds] = useState([]);

  const [formData, setFormData] = useState({
    companyId: "",
    departmentId: "",
    employeeId: "",
    salaryMonth: "",
    salaryComponentId: "",
    ticketNo: "AUTO",
    days: "",
    amount: "",
  });

  const generateTicketNo = () => {
    return "TKT" + Date.now();
  };

  // ---------------- FETCH FUNCTIONS ----------------
  const fetchCompanies = async () => {
    try {
      const data = await apiRequest(`/companies`);
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching companies:", err.message);
    }
  };

  const fetchAllEmployees = async (companiesList) => {
    setLoadingEmployees(true);
    try {
      let comps = companiesList || companies;
      if (!comps || comps.length === 0) {
        try {
          comps = await apiRequest(`/companies`);
          if (Array.isArray(comps)) setCompanies(comps);
        } catch {
          comps = [];
        }
      }

      let emps = [];
      try {
        const directData = await apiRequest(`/employees`);
        if (Array.isArray(directData) && directData.length > 0) {
          emps = directData;
        }
      } catch (e) {
        // Direct /employees without companyId failed
      }

      // Fallback: fetch per company (so it works even if backend server hasn't been restarted)
      if (emps.length === 0 && Array.isArray(comps) && comps.length > 0) {
        const results = await Promise.all(
          comps.map((c) =>
            apiRequest(`/employees?companyId=${c.id}`).catch(() => [])
          )
        );
        emps = results.flat();
      }

      const formatted = emps.map((emp) => ({
        ...emp,
        employeeName:
          emp.employeeName ||
          emp.fullName ||
          `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
          emp.firstName,
        employeeCode: emp.employeeCode || emp.curEmployeeCode,
      }));

      setAllEmployees(formatted);
    } catch (err) {
      console.error("Error fetching all employees:", err.message);
      setAllEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchDepartments = async (companyId) => {
    try {
      if (!companyId) {
        setDepartments([]);
        return;
      }
      const data = await apiRequest(`/departments?companyId=${companyId}&limit=500`);
      const deptList =
        data?.data || data?.rows || (Array.isArray(data) ? data : []);
      setDepartments(deptList);
    } catch (err) {
      console.error("Error fetching departments:", err.message);
      setDepartments([]);
    }
  };

  const fetchSalaryComponents = async (companyId) => {
    try {
      const url = companyId
        ? `/salary-components?companyId=${companyId}`
        : `/salary-components`;
      const data = await apiRequest(url);
      setSalaryComponents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching salary components:", err.message);
      setSalaryComponents([]);
    }
  };

  const fetchAdditionalSalaries = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/additional-salaries`);
      setRecords(data?.records || []);
    } catch (err) {
      console.error("Error fetching additional salaries:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- INIT LOAD ----------------
  useEffect(() => {
    const init = async () => {
      try {
        const compData = await apiRequest(`/companies`);
        const comps = Array.isArray(compData) ? compData : [];
        setCompanies(comps);
        fetchAllEmployees(comps);
      } catch {
        fetchAllEmployees();
      }
      fetchSalaryComponents();
      fetchAdditionalSalaries();
    };
    init();
  }, []);

  // ---------------- EMPLOYEES FILTER FOR FORM ----------------
  // If company or department was manually chosen, narrow the list; otherwise show all employees!
  const formEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (
        formData.companyId &&
        String(emp.companyId) !== String(formData.companyId)
      ) {
        return false;
      }
      if (
        formData.departmentId &&
        String(emp.departmentId) !== String(formData.departmentId)
      ) {
        return false;
      }
      return true;
    });
  }, [allEmployees, formData.companyId, formData.departmentId]);

  // ---------------- SELECT EMPLOYEE DIRECTLY ----------------
  // When an employee is selected, automatically fetch/populate company, department, and salary components
  const handleSelectEmployee = (emp) => {
    if (!emp) {
      setFormData((prev) => ({
        ...prev,
        employeeId: "",
        companyId: "",
        departmentId: "",
        salaryComponentId: "",
      }));
      setDepartments([]);
      return;
    }

    const companyId = emp.companyId ? String(emp.companyId) : "";
    const departmentId = emp.departmentId ? String(emp.departmentId) : "";

    setFormData((prev) => ({
      ...prev,
      employeeId: emp.id,
      companyId: companyId || prev.companyId,
      departmentId: departmentId || prev.departmentId,
    }));

    if (companyId) {
      fetchDepartments(companyId);
      fetchSalaryComponents(companyId);
    }
    setError("");
  };

  // ---------------- FORM HANDLERS ----------------
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      companyId: value,
      departmentId: "",
      salaryComponentId: "",
    }));

    if (value) {
      fetchDepartments(value);
      fetchSalaryComponents(value);
    } else {
      setDepartments([]);
      fetchSalaryComponents();
    }
  };

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      departmentId: value,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!formData.employeeId) {
        setError("Please search and select an employee.");
        setSaving(false);
        return;
      }

      if (!formData.salaryMonth) {
        setError("Please select salary month.");
        setSaving(false);
        return;
      }

      if (!formData.salaryComponentId) {
        setError("Please select head (salary component).");
        setSaving(false);
        return;
      }

      if (
        (formData.days === "" || formData.days === null) &&
        (formData.amount === "" || formData.amount === null)
      ) {
        setError("Please enter either days or amount.");
        setSaving(false);
        return;
      }

      const empObj = allEmployees.find(
        (e) => String(e.id) === String(formData.employeeId)
      );
      const companyId =
        formData.companyId || (empObj ? empObj.companyId : undefined);
      const departmentId =
        formData.departmentId ||
        (empObj ? empObj.departmentId : undefined) ||
        departments[0]?.id ||
        1;

      const payload = {
        companyId: companyId ? Number(companyId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        employeeId: Number(formData.employeeId),
        salaryMonth: formData.salaryMonth,
        salaryComponentId: Number(formData.salaryComponentId),
        ticketNo: formData.ticketNo || generateTicketNo(),
        days: formData.days ? Number(formData.days) : 0,
        amount: formData.amount ? Number(formData.amount) : 0,
      };

      const url = editingId
        ? `/additional-salaries/${editingId}`
        : `/additional-salaries`;

      const method = editingId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      alert(editingId ? "Updated successfully ✅" : "Created successfully ✅");

      // Reset
      setFormData({
        companyId: "",
        departmentId: "",
        employeeId: "",
        salaryMonth: "",
        salaryComponentId: "",
        ticketNo: "AUTO",
        days: "",
        amount: "",
      });

      setEditingId(null);
      setDepartments([]);
      setShowForm(false);

      fetchAdditionalSalaries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------- EDIT ----------------
  const handleEdit = (record) => {
    setShowForm(true);
    setEditingId(record.id);

    setFormData({
      companyId: record.companyId ? String(record.companyId) : "",
      departmentId: record.departmentId ? String(record.departmentId) : "",
      employeeId: record.employeeId ? String(record.employeeId) : "",
      salaryMonth: record.salaryMonth || "",
      salaryComponentId: record.salaryComponentId
        ? String(record.salaryComponentId)
        : "",
      ticketNo: record.ticketNo || generateTicketNo(),
      days: record.days !== undefined && record.days !== null ? record.days : "",
      amount:
        record.amount !== undefined && record.amount !== null
          ? record.amount
          : "",
    });

    if (record.companyId) {
      fetchDepartments(record.companyId);
      fetchSalaryComponents(record.companyId);
    }
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await apiRequest(`/additional-salaries/${id}`, {
        method: "DELETE",
      });

      alert("Deleted successfully ✅");
      fetchAdditionalSalaries();
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------------- CANCEL ----------------
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setError("");

    setFormData({
      companyId: "",
      departmentId: "",
      employeeId: "",
      salaryMonth: "",
      salaryComponentId: "",
      ticketNo: "AUTO",
      days: "",
      amount: "",
    });

    setDepartments([]);
  };

  // ---------------- FILTERED RECORDS FOR TABLE ----------------
  const filteredRecords = useMemo(() => {
    if (tableSelectedEmpIds.length === 0) return records;
    return records.filter((r) => tableSelectedEmpIds.includes(r.employeeId));
  }, [records, tableSelectedEmpIds]);

  // ---------------- UI ----------------
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Additional Salary
      </h2>

      {/* Top Buttons */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              companyId: "",
              departmentId: "",
              employeeId: "",
              salaryMonth: "",
              salaryComponentId: "",
              ticketNo: generateTicketNo(),
              days: "",
              amount: "",
            });
            fetchSalaryComponents();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
        >
          + Add Additional Salary
        </button>

        {showForm && (
          <button
            onClick={handleCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        )}
      </div>

      {/* FORM */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId
                  ? "Edit Additional Salary"
                  : "Create Additional Salary"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Search and select employee directly; company and department are automatically fetched!
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Employee - Direct Search & Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
                {loadingEmployees && (
                  <span className="ml-1 text-xs text-blue-500 font-normal">
                    (loading employees...)
                  </span>
                )}
              </label>
              <EmployeeSearchSelect
                employees={formEmployees}
                selectedId={formData.employeeId}
                onSelect={handleSelectEmployee}
              />
            </div>

            {/* 2. Company - Auto-fetched */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Company
                </label>
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Auto-fetched
                </span>
              </div>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleCompanyChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Department - Auto-fetched */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Department
                </label>
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Auto-fetched
                </span>
              </div>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleDepartmentChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentname || d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Salary Month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Salary Month <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                name="salaryMonth"
                value={formData.salaryMonth}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* 5. Head (Salary Component) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Head (Salary Component) <span className="text-red-500">*</span>
              </label>
              <select
                name="salaryComponentId"
                value={formData.salaryComponentId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Component</option>
                {salaryComponents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Ticket No */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Ticket No
              </label>
              <input
                type="text"
                name="ticketNo"
                value={formData.ticketNo}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 font-mono"
                readOnly
              />
            </div>

            {/* 7. Days */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Days
              </label>
              <input
                type="number"
                name="days"
                value={formData.days}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                placeholder="0"
              />
            </div>

            {/* 8. Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Additional Salary"
                : "Save Additional Salary"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* TABLE SECTION */}
      <div className="bg-white shadow-md rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Additional Salary List
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Showing {filteredRecords.length} of {records.length} total records
            </p>
          </div>

          {/* Filter by Employee Dropdown (Exact match to Picture 2) */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Filter by Employee
            </label>
            <TableEmployeeFilter
              employees={allEmployees}
              selectedIds={tableSelectedEmpIds}
              onChange={setTableSelectedEmpIds}
            />
          </div>
        </div>

        {tableSelectedEmpIds.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 font-medium">
              Filtered by {tableSelectedEmpIds.length} employee{tableSelectedEmpIds.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setTableSelectedEmpIds([])}
              className="text-xs text-red-600 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            <p>Loading additional salary records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>No additional salary records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                  <th className="border p-2.5 text-left">Ticket No</th>
                  <th className="border p-2.5 text-left">Company</th>
                  <th className="border p-2.5 text-left">Department</th>
                  <th className="border p-2.5 text-left">Employee</th>
                  <th className="border p-2.5 text-left">Salary Month</th>
                  <th className="border p-2.5 text-left">Head</th>
                  <th className="border p-2.5 text-right">Days</th>
                  <th className="border p-2.5 text-right">Amount</th>
                  <th className="border p-2.5 text-center">Status</th>
                  <th className="border p-2.5 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="border p-2.5 font-mono text-xs text-gray-700">
                      {r.ticketNo || r.id}
                    </td>
                    <td className="border p-2.5">{r.company?.name || "-"}</td>
                    <td className="border p-2.5">
                      {r.department?.departmentname ||
                        r.department?.name ||
                        "-"}
                    </td>
                    <td className="border p-2.5">
                      {r.employee ? (
                        <div>
                          <p className="font-medium text-gray-800">
                            {r.employee.employeeName ||
                              r.employee.fullName ||
                              r.employee.firstName}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {r.employee.employeeCode ||
                              r.employee.curEmployeeCode}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border p-2.5 font-mono text-xs">
                      {r.salaryMonth}
                    </td>
                    <td className="border p-2.5 font-medium text-gray-700">
                      {r.salaryComponent?.name || "-"}
                    </td>
                    <td className="border p-2.5 text-right font-mono">
                      {r.days || 0}
                    </td>
                    <td className="border p-2.5 text-right font-mono font-medium text-gray-800">
                      ₹{Number(r.amount || 0).toLocaleString()}
                    </td>
                    <td className="border p-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                          r.status === "Inactive"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                      >
                        {r.status || "Active"}
                      </span>
                    </td>

                    <td className="border p-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(r)}
                          className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded font-medium transition"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(r.id)}
                          className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
                        >
                          Delete
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
    </div>
  );
};

export default AdditionalSalaryManagement;
