import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import API from "../api";
import { toast } from "react-toastify";
import {
  Search,
  Save,
  XCircle,
  Trash2,
  Layers,
  UserCheck,
  AlertCircle,
  Database,
  Filter,
  Users,
  CheckSquare,
  Edit3
} from "lucide-react";

const STATUS_OPTIONS = [
  "PRESENT",
  "PRESENT/LEAVE",
];

const DEFAULT_CATEGORIES = [
  { id: 2, categoryName: "AUTOCONER", categoryCode: "AUTOCONER" },
  { id: 3, categoryName: "PREPARATORY", categoryCode: "PREP" },
  { id: 70, categoryName: "HOSTEL1", categoryCode: "HOSTEL1" },
  { id: 71, categoryName: "HOSTEL2", categoryCode: "HOSTEL2" },
  { id: 74, categoryName: "MIXING", categoryCode: "MIXING" },
  { id: 68, categoryName: "OTHERS1", categoryCode: "OTHERS1" },
  { id: 69, categoryName: "OTHERS2", categoryCode: "OTHERS2" },
  { id: 72, categoryName: "STAFF1", categoryCode: "STAFF1" },
  { id: 73, categoryName: "STAFF2", categoryCode: "STAFF2" },
];

const DepartmentAttendanceMultiple = () => {
  const navigate = useNavigate();

  // --- Core Configuration States ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Form Controls ---
  const [deptInput, setDeptInput] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [workedDeptInput, setWorkedDeptInput] = useState("");
  const [selectedWorkedDeptId, setSelectedWorkedDeptId] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedStatus, setSelectedStatus] = useState("PRESENT");
  const [selectedShiftId, setSelectedShiftId] = useState("");

  // --- Dual Grid Data States ---
  // Left Grid: Unsaved employees checklist
  const [unsavedEmployees, setUnsavedEmployees] = useState([]);
  const [selectedLeftEmpIds, setSelectedLeftEmpIds] = useState(new Set());
  const [leftSearch, setLeftSearch] = useState("");

  // Right Grid: Saved Data
  const [savedData, setSavedData] = useState([]);
  const [selectedSavedIds, setSelectedSavedIds] = useState(new Set());
  const [rightSearch, setRightSearch] = useState("");

  // --- Popup Modal for Dept Selection ---
  const [showPopup, setShowPopup] = useState(false);
  const [popupTarget, setPopupTarget] = useState(""); // 'department' or 'workedDept'
  const [popupSearch, setPopupSearch] = useState("");

  // --- Edit Modal State ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("PRESENT");
  const [editShiftId, setEditShiftId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editWorkedDeptId, setEditWorkedDeptId] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Initial Load
  useEffect(() => {
    fetchCompanies();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchShifts();
      fetchCategories(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // Load Grids when Dept, Date, or Shift changes
  useEffect(() => {
    if (selectedCompanyId && selectedDeptId && entryDate) {
      fetchMultipleEntryData();
    } else {
      setUnsavedEmployees([]);
      setSavedData([]);
    }
  }, [selectedCompanyId, selectedDeptId, entryDate, selectedShiftId]);

  const fetchCategories = async (companyId = selectedCompanyId) => {
    try {
      const cid = companyId || selectedCompanyId || localStorage.getItem("companyId") || 1;
      let res;
      try {
        res = await API.get("/categories", { params: { companyId: cid } });
      } catch (e) {
        res = await API.get("/categories");
      }
      const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      if (list.length > 0) {
        setCategories(list);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data } = await API.get("/companies");
      const list = Array.isArray(data) ? data : data.data || [];
      setCompanies(list);
      if (list.length > 0) {
        setSelectedCompanyId(list[0].id);
        fetchCategories(list[0].id);
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

      // Auto-select first department if none selected
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
      const { data } = await API.get("/attendance/multiple-entry", {
        params: {
          companyId: selectedCompanyId,
          departmentId: selectedDeptId,
          attendanceDate: entryDate,
          shiftId: selectedShiftId
        }
      });

      if (data.success) {
        const unsaved = [...(data.unsavedEmployees || [])].sort(sortByAlphabetical);
        const saved = [...(data.savedData || [])].sort(sortByAlphabetical);
        setUnsavedEmployees(unsaved);
        setSavedData(saved);
        setSelectedLeftEmpIds(new Set());
        setSelectedSavedIds(new Set());
      } else {
        toast.error(data.message || "Failed to load attendance data");
      }
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      toast.error(err.response?.data?.message || "Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  // --- Dept Search Modal Functions ---
  const handleOpenPopup = (target) => {
    setPopupTarget(target);
    setPopupSearch("");
    setShowPopup(true);
  };

  const handleSelectPopupItem = (dept) => {
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
    setShowPopup(false);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.departmentname.toLowerCase().includes(popupSearch.toLowerCase()) ||
    (dept.acronym && dept.acronym.toLowerCase().includes(popupSearch.toLowerCase()))
  );

  // Helper: Alphabetical sort by employee name (A to Z)
  const sortByAlphabetical = (a, b) => {
    const nameA = String(a.empName || a.employeeName || "").trim().toUpperCase();
    const nameB = String(b.empName || b.employeeName || "").trim().toUpperCase();
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

  // --- Left Grid Selection Handling ---
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

  // --- Right Grid Selection Handling ---
  const filteredSavedData = useMemo(() => {
    return savedData
      .filter((item) =>
        (item.ticketNo && item.ticketNo.toLowerCase().includes(rightSearch.toLowerCase())) ||
        (item.employeeCode && item.employeeCode.toLowerCase().includes(rightSearch.toLowerCase())) ||
        (item.empName && item.empName.toLowerCase().includes(rightSearch.toLowerCase())) ||
        String(item.id).includes(rightSearch) ||
        (item.status && item.status.toLowerCase().includes(rightSearch.toLowerCase())) ||
        (item.cat && item.cat.toLowerCase().includes(rightSearch.toLowerCase()))
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

  // --- Status Badge Helper ---
  const getStatusBadgeClass = (status) => {
    switch (String(status).toUpperCase()) {
      case "PRESENT":
      case "PRESENT WITH PERMISSION":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "ABSENT":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HALF DAY":
      case "PRESENT/LEAVE":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "LEAVE":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "HOLIDAY":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "WEEK OFF":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  // --- Action Handlers ---
  const handleSaveAttendance = async () => {
    if (selectedLeftEmpIds.size === 0) {
      toast.warning("Please check one or more employees from the list to save attendance.");
      return;
    }

    if (!selectedDeptId || !selectedWorkedDeptId || !selectedShiftId) {
      toast.warning("Please select Department, Worked Dept, and Shift.");
      return;
    }

    setLoading(true);
    try {
      const statusMap = {
        "PRESENT": "Present",
        "PRESENT/LEAVE": "Half Day",
      };

      const statusVal = statusMap[selectedStatus] || "Present";

      const payload = {
        companyId: selectedCompanyId,
        departmentId: selectedDeptId,
        workedDeptId: selectedWorkedDeptId,
        attendanceDate: entryDate,
        shiftId: selectedShiftId,
        status: statusVal,
        employees: Array.from(selectedLeftEmpIds).map((empId) => ({
          employeeId: empId,
          status: statusVal,
        }))
      };

      const { data } = await API.post("/attendance/multiple-entry", payload);
      if (data.success) {
        toast.success(`Successfully saved attendance for ${selectedLeftEmpIds.size} employee(s)!`);
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Failed to save attendance");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleMultiDelete = async () => {
    if (selectedSavedIds.size === 0) {
      toast.info("Please select saved entries from the 'Saved Data' table to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedSavedIds.size} saved attendance record(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyId: selectedCompanyId,
        attendanceDate: entryDate,
        ids: Array.from(selectedSavedIds),
      };

      const { data } = await API.post("/attendance/multiple-entry/delete", payload);
      if (data.success) {
        toast.success("Selected saved attendance records deleted.");
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Deletion failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete records");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedLeftEmpIds(new Set());
    setSelectedSavedIds(new Set());
    toast.info("Cleared all selections.");
  };

  const handleOpenEditModal = (record) => {
    setEditRecord(record);
    const dbStatus = record.status || "Present";
    let initStatus = "PRESENT";
    if (
      dbStatus === "Half Day" ||
      dbStatus.toUpperCase() === "HALF DAY" ||
      dbStatus.toUpperCase() === "PRESENT/LEAVE"
    ) {
      initStatus = "PRESENT/LEAVE";
    }
    setEditStatus(initStatus);
    setEditShiftId(record.shiftId || "");

    let initDate = entryDate;
    if (record.attendanceDate) {
      try {
        initDate = format(new Date(record.attendanceDate), "yyyy-MM-dd");
      } catch (e) {
        initDate = record.attendanceDate;
      }
    }
    setEditDate(initDate);
    let initCat = (record.cat || record.category || "").trim();
    const foundCat = categories.find(
      (c) =>
        (c.categoryCode && c.categoryCode.toUpperCase() === initCat.toUpperCase()) ||
        (c.categoryName && c.categoryName.toUpperCase() === initCat.toUpperCase())
    );
    if (foundCat) {
      initCat = foundCat.categoryCode || foundCat.categoryName;
    }
    setEditCategory(initCat);
    setEditWorkedDeptId(record.workedDeptId || selectedWorkedDeptId || selectedDeptId || "");
    setShowEditModal(true);
  };

  const handleUpdateSingleAttendance = async () => {
    if (!editRecord) return;
    setLoading(true);
    try {
      const statusMap = {
        "PRESENT": "Present",
        "PRESENT/LEAVE": "Half Day",
      };
      const statusVal = statusMap[editStatus] || "Present";

      const payload = {
        status: statusVal,
        shiftId: editShiftId,
        attendanceDate: editDate,
        category: editCategory,
        workedDeptId: editWorkedDeptId,
      };

      const { data } = await API.put(`/attendance/multiple-entry/${editRecord.id}`, payload);
      if (data.success) {
        const shiftChanged = editRecord.shiftId && String(editRecord.shiftId) !== String(editShiftId);
        const newShiftObj = shifts.find(s => String(s.id) === String(editShiftId));
        if (shiftChanged && newShiftObj) {
          toast.success(`Shift updated to "${newShiftObj.name}". Filter by Shift ${newShiftObj.name} to view this record.`);
        } else {
          toast.success("Attendance entry updated successfully!");
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans">
      {/* Container Window Frame */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-blue-200 overflow-hidden">

        {/* Top Header Window Bar - Sleek Blue Theme */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 px-6 py-4 text-white flex flex-wrap justify-between items-center shadow-md border-b border-blue-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm">
              <Layers size={22} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                Department Attendance Multiple Entry
              </h1>
              <p className="text-xs text-blue-200 font-medium">HR Module — Department Multi-Entry Attendance System</p>
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
              hr_department_attendance
            </span>
          </div>
        </div>

        {/* Form Controls Section - Blue Styled Inputs */}
        <div className="p-5 bg-gradient-to-b from-blue-50/50 to-white border-b border-blue-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">

            {/* 1. Department */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <div
                onClick={() => handleOpenPopup("department")}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 hover:border-blue-600 rounded-xl cursor-pointer text-slate-800 text-sm font-semibold flex justify-between items-center shadow-sm transition-all"
              >
                <span className={deptInput ? "text-blue-950 font-bold" : "text-slate-400"}>
                  {deptInput || "Select Dept"}
                </span>
                <Search size={16} className="text-blue-500" />
              </div>
            </div>

            {/* 2. Worked Dept */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Worked Dept
              </label>
              <div
                onClick={() => handleOpenPopup("workedDept")}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 hover:border-blue-600 rounded-xl cursor-pointer text-slate-800 text-sm font-semibold flex justify-between items-center shadow-sm transition-all"
              >
                <span className={workedDeptInput ? "text-blue-950 font-bold" : "text-slate-400"}>
                  {workedDeptInput || "Select Worked Dept"}
                </span>
                <Search size={16} className="text-blue-500" />
              </div>
            </div>

            {/* 3. Entry Date */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Entry Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm transition-all"
              />
            </div>

            {/* 4. Status */}
            <div>
              <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-blue-950 text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm cursor-pointer transition-all"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Shift */}
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

          </div>
        </div>

        {/* Dual Grid Layout (Split Left / Right Side-by-Side with Blue Theme) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-blue-200 divide-y lg:divide-y-0 lg:divide-x divide-blue-200">

          {/* ================= LEFT SIDE: Employee Checklist ================= */}
          <div className="p-4 bg-sky-50/40 flex flex-col h-[520px]">
            {/* Header & Filter */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-700" />
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                  Employee Checklist
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

            {/* Left Table Container */}
            <div className="flex-1 border border-blue-200 rounded-xl bg-white overflow-hidden shadow-inner flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-blue-900 text-white font-bold z-10">
                    <tr>
                      <th className="py-2.5 px-3 text-left w-28 border-r border-blue-800">Tkt.No</th>
                      <th className="py-2.5 px-3 text-left border-r border-blue-800">Emp Name</th>
                      <th className="py-2.5 px-3 text-center w-28 border-r border-blue-800">Category</th>
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
                        <td colSpan="4" className="py-12 text-center text-slate-400">
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
                            <td className="py-2 px-3 border-r border-blue-100 text-center font-bold text-blue-950">
                              {emp.category}
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
                        <td colSpan="4" className="py-16 text-center text-slate-400">
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

            {/* Selection summary count */}
            <div className="mt-2 flex justify-between items-center text-[11px] text-blue-900 px-1 font-bold">
              <span>Selected for saving: <strong className="text-blue-700 font-black">{selectedLeftEmpIds.size}</strong></span>
              <span>Total Unsaved: {unsavedEmployees.length}</span>
            </div>
          </div>

          {/* ================= RIGHT SIDE: Saved Data ================= */}
          <div className="p-4 bg-indigo-50/40 flex flex-col h-[520px]">
            {/* Header & Multi-Delete */}
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

            {/* Right Table Container with Status Column */}
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
                      <th className="py-2.5 px-2 text-center w-24 border-r border-blue-800">Status</th>
                      <th className="py-2.5 px-1.5 text-center w-14 border-r border-blue-800">Cat</th>
                      <th className="py-2.5 px-2 text-center w-12">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="py-12 text-center text-slate-400">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-700 border-t-transparent mb-2"></div>
                          <p className="text-xs font-semibold text-blue-800">Loading saved records...</p>
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
                              {item.empName}
                            </td>
                            <td className="py-2 px-1.5 border-r border-blue-100 text-center font-bold text-blue-950">
                              {item.shift}
                            </td>
                            <td className="py-2 px-2 border-r border-blue-100 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(item.status)}`}>
                                {item.status === "Half Day" ? "PRESENT/LEAVE" : (item.status || "PRESENT")}
                              </span>
                            </td>
                            <td className="py-2 px-1.5 border-r border-blue-100 text-center font-bold text-slate-700">
                              {item.cat}
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
                        <td colSpan="8" className="py-16 text-center text-slate-400">
                          <CheckSquare size={24} className="mx-auto mb-1 text-blue-300" />
                          <p className="text-xs font-semibold text-slate-600">No saved data for selected filters.</p>
                          <p className="text-[11px] text-slate-400">Check employees from left grid & click Save.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right selection summary */}
            <div className="mt-2 flex justify-between items-center text-[11px] text-indigo-950 px-1 font-bold">
              <span>Selected for deletion: <strong className="text-rose-700 font-black">{selectedSavedIds.size}</strong></span>
              <span>Total Saved Records: {savedData.length}</span>
            </div>
          </div>

        </div>

        {/* Bottom Action Footer Buttons */}
        <div className="px-6 py-4 bg-blue-50/70 border-t border-blue-200 flex justify-center items-center gap-4">

          {/* Save Button */}
          <button
            onClick={handleSaveAttendance}
            disabled={selectedLeftEmpIds.size === 0 || loading}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm px-8 py-2.5 rounded-xl shadow-lg border border-emerald-700 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            <span>Save</span>
          </button>

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-sm px-7 py-2.5 rounded-xl shadow-md border border-rose-700 transition-all flex items-center gap-2"
          >
            <XCircle size={18} />
            <span>Cancel</span>
          </button>

        </div>

      </div>

      {/* --- Saved Data / Department Selection Popup Modal (Blue Theme) --- */}
      {showPopup && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-blue-300 shadow-2xl w-full max-w-md overflow-hidden transform scale-95 duration-200 animate-in fade-in flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-blue-950">
              <div>
                <h3 className="text-base font-bold">Saved Data</h3>
                <p className="text-xs text-blue-200">
                  Select {popupTarget === "department" ? "Department" : "Worked Department"}
                </p>
              </div>
              <button
                onClick={() => setShowPopup(false)}
                className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Department List */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-blue-50">
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    onClick={() => handleSelectPopupItem(dept)}
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

            {/* Bottom Search Box */}
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
      {/* --- Attendance Entry Edit Modal Popup --- */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-2xl w-full max-w-lg overflow-hidden transform scale-95 duration-200 animate-in fade-in flex flex-col">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-6 py-4 flex justify-between items-center border-b border-blue-950">
              <div>
                <h3 className="text-lg font-black tracking-tight">Attendance Entry</h3>
                <p className="text-xs text-blue-200 font-medium">Modify attendance details.</p>
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
                    value={editRecord.employeeCode || editRecord.ticketNo || editRecord.employeeId || ""}
                    disabled
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Emp Name</label>
                  <input
                    type="text"
                    value={editRecord.empName || ""}
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
                    value={editRecord.ticketNo || editRecord.employeeCode || ""}
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
                  <option value="">Select Worked Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.departmentname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Shift</label>
                  <select
                    value={editShiftId}
                    onChange={(e) => setEditShiftId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer shadow-sm"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer shadow-sm"
                  >
                    <option value="">Select Category</option>
                    {/* Fallback option if current editCategory is not in the fetched categories list */}
                    {editCategory &&
                      !categories.some(
                        (c) => (c.categoryCode || c.categoryName) === editCategory
                      ) && (
                        <option value={editCategory}>{editCategory}</option>
                      )}
                    {categories.map((c) => {
                      const val = c.categoryCode || c.categoryName;
                      const label = c.categoryName
                        ? `${c.categoryName}${c.categoryCode && c.categoryCode !== c.categoryName ? ` (${c.categoryCode})` : ""}`
                        : c.categoryCode;
                      return (
                        <option key={c.id} value={val}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-blue-950 uppercase mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-blue-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer shadow-sm"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Modal Action Buttons */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={handleUpdateSingleAttendance}
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

export default DepartmentAttendanceMultiple;