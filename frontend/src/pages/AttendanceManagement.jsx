import React, { useState, useEffect, useRef } from "react";
import { format, subDays, isValid } from "date-fns";
import API from "../api";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  Edit2,
  Trash2,
  Check,
  FileText,
  RotateCw,
  Activity,
  Shield,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Info,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TIMEZONE-SAFE TIME FORMATTER
// ─────────────────────────────────────────────────────────────
// const formatTime = (datetime) => {
//   if (!datetime) return "-";
//   const raw = String(datetime)
//     .replace("T", " ")
//     .replace(/\.000Z$|Z$/, "");
//   const timePart = raw.split(" ")[1];
//   if (!timePart) return "-";
//   const [h, m] = timePart.split(":").map(Number);
//   if (isNaN(h) || isNaN(m)) return "-";
//   const ampm = h >= 12 ? "PM" : "AM";
//   const hour12 = h % 12 || 12;
//   return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
// };

const formatTime = (datetime) => {
  if (!datetime) return "-";
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};


const formatDate = (dt) => {
  if (!dt) return "-";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  if (dt instanceof Date) {
    if (isNaN(dt.getTime())) return "-";
    const day = dt.getDate();
    const month = months[dt.getMonth()];
    const year = dt.getFullYear();
    return `${String(day).padStart(2, "0")} ${month} ${year}`;
  }

  // Handle strings (like "2026-07-25" or "2026-07-25T00:00:00.000Z")
  const raw = String(dt)
    .replace("T", " ")
    .replace(/\.000Z$|Z$/, "");
  const datePart = raw.split(" ")[0];
  if (!datePart) return "-";

  if (datePart.includes("-")) {
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return "-";
    return `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;
  }

  const parseAttempt = new Date(dt);
  if (!isNaN(parseAttempt.getTime())) {
    const day = parseAttempt.getDate();
    const month = months[parseAttempt.getMonth()];
    const year = parseAttempt.getFullYear();
    return `${String(day).padStart(2, "0")} ${month} ${year}`;
  }

  return "-";
};

const getStatusColor = (status) =>
  ({
    Present: "bg-green-100 text-green-800 border-green-200",
    "Present with Permission": "bg-teal-100 text-teal-800 border-teal-200",
    Absent: "bg-red-100 text-red-800 border-red-200",
    "Half Day": "bg-yellow-100 text-yellow-800 border-yellow-200",
    Leave: "bg-blue-100 text-blue-800 border-blue-200",
    Holiday: "bg-purple-100 text-purple-800 border-purple-200",
    "Week Off": "bg-gray-100 text-gray-800 border-gray-200",
  })[status] || "bg-gray-100 text-gray-800 border-gray-200";

const getLiveColor = (s) =>
  ({
    Working: "text-green-600",
    "Working (Late)": "text-orange-600",
    "Punched Out": "text-gray-500",
    "Not Punched": "text-red-500",
  })[s] || "text-gray-500";

const STATUS_OPTIONS = [
  "Present",
  "Present with Permission",
  "Absent",
  "Half Day",
  "Leave",
  "Holiday",
  "Week Off",
];

// ─────────────────────────────────────────────────────────────
// REGENERATE MODAL
// ─────────────────────────────────────────────────────────────
const RegenerateModal = ({ companyId, onClose }) => {
  const [regenStart, setRegenStart] = useState(subDays(new Date(), 1));
  const [regenEnd, setRegenEnd] = useState(new Date());
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // full job object
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  // ── Start job ──────────────────────────────────────────────
  const startRegenerate = async () => {
    if (
      !regenStart ||
      !isValid(regenStart) ||
      !regenEnd ||
      !isValid(regenEnd)
    ) {
      setError("Please select valid start and end dates.");
      return;
    }
    setError("");
    setStarting(true);
    try {
      const { data } = await API.post("/attendance/regenerate", {
        companyId,
        startDate: format(regenStart, "yyyy-MM-dd"),
        endDate: format(regenEnd, "yyyy-MM-dd"),
      });
      if (data.success && data.jobId) {
        setJobId(data.jobId);
        setJobStatus({ status: "pending", progress: { message: "Starting…" } });
      } else {
        setError(data.message || "Failed to start regeneration");
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setStarting(false);
    }
  };

  // ── Poll for status ─────────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const { data } = await API.get(
          `/attendance/regenerate-job/${jobId}`,
        );
        if (data.success) setJobStatus(data);
        if (data.status === "done" || data.status === "failed") {
          clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error("Poll error:", e.message);
      }
    };

    poll(); // immediate first poll
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  // ── Derived display values ──────────────────────────────────
  const isDone = jobStatus?.status === "done";
  const isFailed = jobStatus?.status === "failed";
  const isRunning =
    jobStatus?.status === "running" || jobStatus?.status === "pending";
  const summary = jobStatus?.summary;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Regenerate Attendance
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Unlocks finalized records and re-runs attendance logic
            </p>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Date range pickers — disabled while running */}
          {!jobId && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Start Date
                  </label>
                  <DatePicker
                    value={regenStart}
                    onChange={(v) => {
                      if (v && isValid(v)) setRegenStart(v);
                    }}
                    slotProps={{
                      textField: { fullWidth: true, size: "small" },
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    End Date
                  </label>
                  <DatePicker
                    value={regenEnd}
                    onChange={(v) => {
                      if (v && isValid(v)) setRegenEnd(v);
                    }}
                    slotProps={{
                      textField: { fullWidth: true, size: "small" },
                    }}
                  />
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle
                  size={15}
                  className="text-amber-600 mt-0.5 shrink-0"
                />
                <p className="text-xs text-amber-800">
                  All finalized attendance records in this date range will be
                  unlocked and recalculated. This cannot be undone.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          {/* ── Progress section ── */}
          {jobId && jobStatus && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                {isRunning && (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                )}
                {isDone && (
                  <CheckCircle size={20} className="text-green-600 shrink-0" />
                )}
                {isFailed && (
                  <XCircle size={20} className="text-red-600 shrink-0" />
                )}
                <span
                  className={`text-sm font-semibold capitalize ${isDone
                    ? "text-green-700"
                    : isFailed
                      ? "text-red-700"
                      : "text-blue-700"
                    }`}
                >
                  {isDone ? "Completed" : isFailed ? "Failed" : "Processing…"}
                </span>
              </div>

              {/* Progress message while running */}
              {isRunning && jobStatus.progress?.message && (
                <p className="text-xs text-gray-500 italic">
                  {jobStatus.progress.message}
                </p>
              )}

              {/* Animated progress bar while running */}
              {isRunning && (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 bg-blue-500 rounded-full animate-pulse w-full" />
                </div>
              )}

              {/* Summary grid on completion */}
              {isDone && summary && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Processed",
                      value: summary.processed,
                      color: "text-gray-900",
                      bg: "bg-gray-50",
                    },
                    {
                      label: "Finalized",
                      value: summary.finalized,
                      color: "text-green-700",
                      bg: "bg-green-50",
                    },
                    {
                      label: "Skipped",
                      value: summary.skipped,
                      color: "text-amber-700",
                      bg: "bg-amber-50",
                    },
                    {
                      label: "Errors",
                      value: summary.errors?.length || 0,
                      color: "text-red-700",
                      bg: "bg-red-50",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`${item.bg} rounded-lg p-3 text-center`}
                    >
                      <p className="text-[10px] text-gray-500 uppercase mb-1">
                        {item.label}
                      </p>
                      <p className={`text-2xl font-bold ${item.color}`}>
                        {item.value ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors list */}
              {isDone && summary?.errors?.length > 0 && (
                <div className="max-h-28 overflow-y-auto text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  {summary.errors.slice(0, 20).map((e, i) => (
                    <div key={i}>
                      Employee {e.employeeId}: {e.error}
                    </div>
                  ))}
                  {summary.errors.length > 20 && (
                    <div className="text-red-500 italic">
                      …and {summary.errors.length - 20} more
                    </div>
                  )}
                </div>
              )}

              {/* Failed message */}
              {isFailed && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {jobStatus.error || "An unexpected error occurred."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          {!jobId ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={startRegenerate}
                disabled={starting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {starting ? "Starting…" : "Start Regeneration"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 text-sm"
            >
              {isRunning ? "Please wait…" : "Close"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const AttendanceManagement = ({ companyId: propCompanyId }) => {
  const [activeTab, setActiveTab] = useState("records");

  // Common
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    propCompanyId || "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Records tab
  const [attendance, setAttendance] = useState([]);
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [selEmployee, setSelEmployee] = useState("");
  const [selDepartment, setSelDepartment] = useState("");
  const [selStatus, setSelStatus] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [shiftTypes, setShiftTypes] = useState([]);
  const [selShift, setSelShift] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [selRecord, setSelRecord] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [cronOpen, setCronOpen] = useState(false);
  const [cronData, setCronData] = useState(null);
  const [regenOpen, setRegenOpen] = useState(false); // ← NEW

  // Dashboard tab
  const [dashData, setDashData] = useState(null);
  const [dashDate, setDashDate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Permission tab
  const [permData, setPermData] = useState(null);
  const [permMonth, setPermMonth] = useState(new Date().getMonth() + 1);
  const [permYear, setPermYear] = useState(new Date().getFullYear());

  // ── Bootstrap ───────────────────────────────────────────────
  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchEmployees();
      fetchDepartments();
      fetchShiftTypes();
      setSelShift("");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId && activeTab === "records") fetchAttendance();
  }, [
    selectedCompanyId,
    startDate,
    endDate,
    selEmployee,
    selShift,
    selStatus,
    empSearch,
    page,
    activeTab,
  ]);

  useEffect(() => {
    if (selectedCompanyId && activeTab === "dashboard") fetchDashboard();
  }, [selectedCompanyId, dashDate, activeTab]);

  useEffect(() => {
    let t;
    if (activeTab === "dashboard" && autoRefresh && selectedCompanyId) {
      t = setInterval(fetchDashboard, 30000);
    }
    return () => clearInterval(t);
  }, [activeTab, autoRefresh, selectedCompanyId, dashDate]);

  useEffect(() => {
    if (selectedCompanyId && activeTab === "permissions") fetchPermissions();
  }, [selectedCompanyId, permMonth, permYear, activeTab]);

  // ── Fetchers ────────────────────────────────────────────────
  const fetchCompanies = async () => {
    try {
      const { data } = await API.get("/companies");
      const list = Array.isArray(data) ? data : data.data || [];
      setCompanies(list);
      if (!selectedCompanyId && list.length) setSelectedCompanyId(list[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await API.get("/departments", {
        params: { companyId: selectedCompanyId },
      });
      setDepartments(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await API.get("/employees", {
        params: { companyId: selectedCompanyId },
      });
      setEmployees(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchShiftTypes = async () => {
    try {
      const { data } = await API.get("/shift-types", {
        params: { companyId: selectedCompanyId },
      });
      setShiftTypes(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendance = async () => {
    if (!startDate || !isValid(startDate) || !endDate || !isValid(endDate))
      return;
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/attendance", {
        params: {
          companyId: selectedCompanyId,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          page,
          limit: 50,
          ...(selEmployee && { employeeId: selEmployee }),
          ...(selShift && { shiftName: selShift }),
          ...(selStatus && { status: selStatus }),
          ...(empSearch && { search: empSearch }),
        },
      });
      const d = data.success
        ? data
        : { data: data.attendance || [], pagination: { pages: 1, total: 0 } };
      setAttendance(d.data || []);
      setTotalPages(d.pagination?.pages || 1);
      setTotalRecords(d.pagination?.total || 0);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const { data } = await API.get("/attendance/live-dashboard", {
        params: {
          companyId: selectedCompanyId,
          date: format(dashDate, "yyyy-MM-dd"),
        },
      });
      setDashData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/attendance/permission-summary", {
        params: {
          companyId: selectedCompanyId,
          month: permMonth,
          year: permYear,
        },
      });
      setPermData(data.success ? data.data : data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!selEmployee) return setError("Select an employee first");
    setLoading(true);
    try {
      const { data } = await API.get("/attendance/summary", {
        params: {
          companyId: selectedCompanyId,
          employeeId: selEmployee,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      });
      setSummary(data.success ? data.data : data);
      setSummaryOpen(true);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const { data } = await API.get("/attendance/cron-status");
      setCronData(data.success ? data.data : data);
      setCronOpen(true);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  // ── Actions ─────────────────────────────────────────────────
  const handleUpdate = async () => {
    setLoading(true);
    try {
      await API.put(`/attendance/${selRecord.id}`, selRecord);
      setSuccess("Updated");
      setEditOpen(false);
      fetchAttendance();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    setLoading(true);
    try {
      await API.delete(`/attendance/${id}`);
      setSuccess("Deleted");
      fetchAttendance();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      await API.patch(`/attendance/${id}/approve`, { userId: 1 });
      setSuccess("Approved");
      fetchAttendance();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  // Close regen modal and refresh table
  const handleRegenClose = () => {
    setRegenOpen(false);
    fetchAttendance();
  };
  const exportExcel = () => {
    if (!attendance.length) return;

    const headers = [
      "Date", "Employee Code", "Employee Name", "Dept",
      "Check In", "Check Out", "Working Hrs", "Status",
      "Late (min)", "Early Exit (min)", "Permission (min)", "Finalized",
    ];

    const csvContent = [];
    csvContent.push(`Attendance Report`);
    const companyName = companies.find(c => String(c.id) === String(selectedCompanyId))?.name || "Kayaar Exports Pvt Ltd.,";
    csvContent.push(`Company: ${companyName}`);
    csvContent.push(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`);
    csvContent.push("");

    // Group by Date, then Shift
    const groupedRaw = {};
    attendance
      .filter((r) => !selShift || r.shiftName === selShift)
      .forEach((r) => {
        const rawDate = r.attendanceDate.split("T")[0];
        if (!groupedRaw[rawDate]) groupedRaw[rawDate] = {};
        const shiftKey = r.shiftName || "Unassigned";
        if (!groupedRaw[rawDate][shiftKey]) groupedRaw[rawDate][shiftKey] = [];
        groupedRaw[rawDate][shiftKey].push(r);
      });

    Object.entries(groupedRaw)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([rawDate, shifts]) => {
        csvContent.push(`DATE: ${formatDate(rawDate)}`);
        csvContent.push("");

        Object.entries(shifts)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([shiftName, records]) => {
            if (!records.length) return;

            csvContent.push(`SHIFT: ${shiftName}`);
            csvContent.push(headers.join(","));

            records.forEach((r) => {
              const row = [
                formatDate(r.attendanceDate),
                r.employee?.employeeCode || "",
                r.employee?.firstName || "",
                r.employee?.department?.departmentname || "",
                r.firstCheckIn ? formatTime(r.firstCheckIn) : "",
                r.lastCheckOut ? formatTime(r.lastCheckOut) : "",
                r.workingHours || 0,
                r.status || "",
                r.isLate && r.lateByMinutes > 0 ? r.lateByMinutes : "-",
                r.isEarlyExit && r.earlyExitMinutes > 0 ? r.earlyExitMinutes : "-",
                r.permissionMinutes > 0 ? r.permissionMinutes : "-",
                r.isFinalized ? "Yes" : "No",
              ];
              csvContent.push(
                row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
              );
            });
            csvContent.push("");
          });
        csvContent.push("");
      });

    const blob = new Blob([csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_${formatDate(startDate)}_to_${formatDate(endDate)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!attendance.length) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();

    // Title & Metadata
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Attendance Report", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const companyName = companies.find(c => String(c.id) === String(selectedCompanyId))?.name || "Kayaar Exports Pvt Ltd.,";
    doc.text(`Company: ${companyName}`, 14, 21);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 27);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 33);

    let currentY = 38;

    const headers = [
      "Date", "Emp Code", "Emp Name", "Dept",
      "Check In", "Check Out", "Work Hrs", "Status",
      "Late", "Early", "Perm", "Final"
    ];

    // Group by Date, then Shift
    const groupedRaw = {};
    attendance
      .filter((r) => !selShift || r.shiftName === selShift)
      .forEach((r) => {
        const rawDate = r.attendanceDate.split("T")[0];
        if (!groupedRaw[rawDate]) groupedRaw[rawDate] = {};
        const shiftKey = r.shiftName || "Unassigned";
        if (!groupedRaw[rawDate][shiftKey]) groupedRaw[rawDate][shiftKey] = [];
        groupedRaw[rawDate][shiftKey].push(r);
      });

    Object.entries(groupedRaw)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([rawDate, shifts]) => {
        const formattedDate = formatDate(rawDate);

        // Print Date header
        if (currentY > 175) {
          doc.addPage();
          currentY = 15;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 64, 175);
        doc.text(formattedDate, 14, currentY + 5);
        doc.setTextColor(0, 0, 0);
        currentY += 8;

        Object.entries(shifts)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([shiftName, records]) => {
            if (!records.length) return;

            if (currentY > 175) {
              doc.addPage();
              currentY = 15;
            }

            // Draw Shift Section Header
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setFillColor(243, 244, 246);
            doc.rect(14, currentY, pageW - 28, 6, "F");
            doc.setTextColor(31, 41, 55);
            doc.text(`SHIFT: ${shiftName}`, 18, currentY + 4.5);
            doc.setTextColor(0, 0, 0);
            currentY += 8;

            const tableRows = records.map((r) => [
              formatDate(r.attendanceDate),
              r.employee?.employeeCode || "",
              r.employee?.firstName || "",
              r.employee?.department?.departmentname || "",
              r.firstCheckIn ? formatTime(r.firstCheckIn) : "-",
              r.lastCheckOut ? formatTime(r.lastCheckOut) : "-",
              r.workingHours > 0 ? `${r.workingHours}h` : "0h",
              r.status || "",
              r.isLate && r.lateByMinutes > 0 ? `${r.lateByMinutes}m` : "-",
              r.isEarlyExit && r.earlyExitMinutes > 0 ? `${r.earlyExitMinutes}m` : "-",
              r.permissionMinutes > 0 ? `${r.permissionMinutes}m` : "-",
              r.isFinalized ? "Yes" : "No",
            ]);

            autoTable(doc, {
              head: [headers],
              body: tableRows,
              startY: currentY,
              theme: "striped",
              styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
              headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
              margin: { left: 14, right: 14 },
              columnStyles: {
                0: { cellWidth: 20 }, // Date
                1: { cellWidth: 15 }, // Emp Code
                2: { cellWidth: 35 }, // Emp Name
                3: { cellWidth: 25 }, // Dept
                4: { cellWidth: 18 }, // Check In
                5: { cellWidth: 18 }, // Check Out
              },
              didDrawPage: (data) => {
                currentY = data.cursor.y + 10;
              }
            });
          });
        currentY += 4;
      });

    // Add page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const str = `Page ${i} of ${totalPages}`;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
      doc.text(str, pageWidth - 14 - doc.getTextWidth(str), pageHeight - 10);
    }

    doc.save(`Attendance_${formatDate(startDate)}_to_${formatDate(endDate)}.pdf`);
  };

  // Close regen modal and refresh table


  const filteredEmployees = employees
    .filter(
      (e) => !selDepartment || String(e.departmentId) === String(selDepartment),
    )
    .filter(
      (e) =>
        !empSearch ||
        e.firstName
          .toLowerCase()
          .includes(empSearch.toLowerCase())
    );

  const groupedAttendance = attendance
    .filter((r) => !selShift || r.shiftName === selShift)
    .reduce((acc, r) => {
      const shiftKey = r.shiftName || "Unassigned";
      if (!acc[shiftKey]) acc[shiftKey] = [];
      acc[shiftKey].push(r);
      return acc;
    }, {});

  // ── Render ──────────────────────────────────────────────────
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Attendance Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Shift auto-detected from punch time · Auto-finalized by cron after
              each shift
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* ← Regenerate button now opens modal */}
            <button
              onClick={() => setRegenOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              <RotateCw size={15} /> Regenerate
            </button>
            <button
              onClick={fetchCronStatus}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
              title="View auto-generation schedule"
            >
              <Clock size={16} /> Schedule
            </button>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between">
            <span className="text-red-800 text-sm">{error}</span>
            <button onClick={() => setError("")} className="text-red-600 ml-4">
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between">
            <span className="text-green-800 text-sm">{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="text-green-600 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg shadow p-1">
          {[
            { id: "records", label: "Attendance Records", icon: FileText },
            { id: "dashboard", label: "Live Dashboard", icon: Activity },
            { id: "permissions", label: "Permission Tracker", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.id === "dashboard" &&
                autoRefresh &&
                activeTab === "dashboard" && (
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB 1 — ATTENDANCE RECORDS                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === "records" && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <button
                onClick={fetchAttendance}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
              >
                <RotateCw size={16} /> Refresh
              </button>
              <button
                onClick={fetchSummary}
                disabled={!selEmployee}
                title={!selEmployee ? "Select an employee first" : ""}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
              >
                View Summary
              </button>
              <button
                onClick={exportExcel}
                disabled={!attendance.length}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                ⬇ Export CSV
              </button>
              <button
                onClick={exportPDF}
                disabled={!attendance.length}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                ⬇ Export PDF
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                Attendance is auto-generated every evening after each shift
                ends. Shift type (A / B / C / Staff) is detected from the
                employee's punch-in time.
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-5 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Department
                  </label>
                  <select
                    value={selDepartment}
                    onChange={(e) => {
                      setSelDepartment(e.target.value);
                      setSelEmployee("");
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Search Name
                  </label>
                  <input
                    type="text"
                    placeholder="Type name..."
                    value={empSearch}
                    onChange={(e) => {
                      setEmpSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Employee
                  </label>
                  <select
                    value={selEmployee}
                    onChange={(e) => {
                      setSelEmployee(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Employees</option>
                    {filteredEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Shift
                  </label>
                  <select
                    value={selShift}
                    onChange={(e) => {
                      setSelShift(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Shifts</option>
                    {shiftTypes.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Status
                  </label>
                  <select
                    value={selStatus}
                    onChange={(e) => {
                      setSelStatus(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Start Date
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(v) => {
                      if (v && isValid(v)) {
                        setStartDate(v);
                        setPage(1);
                      }
                    }}
                    slotProps={{
                      textField: { fullWidth: true, size: "small" },
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    End Date
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={(v) => {
                      if (v && isValid(v)) {
                        setEndDate(v);
                        setPage(1);
                      }
                    }}
                    slotProps={{
                      textField: { fullWidth: true, size: "small" },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pagination */}
            {totalRecords > 0 && (
              <div className="mb-3 flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
                <span className="text-sm text-gray-600">
                  {(page - 1) * 50 + 1}–{Math.min(page * 50, totalRecords)} of{" "}
                  {totalRecords}
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
                  >
                    ‹ Prev
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  <p className="mt-3 text-gray-500 text-sm">Loading...</p>
                </div>
              </div>
            ) : attendance.length === 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-16 text-center">
                  <p className="text-gray-500">No records found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Attendance is auto-generated each evening after shifts end
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(groupedAttendance)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([shiftName, records]) => {
                  const firstRecord = records.find(
                    (r) => r.scheduledStartTime && r.scheduledEndTime
                  );
                  const timeRange = firstRecord
                    ? `${firstRecord.scheduledStartTime.slice(
                      0,
                      5
                    )} – ${firstRecord.scheduledEndTime.slice(0, 5)}`
                    : null;

                  return (
                    <div
                      key={shiftName}
                      className="mb-6 bg-white rounded-lg shadow overflow-hidden border border-gray-100"
                    >
                      {/* Shift Header */}
                      <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800 text-base">
                            {shiftName}
                          </span>
                          {timeRange && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                              {timeRange}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full">
                          {records.length}{" "}
                          {records.length === 1 ? "Record" : "Records"}
                        </span>
                      </div>

                      {/* Shift Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              {[
                                "Date",
                                "Emp Code",
                                "Employee",
                                "Dept",
                                "Check In",
                                "Check Out",
                                "Hours",
                                "Status",
                                "Late / Early",
                                "Permission",
                                "Actions",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {records.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                  <div>{formatDate(r.attendanceDate)}</div>
                                  <div className="text-[10px] mt-0.5">
                                    {r.isFinalized ? (
                                      <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                        Finalized
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                        Provisional
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                  {r.employee?.employeeCode || "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {r.employee ? (
                                    <p className="font-medium text-gray-900">
                                      {r.employee.firstName}
                                    </p>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-600 capitalize text-xs">
                                  {r.employee?.department?.departmentname || "-"}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-900">
                                  {formatTime(r.firstCheckIn)}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-900">
                                  {formatTime(r.lastCheckOut)}
                                </td>
                                <td className="px-4 py-3 text-gray-900">
                                  {r.workingHours > 0
                                    ? `${r.workingHours}h`
                                    : "-"}
                                  {r.overtimeHours > 0 && (
                                    <span className="text-xs text-blue-600 ml-1">
                                      +{r.overtimeHours}OT
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(
                                      r.status
                                    )}`}
                                  >
                                    {r.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    {r.isLate && (
                                      <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 whitespace-nowrap">
                                        Late {r.lateByMinutes}m
                                      </span>
                                    )}
                                    {r.isEarlyExit && (
                                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200 whitespace-nowrap">
                                        Early {r.earlyExitMinutes}m
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {r.permissionMinutes > 0 ? (
                                    <div className="flex items-center gap-1">
                                      <Shield
                                        size={13}
                                        className="text-teal-600"
                                      />
                                      <span className="text-xs text-teal-700 font-medium whitespace-nowrap">
                                        {r.permissionMinutes}m
                                      </span>
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => {
                                        setSelRecord(r);
                                        setEditOpen(true);
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                      title="Edit"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleApprove(r.id)}
                                      disabled={!!r.approvedAt}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-40"
                                      title="Approve"
                                    >
                                      <Check size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(r.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                      title="Delete"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB 2 — LIVE DASHBOARD                               */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <DatePicker
                value={dashDate}
                onChange={(v) => {
                  if (v && isValid(v)) setDashDate(v);
                }}
                slotProps={{ textField: { size: "small" } }}
              />
              <button
                onClick={fetchDashboard}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <RotateCw size={16} /> Refresh Now
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-refresh (30s)
                {autoRefresh && (
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </label>
            </div>

            {dashData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {[
                    {
                      label: "Total",
                      value: dashData.totalEmployees,
                      icon: Users,
                      cls: "text-gray-700 bg-gray-50",
                    },
                    {
                      label: "Working",
                      value: dashData.punchedIn,
                      icon: CheckCircle,
                      cls: "text-green-700 bg-green-50",
                    },
                    {
                      label: "Not Punched",
                      value: dashData.notYetPunched,
                      icon: XCircle,
                      cls: "text-red-700 bg-red-50",
                    },
                    {
                      label: "Late",
                      value: dashData.lateArrivals,
                      icon: AlertTriangle,
                      cls: "text-orange-700 bg-orange-50",
                    },
                    {
                      label: "Left",
                      value: dashData.punchedOut,
                      icon: Timer,
                      cls: "text-blue-700 bg-blue-50",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-lg p-4 border ${card.cls}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <card.icon size={18} />
                        <span className="text-xs font-medium">
                          {card.label}
                        </span>
                      </div>
                      <p className="text-3xl font-bold">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.values(dashData.byShift || {}).map((s) => (
                    <div
                      key={s.shiftName}
                      className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500"
                    >
                      <h3 className="font-semibold text-gray-900">
                        {s.shiftName}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 text-center mt-2">
                        <div>
                          <p className="text-lg font-bold text-gray-900">
                            {s.total}
                          </p>
                          <p className="text-[10px] text-gray-500">TOTAL</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">
                            {s.punchedIn}
                          </p>
                          <p className="text-[10px] text-gray-500">IN</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-600">
                            {s.notYetPunched}
                          </p>
                          <p className="text-[10px] text-gray-500">MISSING</p>
                        </div>
                      </div>
                      {s.late > 0 && (
                        <p className="text-xs text-orange-600 mt-2 font-medium">
                          ⚠ {s.late} late
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-5 py-3 border-b bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Live Employee Status
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {[
                            "Employee",
                            "Type",
                            "Shift (Auto-detected)",
                            "Punch In",
                            "Punch Out",
                            "Live Status",
                            "Hours",
                            "Final Status",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(dashData.employees || []).map((emp) => (
                          <tr key={emp.employeeId} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-900">
                                {emp.employeeName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {emp.employeeCode}
                              </p>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 capitalize">
                              {emp.employeeType}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">
                              {emp.shiftName}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-900">
                              {formatTime(emp.punchInTime)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-900">
                              {formatTime(emp.punchOutTime)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`font-medium text-sm ${getLiveColor(emp.liveStatus)}`}
                              >
                                {emp.liveStatus === "Working" && "● "}
                                {emp.liveStatus === "Working (Late)" && "⚠ "}
                                {emp.liveStatus === "Not Punched" && "✗ "}
                                {emp.liveStatus === "Punched Out" && "○ "}
                                {emp.liveStatus}
                              </span>
                              {emp.isLate && (
                                <span className="text-xs text-orange-500 ml-1">
                                  ({emp.lateByMinutes}m late)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {emp.workingHours > 0
                                ? `${emp.workingHours}h`
                                : "-"}
                            </td>
                            <td className="px-4 py-2.5">
                              {emp.isFinalized ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(emp.finalStatus)}`}
                                >
                                  {emp.finalStatus}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  Pending finalization
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Activity size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Loading live dashboard...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB 3 — PERMISSION TRACKER                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === "permissions" && (
          <>
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <select
                value={permMonth}
                onChange={(e) => setPermMonth(+e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {format(new Date(2025, i, 1), "MMMM")}
                  </option>
                ))}
              </select>
              <select
                value={permYear}
                onChange={(e) => setPermYear(+e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchPermissions}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
              >
                <RotateCw size={16} /> Load
              </button>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-teal-700" />
                <h3 className="font-semibold text-teal-900 text-sm">
                  Staff Permission Policy
                </h3>
              </div>
              <p className="text-sm text-teal-800">
                Monthly pool: <strong>120 min</strong>. Each late arrival or
                early exit deducts the actual deviation minutes. When pool hits
                zero the day is marked <strong>Absent</strong>. Pool resets each
                month.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              </div>
            ) : permData ? (
              <div className="space-y-4">
                {(permData.summary || []).length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Shield size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">
                      No permission records for this month
                    </p>
                  </div>
                ) : (
                  (permData.summary || []).map((emp) => (
                    <div
                      key={emp.employeeId}
                      className="bg-white rounded-lg shadow p-5 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 text-base">
                            {emp.employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {emp.employeeCode} · {emp.employeeType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${emp.isPoolExhausted ? "text-red-600" : "text-teal-600"}`}
                          >
                            {emp.minutesUsed}/{permData.monthlyPoolMinutes} min
                          </p>
                          <p className="text-xs text-gray-500">
                            {emp.minutesRemaining} min remaining
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
                        <div
                          className={`h-2.5 rounded-full transition-all ${emp.isPoolExhausted ? "bg-red-500" : "bg-teal-500"}`}
                          style={{
                            width: `${Math.min(100, (emp.minutesUsed / permData.monthlyPoolMinutes) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="divide-y divide-gray-100">
                        {emp.days.map((d, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center py-2 text-sm"
                          >
                            <span className="text-gray-700">
                              {formatDate(d.date)}
                            </span>
                            <div className="flex items-center gap-3">
                              {d.lateByMinutes > 0 && (
                                <span className="text-xs text-red-600">
                                  Late {d.lateByMinutes}m
                                </span>
                              )}
                              {d.earlyExitMinutes > 0 && (
                                <span className="text-xs text-orange-600">
                                  Early {d.earlyExitMinutes}m
                                </span>
                              )}
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(d.status)}`}
                              >
                                {d.status}
                              </span>
                              <span className="text-teal-700 font-medium text-xs whitespace-nowrap">
                                -{d.permissionMinutes} min
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </>
        )}

        {/* ─── EDIT DIALOG ──────────────────────────────────── */}
        {editOpen && selRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-sm w-full mx-4 shadow-xl">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Attendance
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {selRecord.employee?.firstName} —{" "}
                  {formatDate(selRecord.attendanceDate)}
                  {selRecord.shiftName && ` · Shift ${selRecord.shiftName}`}
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Status
                  </label>
                  <select
                    value={selRecord.status}
                    onChange={(e) =>
                      setSelRecord({ ...selRecord, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Working Hours
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={selRecord.workingHours || 0}
                    onChange={(e) =>
                      setSelRecord({
                        ...selRecord,
                        workingHours: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={selRecord.remarks || ""}
                    onChange={(e) =>
                      setSelRecord({ ...selRecord, remarks: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUMMARY DIALOG ───────────────────────────────── */}
        {summaryOpen && summary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-lg w-full mx-4 shadow-xl">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance Summary
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Total Days",
                      value: summary.totalDays,
                      color: "text-gray-900",
                    },
                    {
                      label: "Present",
                      value: summary.present,
                      color: "text-green-600",
                    },
                    {
                      label: "With Permission",
                      value: summary.presentWithPermission,
                      color: "text-teal-600",
                    },
                    {
                      label: "Absent",
                      value: summary.absent,
                      color: "text-red-600",
                    },
                    {
                      label: "Half Day",
                      value: summary.halfDay,
                      color: "text-yellow-600",
                    },
                    {
                      label: "Leave",
                      value: summary.leave,
                      color: "text-blue-600",
                    },
                    {
                      label: "Holiday",
                      value: summary.holiday,
                      color: "text-purple-600",
                    },
                    {
                      label: "Week Off",
                      value: summary.weekOff,
                      color: "text-indigo-600",
                    },
                    {
                      label: "Late arrivals",
                      value: summary.lateCount,
                      color: "text-orange-600",
                    },
                    {
                      label: "Early exits",
                      value: summary.earlyExitCount,
                      color: "text-amber-600",
                    },
                    {
                      label: "Working Hours",
                      value: `${summary.totalWorkingHours}h`,
                      color: "text-gray-900",
                    },
                    {
                      label: "Overtime Hours",
                      value: `${summary.totalOvertimeHours}h`,
                      color: "text-blue-700",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="text-center p-3 rounded-lg bg-gray-50"
                    >
                      <p className="text-[10px] text-gray-500 uppercase">
                        {item.label}
                      </p>
                      <p className={`text-2xl font-bold ${item.color}`}>
                        {item.value ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={14} className="text-teal-700" />
                    <span className="text-xs font-semibold text-teal-800">
                      Permission Pool (Staff only)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-teal-800 mb-1">
                    <span>
                      Used:{" "}
                      <strong>{summary.permissionMinutesUsed || 0} min</strong>
                    </span>
                    <span>
                      Pool: <strong>120 min / month</strong>
                    </span>
                  </div>
                  <div className="w-full bg-teal-100 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((summary.permissionMinutesUsed || 0) / 120) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-teal-600 mt-1">
                    {Math.max(0, 120 - (summary.permissionMinutesUsed || 0))}{" "}
                    min remaining
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end">
                <button
                  onClick={() => setSummaryOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── CRON STATUS DIALOG ───────────────────────────── */}
        {cronOpen && cronData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 shadow-xl">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Auto-Generation Schedule
                </h3>
                <p className="text-xs text-gray-500">{cronData.timezone}</p>
              </div>
              <div className="px-6 py-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800">{cronData.note}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(cronData.jobs || []).map((job, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {job.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {job.description}
                        </p>
                      </div>
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">
                        {job.schedule}
                      </code>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-xs font-semibold text-teal-800 mb-1">
                    Staff Permission Pool
                  </p>
                  <p className="text-xs text-teal-700">
                    {cronData.permissionConfig?.monthlyPoolMinutes} min/month.
                    Actual deviation minutes deducted. Pool hits 0 → Absent.
                    Grace: {cronData.permissionConfig?.graceMinutes} min.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end">
                <button
                  onClick={() => setCronOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── REGENERATE MODAL ─────────────────────────────── */}
        {regenOpen && (
          <RegenerateModal
            companyId={selectedCompanyId}
            onClose={handleRegenClose}
          />
        )}
      </div>
    </LocalizationProvider>
  );
};

export default AttendanceManagement;
