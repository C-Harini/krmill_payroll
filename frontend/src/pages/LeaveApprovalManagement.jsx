import React, { useEffect, useState } from "react";
import LeaveRequestDetailModal from "./LeaveRequestDetailModal";
import { apiRequest } from "../utils/apiCaller";
import { jwtDecode } from "jwt-decode";

const LeaveApprovalManagement = () => {
  const [allLeaves, setAllLeaves] = useState([]); // Stores all leaves
  const [filteredLeaves, setFilteredLeaves] = useState([]); // Leaves for table
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const token = sessionStorage.getItem("token");
  let employeeId = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      employeeId = decoded.employeeId || decoded.id;
    } catch (err) {
      console.error("Error decoding token in LeaveApprovalManagement:", err);
    }
  }

  
  // ---------------- FETCH ALL LEAVES ----------------
  const fetchApprovals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest('/leave-requests');
    
      setAllLeaves(Array.isArray(res) ? res : []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.message);
      setAllLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FILTER LEAVES BASED ON STATUS ----------------
  useEffect(() => {
    setFilteredLeaves(
      allLeaves.filter((l) =>
        statusFilter === "All"
          ? true
          : l.status?.toLowerCase() === statusFilter.toLowerCase()
      )
    );
  }, [statusFilter, allLeaves]);

  // Fetch leaves on component mount
  useEffect(() => {
    fetchApprovals();
  }, []);

  // ---------------- SELECT CHECKBOXES ----------------
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeaves.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeaves.map((r) => r.id || r.LeaveRequest?.id));
    }
  };

  // ---------------- BULK ACTIONS ----------------
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Approve ${selectedIds.length} requests?`)) return;

    try {
      for (const id of selectedIds) {
        await apiRequest(`/leave-requests/${id}/action`, {
          method: "POST",
          body: JSON.stringify({
            action: "approve",
            comments: "Bulk approved",
            actionBy: employeeId || 1,
          }),
        });
      }
      fetchApprovals();
      setSelectedIds([]);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleQuickApprove = async (id) => {
    try {
      await apiRequest(`/leave-requests/${id}/action`, {
        method: "POST",
        body: JSON.stringify({
          action: "approve",
          comments: "Quick approved",
          actionBy: employeeId || 1,
        }),
      });
      fetchApprovals();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleQuickReject = async (id) => {
    const reason = prompt("Enter rejection reason") || "Rejected";
    try {
      await apiRequest(`/leave-requests/${id}/action`, {
        method: "POST",
        body: JSON.stringify({
          action: "reject",
          comments: reason,
          actionBy: employeeId || 1,
        }),
      });
      fetchApprovals();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // ---------------- STATUS COUNTS ----------------
  const statusCounts = {
    Pending: allLeaves.filter((l) => l.status?.toLowerCase() === "pending").length,
    Approved: allLeaves.filter((l) => l.status?.toLowerCase() === "approved").length,
    Rejected: allLeaves.filter((l) => l.status?.toLowerCase() === "rejected").length,
    All: allLeaves.length,
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Stats */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-2 mb-6">
            <span>✅</span> Leave Approvals
          </h1>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border-l-4 border-amber-500 shadow-md">
              <div className="text-amber-600 text-sm font-semibold uppercase tracking-wide">
                Pending Approvals
              </div>
              <div className="text-4xl font-bold text-amber-700 mt-2">
                {statusCounts.Pending}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-500 shadow-md">
              <div className="text-green-600 text-sm font-semibold uppercase tracking-wide">
                Approved
              </div>
              <div className="text-4xl font-bold text-green-700 mt-2">
                {statusCounts.Approved}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm">
            {error}
          </div>
        )}

        {/* Status Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                statusFilter === status
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-white text-slate-700 border-2 border-slate-300 hover:border-blue-400"
              }`}
            >
              {status} {count > 0 && `(${count})`}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {statusFilter === "Pending" && selectedIds.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-slate-700 font-semibold">
              {selectedIds.length} request{selectedIds.length !== 1 && "s"} selected
            </span>
            <button
              onClick={handleBulkApprove}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              ✅ Bulk Approve ({selectedIds.length})
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  {statusFilter === "Pending" && (
                    <th className="px-4 py-4 text-left font-semibold">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === filteredLeaves.length &&
                          filteredLeaves.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-4 py-4 text-left text-sm font-semibold">Employee</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Leave Type</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Dates</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Days</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Reason</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length > 0 ? (
                  filteredLeaves.map((request, index) => {
                    const reqId = request.id || request.LeaveRequest?.id;
                    return (
                      <tr
                        key={reqId}
                        className={`border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        {statusFilter === "Pending" && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(reqId)}
                              onChange={() => toggleSelection(reqId)}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">
                              {request.Employee?.firstName}
                            </span>
                            <span className="text-xs text-slate-500">
                              {request.Employee?.employeeCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {request.LeaveType?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {new Date(request.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          -{" "}
                          {new Date(request.endDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                          {request.totalDays}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-xs">
                          {request.reason}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              request.status === "Pending"
                                ? "bg-amber-100 text-amber-700 border border-amber-300"
                                : request.status === "Approved"
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-red-100 text-red-700 border border-red-300"
                            }`}
                          >
                            {request.status === "Pending" && "⏳ "}
                            {request.status === "Approved" && "✓ "}
                            {request.status === "Rejected" && "✕ "}
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailModalOpen(true);
                            }}
                            title="View Details"
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          >
                            👁️
                          </button>
                          {request.status === "Pending" && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(reqId)}
                                title="Quick Approve"
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => handleQuickReject(reqId)}
                                title="Quick Reject"
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                              >
                                ❌
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={statusFilter === "Pending" ? 9 : 8}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No requests found for this status
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRequest && (
        <LeaveRequestDetailModal
          requestId={selectedRequest.id}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRequest(null);
          }}
          onUpdate={fetchApprovals}
          isApprover={true}
          approverId={employeeId || 1}
        />
      )}
    </div>
  );
};

export default LeaveApprovalManagement;
