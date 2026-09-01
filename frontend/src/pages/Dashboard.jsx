import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import API from "../api";

const SectionHeader = ({ title, emoji, isOpen, onClick, isHr = false }) => {
  const textClass = isHr
    ? (isOpen ? "text-white font-extrabold" : "text-sky-200 hover:text-white font-bold")
    : (isOpen ? "text-white font-extrabold" : "text-blue-100 hover:text-white font-bold");

  const bgClass = isHr
    ? (isOpen ? "bg-sky-950/80 border-sky-400" : "bg-sky-900/30 hover:bg-sky-900/50 border-transparent")
    : (isOpen ? "bg-blue-950/80 border-blue-400" : "bg-blue-900/35 hover:bg-blue-900/60 border-transparent");

  const borderHoverClass = isHr ? "hover:border-sky-400" : "hover:border-blue-400";
  const arrowColorClass = isHr ? (isOpen ? "text-white" : "text-sky-300") : (isOpen ? "text-white" : "text-blue-200");

  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full flex items-center justify-between px-5 py-3.5 text-xs uppercase tracking-wider ${textClass} ${bgClass} border-l-4 ${borderHoverClass} transition-all duration-200 text-left focus:outline-none select-none my-1`}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-sm">{emoji}</span>
        <span>{title}</span>
      </span>
      <svg
        className={`w-3.5 h-3.5 transform transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : "rotate-0"
          } ${arrowColorClass}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
};

const SectionWrapper = ({ isOpen, children, isHr = false }) => {
  const borderCol = isHr ? "border-sky-500/40" : "border-blue-500/40";
  const bgCol = isHr ? "bg-sky-950/40" : "bg-black/20";
  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-[1000px] opacity-100 visible my-1.5 mx-2 rounded-lg" : "max-h-0 opacity-0 invisible"
        }`}
    >
      <ul className={`space-y-1 border-l-2 ${borderCol} pl-2 py-2 pr-1 ${bgCol} rounded-r-lg`}>
        {children}
      </ul>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Decode token to find role
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  let userRole = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userRole = decoded.role;
    } catch (err) {
      console.error("Error decoding token in Dashboard:", err);
    }
  }

  // Accordion state
  const [expandedSections, setExpandedSections] = useState({
    master: false,
    leave: false,
    shift: false,
    biometric: false,
    employee: false,
    salary: false,
    reports: false,
    administration: false,
    hrModules: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper for active link checking
  const isActiveLink = (dest) => {
    const currentPath = location.pathname;
    return currentPath === `/dashboard/${dest}` || currentPath === `/dashboard/${dest}/`;
  };

  // Auto-redirect HR users to their dashboard screen
  useEffect(() => {
    if (userRole === "HR" && (window.location.pathname === "/dashboard" || window.location.pathname === "/dashboard/")) {
      navigate("/dashboard/attendance-multiple");
    }
  }, [userRole, navigate]);

  // Auto-expand the matching section based on path on load/navigation
  useEffect(() => {
    const path = location.pathname;

    const checkPath = (paths) => paths.some(p => path.includes(`/dashboard/${p}`));

    let matchedSection = null;
    if (checkPath(["companies", "departments", "categories", "designations", "employment-types", "employer-grades", "castes", "religions"])) {
      matchedSection = "master";
    } else if (checkPath(["leave-policies", "leave-periods", "leave-types", "leave-allocations", "leave-requests", "leave-approvals"])) {
      matchedSection = "leave";
    } else if (checkPath(["shift-types", "shift-assignments", "holiday-lists"])) {
      matchedSection = "shift";
    } else if (checkPath(["biometric-devices", "biometric-punches", "attendance-incentive", "hostel-attendance-incentive", "buses", "ot-hours", "attendance", "eight-eight-multiple"])) {
      matchedSection = "biometric";
    } else if (checkPath(["employees", "workload-entry", "documents", "relations", "employee-shifts"])) {
      matchedSection = "employee";
    } else if (checkPath(["salary-component", "additional-salary", "holiday-salary", "formula-builder", "deduction", "employee-salaries", "salary-generation", "employee-loans"])) {
      matchedSection = "salary";
    } else if (checkPath(["reports", "attendance-reports", "strength-report", "strength-report-old", "deduction-report", "salary-reports", "employee-reports", "discrepancy-report", "shift-reports", "statutory-reports", "ot-reports"])) {
      matchedSection = "reports";
    } else if (checkPath(["user-management"])) {
      matchedSection = "administration";
    } else if (checkPath(["attendance-multiple", "overtime-multiple", "lunch-download", "dept-reports"])) {
      matchedSection = "hrModules";
    }

    if (matchedSection) {
      setExpandedSections(prev => ({
        ...prev,
        [matchedSection]: true
      }));
    }
  }, [location.pathname]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      return toast.error("All password fields are required");
    }
    if (newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters long");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match");
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      return toast.error("Authentication session expired. Please log in again.");
    }

    let userId;
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
    } catch (err) {
      return toast.error("Invalid session. Please log in again.");
    }

    setLoading(true);
    try {
      const res = await API.patch(`users/${userId}/password`, {
        currentPassword,
        newPassword
      });
      toast.success(res.data.message || "Password updated successfully!");
      setShowModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <nav className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl overflow-y-auto">
        <div className="px-6 py-6 border-b border-blue-700">
          <h2 className="text-2xl font-bold">📊 Payroll System</h2>
          {userRole && (
            <span className="text-[10px] bg-white/25 border border-white/20 px-2 py-0.5 mt-1.5 inline-block rounded-full font-bold uppercase tracking-wider">
              Role: {userRole}
            </span>
          )}
        </div>

        <ul className="py-4 space-y-1">
          {/* --- NON-HR SIDEBAR ITEMS (ADMINS & SUPER ADMINS) --- */}
          {userRole !== "HR" && (
            <>
              {/* Master Data Section */}
              <SectionHeader
                title="Master Data"
                emoji="📋"
                isOpen={expandedSections.master}
                onClick={() => toggleSection("master")}
              />
              <SectionWrapper isOpen={expandedSections.master}>
                <li>
                  <Link
                    to="companies"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("companies")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏢 Company Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="departments"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("departments")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💼 Department Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="categories"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("categories")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏷️ Category Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="designations"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("designations")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🎯 Designation Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="employment-types"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employment-types")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📋 Employment Type Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="employer-grades"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employer-grades")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📊 Employee Grade Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="castes"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("castes")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏷️ Caste Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="religions"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("religions")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏷️ Religion Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="employee-salaries"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employee-salaries")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💵 Employee Salary Management
                  </Link>
                </li>
              </SectionWrapper>

              {/* Leave Management Section */}
              <SectionHeader
                title="Leave Management"
                emoji="🏖️"
                isOpen={expandedSections.leave}
                onClick={() => toggleSection("leave")}
              />
              <SectionWrapper isOpen={expandedSections.leave}>
                <li>
                  <Link
                    to="leave-policies"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("leave-policies")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📄 Leave Policy Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="leave-periods"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("leave-periods")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📅 Leave Period Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="leave-types"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("leave-types")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏷️ Leave Type Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="leave-allocations"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("leave-allocations")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📑 Leave Allocation Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="leave-requests"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("leave-requests")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏖️ My Leave Requests
                  </Link>
                </li>
                <li>
                  <Link
                    to="leave-approvals"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("leave-approvals")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    ✅ Leave Approvals
                  </Link>
                </li>
              </SectionWrapper>

              {/* Biometric & Transport Section */}
              <SectionHeader
                title="Biometric & Transport"
                emoji="📟"
                isOpen={expandedSections.biometric}
                onClick={() => toggleSection("biometric")}
              />
              <SectionWrapper isOpen={expandedSections.biometric}>
                <li>
                  <Link
                    to="biometric-devices"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("biometric-devices")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📟 Biometric Device Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="biometric-punches"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("biometric-punches")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📠 Biometric Punch Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="attendance"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("attendance")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    ✅ Attendance Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="attendance-incentive"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("attendance-incentive")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🎫 Attendance Incentive Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="hostel-attendance-incentive"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("hostel-attendance-incentive")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🏠 Hostel Attendance Incentive
                  </Link>
                </li>
                <li>
                  <Link
                    to="buses"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("buses")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🚌 Bus Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="ot-hours"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("ot-hours")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🕒 OT Entry
                  </Link>
                </li>
                <li>
                  <Link
                    to="eight-eight-multiple"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("eight-eight-multiple")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🕒 8-8 Multiple Entry
                  </Link>
                </li>
              </SectionWrapper>

              {/* Shift Management Section */}
              <SectionHeader
                title="Shift Management"
                emoji="⏰"
                isOpen={expandedSections.shift}
                onClick={() => toggleSection("shift")}
              />
              <SectionWrapper isOpen={expandedSections.shift}>
                <li>
                  <Link
                    to="shift-types"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("shift-types")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    ⏰ Shift Type Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="shift-assignments"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("shift-assignments")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📋 Shift Assignment Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="holiday-lists"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("holiday-lists")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🎉 Holiday List Management
                  </Link>
                </li>
              </SectionWrapper>

              {/* Employee Management Section */}
              <SectionHeader
                title="Employee Management"
                emoji="🧑‍💼"
                isOpen={expandedSections.employee}
                onClick={() => toggleSection("employee")}
              />
              <SectionWrapper isOpen={expandedSections.employee}>
                <li>
                  <Link
                    to="employees"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employees")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    👥 Employee Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="documents"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("documents")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📂 Employee Documents
                  </Link>
                </li>
                <li>
                  <Link
                    to="relations"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("relations")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🤝 Employee Relations
                  </Link>
                </li>
                <li>
                  <Link
                    to="employee-shifts"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employee-shifts")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    👥 Employee Shift Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="workload-entry"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("workload-entry")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📊 Workload Entry
                  </Link>
                </li>
              </SectionWrapper>

              {/* Salary Management Section */}
              <SectionHeader
                title="Salary Management"
                emoji="💰"
                isOpen={expandedSections.salary}
                onClick={() => toggleSection("salary")}
              />
              <SectionWrapper isOpen={expandedSections.salary}>
                <li>
                  <Link
                    to="salary-component"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("salary-component")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💰 Salary Component Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="additional-salary"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("additional-salary")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💰 Additional Salary Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="holiday-salary"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("holiday-salary")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🎉 Holiday Salary
                  </Link>
                </li>
                <li>
                  <Link
                    to="formula-builder"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("formula-builder")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🧮 Formula Builder
                  </Link>
                </li>
                <li>
                  <Link
                    to="deduction"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("deduction")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💰 Deductions
                  </Link>
                </li>
                <li>
                  <Link
                    to="employee-loans"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employee-loans")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💸 Advance Loan Management
                  </Link>
                </li>
                <li>
                  <Link
                    to="salary-generation"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("salary-generation")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🧾 Salary Generation
                  </Link>
                </li>
              </SectionWrapper>

              {/* Reports Section */}
              <SectionHeader
                title="Reports"
                emoji="📊"
                isOpen={expandedSections.reports}
                onClick={() => toggleSection("reports")}
              />
              <SectionWrapper isOpen={expandedSections.reports}>
                <li>
                  <Link
                    to="reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📊 Employee Data Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="attendance-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("attendance-reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📅 Attendance Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="strength-report"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("strength-report")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💪 Strength Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="strength-report-old"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("strength-report-old")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📋 Strength Report Old
                  </Link>
                </li>
                <li>
                  <Link
                    to="deduction-report"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("deduction-report")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📉 Deduction Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="salary-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("salary-reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    💰 Salary Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="employee-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("employee-reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📋 Employee Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="discrepancy-report"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("discrepancy-report")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    ⚠️ Wrong Report
                  </Link>
                </li>
                <li>
                  <Link
                    to="shift-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("shift-reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    📈 Shift Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="ot-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("ot-reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    🕒 OT Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="statutory-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("statutory-reports")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    ⚖️ Statutory Reports
                  </Link>
                </li>
              </SectionWrapper>

              {/* Administration Section */}
              <SectionHeader
                title="Administration"
                emoji="⚙️"
                isOpen={expandedSections.administration}
                onClick={() => toggleSection("administration")}
              />
              <SectionWrapper isOpen={expandedSections.administration}>
                <li>
                  <Link
                    to="user-management"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("user-management")
                      ? "bg-blue-700 text-white font-medium shadow-sm"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                      }`}
                  >
                    👤 User Management
                  </Link>
                </li>
              </SectionWrapper>
            </>
          )}

          {/* --- HR ONLY SIDEBAR ITEMS --- */}
          {userRole === "HR" && (
            <>
              <SectionHeader
                title="HR Multiple Entry Modules"
                emoji="🔮"
                isOpen={expandedSections.hrModules}
                onClick={() => toggleSection("hrModules")}
                isHr={true}
              />
              <SectionWrapper isOpen={expandedSections.hrModules} isHr={true}>
                <li>
                  <Link
                    to="attendance-multiple"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("attendance-multiple")
                      ? "bg-sky-700 text-white font-medium shadow-sm"
                      : "text-sky-100 hover:bg-sky-800 hover:text-white font-semibold"
                      }`}
                  >
                    📋 Dept Attendance Multiple
                  </Link>
                </li>
                <li>
                  <Link
                    to="overtime-multiple"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("overtime-multiple")
                      ? "bg-sky-700 text-white font-medium shadow-sm"
                      : "text-sky-100 hover:bg-sky-800 hover:text-white font-semibold"
                      }`}
                  >
                    🕒 Over Time Multiple Entry
                  </Link>
                </li>
                <li>
                  <Link
                    to="lunch-download"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("lunch-download")
                      ? "bg-sky-700 text-white font-medium shadow-sm"
                      : "text-sky-100 hover:bg-sky-800 hover:text-white font-semibold"
                      }`}
                  >
                    🍱 Lunch IN/OUT Download
                  </Link>
                </li>
                <li>
                  <Link
                    to="dept-reports"
                    className={`flex items-center px-6 py-2.5 transition duration-200 rounded-lg mx-2 text-sm ${isActiveLink("dept-reports")
                      ? "bg-sky-700 text-white font-medium shadow-sm"
                      : "text-sky-100 hover:bg-sky-800 hover:text-white font-semibold"
                      }`}
                  >
                    📊 Department Reports
                  </Link>
                </li>
              </SectionWrapper>
            </>
          )}

          {/* --- SHARED FOOTER CONTROLS --- */}
          <li className="pt-4 border-t border-blue-700 mt-4">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center px-6 py-3 text-left bg-blue-950/40 hover:bg-blue-700/60 transition duration-200 rounded-lg mx-2 w-[calc(100%-1rem)] text-blue-100 hover:text-white font-semibold mb-2"
            >
              🔑 Change Password
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem("token");
                localStorage.removeItem("authToken");
                localStorage.removeItem("token");
                localStorage.removeItem("companyId");
                window.location.href = "/";
              }}
              className="flex items-center px-6 py-3 text-left bg-red-950/40 hover:bg-red-800 transition duration-200 rounded-lg mx-2 w-[calc(100%-1rem)] text-red-200 hover:text-white font-semibold"
            >
              🚪 Logout
            </button>
          </li>
        </ul>
      </nav>

      {/* Page Content */}
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>

      {/* Change Password Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-xl font-bold"
            >
              &times;
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-1">Change Password</h3>
              <p className="text-slate-600 text-sm">Update your payroll system credentials</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
