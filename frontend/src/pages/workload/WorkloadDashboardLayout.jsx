import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

// Section Header component matching existing KR Mill Dashboard style
const SectionHeader = ({ title, emoji, isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full flex items-center justify-between px-5 py-3.5 text-xs uppercase tracking-wider transition-all duration-200 text-left focus:outline-none select-none my-1 border-l-4 ${
        isOpen
          ? "text-white font-extrabold bg-blue-950/80 border-blue-400"
          : "text-blue-100 hover:text-white bg-blue-900/35 hover:bg-blue-900/60 border-transparent hover:border-blue-400"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-sm">{emoji}</span>
        <span className="font-semibold">{title}</span>
      </span>
      <svg
        className={`w-3.5 h-3.5 transform transition-transform duration-300 ${
          isOpen ? "rotate-180 text-white" : "rotate-0 text-blue-200"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
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

// Section Submenu Wrapper matching existing accordion animation
const SectionWrapper = ({ isOpen, children }) => {
  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen
          ? "max-h-[1000px] opacity-100 visible my-1.5 mx-2 rounded-lg"
          : "max-h-0 opacity-0 invisible"
      }`}
    >
      <ul className="space-y-1 border-l-2 border-blue-500/40 pl-2 py-2 pr-1 bg-black/20 rounded-r-lg">
        {children}
      </ul>
    </div>
  );
};

const WorkloadDashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Accordion state - strictly two expandable sections: workload & study
  const [expandedSections, setExpandedSections] = useState({
    workload: true,
    study: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper to check if a route is currently active
  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname === `${path}/`
    );
  };

  // Auto-expand the appropriate section based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/workload-dashboard/workload")) {
      setExpandedSections((prev) => ({ ...prev, workload: true }));
    } else if (path.includes("/workload-dashboard/study")) {
      setExpandedSections((prev) => ({ ...prev, study: true }));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    toast.info("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* ===================== SIDEBAR ===================== */}
      <aside className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl flex flex-col h-full flex-shrink-0 z-20">
        {/* Brand / Logo Header */}
        <div className="px-6 py-5 border-b border-blue-700/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-bold leading-tight text-white tracking-wide">
                HR2 Workload
              </h2>
              <p className="text-[11px] text-blue-200 font-medium">
                Workload Management
              </p>
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-[10px] bg-blue-500/30 text-blue-100 border border-blue-400/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
              ROLE: HR2 / WORKLOAD
            </span>
          </div>
        </div>

        {/* Navigation Menu: Exactly THREE Main Tabs */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1">
          {/* ================= MAIN TAB 1: WORKLOAD (Expandable) ================= */}
          <SectionHeader
            title="Workload"
            emoji="⚖️"
            isOpen={expandedSections.workload}
            onClick={() => toggleSection("workload")}
          />
          <SectionWrapper isOpen={expandedSections.workload}>
            <li>
              <Link
                to="/workload-dashboard/workload/master"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/workload/master")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                📋 Workload Master
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/workload/employee"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/workload/employee")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                👥 Workload Employee
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/workload/entry"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/workload/entry")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                📝 Workload Entry
              </Link>
            </li>
          </SectionWrapper>

          {/* ================= MAIN TAB 2: DEPARTMENT REPORTS (Independent Page) ================= */}
          <div className="my-1">
            <Link
              to="/workload-dashboard/department-reports"
              className={`w-full flex items-center px-5 py-3.5 text-xs uppercase tracking-wider transition-all duration-200 text-left select-none border-l-4 ${
                isActive("/workload-dashboard/department-reports")
                  ? "text-white font-extrabold bg-blue-950/80 border-blue-400"
                  : "text-blue-100 hover:text-white bg-blue-900/35 hover:bg-blue-900/60 border-transparent hover:border-blue-400 font-semibold"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-sm">📑</span>
                <span>Department Reports</span>
              </span>
            </Link>
          </div>

          {/* ================= MAIN TAB 3: STUDY (Expandable) ================= */}
          <SectionHeader
            title="Study"
            emoji="🔬"
            isOpen={expandedSections.study}
            onClick={() => toggleSection("study")}
          />
          <SectionWrapper isOpen={expandedSections.study}>
            <li>
              <Link
                to="/workload-dashboard/study/preparatory"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/study/preparatory")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                🧵 Preparatory
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/study/preparatory-trainee"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/study/preparatory-trainee")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                🎓 Preparatory Trainee
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/study/sider"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/study/sider")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                🏭 Sider
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/study/sider-trainee"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/study/sider-trainee")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                👷 Sider Trainee
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/study/auto"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/study/auto")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                ⚙️ Auto
              </Link>
            </li>
            <li>
              <Link
                to="/workload-dashboard/study/auto-trainee"
                className={`flex items-center px-4 py-2.5 transition duration-200 rounded-lg text-sm ${
                  isActive("/workload-dashboard/study/auto-trainee")
                    ? "bg-blue-700 text-white font-medium shadow-sm"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                }`}
              >
                🛠️ Auto Trainee
              </Link>
            </li>
          </SectionWrapper>
        </nav>

        {/* Sidebar Footer: Back Link & Logout */}
        <div className="p-3 border-t border-blue-700/60 flex-shrink-0 space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs text-blue-200 hover:text-white hover:bg-blue-900/50 rounded-lg transition duration-200"
          >
            <span>⬅️</span>
            <span>Return to Payroll Dashboard</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/40 hover:bg-red-800 transition duration-200 rounded-lg w-full text-red-200 hover:text-white font-semibold text-sm"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ===================== MAIN CONTENT OUTLET ===================== */}
      <main className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
        <Outlet />
      </main>
    </div>
  );
};

export default WorkloadDashboardLayout;
