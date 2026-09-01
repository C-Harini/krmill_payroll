import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInMinutes, parseISO } from "date-fns";
import API from "../api";
import { toast } from "react-toastify";
import {
  Search,
  Save,
  XCircle,
  Trash2,
  Clock,
  Layers,
  CheckSquare,
  AlertCircle,
  Database,
  Filter,
  Users,
  Edit3
} from "lucide-react";

const OT_TYPE_OPTIONS = ["HOURS OT", "FULL TIME OT"];

const OvertimeMultipleEntry = () => {
  const navigate = useNavigate();

  // --- Core Configuration States ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Form Controls (Image 1) ---
  const [deptInput, setDeptInput] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [workedDeptInput, setWorkedDeptInput] = useState("");
  const [selectedWorkedDeptId, setSelectedWorkedDeptId] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Date-Time pickers for From Time and To Time
  const [fromTime, setFromTime] = useState(`${format(new Date(), "yyyy-MM-dd")}T08:00`);
  const [toTime, setToTime] = useState(`${format(new Date(), "yyyy-MM-dd")}T17:00`);

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedOtType, setSelectedOtType] = useState("HOURS OT");
  const [calculatedOtHours, setCalculatedOtHours] = useState(0);

  // --- Dual Grid Data States ---
  const [unsavedEmployees, setUnsavedEmployees] = useState([]);
  const [selectedLeftEmpIds, setSelectedLeftEmpIds] = useState(new Set());
  const [leftSearch, setLeftSearch] = useState("");

  const [savedData, setSavedData] = useState([]);
  const [selectedSavedIds, setSelectedSavedIds] = useState(new Set());
  const [rightSearch, setRightSearch] = useState("");

  // --- Dept Selection Popup Modal ---
  const [showDeptPopup, setShowDeptPopup] = useState(false);
  const [popupTarget, setPopupTarget] = useState("");
  const [popupSearch, setPopupSearch] = useState("");

  // --- Edit Modal State (Image 2) ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editFromTime, setEditFromTime] = useState("");
  const [editToTime, setEditToTime] = useState("");
  const [editOtType, setEditOtType] = useState("HOURS OT");
  const [editShiftId, setEditShiftId] = useState("");
  const [editWorkedDeptId, setEditWorkedDeptId] = useState("");
  const [editOtHours, setEditOtHours] = useState(0);
  const [editDate, setEditDate] = useState("");

  // Initial Bootstrap
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchShifts();
    }
  }, [selectedCompanyId]);

  // Auto calculate OT Hours when From Time, To Time, or OT Type changes
  useEffect(() => {
    calculateHours(fromTime, toTime, selectedOtType, setCalculatedOtHours);
  }, [fromTime, toTime, selectedOtType]);

  useEffect(() => {
    if (editFromTime && editToTime) {
      calculateHours(editFromTime, editToTime, editOtType, setEditOtHours);
    }
  }, [editFromTime, editToTime, editOtType]);

  // Load Grids on Filter Change
  useEffect(() => {
    if (selectedCompanyId && selectedDeptId && entryDate) {
      fetchMultipleEntryData();
    } else {
      setUnsavedEmployees([]);
      setSavedData([]);
    }
  }, [selectedCompanyId, selectedDeptId, entryDate, selectedWorkedDeptId, selectedShiftId]);

  // Helper to calculate OT Hours with Full Time OT capping rule (Capped at 8 hours)
  const calculateHours = (fromStr, toStr, type, setHoursState) => {
    if (!fromStr || !toStr) {
      setHoursState(0);
      return;
    }
    try {
      const fromDate = new Date(fromStr);
      const toDate = new Date(toStr);
      let diffMins = differenceInMinutes(toDate, fromDate);
      if (diffMins < 0) {
        diffMins += 24 * 60; // handle overnight shifts
      }
      let hours = Math.round((diffMins / 60) * 100) / 100;

      // FULL TIME OT capping rule: if FULL TIME OT and > 8 hours, cap at 8!
      if (String(type).toUpperCase().includes("FULL TIME") || String(type).toUpperCase().includes("FULL OT")) {
        if (hours > 8 || hours === 0) {
          hours = 8;
        }
      }

      setHoursState(hours);
    } catch (err) {
      console.error("Error calculating hours:", err);
      setHoursState(0);
    }
  };

  // API Fetchers
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
        params: { companyId: selectedCompanyId, limit: 300 }
      });
      const list = data.data || (Array.isArray(data) ? data : []);
      setDepartments(list);

      if (list.length > 0 && !selectedDeptId) {
        setSelectedDeptId(list[0].id);
        setDeptInput(list[0].departmentname);
        setSelectedWorkedDeptId(list[0].id);
        setWorkedDeptInput(list[0].departmentname);
      }
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
      const allShifts = Array.isArray(data) ? data : data.data || [];
      const list = allShifts.filter((s) => {
        const n = String(s.name || "").trim().toUpperCase();
        return n === "A" || n === "B" || n === "C";
      });
      setShifts(list);
      if (list.length > 0) {
        setSelectedShiftId(list[0].id);
      }
    } catch (err) {
      console.error("Error fetching shifts:", err);
      toast.error("Failed to load shifts");
    }
  };

  const fetchMultipleEntryData = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/ot-hours/multiple-entry", {
        params: {
          companyId: selectedCompanyId,
          departmentId: selectedDeptId,
          workedDeptId: selectedWorkedDeptId,
          date: entryDate,
          shiftId: selectedShiftId
        }
      });

      if (data.success) {
        const unsaved = [...(data.unsavedEmployees || data.employees || [])].sort(sortByAlphabetical);
        const saved = [...(data.savedRecords || data.data || [])].sort(sortByAlphabetical);
        setUnsavedEmployees(unsaved);
        setSavedData(saved);
        setSelectedLeftEmpIds(new Set());
        setSelectedSavedIds(new Set());
      } else {
        toast.error(data.message || "Failed to load OT data");
      }
    } catch (err) {
      console.error("Error fetching OT data:", err);
      toast.error(err.response?.data?.message || "Failed to load OT records");
    } finally {
      setLoading(false);
    }
  };

  // Popup Department Selection
  const handleOpenDeptPopup = (target) => {
    setPopupTarget(target);
    setPopupSearch("");
    setShowDeptPopup(true);
  };

  const handleSelectDeptItem = (dept) => {
    if (popupTarget === "department") {
      setSelectedDeptId(dept.id);
      setDeptInput(dept.departmentname);
      if (!selectedWorkedDeptId || workedDeptInput === deptInput) {
        setSelectedWorkedDeptId(dept.id);
        setWorkedDeptInput(dept.departmentname);
      }
    } else {
      setSelectedWorkedDeptId(dept.id);
      setWorkedDeptInput(dept.departmentname);
    }
    setShowDeptPopup(false);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.departmentname.toLowerCase().includes(popupSearch.toLowerCase()) ||
    (dept.acronym && dept.acronym.toLowerCase().includes(popupSearch.toLowerCase()))
  );

  // Helper: Alphabetical sort by employee name (A to Z)
  const sortByAlphabetical = (a, b) => {
    const nameA = String(a.employeeName || a.empName || "").trim().toUpperCase();
    const nameB = String(b.employeeName || b.empName || "").trim().toUpperCase();
    const nameCompare = nameA.localeCompare(nameB);
    if (nameCompare !== 0) return nameCompare;

    const codeA = String(a.ticketNo || a.employeeCode || a.employeeId || "").trim();
    const codeB = String(b.ticketNo || b.employeeCode || b.employeeId || "").trim();
    const numA = parseInt(codeA.replace(/[^0-9]/g, ""), 10);
    const numB = parseInt(codeB.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
  };

  // Selection logic for left table
  const filteredUnsavedEmployees = useMemo(() => {
    return unsavedEmployees
      .filter((emp) =>
        (emp.ticketNo && emp.ticketNo.toLowerCase().includes(leftSearch.toLowerCase())) ||
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(leftSearch.toLowerCase())) ||
        (emp.empName && emp.empName.toLowerCase().includes(leftSearch.toLowerCase())) ||
        (emp.category && emp.category.toLowerCase().includes(leftSearch.toLowerCase()))
      )
      .sort(sortByAlphabetical);
  }, [unsavedEmployees, leftSearch]);

  const toggleSelectLeftEmp = (empId) => {
    setSelectedLeftEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const toggleSelectAllLeft = () => {
    if (selectedLeftEmpIds.size === filteredUnsavedEmployees.length && filteredUnsavedEmployees.length > 0) {
      setSelectedLeftEmpIds(new Set());
    } else {
      setSelectedLeftEmpIds(new Set(filteredUnsavedEmployees.map((emp) => emp.employeeId)));
    }
  };

  // Selection logic for right table
  const filteredSavedData = useMemo(() => {
    return savedData
      .filter((item) =>
        (item.ticketNo && item.ticketNo.toLowerCase().includes(rightSearch.toLowerCase())) ||
        (item.employeeCode && item.employeeCode.toLowerCase().includes(rightSearch.toLowerCase())) ||
        (item.employeeName && item.employeeName.toLowerCase().includes(rightSearch.toLowerCase())) ||
        String(item.id).includes(rightSearch) ||
        (item.category && item.category.toLowerCase().includes(rightSearch.toLowerCase()))
      )
      .sort(sortByAlphabetical);
  }, [savedData, rightSearch]);

  const toggleSelectSavedItem = (id) => {
    setSelectedSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllSaved = () => {
    if (selectedSavedIds.size === filteredSavedData.length && filteredSavedData.length > 0) {
      setSelectedSavedIds(new Set());
    } else {
      setSelectedSavedIds(new Set(filteredSavedData.map((item) => item.id)));
    }
  };

  // Action: Save checked employees to OT
  const handleSaveOT = async () => {
    if (selectedLeftEmpIds.size === 0) {
      toast.warning("Please select one or more employees from the list to save OT.");
      return;
    }

    if (!selectedDeptId || !selectedWorkedDeptId || !selectedShiftId) {
      toast.warning("Please select Department, Work Dept, and Shift.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyId: selectedCompanyId,
        departmentId: selectedDeptId,
        workedDeptId: selectedWorkedDeptId,
        date: entryDate,
        shiftId: selectedShiftId,
        fromTime,
        toTime,
        otType: selectedOtType,
        otHours: calculatedOtHours,
        employeeIds: Array.from(selectedLeftEmpIds),
      };

      const { data } = await API.post("/ot-hours/multiple-entry", payload);
      if (data.success) {
        toast.success(`Successfully saved OT for ${selectedLeftEmpIds.size} employee(s)!`);
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Failed to save OT records");
      }
    } catch (err) {
      console.error("Save OT error:", err);
      toast.error(err.response?.data?.message || "Failed to save OT records");
    } finally {
      setLoading(false);
    }
  };

  // Action: Multi-Delete saved OT entries
  const handleMultiDelete = async () => {
    if (selectedSavedIds.size === 0) {
      toast.info("Please select saved OT entries to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSavedIds.size} saved OT record(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ids: Array.from(selectedSavedIds),
      };

      const { data } = await API.post("/ot-hours/multiple-entry/delete", payload);
      if (data.success) {
        toast.success("Selected saved OT records deleted.");
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Deletion failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete OT records");
    } finally {
      setLoading(false);
    }
  };

  // Action: Open Edit Modal (Image 2)
  const handleOpenEditModal = (record) => {
    setEditRecord(record);
    setEditDate(record.date ? format(new Date(record.date), "yyyy-MM-dd") : entryDate);
    setEditFromTime(record.fromTime || `${entryDate}T08:00`);
    setEditToTime(record.toTime || `${entryDate}T17:00`);
    setEditOtType(record.otType || "HOURS OT");
    setEditShiftId(record.shiftId || selectedShiftId);
    setEditWorkedDeptId(record.workedDeptId || selectedWorkedDeptId);
    setEditOtHours(record.otHours || 0);
    setShowEditModal(true);
  };

  // Action: Submit Edit Modal Update
  const handleUpdateSingleOT = async () => {
    if (!editRecord) return;
    setLoading(true);
    try {
      const payload = {
        workedDeptId: editWorkedDeptId,
        shiftId: editShiftId,
        fromTime: editFromTime,
        toTime: editToTime,
        otType: editOtType,
        otHours: editOtHours,
        date: editDate,
      };

      const { data } = await API.put(`/ot-hours/multiple-entry/${editRecord.id}`, payload);
      if (data.success) {
        const shiftChanged = editRecord.shiftId && String(editRecord.shiftId) !== String(editShiftId);
        const newShiftObj = shifts.find((s) => String(s.id) === String(editShiftId));
        if (shiftChanged && newShiftObj) {
          toast.success(`OT shift updated to "${newShiftObj.name}". Filter by Shift ${newShiftObj.name} to view this record.`);
        } else {
          toast.success("OT entry updated successfully!");
        }
        setShowEditModal(false);
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.response?.data?.message || "Failed to update record");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedLeftEmpIds(new Set());
    setSelectedSavedIds(new Set());
    toast.info("Cleared selections.");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans">
      {/* Container Window Frame */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-blue-200 overflow-hidden">

        {/* Top Header Window Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 px-6 py-4 text-white flex flex-wrap justify-between items-center shadow-md border-b border-blue-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm">
              <Clock size={22} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                Over Time Multiple Entry
              </h1>
              <p className="text-xs text-blue-200 font-medium">HR Module — Over Time Processing & Auto Capping</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 md:mt-0">
            {companies.length > 1 && (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-blue-950/60 border border-blue-400/40 rounded-xl px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:bg-blue-900 cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <span className="bg-blue-500/25 border border-blue-400/40 text-blue-200 text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              ot_hours
            </span>
          </div>
        </div>

        {/* Form Controls Section (Image 1 Layout) */}
        <div className="p-5 bg-gradient-to-b from-blue-50/50 to-white border-b border-blue-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

            {/* 1. Department */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <div
                onClick={() => handleOpenDeptPopup("department")}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 hover:border-blue-600 rounded-xl cursor-pointer text-slate-800 text-sm font-semibold flex justify-between items-center shadow-sm transition-all"
              >
                <span className={deptInput ? "text-blue-950 font-bold" : "text-slate-400"}>
                  {deptInput || "Select Dept"}
                </span>
                <Search size={16} className="text-blue-500" />
              </div>
            </div>

            {/* 2. Work Dept */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Work Dept
              </label>
              <div
                onClick={() => handleOpenDeptPopup("workedDept")}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 hover:border-blue-600 rounded-xl cursor-pointer text-slate-800 text-sm font-semibold flex justify-between items-center shadow-sm transition-all"
              >
                <span className={workedDeptInput ? "text-blue-950 font-bold" : "text-slate-400"}>
                  {workedDeptInput || "Select Work Dept"}
                </span>
                <Search size={16} className="text-blue-500" />
              </div>
            </div>

            {/* 3. Date */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => {
                  setEntryDate(e.target.value);
                  setFromTime(`${e.target.value}T08:00`);
                  setToTime(`${e.target.value}T17:00`);
                }}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm transition-all"
              />
            </div>

            {/* 4. Shift */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Shift
              </label>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm cursor-pointer transition-all"
              >
                <option value="">Select Shift</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. From Time */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                From Time
              </label>
              <input
                type="datetime-local"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm transition-all"
              />
            </div>

            {/* 6. To Time */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                To Time
              </label>
              <input
                type="datetime-local"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm transition-all"
              />
            </div>

            {/* 7. OT Hours (Auto Generated Readout) */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                OT Hours (Auto Generated)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={calculatedOtHours}
                  onChange={(e) => setCalculatedOtHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-blue-100/70 border border-blue-400 rounded-xl text-blue-950 text-sm font-black focus:outline-none shadow-sm font-mono"
                />
                <span className="absolute right-3 text-xs font-bold text-blue-700 uppercase">hrs</span>
              </div>
            </div>

            {/* 8. OT Type */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                OT Type
              </label>
              <select
                value={selectedOtType}
                onChange={(e) => setSelectedOtType(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm cursor-pointer transition-all"
              >
                {OT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Dual Grid Layout (Side-by-Side Split View) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-blue-200 divide-y lg:divide-y-0 lg:divide-x divide-blue-200">

          {/* ================= LEFT SIDE: Employee Checklist ================= */}
          <div className="p-4 bg-sky-50/40 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-700" />
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                  Employee List
                </h3>
                <span className="bg-blue-100 text-blue-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-300">
                  {filteredUnsavedEmployees.length} Available
                </span>
              </div>

              <div className="relative w-44">
                <input
                  type="text"
                  placeholder="Filter..."
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs border border-blue-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                />
                <Filter size={12} className="absolute left-2 top-2 text-blue-400" />
              </div>
            </div>

            {/* Left Table */}
            <div className="flex-1 border border-blue-200 rounded-xl bg-white overflow-hidden shadow-inner flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-blue-900 text-white font-bold z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-left w-28 border-r border-blue-800">Tkt.No</th>
                      <th className="py-2.5 px-3 text-left border-r border-blue-800">Emp Name</th>
                      <th className="py-2.5 px-3 text-center w-16">
                        <div className="flex items-center justify-center gap-1">
                          <span>Sel</span>
                          <input
                            type="checkbox"
                            checked={
                              filteredUnsavedEmployees.length > 0 &&
                              selectedLeftEmpIds.size === filteredUnsavedEmployees.length
                            }
                            onChange={toggleSelectAllLeft}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="py-12 text-center text-slate-400">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-700 border-t-transparent mb-2"></div>
                          <p className="text-xs font-semibold text-blue-800">Loading department employees...</p>
                        </td>
                      </tr>
                    ) : filteredUnsavedEmployees.length > 0 ? (
                      filteredUnsavedEmployees.map((emp) => {
                        const isChecked = selectedLeftEmpIds.has(emp.employeeId);
                        return (
                          <tr
                            key={emp.employeeId}
                            className={`hover:bg-blue-50/70 transition-colors ${isChecked ? "bg-blue-100/90 font-semibold text-blue-950" : "text-slate-800"
                              }`}
                          >
                            <td className="py-2 px-3 border-r border-blue-100 font-bold font-mono text-blue-900">
                              {emp.ticketNo || emp.employeeCode || emp.employeeId || "-"}
                            </td>
                            <td className="py-2 px-3 border-r border-blue-100 uppercase font-semibold text-slate-900">
                              {emp.empName}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectLeftEmp(emp.employeeId)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-16 text-center text-slate-400">
                          <AlertCircle size={24} className="mx-auto mb-1 text-blue-300" />
                          <p className="text-xs font-semibold text-slate-600">No unsaved employees found.</p>
                          <p className="text-[11px] text-slate-400">Select department to load list.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center text-[11px] text-blue-900 px-1 font-bold">
              <span>Selected for OT: <strong className="text-blue-700 font-black">{selectedLeftEmpIds.size}</strong></span>
              <span>Total Available: {unsavedEmployees.length}</span>
            </div>
          </div>

          {/* ================= RIGHT SIDE: Saved Data ================= */}
          <div className="p-4 bg-indigo-50/40 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-blue-900" />
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                  Saved Data
                </h3>
                <span className="bg-indigo-100 text-indigo-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-300">
                  {filteredSavedData.length} Saved
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-32">
                  <input
                    type="text"
                    placeholder="Search saved..."
                    value={rightSearch}
                    onChange={(e) => setRightSearch(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 text-xs border border-blue-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  />
                  <Filter size={11} className="absolute left-2 top-2 text-blue-400" />
                </div>

                <button
                  onClick={handleMultiDelete}
                  disabled={selectedSavedIds.size === 0}
                  className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold px-3 py-1 rounded-lg shadow border border-rose-700 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} />
                  Multi-Delete {selectedSavedIds.size > 0 && `(${selectedSavedIds.size})`}
                </button>
              </div>
            </div>

            {/* Right Table Container (Saved Data) */}
            <div className="flex-1 border border-blue-200 rounded-xl bg-white overflow-hidden shadow-inner flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-blue-900 text-white font-bold z-10">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-9 border-r border-blue-800">
                        <input
                          type="checkbox"
                          checked={
                            filteredSavedData.length > 0 &&
                            selectedSavedIds.size === filteredSavedData.length
                          }
                          onChange={toggleSelectAllSaved}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 text-left w-16 border-r border-blue-800">ID</th>
                      <th className="py-2.5 px-1 text-center w-10 border-r border-blue-800">Sl.No</th>
                      <th className="py-2.5 px-2.5 text-left w-20 border-r border-blue-800">TktNo</th>
                      <th className="py-2.5 px-3 text-left border-r border-blue-800">Emp Name</th>
                      <th className="py-2.5 px-1.5 text-center w-12 border-r border-blue-800">Shift</th>
                      <th className="py-2.5 px-2 text-center w-14 border-r border-blue-800">Cat</th>
                      <th className="py-2.5 px-2 text-center w-20 border-r border-blue-800">OT Hours</th>
                      <th className="py-2.5 px-2 text-center w-12">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="py-12 text-center text-slate-400">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-700 border-t-transparent mb-2"></div>
                          <p className="text-xs font-semibold text-blue-800">Loading saved OT records...</p>
                        </td>
                      </tr>
                    ) : filteredSavedData.length > 0 ? (
                      filteredSavedData.map((item, index) => {
                        const isChecked = selectedSavedIds.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            onDoubleClick={() => handleOpenEditModal(item)}
                            className={`hover:bg-blue-50/70 transition-colors ${isChecked ? "bg-indigo-100/90 font-semibold text-indigo-950" : "text-slate-800"
                              }`}
                          >
                            <td className="py-2 px-2 text-center border-r border-blue-100">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectSavedItem(item.id)}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-2 border-r border-blue-100 font-mono text-blue-900 font-bold">
                              {item.id}
                            </td>
                            <td className="py-2 px-1 border-r border-blue-100 text-center font-semibold text-slate-600">
                              {index + 1}
                            </td>
                            <td className="py-2 px-2.5 border-r border-blue-100 font-bold font-mono text-slate-900">
                              {item.ticketNo || item.employeeCode || item.employeeId || "-"}
                            </td>
                            <td className="py-2 px-3 border-r border-blue-100 uppercase font-semibold text-slate-900">
                              {item.employeeName}
                            </td>
                            <td className="py-2 px-1.5 border-r border-blue-100 text-center font-bold text-blue-950">
                              {item.shiftName}
                            </td>
                            <td className="py-2 px-2 border-r border-blue-100 text-center font-bold text-slate-700">
                              {item.category}
                            </td>
                            <td className="py-2 px-2 border-r border-blue-100 text-center font-black font-mono text-blue-900">
                              {item.otHours}
                            </td>
                            <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                <Edit3 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="py-16 text-center text-slate-400">
                          <CheckSquare size={24} className="mx-auto mb-1 text-blue-300" />
                          <p className="text-xs font-semibold text-slate-600">No saved OT data for selected filters.</p>
                          <p className="text-[11px] text-slate-400">Check employees from left grid & click Save.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center text-[11px] text-indigo-950 px-1 font-bold">
              <span>Selected for deletion: <strong className="text-rose-700 font-black">{selectedSavedIds.size}</strong></span>
              <span>Total Saved Records: {savedData.length}</span>
            </div>
          </div>

        </div>

        {/* Bottom Action Footer */}
        <div className="px-6 py-4 bg-blue-50/70 border-t border-blue-200 flex justify-center items-center gap-4">
          <button
            onClick={handleSaveOT}
            disabled={selectedLeftEmpIds.size === 0 || loading}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm px-8 py-2.5 rounded-xl shadow-lg border border-emerald-700 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            <span>Save</span>
          </button>

          <button
            onClick={handleCancel}
            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-sm px-7 py-2.5 rounded-xl shadow-md border border-rose-700 transition-all flex items-center gap-2"
          >
            <XCircle size={18} />
            <span>Cancel</span>
          </button>
        </div>

      </div>

      {/* --- Department Selection Popup Modal --- */}
      {showDeptPopup && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-blue-300 shadow-2xl w-full max-w-md overflow-hidden transform scale-95 duration-200 animate-in fade-in flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-blue-950">
              <div>
                <h3 className="text-base font-bold">Select Department</h3>
                <p className="text-xs text-blue-200">
                  Select {popupTarget === "department" ? "Department" : "Work Dept"}
                </p>
              </div>
              <button
                onClick={() => setShowDeptPopup(false)}
                className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 divide-y divide-blue-50">
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => handleSelectDeptItem(dept)}
                    className="px-4 py-2.5 hover:bg-blue-50 text-slate-800 text-sm font-semibold cursor-pointer rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>{dept.departmentname}</span>
                    {dept.acronym && (
                      <span className="text-[11px] bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono">
                        {dept.acronym}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  No matching departments found
                </div>
              )}
            </div>

            <div className="p-3.5 bg-blue-50/60 border-t border-blue-200">
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                Search
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={popupSearch}
                  onChange={(e) => setPopupSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-blue-300 rounded-xl text-blue-950 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white shadow-sm"
                  autoFocus
                />
                <Search size={15} className="absolute left-3 text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Over Time Entry Edit Modal Popup (Image 2) --- */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-2xl w-full max-w-lg overflow-hidden transform scale-95 duration-200 animate-in fade-in flex flex-col">

            {/* Modal Header (Image 2 design) */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-6 py-4 flex justify-between items-center border-b border-blue-950">
              <div>
                <h3 className="text-lg font-black tracking-tight">Over Time Entry</h3>
                <p className="text-xs text-blue-200 font-medium">To Add, Modify over time details.</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 bg-slate-50 space-y-4">

              {/* Emp Code & Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Emp. Code</label>
                  <input
                    type="text"
                    value={editRecord.employeeCode || editRecord.ticketNo || editRecord.employeeId}
                    disabled
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Emp Name</label>
                  <input
                    type="text"
                    value={editRecord.employeeName}
                    disabled
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold uppercase"
                  />
                </div>
              </div>

              {/* Ticket No & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Ticket No.</label>
                  <input
                    type="text"
                    value={editRecord.ticketNo || editRecord.employeeCode}
                    disabled
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm cursor-pointer"
                  />
                </div>
              </div>

              {/* Worked Dept */}
              <div>
                <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Worked Dept</label>
                <select
                  value={editWorkedDeptId}
                  onChange={(e) => setEditWorkedDeptId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer shadow-sm"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentname}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Time & To Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">From Time</label>
                  <input
                    type="datetime-local"
                    value={editFromTime}
                    onChange={(e) => setEditFromTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">To Time</label>
                  <input
                    type="datetime-local"
                    value={editToTime}
                    onChange={(e) => setEditToTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* OT Hours & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">OT Hours (Auto Generated)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editOtHours}
                    onChange={(e) => setEditOtHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-blue-100/80 border border-blue-400 rounded-xl text-blue-950 text-xs font-black font-mono shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Shift</label>
                  <select
                    value={editShiftId}
                    onChange={(e) => setEditShiftId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer shadow-sm"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* OT Type */}
              <div>
                <label className="block text-xs font-bold text-blue-950 uppercase mb-1">OT Type</label>
                <select
                  value={editOtType}
                  onChange={(e) => setEditOtType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer shadow-sm"
                >
                  {OT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Modal Action Buttons (Image 2 buttons) */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={handleUpdateSingleOT}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-6 py-2 rounded-xl shadow-md border border-emerald-700 transition-all flex items-center gap-1.5"
              >
                <Save size={15} />
                <span>Update</span>
              </button>

              <button
                onClick={() => setShowEditModal(false)}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md border border-rose-700 transition-all flex items-center gap-1.5"
              >
                <XCircle size={15} />
                <span>Cancel</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeMultipleEntry;