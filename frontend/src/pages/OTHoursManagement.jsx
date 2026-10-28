import React, { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";

// ─── Employee Multi-Select Component (Search by name, cur/new code; selected sorted to top) ───
const EmployeeMultiSelect = ({
  label = "Employee (Dropdown)",
  employees = [],
  selected = [],
  onChange,
  disabled = false,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTxt, setSearchTxt] = useState("");
  const [openSelectedSnapshot, setOpenSelectedSnapshot] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setOpenSelectedSnapshot(selected);
    }
  }, [open]);

  const filtered = useMemo(() => {
    let list = employees;
    if (searchTxt.trim()) {
      const q = searchTxt.toLowerCase().trim();
      list = employees.filter((e) => {
        const name = String(e.firstName || e.name || "").toLowerCase();
        const curCode = String(e.curEmployeeCode || e.employeeCode || e.ticketNo || "").toLowerCase();
        const newCode = String(e.newEmployeeCode || "").toLowerCase();
        const desig = String(e.designation?.acronym || e.designation?.name || e.designationName || "").toLowerCase();
        const dept = String(e.department?.acronym || e.department?.departmentname || "").toLowerCase();
        return (
          name.includes(q) ||
          curCode.includes(q) ||
          newCode.includes(q) ||
          desig.includes(q) || dept.includes(q)
        );
      });
    }

    // Sort already selected to top upon opening
    return [...list].sort((a, b) => {
      const aSel = openSelectedSnapshot.includes(String(a.id));
      const bSel = openSelectedSnapshot.includes(String(b.id));
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [employees, searchTxt, openSelectedSnapshot]);

  const toggle = (id) => {
    const sid = String(id);
    onChange(
      selected.includes(sid)
        ? selected.filter((s) => s !== sid)
        : [...selected, sid]
    );
  };

  const toggleAll = () => {
    if (searchTxt.trim()) {
      const filteredIds = filtered.map((e) => String(e.id));
      const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id));
      if (allFilteredSelected) {
        onChange(selected.filter((id) => !filteredIds.includes(id)));
      } else {
        onChange(Array.from(new Set([...selected, ...filteredIds])));
      }
    } else {
      if (selected.length === employees.length && employees.length > 0) {
        onChange([]);
      } else {
        onChange(employees.map((e) => String(e.id)));
      }
    }
  };

  const isAllSelected = searchTxt.trim()
    ? filtered.length > 0 && filtered.every((e) => selected.includes(String(e.id)))
    : selected.length === employees.length && employees.length > 0;

  const displayText = () => {
    if (!selected.length) return `All Employees (${employees.length})`;
    if (selected.length === 1) {
      const found = employees.find((e) => String(e.id) === selected[0]);
      if (found) {
        const code = found.curEmployeeCode || found.employeeCode || found.ticketNo || "";
        const name = found.firstName || found.employeeName || found.name || "";
        return `${name}${code ? ` (${code})` : ""}`;
      }
      return "1 selected";
    }
    return `${selected.length} Employees Selected`;
  };

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {label}
        </label>
      )}
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full border border-gray-300 rounded-lg text-sm bg-white flex justify-between items-center select-none ${
          compact ? "px-3 py-2 min-h-[38px]" : "p-2 min-h-[42px]"
        } ${
          disabled
            ? "bg-gray-100 cursor-not-allowed text-gray-400"
            : "cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        }`}
      >
        <span className={`truncate text-sm ${!selected.length ? "text-gray-500" : "text-gray-800 font-medium"}`}>
          {displayText()}
        </span>
        <div className="flex items-center gap-1.5 ml-1 shrink-0">
          {!disabled && selected.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1 cursor-pointer"
              title="Clear selection"
            >
              ✕
            </span>
          )}
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[280px] overflow-hidden">
          {/* Internal search input */}
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              placeholder="Search name, cur/new code..."
              value={searchTxt}
              onChange={(e) => setSearchTxt(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              autoFocus
            />
          </div>
          {/* Select all bar */}
          <div
            onClick={toggleAll}
            className="flex items-center justify-between px-3 py-2 cursor-pointer border-b border-gray-100 hover:bg-gray-50 bg-gray-50/50 text-xs"
          >
            <span className="font-semibold text-gray-700">
              {isAllSelected ? "Deselect All" : "Select All"}
            </span>
            <span className="text-[11px] text-gray-500">
              {selected.length} / {employees.length}
            </span>
          </div>
          {/* Options list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                No matching employees
              </div>
            ) : (
              filtered.map((e) => {
                const sid = String(e.id);
                const isChecked = selected.includes(sid);
                const curCode = e.curEmployeeCode || e.employeeCode || e.ticketNo || "";
                return (
                  <div
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-blue-50/60 transition-colors text-xs ${
                      isChecked ? "bg-blue-50 text-blue-900 font-medium" : "text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 pointer-events-none"
                    />
                    <div className="truncate flex-1">
                      <span className="font-medium">
                        {e.firstName || e.employeeName || e.name}
                      </span>
                      {curCode && (
                        <span className="text-gray-500 ml-1 font-mono text-[11px]">
                          ({curCode})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const OTHoursManagement = () => {
  const BASE_URL = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem("token");

  // Dropdown data
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allCompanyEmployees, setAllCompanyEmployees] = useState([]); // All active employees of company (no connection with department)
  const [employees, setEmployees] = useState([]); // Department employees
  const [shifts, setShifts] = useState([]);

  // Form data
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Employee filter & search states
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // Employee OT hours data
  const [otHours, setOtHours] = useState({});
  const [otRecords, setOtRecords] = useState({});

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editFromTime, setEditFromTime] = useState("");
  const [editToTime, setEditToTime] = useState("");
  const [editOtType, setEditOtType] = useState("HOURS OT");
  const [editShiftId, setEditShiftId] = useState("");
  const [editWorkedDeptId, setEditWorkedDeptId] = useState("");
  const [editOtHours, setEditOtHours] = useState(0);

  // States for loading and messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // ================== FETCH COMPANIES ==================
  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${BASE_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);

      // Auto-select first company
      if (Array.isArray(data) && data.length > 0) {
        setSelectedCompanyId(data[0].id);
      } else if (data.companies && data.companies.length > 0) {
        setSelectedCompanyId(data.companies[0].id);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to fetch companies");
    }
  };

  // ================== FETCH DEPARTMENTS ==================
  const fetchDepartments = async (companyId) => {
    if (!companyId) {
      setDepartments([]);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : data.data || data.departments || []);
      setSelectedDepartmentId(""); // Reset department when company changes
      setEmployees([]); // Clear employees
      setOtHours({}); // Clear OT hours
      setSelectedEmployeeIds([]);
      setEmployeeSearch("");
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    }
  };

  // ================== FETCH SHIFTS ==================
  const fetchShifts = async (companyId) => {
    if (!companyId) {
      setShifts([]);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/shift-types?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setShifts(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Error fetching shifts:", err);
      setShifts([]);
    }
  };

  // ================== FETCH ALL COMPANY EMPLOYEES ==================
  const fetchAllCompanyEmployees = async (companyId) => {
    if (!companyId) {
      setAllCompanyEmployees([]);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/employees?companyId=${companyId}&status=Active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.employees || data.data || [];
      setAllCompanyEmployees(list);
    } catch (err) {
      console.error("Error fetching all company employees:", err);
      setAllCompanyEmployees([]);
    }
  };

  // ================== FETCH EXISTING OT HOURS ==================
  const fetchExistingOTHours = async (companyId, departmentId, date) => {
    try {
      let url = `${BASE_URL}/ot-hours/filter?companyId=${companyId}&date=${date}`;
      if (departmentId) {
        url += `&departmentId=${departmentId}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const records = Array.isArray(data.records) ? data.records : [];

      // Convert array to objects keyed by employeeId
      const existingOtHoursMap = {};
      const existingRecordsMap = {};
      records.forEach((record) => {
        existingOtHoursMap[record.employeeId] = record.otHours;
        existingRecordsMap[record.employeeId] = record;
      });

      setOtRecords(existingRecordsMap);
      return existingOtHoursMap;
    } catch (err) {
      console.error("Error fetching existing OT hours:", err);
      setOtRecords({});
      return {};
    }
  };

  // ================== FETCH EMPLOYEES (FOR DEPARTMENT OR COMPANY) ==================
  const fetchEmployees = async (companyId, departmentId) => {
    if (!companyId) {
      setEmployees([]);
      setOtHours({});
      setSelectedEmployeeIds([]);
      setEmployeeSearch("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = `${BASE_URL}/employees?companyId=${companyId}&status=Active`;
      if (departmentId) {
        url += `&departmentId=${departmentId}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const empList = Array.isArray(data) ? data : data.employees || data.data || [];
      setEmployees(empList);

      // Initialize OT hours for each employee
      const initialOtHours = {};
      empList.forEach((emp) => {
        initialOtHours[emp.id] = "";
      });

      // Fetch existing OT hours for the selected date
      const existingOtHours = await fetchExistingOTHours(companyId, departmentId, selectedDate);

      // Merge existing data with initialized data
      const mergedOtHours = {
        ...initialOtHours,
        ...existingOtHours,
      };

      setOtHours(mergedOtHours);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Failed to fetch employees");
      setEmployees([]);
      setOtHours({});
    } finally {
      setLoading(false);
    }
  };

  // ================== INIT LOAD ==================
  useEffect(() => {
    fetchCompanies();
  }, []);

  // ================== WHEN COMPANY CHANGES ==================
  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments(selectedCompanyId);
      fetchShifts(selectedCompanyId);
      fetchAllCompanyEmployees(selectedCompanyId);
      fetchEmployees(selectedCompanyId, selectedDepartmentId);
    } else {
      setAllCompanyEmployees([]);
      setDepartments([]);
      setEmployees([]);
    }
  }, [selectedCompanyId]);

  // ================== WHEN DEPARTMENT CHANGES ==================
  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees(selectedCompanyId, selectedDepartmentId);
    }
  }, [selectedDepartmentId]);

  // Department-scoped employees (filtered according to department)
  const departmentEmployees = useMemo(() => {
    const source = allCompanyEmployees.length ? allCompanyEmployees : employees;
    if (!selectedDepartmentId) return source;
    return source.filter((e) => {
      const dId = e.departmentId !== undefined && e.departmentId !== null ? e.departmentId : e.department?.id;
      return String(dId) === String(selectedDepartmentId);
    });
  }, [allCompanyEmployees, employees, selectedDepartmentId]);

  // ================== WHEN DATE CHANGES ==================
  useEffect(() => {
    if (selectedCompanyId && selectedDate) {
      const loadOTHoursForDate = async () => {
        const existingOtHours = await fetchExistingOTHours(selectedCompanyId, selectedDepartmentId, selectedDate);
        const initialOtHours = {};
        employees.forEach((emp) => {
          initialOtHours[emp.id] = "";
        });
        setOtHours({
          ...initialOtHours,
          ...existingOtHours,
        });
      };
      loadOTHoursForDate();
    }
  }, [selectedDate, selectedCompanyId, selectedDepartmentId]);

  // ================== HELPER TO FORMAT DATETIME FOR INPUT ==================
  const formatDateTimeLocal = (dateVal) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().substring(0, 16);
    } catch (e) {
      console.error(e);
      return "";
    }
  };

  // ================== HELPER TO CALCULATE OT HOURS ==================
  const calculateHours = (fromStr, toStr, type, setHoursState) => {
    if (!fromStr || !toStr) {
      setHoursState(0);
      return;
    }
    try {
      const fromDate = new Date(fromStr);
      const toDate = new Date(toStr);
      let diffMins = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60));
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

  // Auto calculate OT Hours when From/To Time or Type changes inside the modal
  useEffect(() => {
    if (showEditModal) {
      calculateHours(editFromTime, editToTime, editOtType, setEditOtHours);
    }
  }, [editFromTime, editToTime, editOtType, showEditModal]);

  // ================== OPEN EDIT/ADD DETAILS MODAL ==================
  const handleOpenEditModal = (record, employee) => {
    setEditEmployee(employee);
    if (record) {
      // Edit existing
      setEditRecord(record);
      setEditFromTime(record.fromTime ? formatDateTimeLocal(record.fromTime) : `${selectedDate}T08:00`);
      setEditToTime(record.toTime ? formatDateTimeLocal(record.toTime) : `${selectedDate}T17:00`);
      setEditOtType(record.otType || "HOURS OT");
      setEditShiftId(record.shiftId || (shifts.length > 0 ? shifts[0].id : ""));
      setEditWorkedDeptId(record.workedDeptId || selectedDepartmentId);
      setEditOtHours(record.otHours || 0);
    } else {
      // Add new detailed
      setEditRecord(null);
      setEditFromTime(`${selectedDate}T08:00`);
      setEditToTime(`${selectedDate}T17:00`);
      setEditOtType("HOURS OT");
      setEditShiftId(shifts.length > 0 ? shifts[0].id : "");
      setEditWorkedDeptId(selectedDepartmentId);
      setEditOtHours(0);
    }
    setShowEditModal(true);
  };

  // ================== SUBMIT MODAL DETAILS ==================
  const handleSaveModalRecord = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editRecord) {
        // UPDATE existing record
        const payload = {
          workedDeptId: editWorkedDeptId,
          shiftId: editShiftId,
          fromTime: editFromTime,
          toTime: editToTime,
          otType: editOtType,
          otHours: editOtHours,
        };

        const res = await fetch(`${BASE_URL}/ot-hours/multiple-entry/${editRecord.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to update OT record");
        }
        setSuccess("OT record updated successfully ✅");
      } else {
        // CREATE new detailed record
        const payload = {
          companyId: selectedCompanyId,
          departmentId: selectedDepartmentId,
          workedDeptId: editWorkedDeptId,
          date: selectedDate,
          shiftId: editShiftId,
          fromTime: editFromTime,
          toTime: editToTime,
          otType: editOtType,
          otHours: editOtHours,
          employeeIds: [editEmployee.id],
        };

        const res = await fetch(`${BASE_URL}/ot-hours/multiple-entry`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to save OT record");
        }
        setSuccess("OT record created successfully ✅");
      }

      setShowEditModal(false);
      // Reload employee list and existing OT
      fetchEmployees(selectedCompanyId, selectedDepartmentId);
    } catch (err) {
      console.error("Error saving OT modal:", err);
      setError(err.message || "An error occurred while saving OT details");
    } finally {
      setSaving(false);
    }
  };

  // ================== HANDLE OT HOURS INPUT CHANGE ==================
  const handleOtHoursChange = (employeeId, value) => {
    setOtHours((prev) => ({
      ...prev,
      [employeeId]: value,
    }));
  };

  // ================== VALIDATE AND SUBMIT ==================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Validation
      if (!selectedCompanyId) {
        setError("Please select a company");
        setSaving(false);
        return;
      }

      if (!selectedDate) {
        setError("Please select a date");
        setSaving(false);
        return;
      }

      if (employees.length === 0) {
        setError("No employees found");
        setSaving(false);
        return;
      }

      // Check if at least one employee has OT hours entered
      const hasAnySaved = Object.values(otHours).some((val) => val !== "" && val !== null && val !== undefined);
      if (!hasAnySaved) {
        setError("Please enter OT hours for at least one employee");
        setSaving(false);
        return;
      }

      // Prepare payload
      const payload = {
        companyId: selectedCompanyId,
        departmentId: selectedDepartmentId || undefined,
        date: selectedDate,
        entries: employees
          .filter((emp) => otHours[emp.id] !== "" && otHours[emp.id] !== null && otHours[emp.id] !== undefined)
          .map((emp) => ({
            employeeId: emp.id,
            otHours: parseFloat(otHours[emp.id]),
          })),
      };

      // Send to backend
      const res = await fetch(`${BASE_URL}/ot-hours`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save OT hours");
      }

      setSuccess(`OT hours saved successfully for ${payload.entries.length} employee(s) ✅`);

      // Reset form
      setOtHours({});
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
      setSelectedDepartmentId("");
      setEmployees([]);
      setSelectedEmployeeIds([]);
      setEmployeeSearch("");
    } catch (err) {
      setError(err.message || "An error occurred while saving OT hours");
      console.error("Error saving OT hours:", err);
    } finally {
      setSaving(false);
    }
  };

  // Filtered employees based on search query (typing) and dropdown filter
  const filteredEmployees = useMemo(() => {
    // If department is selected, start with department employees; else all company employees
    let list = selectedDepartmentId ? departmentEmployees : (allCompanyEmployees.length ? allCompanyEmployees : employees);

    if (selectedEmployeeIds.length > 0) {
      const selectedSet = new Set(selectedEmployeeIds);
      if (selectedDepartmentId) {
        const inDept = departmentEmployees.filter((e) => selectedSet.has(String(e.id)));
        list = inDept.length > 0 ? inDept : allCompanyEmployees.filter((e) => selectedSet.has(String(e.id)));
      } else {
        list = (allCompanyEmployees.length ? allCompanyEmployees : employees).filter((e) => selectedSet.has(String(e.id)));
      }
    }

    if (employeeSearch.trim()) {
      const term = employeeSearch.trim().toLowerCase();
      list = list.filter((emp) => {
        const code = String(emp.curEmployeeCode || emp.employeeCode || emp.ticketNo || emp.id || "").toLowerCase();
        const newCode = String(emp.newEmployeeCode || "").toLowerCase();
        const name = (emp.firstName || "").toLowerCase();
        const desig = String(emp.designation?.acronym || emp.designation?.name || "").toLowerCase();
        const dept = String(emp.department?.acronym || emp.department?.departmentname || "").toLowerCase();
        return code.includes(term) || newCode.includes(term) || name.includes(term) || desig.includes(term) || dept.includes(term);
      });
    }

    return list;
  }, [selectedDepartmentId, departmentEmployees, allCompanyEmployees, employees, selectedEmployeeIds, employeeSearch]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">OT Hours Entry</h1>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg border border-green-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Filter Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Company Dropdown */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Company <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName || company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Dropdown (OPTIONAL) */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Department
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value);
                  setSelectedEmployeeIds([]);
                }}
                disabled={!selectedCompanyId}
                className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.departmentname || dept.departmentName || dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-gray-600">
            <p>Loading employees...</p>
          </div>
        )}

        {/* Employees List Section */}
        {!loading && employees.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Header & Typing Filter Toolbar */}
            <div className="bg-slate-50 p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  {(() => {
                    const dept = departments.find((d) => String(d.id) === String(selectedDepartmentId));
                    return dept?.acronym || dept?.departmentname || dept?.departmentName || dept?.name || "All Departments";
                  })()}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                    Showing {filteredEmployees.length} of {employees.length} employees
                  </span>
                  {(employeeSearch || selectedEmployeeIds.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeSearch("");
                        setSelectedEmployeeIds([]);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold underline ml-1"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar Controls: Employee Dropdown near Search Bar (ACCORDING TO DEPARTMENT) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <div className="w-full sm:w-64">
                  <EmployeeMultiSelect
                    label=""
                    employees={departmentEmployees}
                    selected={selectedEmployeeIds}
                    onChange={setSelectedEmployeeIds}
                    disabled={!departmentEmployees.length}
                    compact
                  />
                </div>
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search employee name, code, designation..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => setEmployeeSearch("")}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs font-bold p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-blue-700 to-blue-800 text-white sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold whitespace-nowrap bg-blue-700 sticky top-0 z-20 w-16">S.No</th>
                    <th className="p-3 text-left text-sm font-semibold whitespace-nowrap bg-blue-700 sticky top-0 z-20">Employee Code</th>
                    <th className="p-3 text-left text-sm font-semibold whitespace-nowrap bg-blue-700 sticky top-0 z-20">Employee Name</th>
                    <th className="p-3 text-left text-sm font-semibold whitespace-nowrap bg-blue-700 sticky top-0 z-20">Designation</th>
                    <th className="p-3 text-left text-sm font-semibold whitespace-nowrap bg-blue-700 sticky top-0 z-20 w-48">OT Hours <span className="text-red-300">*</span></th>
                    <th className="p-3 text-center text-sm font-semibold whitespace-nowrap bg-blue-700 sticky top-0 z-20 w-36">Action / Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500">
                        <p className="font-semibold text-sm">No employees match your search or filter.</p>
                        <p className="text-xs text-gray-400 mt-1">Try clearing the search text or changing the employee dropdown.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEmployeeSearch("");
                            setSelectedEmployeeIds([]);
                          }}
                          className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                        >
                          Clear Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, index) => {
                      const existingRecord = otRecords[emp.id];
                      return (
                        <tr key={emp.id} className="hover:bg-blue-50/40 border-b transition-colors">
                          <td className="p-3 text-sm text-gray-500 font-mono">{index + 1}</td>
                          <td className="p-3 text-sm font-semibold text-gray-700 font-mono">{emp.curEmployeeCode || emp.employeeCode || emp.ticketNo || emp.id}</td>
                          <td className="p-3 text-sm font-semibold text-gray-900">
                            {emp.firstName}
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {emp.designation?.acronym || emp.designation?.name || emp.designationName || "-"}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="Enter OT hours"
                              value={otHours[emp.id] || ""}
                              onChange={(e) => handleOtHoursChange(emp.id, e.target.value)}
                              disabled={!!existingRecord}
                              className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 font-medium"
                            />
                          </td>
                          <td className="p-3 text-center">
                            {existingRecord ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(existingRecord, emp)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition shadow-sm"
                              >
                                ✏️ Edit Details
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(null, emp)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                              >
                                ➕ Add Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Submit Button */}
            <div className="bg-gray-50 p-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md flex items-center gap-2"
              >
                {saving ? "Saving..." : "💾 Save OT Hours"}
              </button>
            </div>
          </div>
        )}

        {/* No Employees Found */}
        {!loading && employees.length === 0 && selectedCompanyId && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 text-lg">
              No employees found. Please check company or department selection.
            </p>
          </div>
        )}

        {/* Initial State - No Company Selected */}
        {!loading && employees.length === 0 && !selectedCompanyId && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 text-lg">
              Select a company above to view employees and enter OT hours.
            </p>
          </div>
        )}
      </form>

      {/* --- Detailed OT Entry Edit/Add Modal --- */}
      {showEditModal && editEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-2xl w-full max-w-lg overflow-hidden transform scale-95 duration-200 animate-in fade-in flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-6 py-4 flex justify-between items-center border-b border-blue-950">
              <div>
                <h3 className="text-lg font-black tracking-tight">Detailed Overtime Entry</h3>
                <p className="text-xs text-blue-200 font-medium">Add or modify detailed overtime records.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-white/80 hover:text-white text-2xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 bg-slate-50 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Emp Code & Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Emp. Code</label>
                  <input
                    type="text"
                    value={editEmployee.curEmployeeCode || editEmployee.employeeCode || editEmployee.id || ""}
                    disabled
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Emp Name</label>
                  <input
                    type="text"
                    value={editEmployee.firstName}
                    disabled
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold uppercase"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                <input
                  type="text"
                  value={format(new Date(selectedDate), "dd-MMM-yyyy")}
                  disabled
                  className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold"
                />
              </div>

              {/* Shift & Work Dept */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Shift</label>
                  <select
                    value={editShiftId}
                    onChange={(e) => setEditShiftId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
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
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Work Dept</label>
                  <select
                    value={editWorkedDeptId}
                    onChange={(e) => setEditWorkedDeptId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentname || d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* From Time & To Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">From Time</label>
                  <input
                    type="datetime-local"
                    value={editFromTime}
                    onChange={(e) => setEditFromTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">To Time</label>
                  <input
                    type="datetime-local"
                    value={editToTime}
                    onChange={(e) => setEditToTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* OT Hours & OT Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">OT Hours (Auto)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editOtHours}
                    onChange={(e) => setEditOtHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-blue-100 border border-blue-300 rounded-xl text-blue-900 text-xs font-black font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">OT Type</label>
                  <select
                    value={editOtType}
                    onChange={(e) => setEditOtType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="HOURS OT">HOURS OT</option>
                    <option value="FULL TIME OT">FULL TIME OT</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveModalRecord}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2 rounded-xl transition"
              >
                {saving ? "Saving..." : "Save Details"}
              </button>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OTHoursManagement;
