import React, { useState, useEffect, useMemo, useRef } from "react";
import API from "../../api";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Layers,
  AlertCircle
} from "lucide-react";

const WorkloadMaster = () => {
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Editing state: { [id]: { code, workloadName, reportName, salary, side } }
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Adding new row state
  const [isAdding, setIsAdding] = useState(false);
  const [newRowData, setNewRowData] = useState({
    code: "",
    workloadName: "",
    reportName: "",
    salary: "",
    side: "",
  });

  const newRowRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch workload data from backend API
  const fetchWorkloads = async (term = "") => {
    try {
      setLoading(true);
      const url = term ? `/workload-master?search=${encodeURIComponent(term)}` : "/workload-master";
      const res = await API.get(url);
      if (res.data && res.data.success) {
        setWorkloads(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load workloads:", err);
      toast.error(err.response?.data?.message || "Failed to load workload master data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloads();
  }, []);

  // Filter workloads based on search input (client-side instant search)
  const filteredWorkloads = useMemo(() => {
    if (!searchTerm.trim()) return workloads;
    const q = searchTerm.toLowerCase().trim();
    return workloads.filter((item) => {
      const codeStr = item.code !== null && item.code !== undefined ? String(item.code) : "";
      const nameStr = (item.workloadName || "").toLowerCase();
      const reportStr = (item.reportName || "").toLowerCase();
      return codeStr.includes(q) || nameStr.includes(q) || reportStr.includes(q);
    });
  }, [workloads, searchTerm]);

  // Handle Multi-Select
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(filteredWorkloads.map((w) => w.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
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

  // Start adding new entry (scrolls to the end of entries)
  const handleStartAdd = () => {
    setIsAdding(true);
    setNewRowData({
      code: "",
      workloadName: "",
      reportName: "",
      salary: "",
      side: "",
    });
    setTimeout(() => {
      newRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewRowData({ code: "", workloadName: "", reportName: "", salary: "", side: "" });
  };

  // Save new record
  const handleSaveNew = async () => {
    if (!newRowData.workloadName.trim()) {
      toast.warning("Work Load name cannot be empty");
      return;
    }

    try {
      const payload = {
        code: newRowData.code !== "" ? Number(newRowData.code) : null,
        workloadName: newRowData.workloadName.trim(),
        reportName: newRowData.reportName.trim() || null,
        salary: newRowData.salary !== "" ? Number(newRowData.salary) : 0,
        side: newRowData.side !== "" ? Number(newRowData.side) : 0,
      };

      const res = await API.post("/workload-master", payload);
      if (res.data && res.data.success) {
        toast.success("Workload master entry added successfully!");
        setIsAdding(false);
        setNewRowData({ code: "", workloadName: "", reportName: "", salary: "", side: "" });
        fetchWorkloads(searchTerm);
      }
    } catch (err) {
      console.error("Failed to add entry:", err);
      toast.error(err.response?.data?.message || "Failed to add entry");
    }
  };

  // Start editing a row
  const handleStartEdit = (item) => {
    setEditingRowId(item.id);
    setEditFormData({
      code: item.code !== null && item.code !== undefined ? item.code : "",
      workloadName: item.workloadName || "",
      reportName: item.reportName || "",
      salary: item.salary !== null && item.salary !== undefined ? item.salary : 0,
      side: item.side !== null && item.side !== undefined ? item.side : 0,
    });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  // Save edited row
  const handleSaveEdit = async (id) => {
    if (!editFormData.workloadName || !editFormData.workloadName.trim()) {
      toast.warning("Work Load name cannot be empty");
      return;
    }

    try {
      const payload = {
        code: editFormData.code !== "" ? Number(editFormData.code) : null,
        workloadName: editFormData.workloadName.trim(),
        reportName: editFormData.reportName ? editFormData.reportName.trim() : null,
        salary: editFormData.salary !== "" ? Number(editFormData.salary) : 0,
        side: editFormData.side !== "" ? Number(editFormData.side) : 0,
      };

      const res = await API.put(`/workload-master/${id}`, payload);
      if (res.data && res.data.success) {
        toast.success("Workload entry updated successfully!");
        setEditingRowId(null);
        setEditFormData({});
        fetchWorkloads(searchTerm);
      }
    } catch (err) {
      console.error("Failed to update entry:", err);
      toast.error(err.response?.data?.message || "Failed to update entry");
    }
  };

  // Delete single record
  const handleDeleteSingle = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name || 'this workload'}"?`)) {
      return;
    }

    try {
      const res = await API.delete(`/workload-master/${id}`);
      if (res.data && res.data.success) {
        toast.success("Record deleted successfully");
        const updated = new Set(selectedIds);
        updated.delete(id);
        setSelectedIds(updated);
        fetchWorkloads(searchTerm);
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  // Delete selected records (Multiple Select Delete)
  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${count} selected workload record(s)?`)) {
      return;
    }

    try {
      const res = await API.post("/workload-master/bulk-delete", {
        ids: Array.from(selectedIds),
      });
      if (res.data && res.data.success) {
        toast.success(`Deleted ${count} record(s) successfully!`);
        setSelectedIds(new Set());
        fetchWorkloads(searchTerm);
      }
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      toast.error(err.response?.data?.message || "Failed to delete selected records");
    }
  };

  const isAllSelected =
    filteredWorkloads.length > 0 && selectedIds.size === filteredWorkloads.length;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Inline style to hide number spinners in code inputs */}
      <style>{`
        input[type="number"].no-spinner::-webkit-inner-spin-button,
        input[type="number"].no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"].no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </span>
            Workload Master
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage mill workload definitions, reporting parameters, and assigned salary scales.
          </p>
        </div>

        {/* Action Controls Top-Right */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWorkloads(searchTerm)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Top Toolbar: Unified Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Code, Work Load, or Report Name..."
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
            Showing <span className="font-semibold text-slate-800">{filteredWorkloads.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{workloads.length}</span> records
          </div>
        </div>

        {/* Tabular Column: Code, Work Load, Report Name, Salary */}
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white sticky top-0 z-10 shadow-sm border-b border-blue-950 font-semibold text-xs tracking-wider uppercase">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="py-3.5 px-4 w-24 text-blue-100">Code</th>
                <th className="py-3.5 px-6 text-blue-100">Work Load</th>
                <th className="py-3.5 px-6 text-blue-100">Report Name</th>
                <th className="py-3.5 px-4 w-32 text-right text-blue-100">Salary</th>
                <th className="py-3.5 px-4 w-36 text-center text-blue-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && workloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-blue-500" />
                    Loading workload records...
                  </td>
                </tr>
              ) : filteredWorkloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    No workload records found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredWorkloads.map((item) => {
                  const isEditing = editingRowId === item.id;
                  const isSelected = selectedIds.has(item.id);

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-blue-50/60 border-y-2 border-blue-400">
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled
                            className="rounded opacity-50"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={editFormData.code}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setEditFormData({ ...editFormData, code: val });
                            }}
                            className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Code"
                          />
                        </td>
                        <td className="py-2 px-6">
                          <input
                            type="text"
                            value={editFormData.workloadName}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, workloadName: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                            placeholder="Work Load Name"
                          />
                        </td>
                        <td className="py-2 px-6">
                          <input
                            type="text"
                            value={editFormData.reportName}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, reportName: e.target.value })
                            }
                            className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Report Name"
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input
                            type="number"
                            step="any"
                            value={editFormData.salary}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, salary: e.target.value })
                            }
                            className="w-full text-right px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-emerald-700"
                            placeholder="Salary"
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition shadow-xs flex items-center gap-1"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium transition flex items-center gap-1"
                              title="Cancel Edit"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

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
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {item.code !== null && item.code !== undefined ? item.code : "-"}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-900">
                        {item.workloadName}
                      </td>
                      <td className="py-3 px-6 text-slate-600">
                        {item.reportName || "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700 font-mono">
                        {Number(item.salary).toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition shadow-2xs"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(item.id, item.workloadName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition shadow-2xs"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* End of Entries: Editable Row for New Entry */}
              {isAdding && (
                <tr ref={newRowRef} className="bg-blue-50/70 border-t-2 border-b-2 border-blue-500 shadow-inner">
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded uppercase">
                      New
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newRowData.code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setNewRowData({ ...newRowData, code: val });
                      }}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Code (e.g. 370)"
                      autoFocus
                    />
                  </td>
                  <td className="py-2 px-6">
                    <input
                      type="text"
                      value={newRowData.workloadName}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, workloadName: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      placeholder="Enter Work Load name..."
                    />
                  </td>
                  <td className="py-2 px-6">
                    <input
                      type="text"
                      value={newRowData.reportName}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, reportName: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Report Name..."
                    />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <input
                      type="number"
                      step="any"
                      value={newRowData.salary}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, salary: e.target.value })
                      }
                      className="w-full text-right px-2 py-1.5 text-sm bg-white border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-emerald-800"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={handleSaveNew}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelAdd}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Corner Action Controls (Delete, Cancel & Selection Info) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Side: Records summary */}
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredWorkloads.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{workloads.length}</span> workload records
          </div>

          {/* Right Bottom Corner: Highly Visible Delete and Cancel Buttons */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <span className="text-xs font-bold text-slate-700 mr-1 bg-slate-200/80 px-2.5 py-1 rounded-md">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm transition"
                  title="Delete all selected items"
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
                Select rows to delete multiple entries
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkloadMaster;
