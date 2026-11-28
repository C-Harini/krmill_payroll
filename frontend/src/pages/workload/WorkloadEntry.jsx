import React, { useState, useEffect, useMemo, useRef } from "react";
import API from "../../api";
import { toast } from "react-toastify";
import {
  Calendar,
  Save,
  X,
  Search,
  RefreshCw,
  Layers,
  ListFilter,
  Check,
  AlertCircle
} from "lucide-react";

// Format date helper: returns "YYYY-MM-DD"
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const WorkloadEntry = () => {
  // Date State
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Table rows for the selected date
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Workload Master List (for Autocomplete)
  const [workloadMasterList, setWorkloadMasterList] = useState([]);

  // Active inline cell editing state for Cur.WL
  const [activeEditEmpId, setActiveEditEmpId] = useState(null);
  const [activeEditText, setActiveEditText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Entry Date List Modal State
  const [showDateListModal, setShowDateListModal] = useState(false);
  const [savedDates, setSavedDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);

  const editInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load Workload Master list for autocomplete
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await API.get("/workload-master");
        if (res.data && res.data.success) {
          setWorkloadMasterList(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load workload master for suggestions:", err);
      }
    };
    fetchMaster();
  }, []);

  // Fetch entries for the selected date
  const fetchEntries = async (dateStr) => {
    try {
      setLoading(true);
      const res = await API.get(`/workload-entries?date=${dateStr}`);
      if (res.data && res.data.success) {
        setEntries(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch workload entries:", err);
      toast.error(err.response?.data?.message || "Failed to load workload entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchEntries(selectedDate);
    }
  }, [selectedDate]);

  // Handle outside click to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        editInputRef.current &&
        !editInputRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Entry Date List
  const handleOpenDateListModal = async () => {
    setShowDateListModal(true);
    setLoadingDates(true);
    try {
      const res = await API.get("/workload-entries/dates");
      if (res.data && res.data.success) {
        setSavedDates(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch entry dates:", err);
      toast.error("Failed to load saved entry dates");
    } finally {
      setLoadingDates(false);
    }
  };

  // Select date from the Date List Modal to load and edit
  const handleSelectDateFromList = (d) => {
    setSelectedDate(d);
    setShowDateListModal(false);
    fetchEntries(d);
  };

  // Filter entries based on search input
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const q = searchTerm.toLowerCase().trim();
    return entries.filter((row) => {
      const tkt = (row.ticketNumber || "").toLowerCase();
      const name = (row.empName || "").toLowerCase();
      const dept = (row.dept || "").toLowerCase();
      const curWl = (row.currentWorkload || "").toLowerCase();
      return tkt.includes(q) || name.includes(q) || dept.includes(q) || curWl.includes(q);
    });
  }, [entries, searchTerm]);

  // Autocomplete matching workloads
  const matchingWorkloads = useMemo(() => {
    if (!activeEditText || !activeEditText.trim()) return workloadMasterList.slice(0, 30);
    const q = activeEditText.toLowerCase().trim();
    return workloadMasterList.filter((item) => {
      const name = (item.workloadName || "").toLowerCase();
      const code = String(item.code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [workloadMasterList, activeEditText]);

  // Handle click on Current Workload cell to edit
  const handleStartEditWorkload = (row) => {
    setActiveEditEmpId(row.employeeId);
    setActiveEditText(row.currentWorkload === "-" ? "" : row.currentWorkload);
    setShowDropdown(true);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 50);
  };

  // Select item from autocomplete dropdown
  const handleSelectWorkload = (empId, masterItem) => {
    setEntries((prev) =>
      prev.map((r) => {
        if (r.employeeId === empId) {
          return {
            ...r,
            currentWorkload: masterItem.workloadName,
            currentSalary: Number(masterItem.salary) || 0,
            workloadMasterId: masterItem.id,
          };
        }
        return r;
      })
    );
    setActiveEditEmpId(null);
    setActiveEditText("");
    setShowDropdown(false);
  };

  // When user types in Current Workload input
  const handleWorkloadInputChange = (empId, text) => {
    setActiveEditText(text);
    setShowDropdown(true);

    const exact = workloadMasterList.find(
      (m) => m.workloadName.toLowerCase() === text.trim().toLowerCase()
    );

    setEntries((prev) =>
      prev.map((r) => {
        if (r.employeeId === empId) {
          return {
            ...r,
            currentWorkload: text || "-",
            currentSalary: exact ? Number(exact.salary) : r.currentSalary,
            workloadMasterId: exact ? exact.id : r.workloadMasterId,
          };
        }
        return r;
      })
    );
  };

  // Save all modified entries to backend
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        date: selectedDate,
        entries: entries.map((r) => ({
          employeeId: r.employeeId,
          currentWorkload: r.currentWorkload,
          currentSalary: r.currentSalary,
          workloadMasterId: r.workloadMasterId,
        })),
      };

      const res = await API.post("/workload-entries/save", payload);
      if (res.data && res.data.success) {
        toast.success(`Workload entries saved successfully for ${selectedDate}!`);
        fetchEntries(selectedDate);
      }
    } catch (err) {
      console.error("Failed to save entries:", err);
      toast.error(err.response?.data?.message || "Failed to save workload entries");
    } finally {
      setSaving(false);
    }
  };

  // Cancel changes (re-fetch current saved state)
  const handleCancel = () => {
    setActiveEditEmpId(null);
    setShowDropdown(false);
    fetchEntries(selectedDate);
    toast.info("Changes reverted");
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </span>
            Workload Entry
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Daily operator workload allocation, machine side standards, and assigned salary scales.
          </p>
        </div>

        {/* Date Selector, Load Button & Entry Date List */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 pl-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => fetchEntries(selectedDate)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
            title="Load entries for selected date"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Load
          </button>

          <button
            onClick={handleOpenDateListModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm transition cursor-pointer"
            title="View dates where workload entries have been recorded"
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-600" />
            Entry Date List
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Top Search Toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Ticket No, Employee Name, Dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-600 font-semibold self-center">
            Showing <span className="text-blue-900 font-bold">{filteredEntries.length}</span> of{" "}
            <span className="text-blue-900 font-bold">{entries.length}</span> Employees
          </div>
        </div>

        {/* Tabular Column */}
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white sticky top-0 z-20 shadow-sm border-b border-blue-950 font-bold text-xs uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-3 text-center text-blue-100 border-r border-blue-800/40 w-16">
                  Tkt.No
                </th>
                <th className="py-3 px-3 text-center text-blue-100 border-r border-blue-800/40 w-14">
                  slno
                </th>
                <th className="py-3 px-5 text-blue-100 border-r border-blue-800/40 min-w-[180px]">
                  Employee Name
                </th>
                <th className="py-3 px-3 text-center text-blue-100 border-r border-blue-800/40 w-16">
                  Dept
                </th>
                <th className="py-3 px-3 text-center text-blue-100 border-r border-blue-800/40 w-14">
                  Cat
                </th>
                <th className="py-3 px-4 text-center text-blue-100 border-r border-blue-800/40 w-28">
                  DOJ
                </th>
                <th className="py-3 px-3 text-center text-blue-100 border-r border-blue-800/40 w-20">
                  Exp
                </th>
                <th className="py-3 px-3 text-center text-blue-100 border-r border-blue-800/40 w-16">
                  Target
                </th>
                <th className="py-3 px-5 text-blue-100 border-r border-blue-800/40 min-w-[160px]">
                  Prv.WL
                </th>
                <th className="py-3 px-4 text-right text-blue-100 border-r border-blue-800/40 w-20">
                  Prv.Sal
                </th>
                <th className="py-3 px-5 text-amber-200 border-r border-blue-800/40 min-w-[200px] bg-blue-950/60">
                  Cur.WL
                </th>
                <th className="py-3 px-4 text-right text-amber-200 border-r border-blue-800/40 w-20 bg-blue-950/60">
                  Cur.Sal
                </th>
                <th className="py-3 px-3 text-center text-blue-100 w-24">
                  waste/Effi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 font-semibold text-sm">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-blue-500" />
                    Loading workload entries...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 font-semibold text-sm">
                    <AlertCircle className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    No workload entries found for date {selectedDate}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => {
                  const isEditingWl = activeEditEmpId === row.employeeId;

                  return (
                    <tr
                      key={row.employeeId}
                      className="hover:bg-blue-50/40 transition-colors font-medium text-slate-800"
                    >
                      {/* Ticket Number */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                        {row.ticketNumber}
                      </td>

                      {/* Serial Number */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 border-r border-slate-200">
                        {row.slno}
                      </td>

                      {/* Employee Name */}
                      <td className="py-2.5 px-5 font-bold uppercase text-slate-900 border-r border-slate-200">
                        {row.empName}
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                        {row.dept}
                      </td>

                      {/* Category (H or O) */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded ${
                            row.category === "H"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-blue-100 text-blue-900"
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>

                      {/* Date of Joining */}
                      <td className="py-2.5 px-4 text-center font-mono text-slate-700 border-r border-slate-200">
                        {row.dateOfJoining}
                      </td>

                      {/* Experience */}
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700 border-r border-slate-200">
                        {row.experience}
                      </td>

                      {/* Target (Always "-") */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400 border-r border-slate-200">
                        {row.target || "-"}
                      </td>

                      {/* Previous Workload */}
                      <td className="py-2.5 px-5 font-semibold text-slate-700 border-r border-slate-200 truncate max-w-[200px]" title={row.previousWorkload}>
                        {row.previousWorkload || "-"}
                      </td>

                      {/* Previous Salary */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                        {row.previousSalary !== "-" && row.previousSalary !== null
                          ? Number(row.previousSalary).toLocaleString("en-IN")
                          : "-"}
                      </td>

                      {/* Current Workload (Click to Edit with Autocomplete Dropdown) */}
                      <td
                        onClick={() => handleStartEditWorkload(row)}
                        className={`py-1.5 px-4 border-r border-slate-200 cursor-pointer relative select-none ${
                          isEditingWl ? "bg-amber-50" : "hover:bg-amber-50/60"
                        }`}
                        title="Click to edit workload"
                      >
                        {isEditingWl ? (
                          <div className="relative">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={activeEditText}
                              onChange={(e) =>
                                handleWorkloadInputChange(row.employeeId, e.target.value)
                              }
                              onFocus={() => setShowDropdown(true)}
                              className="w-full px-2.5 py-1 text-xs font-bold text-blue-900 bg-white border-2 border-blue-500 rounded focus:outline-none shadow-sm"
                              placeholder="Type workload name..."
                            />

                            {/* Autocomplete Dropdown Popup */}
                            {showDropdown && matchingWorkloads.length > 0 && (
                              <div
                                ref={dropdownRef}
                                className="absolute left-0 top-full mt-1 w-72 max-h-56 overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-xl z-50 divide-y divide-slate-100"
                              >
                                {matchingWorkloads.map((item) => (
                                  <div
                                    key={item.id}
                                    onMouseDown={() =>
                                      handleSelectWorkload(row.employeeId, item)
                                    }
                                    className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between text-slate-800 font-semibold"
                                  >
                                    <div className="truncate pr-2">
                                      <span className="font-bold text-slate-900">
                                        {item.workloadName}
                                      </span>
                                      {item.code !== null && (
                                        <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                                          (Code {item.code})
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-emerald-700 font-mono font-bold whitespace-nowrap">
                                      ₹{Number(item.salary).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="font-bold text-blue-900">
                            {row.currentWorkload || "-"}
                          </div>
                        )}
                      </td>

                      {/* Current Salary (Auto-filled based on current workload) */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                        {row.currentSalary !== undefined && row.currentSalary !== null
                          ? Number(row.currentSalary).toLocaleString("en-IN")
                          : 0}
                      </td>

                      {/* Waste / Efficiency (Always 0) */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {row.wasteEfficiency || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar: Save, Cancel & Total Employees */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-700">
            Total Employees : <span className="text-blue-900">{filteredEntries.length}</span>
          </div>

          {/* Bottom Right Save and Cancel Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-lg shadow-sm transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Entry Date List (Shows all dates where entries were recorded)       */}
      {/* ========================================================================= */}
      {showDateListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-800 to-blue-900 text-white px-5 py-3.5 flex items-center justify-between font-bold text-sm">
              <span className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-blue-200" />
                Workload Entry Dates
              </span>
              <button
                onClick={() => setShowDateListModal(false)}
                className="hover:bg-white/20 p-1 rounded transition text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {loadingDates ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-blue-500" />
                  Loading entry dates...
                </div>
              ) : savedDates.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  No recorded workload dates found yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {savedDates.map((item) => (
                    <button
                      key={item.date}
                      onClick={() => handleSelectDateFromList(item.date)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {item.date}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        {item.count} entries
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowDateListModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkloadEntry;
