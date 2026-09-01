import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import API from "../api";
import { toast } from "react-toastify";
import {
  Briefcase,
  Search,
  Save,
  Upload,
  Download,
  CheckSquare,
  Square,
  Edit3,
  Filter,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FileSpreadsheet,
  Check,
  GraduationCap,
  Info
} from "lucide-react";

const WorkloadManagement = () => {
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";
  const token = sessionStorage.getItem("token") || localStorage.getItem("token") || localStorage.getItem("authToken");

  // Core Data
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [searchTerm, setSearchTerm] = useState("");

  // Workload State Map: { [empId]: workloadValue }
  const [workloadValues, setWorkloadValues] = useState({});
  // Baseline saved workload values to track changes: { [empId]: originalValue }
  const [originalWorkloads, setOriginalWorkloads] = useState({});

  // Row Selection (Set of Employee IDs)
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());

  // Bulk Entry Input
  const [bulkWorkloadInput, setBulkWorkloadInput] = useState("");

  // Loading & Saving States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Bulk Upload Modal State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);

  // References for row inputs
  const inputRefs = useRef({});

  // ================== FETCH COMPANIES ==================
  const fetchCompanies = async () => {
    try {
      const { data } = await API.get("/companies");
      const list = Array.isArray(data) ? data : data.data || data.companies || [];
      setCompanies(list);
      if (list.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(list[0].id);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to load companies");
    }
  };

  // ================== FETCH DEPARTMENTS ==================
  const fetchDepartments = async (companyId) => {
    if (!companyId) {
      setDepartments([]);
      return;
    }
    try {
      const { data } = await API.get("/departments", {
        params: { companyId, limit: 300 },
      });
      const list = data.data || (Array.isArray(data) ? data : data.departments || []);
      setDepartments(list);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    }
  };

  // ================== FETCH EMPLOYEES (TRAINEES ONLY) ==================
  const fetchEmployees = async (companyId, departmentId, status) => {
    if (!companyId) {
      setEmployees([]);
      setWorkloadValues({});
      setOriginalWorkloads({});
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Specifically fetch trainee employees (isTrainee = true from Employee Details)
      const params = { companyId, isTrainee: "true" };
      if (departmentId) params.departmentId = departmentId;
      if (status) params.status = status;

      const { data } = await API.get("/employees", { params });
      const rawList = Array.isArray(data) ? data : data.data || data.employees || [];
      
      // Strict client-side filter: Only show employees who are trainees
      const empList = rawList.filter(
        (emp) => emp.isTrainee === true || emp.isTrainee === "true" || emp.isTrainee === 1
      );
      setEmployees(empList);

      // Initialize workload maps
      const newWorkloadMap = {};
      const newOriginalMap = {};
      empList.forEach((emp) => {
        const val = emp.workload !== null && emp.workload !== undefined ? String(emp.workload) : "";
        newWorkloadMap[emp.id] = val;
        newOriginalMap[emp.id] = val;
      });

      setWorkloadValues(newWorkloadMap);
      setOriginalWorkloads(newOriginalMap);
      setSelectedEmpIds(new Set());
    } catch (err) {
      console.error("Error fetching trainee employees:", err);
      setError("Failed to load trainee employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Bootstrap Load
  useEffect(() => {
    fetchCompanies();
  }, []);

  // When Company Changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments(selectedCompanyId);
      fetchEmployees(selectedCompanyId, selectedDepartmentId, statusFilter);
    }
  }, [selectedCompanyId]);

  // When Department or Status Changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees(selectedCompanyId, selectedDepartmentId, statusFilter);
    }
  }, [selectedDepartmentId, statusFilter]);

  // ================== SEARCH & FILTER ==================
  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const ticketNo = String(emp.employeeCode || emp.ticketNo || "").toLowerCase();
    const fullName = `${emp.firstName || ""} ${emp.middleName || ""} ${emp.lastName || ""}`.toLowerCase();
    const deptName = (emp.department?.departmentname || emp.departmentName || "").toLowerCase();
    const empId = String(emp.id);

    return (
      ticketNo.includes(term) ||
      fullName.includes(term) ||
      deptName.includes(term) ||
      empId.includes(term)
    );
  });

  // Helper to validate workload range (must be between 0.00 and 1.00)
  const isOutOfRange = (val) => {
    if (val === "" || val === null || val === undefined) return false;
    const n = parseFloat(val);
    return isNaN(n) || n < 0 || n > 1;
  };

  // Calculate modified count
  const modifiedCount = employees.filter(
    (emp) => (workloadValues[emp.id] ?? "") !== (originalWorkloads[emp.id] ?? "")
  ).length;

  // Check if any employee has invalid workload
  const hasAnyOutOfRange = employees.some((emp) => isOutOfRange(workloadValues[emp.id]));

  // ================== REAL-TIME BULK WORKLOAD INPUT CHANGE ==================
  const handleBulkWorkloadInputChange = (value) => {
    setBulkWorkloadInput(value);

    // As user types, immediately update all currently selected employees' workload column in the UI!
    if (selectedEmpIds.size > 0) {
      setWorkloadValues((prev) => {
        const next = { ...prev };
        selectedEmpIds.forEach((empId) => {
          next[empId] = value;
        });
        return next;
      });
    }
  };

  // ================== SELECTION HANDLERS ==================
  const toggleSelectRow = (empId) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      const willBeSelected = !next.has(empId);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }

      // If user has a bulk value entered and selects this row, also apply the bulk value to this row immediately
      if (willBeSelected && bulkWorkloadInput !== "") {
        setWorkloadValues((curr) => ({
          ...curr,
          [empId]: bulkWorkloadInput,
        }));
      }

      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmpIds(new Set());
    } else {
      const allIds = new Set(filteredEmployees.map((emp) => emp.id));
      setSelectedEmpIds(allIds);

      // If user has a bulk value entered and selects all, apply to all selected
      if (bulkWorkloadInput !== "") {
        setWorkloadValues((curr) => {
          const next = { ...curr };
          allIds.forEach((id) => {
            next[id] = bulkWorkloadInput;
          });
          return next;
        });
      }
    }
  };

  // ================== WORKLOAD INPUT CHANGE ==================
  const handleWorkloadChange = (empId, value) => {
    setWorkloadValues((prev) => ({
      ...prev,
      [empId]: value,
    }));
  };

  // ================== BULK ENTRY: APPLY TO SELECTED BUTTON ==================
  const handleApplyBulkEntry = () => {
    if (selectedEmpIds.size === 0) {
      toast.warning("Please select at least one employee from the list to apply workload.");
      return;
    }

    if (bulkWorkloadInput === "" || isNaN(Number(bulkWorkloadInput))) {
      toast.warning("Please enter a valid workload number.");
      return;
    }

    if (isOutOfRange(bulkWorkloadInput)) {
      toast.error("Workload must be between 0.00 and 1.00 (e.g. 0.5, 0.75, 1.0)");
      return;
    }

    setWorkloadValues((prev) => {
      const next = { ...prev };
      selectedEmpIds.forEach((empId) => {
        next[empId] = bulkWorkloadInput;
      });
      return next;
    });

    toast.success(`Workload of ${bulkWorkloadInput} applied to ${selectedEmpIds.size} selected employee(s). Click 'Save Changes' to persist!`);
  };

  // ================== SAVE INDIVIDUAL ROW ==================
  const handleSaveIndividualRow = async (emp) => {
    const currentVal = workloadValues[emp.id];
    
    if (isOutOfRange(currentVal)) {
      toast.error(`Invalid workload for ${emp.firstName}! Value must be between 0.00 and 1.00.`);
      return;
    }

    setSavingRowId(emp.id);
    try {
      const res = await API.put(`/employees/${emp.id}/workload`, {
        workload: currentVal === "" ? null : parseFloat(currentVal),
      });

      if (res.data.success || res.status === 200) {
        toast.success(`Workload saved for ${emp.firstName} (${emp.employeeCode}) ✅`);
        setOriginalWorkloads((prev) => ({
          ...prev,
          [emp.id]: currentVal,
        }));
      } else {
        toast.error(res.data.message || "Failed to save workload");
      }
    } catch (err) {
      console.error("Error saving individual workload:", err);
      toast.error(err.response?.data?.message || err.message || "Error saving workload");
    } finally {
      setSavingRowId(null);
    }
  };

  // ================== SAVE ALL / BULK SAVE ==================
  const handleSaveAll = async () => {
    // If there are selected employees, prioritize saving selected; otherwise save all modified
    let targetEmployees = [];
    if (selectedEmpIds.size > 0) {
      targetEmployees = employees.filter((emp) => selectedEmpIds.has(emp.id));
    } else {
      targetEmployees = employees.filter(
        (emp) => (workloadValues[emp.id] ?? "") !== (originalWorkloads[emp.id] ?? "")
      );
    }

    if (targetEmployees.length === 0) {
      toast.info("No modifications or selected employees to save.");
      return;
    }

    // Range validation check for all target employees
    const outOfRangeList = targetEmployees.filter((emp) => isOutOfRange(workloadValues[emp.id]));
    if (outOfRangeList.length > 0) {
      toast.error(
        `Cannot save: ${outOfRangeList.length} employee(s) have workload values outside the range of 0.00 to 1.00. Please correct them first.`
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updates = targetEmployees.map((emp) => ({
        employeeId: emp.id,
        workload: workloadValues[emp.id] === "" ? null : parseFloat(workloadValues[emp.id]),
      }));

      const res = await API.put("/employees/bulk-workload", { updates });

      if (res.data.success || res.status === 200) {
        toast.success(`Successfully saved workloads for ${updates.length} employee(s) ✅`);
        setSuccess(`Workloads updated for ${updates.length} employee(s) successfully!`);

        // Update baseline original values
        setOriginalWorkloads((prev) => {
          const next = { ...prev };
          targetEmployees.forEach((emp) => {
            next[emp.id] = workloadValues[emp.id];
          });
          return next;
        });
      } else {
        throw new Error(res.data.message || "Failed to update workloads");
      }
    } catch (err) {
      console.error("Error bulk saving workloads:", err);
      const msg = err.response?.data?.message || err.message || "Failed to save workloads";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ================== FOCUS ROW INPUT (EDIT ACTION) ==================
  const handleFocusRow = (empId) => {
    if (inputRefs.current[empId]) {
      inputRefs.current[empId].focus();
      inputRefs.current[empId].select();
    }
  };

  // ================== CSV TEMPLATE DOWNLOAD ==================
  const handleDownloadTemplate = () => {
    const csvContent = "ticketNo,employeeName,workload\nEMP001,John Doe,1.0\nEMP002,Jane Smith,0.5\nEMP003,Alex Kumar,0.75\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "workload_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================== CSV PARSING FOR BULK UPLOAD MODAL ==================
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a valid .csv file");
      return;
    }

    setCsvFile(file);
    setUploadStats(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          toast.warning("CSV file contains no data rows.");
          setParsedRows([]);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]+/g, ""));
        const ticketIdx = headers.findIndex((h) => h.includes("ticket") || h.includes("code") || h.includes("empid"));
        const nameIdx = headers.findIndex((h) => h.includes("name"));
        const workloadIdx = headers.findIndex((h) => h.includes("workload"));

        if (ticketIdx === -1 || workloadIdx === -1) {
          toast.error("CSV headers must contain 'ticketNo' (or 'employeeCode') and 'workload'");
          return;
        }

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/['"]+/g, ""));
          if (cols.length > ticketIdx && cols.length > workloadIdx) {
            const ticket = cols[ticketIdx];
            const name = nameIdx !== -1 ? cols[nameIdx] : "";
            const workload = cols[workloadIdx];
            if (ticket) {
              parsed.push({ ticketNo: ticket, employeeName: name, workload });
            }
          }
        }
        setParsedRows(parsed);
        toast.info(`Parsed ${parsed.length} rows from CSV`);
      } catch (err) {
        console.error("CSV parse error:", err);
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  // ================== SUBMIT BULK UPLOAD MODAL ==================
  const handleConfirmBulkUpload = async () => {
    if (parsedRows.length === 0) {
      toast.warning("No rows parsed to upload.");
      return;
    }

    const invalidRows = parsedRows.filter((r) => isOutOfRange(r.workload));
    if (invalidRows.length > 0) {
      toast.error(`Cannot upload: ${invalidRows.length} row(s) have invalid workloads. All values must be between 0.00 and 1.00.`);
      return;
    }

    setIsUploading(true);
    try {
      const res = await API.post("/employees/bulk-upload-workload", {
        records: parsedRows,
        companyId: selectedCompanyId,
      });

      if (res.data.success || res.status === 200) {
        setUploadStats(res.data.results);
        toast.success(res.data.message || "Bulk workload upload completed successfully! ✅");
        // Reload employees to reflect database updates
        fetchEmployees(selectedCompanyId, selectedDepartmentId, statusFilter);
      } else {
        toast.error(res.data.message || "Failed to upload workloads");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      toast.error(err.response?.data?.message || err.message || "Error processing bulk upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ================= HEADER SECTION ================= */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-xl border border-blue-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <GraduationCap size={30} className="text-sky-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Trainee Workload Entry
              </h1>
              <span className="px-2.5 py-0.5 bg-sky-400/20 text-sky-200 border border-sky-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Trainees Only
              </span>
            </div>
            <p className="text-xs md:text-sm text-sky-200 mt-1">
              Assign and manage master workloads for Trainee employees taken from Employee Details
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setCsvFile(null);
              setParsedRows([]);
              setUploadStats(null);
              setShowBulkUploadModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Upload size={16} />
            <span>Bulk Upload (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || (selectedEmpIds.size === 0 && modifiedCount === 0)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save size={16} />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
            {(selectedEmpIds.size > 0 || modifiedCount > 0) && (
              <span className="ml-1 px-2 py-0.5 bg-slate-900/40 text-white rounded-full text-xs font-mono">
                {selectedEmpIds.size > 0 ? selectedEmpIds.size : modifiedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================= INFO NOTICE BANNER ================= */}
      <div className="bg-sky-50/90 border border-sky-200 text-sky-950 p-4 rounded-2xl shadow-sm flex items-start gap-3">
        <Info size={20} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5 leading-relaxed">
          <p className="font-bold text-sky-900">
            📌 Trainee-Specific Workload Assignment
          </p>
          <p className="text-sky-800">
            Only employees marked as <strong className="text-sky-950 font-bold">"Is Trainee"</strong> in Employee Details are displayed here. Non-training regular staff are excluded and maintain standard 100% capacity in Strength Reports (workload in DB is null).
          </p>
        </div>
      </div>

      {/* ================= ALERTS & NOTICES ================= */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 shadow-sm animate-in fade-in">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 shadow-sm animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* ================= FILTER CONTROLS CARD ================= */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* 1. Company */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Department
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              disabled={!selectedCompanyId}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentname || d.departmentName || d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Employment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all cursor-pointer"
            >
              <option value="Active">Active Only</option>
              <option value="">All Statuses</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Refresh / Stats */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchEmployees(selectedCompanyId, selectedDepartmentId, statusFilter)}
              disabled={loading || !selectedCompanyId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-sm rounded-xl border border-blue-200 shadow-sm transition-all"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : "text-blue-600"} />
              <span>{loading ? "Loading..." : "Refresh Trainees"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= SEARCH & BULK ENTRY TOOLBAR ================= */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Search Filter by Name / Ticket No */}
          <div className="lg:col-span-6 relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Search Trainee by Ticket Number / Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type Ticket No, Trainee Name, or Dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
              />
              <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Entry Input Bar (Applies to Selected Trainees) */}
          <div className={`lg:col-span-6 border p-3 rounded-xl transition-all ${
            isOutOfRange(bulkWorkloadInput)
              ? "bg-red-50/80 border-red-300 ring-2 ring-red-400"
              : "bg-sky-50 border-sky-200"
          }`}>
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-950 mb-1.5 flex items-center justify-between">
              <span>⚡ Bulk Trainee Workload Entry</span>
              <span className="text-[11px] font-semibold text-sky-800 lowercase">
                ({selectedEmpIds.size} trainee{selectedEmpIds.size === 1 ? "" : "s"} selected)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Enter workload (0.00 - 1.00)"
                value={bulkWorkloadInput}
                onChange={(e) => handleBulkWorkloadInputChange(e.target.value)}
                className={`w-full px-3.5 py-2 bg-white rounded-xl text-sm font-bold focus:outline-none shadow-sm transition-all ${
                  isOutOfRange(bulkWorkloadInput)
                    ? "border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-500"
                    : "border border-sky-300 text-slate-900 focus:ring-2 focus:ring-sky-600"
                }`}
              />
              <button
                type="button"
                onClick={handleApplyBulkEntry}
                disabled={selectedEmpIds.size === 0 || !bulkWorkloadInput || isOutOfRange(bulkWorkloadInput)}
                className="whitespace-nowrap px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Apply to Selected
              </button>
            </div>
            {isOutOfRange(bulkWorkloadInput) && (
              <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                <span>Workload must be between 0.00 and 1.00 (e.g. 0.25, 0.5, 0.75, 1.0)</span>
              </p>
            )}
          </div>

        </div>

        {/* Quick Toolbar Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="font-semibold">
              Showing <strong className="text-blue-900">{filteredEmployees.length}</strong> Trainee Employees
            </span>
            {selectedEmpIds.size > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full border border-blue-200">
                {selectedEmpIds.size} Selected
              </span>
            )}
            {modifiedCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full border border-amber-300">
                {modifiedCount} Modified (Unsaved)
              </span>
            )}
            {hasAnyOutOfRange && (
              <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-bold rounded-full border border-red-300">
                ⚠️ Out of Range Values Present
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ================= EMPLOYEES WORKLOAD TABLE ================= */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[580px] relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 shadow-md">
              <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider select-none">
                {/* Select All Checkbox */}
                <th className="p-3.5 text-center w-12 border-b border-slate-700 bg-slate-800 sticky top-0 z-20">
                  <div
                    onClick={toggleSelectAll}
                    className="cursor-pointer flex items-center justify-center text-sky-400 hover:text-sky-300"
                    title="Select / Deselect All"
                  >
                    {selectedEmpIds.size > 0 && selectedEmpIds.size === filteredEmployees.length ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} className="text-slate-400 hover:text-white" />
                    )}
                  </div>
                </th>
                <th className="p-3.5 text-left border-b border-slate-700 bg-slate-800 sticky top-0 z-20 w-16">S.No</th>
                <th className="p-3.5 text-left border-b border-slate-700 bg-slate-800 sticky top-0 z-20">Employee ID</th>
                <th className="p-3.5 text-left border-b border-slate-700 bg-slate-800 sticky top-0 z-20">Ticket Num</th>
                <th className="p-3.5 text-left border-b border-slate-700 bg-slate-800 sticky top-0 z-20">Employee Name</th>
                <th className="p-3.5 text-left border-b border-slate-700 bg-slate-800 sticky top-0 z-20">Department</th>
                <th className="p-3.5 text-center border-b border-slate-700 bg-slate-800 sticky top-0 z-20 w-32">Status</th>
                <th className="p-3.5 text-left border-b border-slate-700 bg-slate-800 sticky top-0 z-20 w-48">
                  Workload (0 - 1) <span className="text-red-400">*</span>
                </th>
                <th className="p-3.5 text-center border-b border-slate-700 bg-slate-800 sticky top-0 z-20 w-36">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={28} className="animate-spin text-blue-600" />
                      <p className="font-semibold text-slate-700 text-sm">Loading trainee employees...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-lg mx-auto">
                      <div className="p-4 bg-sky-50 rounded-full text-sky-600">
                        <GraduationCap size={36} />
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {searchTerm ? "No matching trainee employees found." : "No Trainee Employees Found"}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {searchTerm
                          ? "Try searching for a different name or ticket number."
                          : "This page displays only employees marked with 'Is Trainee' in Employee Details. If you need to set workload for an employee, open Employee Management, edit the employee profile, and check 'Is Trainee' under Basic Info."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => {
                  const isSelected = selectedEmpIds.has(emp.id);
                  const val = workloadValues[emp.id] ?? "";
                  const isModified = val !== (originalWorkloads[emp.id] ?? "");
                  const isInvalid = isOutOfRange(val);
                  const isRowSaving = savingRowId === emp.id;

                  return (
                    <tr
                      key={emp.id}
                      className={`transition-colors duration-150 ${
                        isSelected
                          ? "bg-blue-50/70"
                          : isInvalid
                          ? "bg-red-50/50"
                          : isModified
                          ? "bg-amber-50/40"
                          : index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/60"
                      } hover:bg-sky-50/60`}
                    >
                      {/* Select Checkbox */}
                      <td className="p-3.5 text-center">
                        <div
                          onClick={() => toggleSelectRow(emp.id)}
                          className="cursor-pointer flex items-center justify-center text-blue-600 hover:text-blue-800"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-slate-300 hover:text-slate-500" />
                          )}
                        </div>
                      </td>

                      {/* S.No */}
                      <td className="p-3.5 text-xs font-mono font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* Employee ID */}
                      <td className="p-3.5 text-xs font-mono font-bold text-slate-800">
                        {emp.id}
                      </td>

                      {/* Ticket Num */}
                      <td className="p-3.5 text-sm font-mono font-extrabold text-blue-900">
                        {emp.employeeCode || emp.ticketNo || "-"}
                      </td>

                      {/* Employee Name */}
                      <td className="p-3.5">
                        <div className="text-sm font-bold text-slate-900">
                          {emp.firstName}
                        </div>
                        {emp.designation?.name && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {emp.designation.name}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="p-3.5 text-xs font-semibold text-slate-700">
                        {emp.department?.departmentname || emp.departmentName || "-"}
                      </td>

                      {/* Trainee Status Badge */}
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                          <GraduationCap size={13} className="text-purple-600" />
                          <span>Trainee</span>
                        </span>
                      </td>

                      {/* Workload Input Box (0.00 to 1.00) */}
                      <td className="p-3.5">
                        <div className="relative">
                          <input
                            ref={(el) => (inputRefs.current[emp.id] = el)}
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            placeholder="0.00"
                            value={val}
                            onChange={(e) => handleWorkloadChange(emp.id, e.target.value)}
                            className={`w-full px-3 py-1.5 text-sm font-bold rounded-xl border focus:outline-none transition-all ${
                              isInvalid
                                ? "bg-red-50 border-2 border-red-500 text-red-950 focus:ring-2 focus:ring-red-500 font-black shadow-inner"
                                : isModified
                                ? "bg-amber-50 border-amber-400 text-amber-950 focus:ring-amber-500 font-black shadow-inner"
                                : "bg-white border-slate-300 text-slate-900 focus:ring-blue-500"
                            }`}
                          />
                          {isInvalid && (
                            <div className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                              <AlertCircle size={11} className="text-red-500 flex-shrink-0" />
                              <span>0.00 - 1.00 only</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualRow(emp)}
                            disabled={isRowSaving || !isModified || isInvalid}
                            title={
                              isInvalid
                                ? "Workload must be between 0 and 1"
                                : isModified
                                ? "Save changes for this employee"
                                : "No changes to save"
                            }
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                          >
                            {isRowSaving ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFocusRow(emp.id)}
                            title="Focus & Edit Workload"
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Action Bar */}
        {filteredEmployees.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 font-medium">
              <span>
                Total: <strong>{filteredEmployees.length}</strong> Trainee employees | Selected:{" "}
                <strong className="text-blue-900">{selectedEmpIds.size}</strong> | Modified:{" "}
                <strong className="text-amber-700">{modifiedCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || (selectedEmpIds.size === 0 && modifiedCount === 0) || hasAnyOutOfRange}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Save size={16} />
                <span>{saving ? "Saving..." : "Save All Workloads"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= BULK UPLOAD CSV MODAL ================= */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden transform animate-in fade-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-6 py-4 flex justify-between items-center border-b border-blue-950">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} className="text-sky-300" />
                <div>
                  <h3 className="text-lg font-black tracking-tight">Bulk Workload Upload</h3>
                  <p className="text-xs text-sky-200">Upload CSV with ticket number, employee name, and workload</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(false)}
                className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-slate-50">
              {/* Step 1: Download Template */}
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-sky-950">1. Download CSV Template</h4>
                  <p className="text-xs text-sky-800 mt-0.5">
                    CSV format must have columns: <code className="bg-sky-200/70 px-1 py-0.5 rounded text-sky-950 font-mono">ticketNo, employeeName, workload</code>
                  </p>
                  <p className="text-[11px] text-sky-700 mt-1 italic">
                    Note: Workload values (0.00 - 1.00) apply only to Trainee employees.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-sky-100 text-sky-900 font-bold text-xs rounded-lg border border-sky-300 shadow-sm transition-all whitespace-nowrap"
                >
                  <Download size={14} />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* Step 2: Upload CSV File */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  2. Select CSV File to Upload
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-white cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {csvFile && (
                    <p className="text-xs font-semibold text-emerald-700 mt-2">
                      Selected: <strong>{csvFile.name}</strong> ({parsedRows.length} rows parsed)
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Preview Parsed Rows */}
              {parsedRows.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                    <span>3. Preview Parsed Records ({parsedRows.length} rows)</span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-inner">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Ticket No</th>
                          <th className="p-2 text-left">Employee Name</th>
                          <th className="p-2 text-right">Workload</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 50).map((row, idx) => {
                          const invalid = isOutOfRange(row.workload);
                          return (
                            <tr key={idx} className={invalid ? "bg-red-50" : "hover:bg-slate-50"}>
                              <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="p-2 font-mono font-bold text-blue-900">{row.ticketNo}</td>
                              <td className="p-2 font-medium text-slate-800">{row.employeeName || "-"}</td>
                              <td className={`p-2 font-mono font-bold text-right ${invalid ? "text-red-700 font-black" : "text-emerald-700"}`}>
                                {row.workload}
                              </td>
                              <td className="p-2 text-center">
                                {invalid ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full border border-red-200">
                                    Invalid (Must be 0-1)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                                    Valid
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 50 && (
                    <p className="text-[11px] text-slate-500 mt-1 italic">Showing first 50 rows of {parsedRows.length} total rows.</p>
                  )}
                </div>
              )}

              {/* Upload Results Feedback */}
              {uploadStats && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>Upload Completed</span>
                  </div>
                  <div className="text-emerald-800">
                    Total: {uploadStats.total} | Updated: <strong>{uploadStats.updated}</strong> | Not Found: <strong>{uploadStats.notFound}</strong> | Failed: <strong>{uploadStats.failed}</strong>
                  </div>
                  {uploadStats.errors?.length > 0 && (
                    <div className="mt-2 max-h-24 overflow-y-auto text-[11px] text-red-700 bg-red-50 p-2 rounded border border-red-200">
                      {uploadStats.errors.map((e, idx) => (
                        <div key={idx}>Row {e.row}: {e.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkUploadModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkUpload}
                disabled={isUploading || parsedRows.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Confirm & Upload Workloads</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkloadManagement;
