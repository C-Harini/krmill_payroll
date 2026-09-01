import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import API from "../api";
import { toast } from "react-toastify";
import { Save, XCircle, Trash2, Edit } from "lucide-react";

const EightEightMultipleEntry = () => {
  const navigate = useNavigate();

  // --- Active Core States ---
  const [loading, setLoading] = useState(false);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // --- Active Bulk 8-8 Count States ---
  const [bulkPrep, setBulkPrep] = useState(0);
  const [bulkSpg, setBulkSpg] = useState(0);
  const [bulkAuto, setBulkAuto] = useState(0);

  // --- Bulk History States ---
  const [historyList, setHistoryList] = useState([]);

  const companyId = localStorage.getItem("companyId") || "1";

  // Fetch counts when date changes
  useEffect(() => {
    if (entryDate) {
      fetchCounts();
    }
  }, [entryDate]);

  // Fetch history list on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/eight-eight/multiple-entry", {
        params: {
          companyId,
          departmentId: 1,
          workedDeptId: 1,
          date: entryDate,
          shiftId: 1
        }
      });
      if (data.success) {
        setBulkPrep(data.bulkCounts?.["PREP 8-8"] || 0);
        setBulkSpg(data.bulkCounts?.["SPG 8-8"] || 0);
        setBulkAuto(data.bulkCounts?.["Auto 8-8"] || 0);
      } else {
        toast.error(data.message || "Failed to load counts");
      }
    } catch (err) {
      console.error("Error fetching counts:", err);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await API.get("/eight-eight/bulk-history", {
        params: { companyId }
      });
      if (data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error("Error fetching bulk history:", err);
    }
  };

  const handleSaveBulkCounts = async () => {
    setLoading(true);
    try {
      const payload = {
        companyId,
        departmentId: 1,
        workedDeptId: 1,
        date: entryDate,
        shiftId: 1,
        bulkCounts: {
          "PREP 8-8": parseInt(bulkPrep) || 0,
          "SPG 8-8": parseInt(bulkSpg) || 0,
          "Auto 8-8": parseInt(bulkAuto) || 0
        }
      };

      const { data } = await API.post("/eight-eight/bulk-save", payload);
      if (data.success) {
        toast.success("Bulk 8-8 counts saved successfully!");
        fetchCounts();
        fetchHistory();
      } else {
        toast.error(data.message || "Failed to save counts");
      }
    } catch (err) {
      console.error("Save counts error:", err);
      toast.error("Failed to save counts");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (row) => {
    setEntryDate(row.date);
    setBulkPrep(row["PREP 8-8"] || 0);
    setBulkSpg(row["SPG 8-8"] || 0);
    setBulkAuto(row["Auto 8-8"] || 0);
    toast.info(`Loaded counts for ${row.date}. You can modify them above and click Save.`);
  };

  const handleDeleteRow = async (date) => {
    if (!window.confirm(`Are you sure you want to delete all 8-8 counts for ${date}?`)) return;
    setLoading(true);
    try {
      const { data } = await API.post("/eight-eight/bulk-delete", {
        companyId,
        date
      });
      if (data.success) {
        toast.success(`Deleted counts for ${date}`);
        if (date === entryDate) {
          setBulkPrep(0);
          setBulkSpg(0);
          setBulkAuto(0);
        }
        fetchHistory();
      } else {
        toast.error(data.message || "Failed to delete counts");
      }
    } catch (err) {
      console.error("Delete row error:", err);
      toast.error("Failed to delete counts");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Discard changes and return home?")) {
      navigate("/dashboard");
    }
  };

  /*
  ==============================================================================
  DEACTIVATED BACKGROUND LOGIC (COMMENTED OUT TO PREVENT BACKGROUND CALLS)
  ==============================================================================
  
  // --- Core States ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employeeList, setEmployeeList] = useState([]); // left grid data
  const [savedDataList, setSavedDataList] = useState([]); // right grid data
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set()); // selected checkboxes

  // --- Form Input States ---
  const [deptInput, setDeptInput] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [workedDeptInput, setWorkedDeptInput] = useState("");
  const [selectedWorkedDeptId, setSelectedWorkedDeptId] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");

  // --- 8-8 Entry Type Input ---
  const [selectedEntryType, setSelectedEntryType] = useState("PREP 8-8");

  // --- Saved Data Popup Modal States ---
  const [showPopup, setShowPopup] = useState(false);
  const [popupTarget, setPopupTarget] = useState(""); // 'department' or 'workedDept'
  const [popupSearch, setPopupSearch] = useState("");

  // --- Bootstrap ---
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchShifts();
    }
  }, [selectedCompanyId]);

  // Load lists when inputs change
  useEffect(() => {
    if (selectedCompanyId && selectedDeptId && entryDate) {
      fetchMultipleEntryData();
    } else {
      setEmployeeList([]);
      setSavedDataList([]);
    }
  }, [selectedCompanyId, selectedDeptId, selectedWorkedDeptId, entryDate, selectedShiftId, selectedEntryType]);

  // --- Fetchers ---
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
        params: { companyId: selectedCompanyId, limit: 200 }
      });
      const list = data.data || (Array.isArray(data) ? data : []);
      setDepartments(list);
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
      const list = Array.isArray(data) ? data : data.data || [];
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
      const { data } = await API.get("/eight-eight/multiple-entry", {
        params: {
          companyId: selectedCompanyId,
          departmentId: selectedDeptId,
          workedDeptId: selectedWorkedDeptId || selectedDeptId,
          date: entryDate,
          shiftId: selectedShiftId
        }
      });
      if (data.success) {
        setEmployeeList(data.employees || []);
        setSavedDataList(data.savedRecords || []);
        setSelectedEmpIds(new Set());
      } else {
        toast.error(data.message || "Failed to load 8-8 data");
      }
    } catch (err) {
      console.error("Error fetching 8-8 entry data:", err);
      toast.error(err.response?.data?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const toggleSelectEmployee = (empId) => {
    const next = new Set(selectedEmpIds);
    if (next.has(empId)) {
      next.delete(empId);
    } else {
      next.add(empId);
    }
    setSelectedEmpIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.size === employeeList.length) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(employeeList.map((emp) => emp.id)));
    }
  };

  const handleSave = async () => {
    if (selectedEmpIds.size === 0) {
      toast.warning("Please select at least one employee.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        companyId: selectedCompanyId,
        departmentId: selectedDeptId,
        workedDeptId: selectedWorkedDeptId || selectedDeptId,
        date: entryDate,
        shiftId: selectedShiftId,
        entryType: selectedEntryType,
        hours: 0,
        employeeIds: Array.from(selectedEmpIds),
        userId: 1
      };
      const { data } = await API.post("/eight-eight/multiple-entry", payload);
      if (data.success) {
        toast.success(data.message || "8-8 record saved successfully!");
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Failed to save records");
      }
    } catch (err) {
      console.error("Error saving records:", err);
      toast.error(err.response?.data?.message || "Failed to save records");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setLoading(true);
    try {
      const { data } = await API.delete(`/eight-eight/${id}`);
      if (data.success) {
        toast.success("Record deleted successfully!");
        fetchMultipleEntryData();
      } else {
        toast.error(data.message || "Failed to delete record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
      toast.error(err.response?.data?.message || "Failed to delete record");
    } finally {
      setLoading(false);
    }
  };

  // --- Popup Search Modal Handlers ---
  const handleOpenPopup = (target) => {
    setPopupTarget(target);
    setPopupSearch("");
    setShowPopup(true);
  };

  const handleSelectPopupItem = (dept) => {
    if (popupTarget === "department") {
      setDeptInput(dept.departmentname);
      setSelectedDeptId(dept.id);
    } else {
      setWorkedDeptInput(dept.departmentname);
      setSelectedWorkedDeptId(dept.id);
    }
    setShowPopup(false);
  };

  const filteredDepartments = departments.filter((d) => {
    const s = popupSearch.toLowerCase();
    return (
      (d.departmentname && d.departmentname.toLowerCase().includes(s)) ||
      (d.acronym && d.acronym.toLowerCase().includes(s))
    );
  });
  */

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Header title */}
      <div className="mb-6 bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl shadow-xl p-6 text-white flex justify-between items-center transition-all duration-300 hover:shadow-2xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">8-8 Entry Counts</h1>
          <p className="text-blue-100 text-sm mt-1">Administration System — Set and Manage 8-8 Daily Counts</p>
        </div>
      </div>

      {/* Main Container (Full Width) */}
      <div className="space-y-6 w-full">
        {/* Counts Entry Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 w-full">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3 border-slate-100">
            ⏰ 8 to 8 Counts Form
          </h2>

          <div className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Select Date *
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all bg-slate-50/50"
              />
            </div>

            {/* Counts Input Area */}
            <div className="p-5 bg-blue-50/30 rounded-2xl border border-blue-200/50">
              <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span>📊</span> Shift Counts
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1.5">
                    Prep. 8 to 8
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bulkPrep}
                    onChange={(e) => setBulkPrep(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1.5">
                    Spg. 8 to 8
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bulkSpg}
                    onChange={(e) => setBulkSpg(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1.5">
                    Auto 8 to 8
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bulkAuto}
                    onChange={(e) => setBulkAuto(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-5 border-t border-slate-100">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-all shadow active:scale-95"
            >
              <XCircle size={16} />
              Cancel
            </button>

            <button
              onClick={handleSaveBulkCounts}
              disabled={loading}
              className="flex items-center gap-1.5 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {loading ? "Saving..." : "Save Counts"}
            </button>
          </div>
        </div>

        {/* Datewise History Display Table Card (Full Width) */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col w-full">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📋</span> Added Counts Datewise
            </h3>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-left">
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Prep. 8 to 8</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Spg. 8 to 8</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider">Auto 8 to 8</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {historyList.length > 0 ? (
                  historyList.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">
                        {row.date}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {row["PREP 8-8"]}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {row["SPG 8-8"]}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {row["Auto 8-8"]}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditRow(row)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRow(row.date)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-sm">
                      No saved counts found. Add counts above to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        Deactivated Legacy UI Components (Commented Out for Future Re-use)
        ========================================================================

        {false && (
          <>
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                8-8 & Department Configurations
              </h2>
            </div>
          </>
        )}
      */}
    </div>
  );
};

export default EightEightMultipleEntry;
