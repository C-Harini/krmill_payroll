import React, { useState, useEffect } from "react";
import API from "../api";
import { toast } from "react-toastify";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  History,
  FileText,
  X,
  ExternalLink,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  Download
} from "lucide-react";

const DiscrepancyReport = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const backendBaseUrl = apiUrl.replace(/\/api\/?$/, "");

  // --- Core Configuration States ---
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");

  // --- Date Filters ---
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState("active"); // "active" or "history"

  // --- Data States (Active) ---
  const [discrepancyList, setDiscrepancyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // --- Data States (History) ---
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // --- Approval Modal States ---
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [approvalFile, setApprovalFile] = useState(null);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // --- Bootstrap ---
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments();
      fetchEmployees();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId) {
      handleSearch(1);
    }
  }, [activeTab]);

  // --- API Fetchers ---
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
        params: { companyId: selectedCompanyId, limit: 300 },
      });
      const list = data.data || (Array.isArray(data) ? data : []);
      setDepartments(list);
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Failed to load departments");
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await API.get("/employees", {
        params: { companyId: selectedCompanyId, limit: 1000 },
      });
      const list = data.data || (Array.isArray(data) ? data : []);
      setEmployees(list);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleSearch = (pageNumber = 1) => {
    if (activeTab === "active") {
      fetchDiscrepancies(pageNumber);
    } else {
      fetchHistory(pageNumber);
    }
  };

  const fetchDiscrepancies = async (pageNumber = 1) => {
    if (!selectedCompanyId || !fromDate || !toDate) {
      toast.warning("Please complete filters before searching.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.get("/employee-reports/discrepancy", {
        params: {
          company_id: selectedCompanyId,
          department_id: selectedDeptId,
          employee_id: selectedEmpId,
          from_date: fromDate,
          to_date: toDate,
          page: pageNumber,
          limit: pagination.limit,
        },
      });

      if (data.success) {
        setDiscrepancyList(data.data || []);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      } else {
        toast.error(data.message || "Failed to fetch discrepancies");
      }
    } catch (err) {
      console.error("Error fetching discrepancy list:", err);
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      toast.error("Error fetching discrepancy report: " + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (pageNumber = 1) => {
    if (!selectedCompanyId || !fromDate || !toDate) {
      toast.warning("Please complete filters before searching.");
      return;
    }

    setHistoryLoading(true);
    try {
      const { data } = await API.get("/employee-reports/discrepancy/history", {
        params: {
          company_id: selectedCompanyId,
          department_id: selectedDeptId,
          employee_id: selectedEmpId,
          from_date: fromDate,
          to_date: toDate,
          page: pageNumber,
          limit: historyPagination.limit,
        },
      });

      if (data.success) {
        setHistoryList(data.data || []);
        setHistoryPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      } else {
        toast.error(data.message || "Failed to fetch discrepancy history");
      }
    } catch (err) {
      console.error("Error fetching discrepancy history:", err);
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      toast.error("Error fetching discrepancy history: " + errMsg);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (activeTab === "active") {
      if (newPage < 1 || newPage > pagination.totalPages) return;
      fetchDiscrepancies(newPage);
    } else {
      if (newPage < 1 || newPage > historyPagination.totalPages) return;
      fetchHistory(newPage);
    }
  };

  // --- Approval Flow Handlers ---
  const openApproveModal = (record) => {
    setSelectedRecord(record);
    setApprovalReason("");
    setApprovalFile(null);
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approvalReason.trim()) {
      toast.warning("Please enter a reason for approval.");
      return;
    }

    setSubmittingApproval(true);
    try {
      const formData = new FormData();
      formData.append("employeeId", selectedRecord.employee_id);
      formData.append("date", selectedRecord.date);
      formData.append("status", selectedRecord.hr_status); // Approving the HR Status override to save as master
      formData.append("reason", approvalReason);
      if (approvalFile) {
        formData.append("document", approvalFile);
      }

      const { data } = await API.post("/employee-reports/discrepancy/approve", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (data.success) {
        toast.success("Discrepancy approved and master attendance updated!");
        setShowApproveModal(false);
        fetchDiscrepancies(pagination.page);
      } else {
        toast.error(data.message || "Failed to approve discrepancy");
      }
    } catch (err) {
      console.error("Error approving discrepancy:", err);
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      toast.error("Failed to approve discrepancy: " + errMsg);
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Helper to format clock time
  const formatTime = (datetime) => {
    if (!datetime) return "-";
    const date = new Date(datetime);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Status badges
  const getStatusBadge = (status) => {
    const s = String(status).toUpperCase();
    if (s.includes("ABSENT")) return "bg-red-100 text-red-800 border border-red-200";
    if (s.includes("LEAVE")) return "bg-amber-100 text-amber-800 border border-amber-200";
    if (s.includes("PRESENT")) return "bg-green-100 text-green-800 border border-green-200";
    return "bg-slate-100 text-slate-800 border border-slate-200";
  };

  // Group discrepancies by shift_name
  const getGroupedByShift = () => {
    const groups = {};
    discrepancyList.forEach((item) => {
      const shift = item.shift_name || "Unknown";
      if (!groups[shift]) {
        groups[shift] = [];
      }
      groups[shift].push(item);
    });
    return groups;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Title Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3">
            <span className="text-4xl">⚠️</span>
            Wrong Report
          </h1>
          <p className="text-slate-600 mt-2">
            Audit system comparing raw biometric swipes and manual HR overrides
          </p>
        </div>

        {/* Tab Controls */}
        <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1 self-start md:self-center border border-slate-300/40">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-300/40"
            }`}
          >
            <AlertTriangle size={16} />
            Active Discrepancies
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-300/40"
            }`}
          >
            <History size={16} />
            Resolution History
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Company */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Company *
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
              disabled={!selectedCompanyId}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentname}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Employee
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
              disabled={!selectedCompanyId}
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} - {emp.firstName}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => handleSearch(1)}
            disabled={loading || historyLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT: ACTIVE DISCREPANCIES --- */}
      {activeTab === "active" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">⚠️ Detected Status Mismatches</h3>
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-sm font-semibold text-slate-600">Comparing master ledger and biometric clocks...</p>
            </div>
          ) : discrepancyList.length > 0 ? (
            Object.entries(getGroupedByShift()).map(([shiftName, items]) => (
              <div key={shiftName} className="mb-8 last:mb-0">
                <div className="flex items-center gap-2 mb-3 bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                  <h4 className="text-sm font-bold text-slate-800">
                    Shift: {shiftName} ({items.length} {items.length === 1 ? "record" : "records"})
                  </h4>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-slate-700 font-semibold">Date</th>
                        <th className="px-4 py-3 text-left text-slate-700 font-semibold">Emp Code</th>
                        <th className="px-4 py-3 text-left text-slate-700 font-semibold">Employee Name</th>
                        <th className="px-4 py-3 text-left text-slate-700 font-semibold">Department</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">HR Override</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Master Status</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Punch In</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Punch Out</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Work Hours</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((item) => (
                        <tr
                          key={`${item.employee_id}_${item.date}`}
                          className="hover:bg-slate-50 transition-colors bg-white"
                        >
                          <td className="px-4 py-3.5 text-slate-800 font-mono">
                            {item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-800 font-bold font-mono">
                            {item.employee_code}
                          </td>
                          <td className="px-4 py-3.5 text-slate-800 uppercase font-semibold">
                            {item.employee_name}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.department_name}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.hr_status)}`}>
                              {item.hr_status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.master_status)}`}>
                              {item.master_status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-700 font-mono">
                            {formatTime(item.check_in)}
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-700 font-mono">
                            {formatTime(item.check_out)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-slate-800 font-mono">
                            {item.working_hours != null ? Number(item.working_hours).toFixed(2) : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => openApproveModal(item)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow hover:shadow-md transition-all flex items-center gap-1 mx-auto"
                            >
                              <Check size={12} />
                              Approve HR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-semibold text-green-700">No Status Discrepancies Found!</p>
              <p className="text-xs text-slate-500">All HR snapshots match the master records and biometric punch logs.</p>
            </div>
          )}

          {/* Footer & Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-4 border-t border-slate-200 flex justify-between items-center mt-4">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 font-semibold">
                Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total} Discrepancies)
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: RESOLUTION HISTORY --- */}
      {activeTab === "history" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">📜 Audit Trail & Resolution Logs</h3>
          {historyLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-sm font-semibold text-slate-600">Retrieving audit history...</p>
            </div>
          ) : historyList.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">Approved Date</th>
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">Attendance Date</th>
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">Emp Code</th>
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">Employee Name</th>
                    <th className="px-4 py-3 text-center text-slate-700 font-semibold">Original Status</th>
                    <th className="px-4 py-3 text-center text-slate-700 font-semibold">Approved Status</th>
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">Reason for Correction</th>
                    <th className="px-4 py-3 text-center text-slate-700 font-semibold">Document</th>
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">Approver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                        {item.approvedAt ? new Date(item.approvedAt).toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-mono">
                        {item.attendanceDate ? new Date(item.attendanceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 font-bold font-mono">
                        {item.employee?.employeeCode}
                      </td>
                      <td className="px-4 py-3.5 text-slate-800 uppercase font-semibold">
                        {item.employee ? `${item.employee.firstName} ${item.employee.lastName || ""}` : "Unknown"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.originalStatus)}`}>
                          {item.originalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.approvedStatus)}`}>
                          {item.approvedStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 max-w-xs truncate" title={item.reason}>
                        {item.reason}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {item.documentPath ? (
                          <a
                            href={`${backendBaseUrl}/${item.documentPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 border border-blue-200 rounded px-2.5 py-1"
                          >
                            <Download size={12} />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-semibold">
                        {item.approvedByUser ? `${item.approvedByUser.firstName} ${item.approvedByUser.lastName || ""}` : "Admin"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <History size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Historical Approvals Found</p>
              <p className="text-xs text-slate-500">Run searches across wider filters to find audited records.</p>
            </div>
          )}

          {/* Footer & Pagination */}
          {historyPagination.totalPages > 1 && (
            <div className="px-4 py-4 border-t border-slate-200 flex justify-between items-center mt-4">
              <button
                onClick={() => handlePageChange(historyPagination.page - 1)}
                disabled={historyPagination.page === 1}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 font-semibold">
                Page {historyPagination.page} of {historyPagination.totalPages} (Total: {historyPagination.total} Resolutions)
              </span>
              <button
                onClick={() => handlePageChange(historyPagination.page + 1)}
                disabled={historyPagination.page === historyPagination.totalPages}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- APPROVAL MODAL --- */}
      {showApproveModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                Approve HR Status Override
              </h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApproveSubmit}>
              <div className="p-6 space-y-4">
                {/* Employee details summary */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Employee Information</span>
                    <span>Date: {selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</span>
                  </div>
                  <div className="text-slate-800 font-bold">
                    {selectedRecord.employee_code} - {selectedRecord.employee_name}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold uppercase">
                    Department: {selectedRecord.department_name}
                  </div>
                </div>

                {/* Status Correction visual */}
                <div className="grid grid-cols-5 items-center justify-center text-center py-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <div className="col-span-2">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1">Master Ledger</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedRecord.master_status)}`}>
                      {selectedRecord.master_status}
                    </span>
                  </div>
                  <div className="flex justify-center text-blue-500 font-bold">
                    <ArrowRight size={18} />
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1">HR Approved Status</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedRecord.hr_status)}`}>
                      {selectedRecord.hr_status}
                    </span>
                  </div>
                </div>

                {/* File picker */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <FileText size={16} className="text-slate-500" />
                    Supporting Document (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setApprovalFile(e.target.files[0])}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg p-1.5 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Accepts PDF, JPG, JPEG, or PNG (Max 5MB)</p>
                </div>

                {/* Reason Textarea */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Reason for Correction *
                  </label>
                  <textarea
                    rows="3"
                    required
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    placeholder="Describe why the HR snapshot status is correct (e.g. manual clock failure, approved gate pass, on-duty permission)..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  ></textarea>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval || !approvalReason.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {submittingApproval ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Approving...
                    </>
                  ) : (
                    "Approve & Update"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscrepancyReport;
