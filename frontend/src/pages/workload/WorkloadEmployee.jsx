import React, { useState, useEffect, useMemo, useRef } from "react";
import API from "../../api";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Users,
  Check,
  AlertCircle
} from "lucide-react";

const WorkloadEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal State for Adding Employees
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmployees, setModalEmployees] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalSelectedEmpIds, setModalSelectedEmpIds] = useState(new Set());

  const searchInputRef = useRef(null);

  // Fetch enrolled workload employees
  const fetchWorkloadEmployees = async () => {
    try {
      setLoading(true);
      const res = await API.get("/workload-employees");
      if (res.data && res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load workload employees:", err);
      toast.error(err.response?.data?.message || "Failed to load workload employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloadEmployees();
  }, []);

  // Filter workload employees based on main search input
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const q = searchTerm.toLowerCase().trim();
    return employees.filter((emp) => {
      const tkt = (emp.ticketNo || "").toLowerCase();
      const name = (emp.employeeName || "").toLowerCase();
      const dept = (emp.department || "").toLowerCase();
      return tkt.includes(q) || name.includes(q) || dept.includes(q);
    });
  }, [employees, searchTerm]);

  // Handle Multi-Select on main table
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all currently filtered/visible employees
      const updated = new Set(selectedIds);
      filteredEmployees.forEach((emp) => updated.add(emp.id));
      setSelectedIds(updated);
    } else {
      // Uncheck all currently filtered/visible employees
      const updated = new Set(selectedIds);
      filteredEmployees.forEach((emp) => updated.delete(emp.id));
      setSelectedIds(updated);
    }
  };

  const handleToggleSelect = (id) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
  };

  // Delete single record
  const handleDeleteSingle = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name || 'this employee'}" from workload?`)) {
      return;
    }

    try {
      const res = await API.delete(`/workload-employees/${id}`);
      if (res.data && res.data.success) {
        toast.success("Employee removed from workload list");
        const updated = new Set(selectedIds);
        updated.delete(id);
        setSelectedIds(updated);
        fetchWorkloadEmployees();
      }
    } catch (err) {
      console.error("Failed to remove employee:", err);
      toast.error(err.response?.data?.message || "Failed to remove employee");
    }
  };

  // Bulk delete selected records
  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    if (!window.confirm(`Are you sure you want to remove ${count} selected employee(s) from workload?`)) {
      return;
    }

    try {
      const res = await API.post("/workload-employees/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      if (res.data && res.data.success) {
        toast.success(`Removed ${count} employee(s) successfully!`);
        setSelectedIds(new Set());
        fetchWorkloadEmployees();
      }
    } catch (err) {
      console.error("Failed to bulk remove:", err);
      toast.error(err.response?.data?.message || "Failed to remove selected employees");
    }
  };

  // Open Add Employee Modal
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setModalSearchTerm("");
    setModalSelectedEmpIds(new Set());
    try {
      setModalLoading(true);
      const res = await API.get("/workload-employees/available");
      if (res.data && res.data.success) {
        setModalEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch available employees:", err);
      toast.error("Failed to fetch employees list");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalEmployees([]);
    setModalSelectedEmpIds(new Set());
  };

  // Filter available employees in modal by search bar
  const filteredModalEmployees = useMemo(() => {
    if (!modalSearchTerm.trim()) return modalEmployees;
    const q = modalSearchTerm.toLowerCase().trim();
    return modalEmployees.filter((emp) => {
      const name = (emp.employeeName || "").toLowerCase();
      const tkt = (emp.ticketNo || "").toLowerCase();
      const dept = (emp.dept || "").toLowerCase();
      return name.includes(q) || tkt.includes(q) || dept.includes(q);
    });
  }, [modalEmployees, modalSearchTerm]);

  // Toggle selection inside modal
  const handleToggleModalSelect = (empId, isEnrolled) => {
    if (isEnrolled) return;
    const updated = new Set(modalSelectedEmpIds);
    if (updated.has(empId)) {
      updated.delete(empId);
    } else {
      updated.add(empId);
    }
    setModalSelectedEmpIds(updated);
  };

  // Save selection from modal
  const handleSaveModalSelection = async () => {
    if (modalSelectedEmpIds.size === 0) {
      toast.warning("Please select at least one employee to add");
      return;
    }

    try {
      const res = await API.post("/workload-employees", {
        employeeIds: Array.from(modalSelectedEmpIds),
      });
      if (res.data && res.data.success) {
        toast.success(`Successfully added ${modalSelectedEmpIds.size} employee(s) to workload!`);
        handleCloseModal();
        fetchWorkloadEmployees();
      }
    } catch (err) {
      console.error("Failed to add employees:", err);
      toast.error(err.response?.data?.message || "Failed to add employees to workload");
    }
  };

  // Check if all visible filtered items are selected
  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedIds.has(emp.id));

  // Check if some but not all visible items are selected (indeterminate state)
  const isSomeSelected =
    filteredEmployees.some((emp) => selectedIds.has(emp.id)) && !isAllSelected;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-lg shadow-sm">
              <Users className="w-5 h-5" />
            </span>
            Workload Employees
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage employees assigned to workload monitoring, trainee allocations, and daily attendance tracking.
          </p>
        </div>

        {/* Action Controls Top-Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkloadEmployees}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Top Toolbar: Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Tkt.No, Employee Name, or Dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Records summary counter */}
          <div className="text-xs text-slate-500 self-center">
            Showing <span className="font-semibold text-slate-800">{filteredEmployees.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{employees.length}</span> employees
          </div>
        </div>

        {/* Tabular Column: slno, Tkt.No, Employee Name, Dept, H/O */}
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white sticky top-0 z-10 shadow-sm border-b border-blue-950 font-semibold text-xs tracking-wider uppercase">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select All Visible"
                  />
                </th>
                <th className="py-3.5 px-4 w-20 text-center text-blue-100">slno</th>
                <th className="py-3.5 px-4 w-28 text-blue-100">Tkt.No</th>
                <th className="py-3.5 px-6 text-blue-100">Employee Name</th>
                <th className="py-3.5 px-4 w-32 text-blue-100">Dept</th>
                <th className="py-3.5 px-4 w-24 text-center text-blue-100">H/O</th>
                <th className="py-3.5 px-4 w-28 text-center text-blue-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-blue-500" />
                    Loading workload employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    No workload employees found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isSelected ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {item.slno || idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {item.ticketNo}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {item.employeeName}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {item.department}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-md ${
                            item.ho === "H"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.ho}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteSingle(item.id, item.employeeName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition shadow-2xs"
                          title="Delete Employee from Workload"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Corner Action Controls (Delete, Cancel & Selection Info) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredEmployees.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{employees.length}</span> workload employees
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <span className="text-xs font-bold text-slate-700 mr-1 bg-slate-200/80 px-2.5 py-1 rounded-md">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm transition"
                  title="Remove selected employees from workload"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedIds.size})
                </button>
                <button
                  onClick={handleCancelSelection}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 border border-slate-300 rounded-lg shadow-sm transition"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Select rows to remove multiple employees from workload
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL: Select Employees from Master (Reference Photo Model)         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6">
          <div className="bg-[#e49b6b] border-2 border-[#b86d3d] rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            {/* Modal Title Bar */}
            <div className="bg-[#b86d3d] text-white px-5 py-3 flex items-center justify-between font-bold text-base select-none shadow-sm">
              <span className="tracking-wide flex items-center gap-2">
                <span>Select Employees</span>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                  {modalSelectedEmpIds.size} selected
                </span>
              </span>
              <button
                onClick={handleCloseModal}
                className="hover:bg-red-600 p-1.5 rounded-md transition text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Employee List Table */}
            <div className="bg-white overflow-y-auto flex-1 border-b border-[#b86d3d]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-bold uppercase select-none z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-14 text-center">Sel</th>
                    <th className="py-2.5 px-6">Emp Name</th>
                    <th className="py-2.5 px-4 w-24 text-center">cat</th>
                    <th className="py-2.5 px-6 w-40">dept</th>
                    <th className="py-2.5 px-6 w-32 text-right">ticketno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalLoading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500">
                        <RefreshCw className="w-7 h-7 mx-auto animate-spin mb-2 text-amber-600" />
                        Loading full employee list...
                      </td>
                    </tr>
                  ) : filteredModalEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                        No employees found matching "{modalSearchTerm}"
                      </td>
                    </tr>
                  ) : (
                    filteredModalEmployees.map((emp) => {
                      const isSelected = modalSelectedEmpIds.has(emp.id);
                      const isEnrolled = emp.isEnrolled;

                      return (
                        <tr
                          key={emp.id}
                          onClick={() => handleToggleModalSelect(emp.id, isEnrolled)}
                          className={`cursor-pointer transition select-none ${
                            isEnrolled
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#ff4e00] text-white font-bold"
                              : "hover:bg-amber-50 text-slate-800"
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected || isEnrolled}
                              disabled={isEnrolled}
                              onChange={() => {}}
                              className="rounded cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="py-2.5 px-6 uppercase font-medium">
                            {emp.employeeName}
                            {isEnrolled && (
                              <span className="ml-2 text-xs text-slate-500 font-normal italic">
                                (Enrolled)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold">
                            {emp.cat}
                          </td>
                          <td className="py-2.5 px-6 uppercase font-medium">
                            {emp.dept}
                          </td>
                          <td className="py-2.5 px-6 text-right font-mono font-bold text-sm">
                            {emp.ticketNo}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Bottom: Search Bar & Action Buttons (matching photo style) */}
            <div className="bg-[#d9ecff] p-4 border-t border-[#b86d3d] flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                  Search:
                </span>
                <input
                  type="text"
                  placeholder="Search by ticket number or name..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-sm bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  autoFocus
                />
                {modalSearchTerm && (
                  <button
                    onClick={() => setModalSearchTerm("")}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Bottom End Buttons */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-700">
                  Showing <span className="text-blue-800 font-bold">{filteredModalEmployees.length}</span> of <span className="font-bold">{modalEmployees.length}</span> total employees
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveModalSelection}
                    disabled={modalSelectedEmpIds.size === 0}
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition ${
                      modalSelectedEmpIds.size > 0
                        ? "bg-blue-700 hover:bg-blue-800 active:bg-blue-900 cursor-pointer"
                        : "bg-slate-400 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Add Selected ({modalSelectedEmpIds.size})
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkloadEmployee;
