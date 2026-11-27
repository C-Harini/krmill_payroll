import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

// Realistic textile mill workload employees mock data
const INITIAL_WORKLOAD_EMPLOYEES = [
  {
    id: 1,
    empCode: "KR-1024",
    name: "Murugan K",
    department: "Ring Frame",
    designation: "Sider",
    machineAllocation: "RF-01 & RF-02 (Sides 1-10)",
    standardWorkload: 10,
    unit: "Sides",
    attendance: "Present",
    enteredWorkload: "10",
    remarks: "Standard 4,800 spindles",
    isEntered: true,
  },
  {
    id: 2,
    empCode: "KR-1045",
    name: "Senthil Kumar R",
    department: "Ring Frame",
    designation: "Sider",
    machineAllocation: "RF-03 & RF-04 (Sides 1-10)",
    standardWorkload: 10,
    unit: "Sides",
    attendance: "Present",
    enteredWorkload: "9.5",
    remarks: "1 side stopped for maintenance 1 hr",
    isEntered: true,
  },
  {
    id: 3,
    empCode: "KR-1088",
    name: "Palanisamy M",
    department: "Ring Frame",
    designation: "Doffer",
    machineAllocation: "RF-01 to RF-06",
    standardWorkload: 12,
    unit: "Doffs",
    attendance: "Present",
    enteredWorkload: "12",
    remarks: "Completed 12 full frame doffs",
    isEntered: true,
  },
  {
    id: 4,
    empCode: "KR-1102",
    name: "Ramesh T",
    department: "Carding",
    designation: "Card Tender",
    machineAllocation: "Cards #01 - #08",
    standardWorkload: 8,
    unit: "Cards",
    attendance: "Present",
    enteredWorkload: "8",
    remarks: "Full delivery on all 8 cards",
    isEntered: true,
  },
  {
    id: 5,
    empCode: "KR-1135",
    name: "Karthik P",
    department: "Carding",
    designation: "Card Tender",
    machineAllocation: "Cards #09 - #16",
    standardWorkload: 8,
    unit: "Cards",
    attendance: "Present",
    enteredWorkload: "",
    remarks: "",
    isEntered: false,
  },
  {
    id: 6,
    empCode: "KR-1150",
    name: "Selvam A",
    department: "Autoconer",
    designation: "Winder Operator",
    machineAllocation: "AC Machine #01 (Drums 1-60)",
    standardWorkload: 60,
    unit: "Drums",
    attendance: "Present",
    enteredWorkload: "60",
    remarks: "Auto-package feed optimal",
    isEntered: true,
  },
  {
    id: 7,
    empCode: "KR-1162",
    name: "Venkatesh S",
    department: "Autoconer",
    designation: "Winder Operator",
    machineAllocation: "AC Machine #02 (Drums 1-60)",
    standardWorkload: 60,
    unit: "Drums",
    attendance: "Present",
    enteredWorkload: "",
    remarks: "",
    isEntered: false,
  },
  {
    id: 8,
    empCode: "KR-1178",
    name: "Anbarasan V",
    department: "Blow Room",
    designation: "Feeder Tender",
    machineAllocation: "Unifloc & Bale Plucker Line 1",
    standardWorkload: 40,
    unit: "Bales",
    attendance: "Present",
    enteredWorkload: "40",
    remarks: "Cotton laydown completed",
    isEntered: true,
  },
  {
    id: 9,
    empCode: "KR-1205",
    name: "Dhanapal K",
    department: "Preparatory",
    designation: "Draw Frame Operator",
    machineAllocation: "DF Breaker & Finisher Line",
    standardWorkload: 4,
    unit: "Deliveries",
    attendance: "Present",
    enteredWorkload: "",
    remarks: "",
    isEntered: false,
  },
  {
    id: 10,
    empCode: "KR-1218",
    name: "Ganesan R",
    department: "Preparatory",
    designation: "Simplex Tender",
    machineAllocation: "Speed Frame SF-01 & SF-02",
    standardWorkload: 2,
    unit: "Frames",
    attendance: "Absent",
    enteredWorkload: "0",
    remarks: "Absent - Unplanned leave",
    isEntered: true,
  },
  {
    id: 11,
    empCode: "KR-1234",
    name: "Manikandan C",
    department: "Packing",
    designation: "Packing Assistant",
    machineAllocation: "Packing Table #1 & Tare Scale",
    standardWorkload: 250,
    unit: "Bags",
    attendance: "Present",
    enteredWorkload: "",
    remarks: "",
    isEntered: false,
  },
  {
    id: 12,
    empCode: "KR-1250",
    name: "Saravanan N",
    department: "Rotor Spinning",
    designation: "OE Operator",
    machineAllocation: "Rotor Machine OE-01",
    standardWorkload: 320,
    unit: "Rotors",
    attendance: "Present",
    enteredWorkload: "320",
    remarks: "320 rotors running at 98% efficiency",
    isEntered: true,
  },
];

const DEPARTMENTS = [
  "All Departments",
  "Ring Frame",
  "Carding",
  "Autoconer",
  "Blow Room",
  "Preparatory",
  "Packing",
  "Rotor Spinning",
];

const SHIFTS = [
  { id: "Shift 1", label: "Shift 1 (07:00 AM - 03:00 PM)" },
  { id: "Shift 2", label: "Shift 2 (03:00 PM - 11:00 PM)" },
  { id: "Shift 3", label: "Shift 3 (11:00 PM - 07:00 AM)" },
  { id: "General", label: "General Shift (09:00 AM - 05:30 PM)" },
];

const WorkloadEntry = () => {
  // Today's date default
  const today = new Date().toISOString().split("T")[0];
  const [entryDate, setEntryDate] = useState(today);
  const [selectedShift, setSelectedShift] = useState("Shift 1");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Entered" | "Pending"
  const [searchTerm, setSearchTerm] = useState("");

  // Workload table state
  const [employeeRows, setEmployeeRows] = useState(INITIAL_WORKLOAD_EMPLOYEES);

  // Row selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkWorkloadValue, setBulkWorkloadValue] = useState("");

  // Loading state simulation
  const [isSaving, setIsSaving] = useState(false);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employeeRows.filter((emp) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        emp.empCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.machineAllocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        departmentFilter === "All Departments" ||
        emp.department === departmentFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Entered" && emp.isEntered) ||
        (statusFilter === "Pending" && !emp.isEntered);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employeeRows, searchTerm, departmentFilter, statusFilter]);

  // KPI metrics
  const totalEmployees = employeeRows.length;
  const enteredCount = employeeRows.filter((e) => e.isEntered).length;
  const pendingCount = totalEmployees - enteredCount;
  const completionPercentage = totalEmployees
    ? Math.round((enteredCount / totalEmployees) * 100)
    : 0;

  // Handle single row workload change
  const handleWorkloadChange = (id, value) => {
    setEmployeeRows((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          return {
            ...emp,
            enteredWorkload: value,
          };
        }
        return emp;
      })
    );
  };

  // Handle attendance change
  const handleAttendanceChange = (id, attendance) => {
    setEmployeeRows((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const isAbsent = attendance === "Absent";
          return {
            ...emp,
            attendance,
            enteredWorkload: isAbsent ? "0" : emp.enteredWorkload,
            remarks: isAbsent ? "Marked Absent" : emp.remarks,
          };
        }
        return emp;
      })
    );
  };

  // Handle remarks change
  const handleRemarksChange = (id, remarks) => {
    setEmployeeRows((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, remarks } : emp))
    );
  };

  // Save single row
  const handleSaveRow = (id) => {
    const target = employeeRows.find((e) => e.id === id);
    if (!target) return;

    if (
      target.attendance === "Present" &&
      (target.enteredWorkload === "" || target.enteredWorkload === null)
    ) {
      toast.warning(`Please enter a workload value for ${target.name}`);
      return;
    }

    setEmployeeRows((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, isEntered: true } : emp
      )
    );
    toast.success(`Saved entry for ${target.empCode} (${target.name})`);
  };

  // Toggle single row selection
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all filtered rows
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  // Apply full standard workload to all selected employees
  const handleApplyStandardToSelected = () => {
    if (selectedIds.size === 0) {
      toast.info("Please select at least one employee");
      return;
    }

    setEmployeeRows((prev) =>
      prev.map((emp) => {
        if (selectedIds.has(emp.id) && emp.attendance !== "Absent") {
          return {
            ...emp,
            enteredWorkload: String(emp.standardWorkload),
            isEntered: true,
          };
        }
        return emp;
      })
    );
    toast.success(
      `Applied standard workload benchmark to ${selectedIds.size} employees`
    );
  };

  // Bulk apply custom value to selected
  const handleBulkApplyValue = () => {
    if (selectedIds.size === 0) {
      toast.info("Please select at least one employee");
      return;
    }
    if (!bulkWorkloadValue.trim()) {
      toast.warning("Please enter a workload value to apply");
      return;
    }

    setEmployeeRows((prev) =>
      prev.map((emp) => {
        if (selectedIds.has(emp.id)) {
          return {
            ...emp,
            enteredWorkload: bulkWorkloadValue,
            isEntered: true,
          };
        }
        return emp;
      })
    );
    toast.success(`Applied ${bulkWorkloadValue} to ${selectedIds.size} employees`);
    setBulkWorkloadValue("");
  };

  // Save all entered rows
  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setEmployeeRows((prev) =>
        prev.map((emp) => {
          if (emp.enteredWorkload !== "" && emp.enteredWorkload !== null) {
            return { ...emp, isEntered: true };
          }
          return emp;
        })
      );
      setIsSaving(false);
      toast.success(
        `All workload entries for ${entryDate} (${selectedShift}) saved successfully (Local Mock Data)!`
      );
    }, 400);
  };

  // Reset to default
  const handleResetEntries = () => {
    setEmployeeRows(INITIAL_WORKLOAD_EMPLOYEES);
    setSelectedIds(new Set());
    toast.info("Workload entry table reset to default");
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      {/* ===================== BREADCRUMB ===================== */}
      <nav className="mb-3 text-xs font-medium text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              to="/workload-dashboard/workload/master"
              className="hover:text-blue-600 transition"
            >
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-600">Workload</li>
          <li>/</li>
          <li className="text-blue-700 font-semibold">Workload Entry</li>
        </ol>
      </nav>

      {/* ===================== PAGE HEADER ===================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="text-2xl">📝</span> Workload Daily Entry
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Record, verify, and submit daily operator machine allocations and completed workload
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetEntries}
            type="button"
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm text-sm"
          >
            Reset Table
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{isSaving ? "Saving..." : "Save All Entries"}</span>
          </button>
        </div>
      </div>

      {/* ===================== SUMMARY STAT CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Date & Shift Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Active Session</span>
            <span className="text-blue-600 text-lg">📅</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {entryDate}
          </div>
          <div className="text-xs text-blue-700 font-semibold mt-1">
            {selectedShift}
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Workload Employees</span>
            <span className="text-indigo-600 text-lg">👥</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {totalEmployees}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {DEPARTMENTS.length - 1} mill departments
          </div>
        </div>

        {/* Entries Completed */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Entries Recorded</span>
            <span className="text-emerald-600 text-lg">✅</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {enteredCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {completionPercentage}% complete for this shift
          </div>
        </div>

        {/* Pending Entries */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase mb-1">
            <span>Pending Entries</span>
            <span className="text-amber-600 text-lg">⏳</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Awaiting supervisor verification
          </div>
        </div>
      </div>

      {/* ===================== DATE, SHIFT, AND FILTER CONTROLS ===================== */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* 1. Date Picker */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>📅 Workload Date</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium shadow-sm transition"
            />
          </div>

          {/* 2. Shift Selector */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>⏰ Select Shift</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium shadow-sm transition"
            >
              {SHIFTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Department Filter */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Entry Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition"
            >
              <option value="All">All Statuses ({totalEmployees})</option>
              <option value="Entered">Recorded ({enteredCount})</option>
              <option value="Pending">Pending ({pendingCount})</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Search & Bulk Action Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Box */}
          <div className="w-full md:w-80 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by code, name, machine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Bulk Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">
              Selected ({selectedIds.size}):
            </span>
            <button
              onClick={handleApplyStandardToSelected}
              disabled={selectedIds.size === 0}
              type="button"
              className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-medium rounded-lg text-xs transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Fill Standard Target</span>
            </button>

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Val"
                value={bulkWorkloadValue}
                onChange={(e) => setBulkWorkloadValue(e.target.value)}
                disabled={selectedIds.size === 0}
                className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <button
                onClick={handleBulkApplyValue}
                disabled={selectedIds.size === 0}
                type="button"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs border border-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== WORKLOAD ENTRY TABLE ===================== */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-xs uppercase tracking-wider">
                {/* Checkbox */}
                <th className="px-4 py-3.5 text-center w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredEmployees.length &&
                      filteredEmployees.length > 0
                    }
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3.5 text-center font-semibold w-12">
                  #
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  Employee
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  Department & Role
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  Machine Allocation
                </th>
                <th className="px-4 py-3.5 text-center font-semibold">
                  Std. Target
                </th>
                <th className="px-5 py-3.5 font-semibold w-52">
                  Daily Workload Entry
                </th>
                <th className="px-4 py-3.5 text-center font-semibold w-32">
                  Attendance
                </th>
                <th className="px-4 py-3.5 text-center font-semibold w-28">
                  Status
                </th>
                <th className="px-4 py-3.5 text-center font-semibold w-24">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, index) => {
                  const isSelected = selectedIds.has(emp.id);
                  const isOverOrUnder =
                    emp.enteredWorkload &&
                    Number(emp.enteredWorkload) !== emp.standardWorkload &&
                    emp.attendance === "Present";

                  return (
                    <tr
                      key={emp.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-blue-50/70"
                          : index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/60"
                      } hover:bg-blue-50/40`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(emp.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Sl.No */}
                      <td className="px-3 py-3.5 text-center text-slate-500 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Employee Info */}
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-semibold">
                            {emp.empCode}
                          </span>
                          <span className="font-bold">{emp.name}</span>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-semibold text-slate-800">
                          {emp.department}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {emp.designation}
                        </div>
                      </td>

                      {/* Machine Allocation */}
                      <td className="px-5 py-3.5 text-xs text-slate-700">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800 border border-slate-200 block truncate max-w-xs" title={emp.machineAllocation}>
                          {emp.machineAllocation}
                        </span>
                      </td>

                      {/* Standard Target */}
                      <td className="px-4 py-3.5 text-center font-bold text-xs text-slate-800">
                        {emp.standardWorkload} {emp.unit}
                      </td>

                      {/* Interactive Workload Entry Input */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0"
                              disabled={emp.attendance === "Absent"}
                              value={emp.enteredWorkload}
                              onChange={(e) =>
                                handleWorkloadChange(emp.id, e.target.value)
                              }
                              className={`w-full px-3 py-1.5 border rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                emp.attendance === "Absent"
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300"
                                  : isOverOrUnder
                                  ? "border-amber-400 bg-amber-50/50 text-slate-900"
                                  : "border-slate-300 bg-white text-slate-900"
                              }`}
                            />
                            <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-400 font-medium pointer-events-none">
                              {emp.unit}
                            </span>
                          </div>
                        </div>

                        {/* Optional remarks note input */}
                        <input
                          type="text"
                          placeholder="Optional notes / breakdown..."
                          value={emp.remarks}
                          onChange={(e) =>
                            handleRemarksChange(emp.id, e.target.value)
                          }
                          className="w-full mt-1 px-2 py-0.5 text-[11px] border border-slate-200 rounded text-slate-600 placeholder-slate-400 focus:outline-none focus:border-blue-400"
                        />
                      </td>

                      {/* Attendance Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <select
                          value={emp.attendance}
                          onChange={(e) =>
                            handleAttendanceChange(emp.id, e.target.value)
                          }
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                            emp.attendance === "Present"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : emp.attendance === "Absent"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Leave">On Leave</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {emp.isEntered ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Entered
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleSaveRow(emp.id)}
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition active:scale-95"
                          title="Save this row entry"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* Empty state */
                <tr>
                  <td colSpan={10} className="text-center py-14 px-4">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl text-slate-400 mb-2">
                        🔍
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mb-1">
                        No Employees Found
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        No workload employees matched your filter or search criteria for {selectedShift}.
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setDepartmentFilter("All Departments");
                          setStatusFilter("All");
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            Showing <span className="font-semibold">{filteredEmployees.length}</span> of{" "}
            <span className="font-semibold">{totalEmployees}</span> employees for{" "}
            <span className="font-semibold text-slate-900">{entryDate}</span> ({selectedShift})
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>Submit & Save All Entries</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkloadEntry;
