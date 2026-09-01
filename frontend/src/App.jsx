import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Import your page components
import CompanyManagement from "./pages/CompanyManagement";
import DepartmentManagement from "./pages/DepartmentManagement";
import LeavePeriodManagement from "./pages/LeavePeriodManagement";
import LeaveTypeManagement from "./pages/LeaveTypeManagement";
import HolidayListManagement from "./pages/HolidayListManagement";
import ShiftTypeManagement from "./pages/ShiftTypeManagement";
import BusManagement from "./pages/BusManagement";
import BiometricDeviceManagement from "./pages/BiometricDeviceManagement";
import DesignationManagement from "./pages/DesignationManagement";
import EmploymentTypeManagement from "./pages/EmploymentTypeManagement";
import EmployerGradeManagement from "./pages/EmployerGradeManagement";
import LeavePolicyManagement from "./pages/LeavePolicyManagement";
import EmployeeManagement from "./pages/EmployeeManagement";
import LeaveAllocationManagement from "./pages/LeaveAllocationManagement";
import SalaryComponentManagement from "./pages/SalaryComponentManagement";
import FormulaBuilder from "./pages/FormulaBuilder";
import EmployeeSalaryManagement from "./pages/EmployeeSalaryManagement";
import BiometricAttendance from "./pages/BiometricAttendance";
import ShiftAssignmentManagement from "./pages/ShiftAssignmentManagement";
import SalaryGenerationManagement from "./pages/SalaryGenerationManagement";
import EmployeeReports from "./pages/EmployeeReports";
import LeaveRequestManagement from "./pages/LeaveRequestManagement";
import LeaveApprovalManagement from "./pages/LeaveApprovalManagement";
import AttendanceManagement from "./pages/AttendanceManagement";
import SalaryReports from "./pages/SalaryReports";
import StatutoryReports from "./pages/StatutoryReports";
import UserManagement from "./pages/UserManagement";
import LoginPage from "./pages/LoginManagement";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import AttendanceIncentiveManagement from "./pages/AttendanceIncentiveManagement";
import DepartmentAttendanceMultiple from "./pages/DepartmentAttendanceMultiple";
import OvertimeMultipleEntry from "./pages/OvertimeMultipleEntry";
import EightEightMultipleEntry from "./pages/EightEightMultipleEntry";
import LunchInOutDownload from "./pages/LunchInOutDownload";
import DepartmentReports from "./pages/DepartmentReports";
import AdditionalSalaryManagement from "./pages/AdditionalSalaryManagement";
import HostelAttendanceIncentiveManagement from "./pages/HostelAttendanceIncentiveManagement";
import EmployeeLoanManagement from "./pages/EmployeeLoanManagement";
import EmployeeShiftManagement from "./pages/EmployeeShiftManagment";
import OTHoursManagement from "./pages/OTHoursManagement";
import OTReport from "./pages/OTReport";
import CasteManagement from "./pages/CasteManagement";
import RelionManagement from "./pages/ReligionManagement";
import CategoryManagement from "./pages/CategoryManagement";
import Deduction from "./pages/DeductionManagement";
import DeductionReport from "./pages/DeductionReport";
import ReportsPage from "./pages/ReportPage";
import StrengthReport from "./pages/StrengthReport";
import StrengthReportOld from "./pages/StrengthReportOld";
import EmployeeRelation from "./pages/EmployeeRelations";
import EmployeeDcouments from "./pages/EmployeeDocuments";
import ShiftReport from "./pages//ShiftReportPage";
import HolidaySalary from "./pages/HolidaySalary";
import AttendanceReport from "./pages/AttendanceReport";
import DiscrepancyReport from "./pages/DiscrepancyReport";
import WorkloadManagement from "./pages/WorkloadManagement";

function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <h1 className="text-4xl font-bold text-red-600">404 - Page Not Found</h1>
    </div>
  );
}



// 🔹 Role-based private route
function PrivateRoute({ children, allowedRoles }) {
  const token = sessionStorage.getItem("token");
  if (!token) return <Navigate to="/" />;

  try {
    const decoded = jwtDecode(token);
    const role = decoded.role;
    if (allowedRoles && !allowedRoles.includes(role)) {
      return <Navigate to="/" />;
    }
    return children;
  } catch (err) {
    console.error("Invalid token:", err);
    sessionStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    return <Navigate to="/" />;
  }
}

// 🔹 Redirect logged-in users from public pages
function PublicRoute({ children }) {
  const token = sessionStorage.getItem("token");
  if (token) {
    try {
      const role = jwtDecode(token).role;
      return <Navigate to="/dashboard" />;
    } catch {
      sessionStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      return children;
    }
  }
  return children;
}

function App() {
  return (
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          {/* PUBLIC ROUTES (NO NAVBAR) */}
          <Route element={<Auth />}>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login-page" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

        {/* DASHBOARD LAYOUT (WITH NAVBAR) */}
        <Route
          path="/dashboard"
          element={
            // <PrivateRoute>
            <Dashboard />
            // </PrivateRoute>
          }
        >
          {/* Default page after login */}
          <Route index element={<Home />} />
          {/* All child pages */}
          <Route path="companies" element={<CompanyManagement />} />
          <Route path="departments" element={<DepartmentManagement />} />
          <Route path="designations" element={<DesignationManagement />} />
          <Route
            path="employment-types"
            element={<EmploymentTypeManagement />}
          />
          <Route path="employer-grades" element={<EmployerGradeManagement />} />
          <Route path="leave-policies" element={<LeavePolicyManagement />} />
          <Route path="leave-periods" element={<LeavePeriodManagement />} />
          <Route path="leave-types" element={<LeaveTypeManagement />} />
          <Route path="holiday-lists" element={<HolidayListManagement />} />
          <Route path="shift-types" element={<ShiftTypeManagement />} />
          <Route
            path="shift-assignments"
            element={<ShiftAssignmentManagement />}
          />
          <Route path="buses" element={<BusManagement />} />
          <Route
            path="biometric-devices"
            element={<BiometricDeviceManagement />}
          />
          <Route path="biometric-punches" element={<BiometricAttendance />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="workload-entry" element={<WorkloadManagement />} />
          <Route
            path="leave-allocations"
            element={<LeaveAllocationManagement />}
          />
          <Route path="leave-requests" element={<LeaveRequestManagement />} />
          <Route path="leave-approvals" element={<LeaveApprovalManagement />} />
          <Route
            path="salary-component"
            element={<SalaryComponentManagement />}
          />
          <Route path="formula-builder" element={<FormulaBuilder />} />
          <Route
            path="employee-salaries"
            element={<EmployeeSalaryManagement />}
          />
          <Route
            path="salary-generation"
            element={<SalaryGenerationManagement />}
          />
          <Route path="salary-reports" element={<SalaryReports />} />
          <Route path="employee-reports" element={<EmployeeReports />} />
          <Route path="statutory-reports" element={<StatutoryReports />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="shift-reports" element={<ShiftReport />} />
          <Route path="attendance-reports" element={<AttendanceReport />} />
          <Route path="discrepancy-report" element={<DiscrepancyReport />} />
          <Route
            path="attendance-multiple"
            element={
              <PrivateRoute allowedRoles={["HR"]}>
                <DepartmentAttendanceMultiple />
              </PrivateRoute>
            }
          />
          <Route
            path="overtime-multiple"
            element={
              <PrivateRoute allowedRoles={["HR"]}>
                <OvertimeMultipleEntry />
              </PrivateRoute>
            }
          />
          <Route
            path="eight-eight-multiple"
            element={
              <PrivateRoute allowedRoles={["Admin", "Super Admin", "Department Admin"]}>
                <EightEightMultipleEntry />
              </PrivateRoute>
            }
          />
          <Route
            path="lunch-download"
            element={
              <PrivateRoute allowedRoles={["HR"]}>
                <LunchInOutDownload />
              </PrivateRoute>
            }
          />
          <Route
            path="dept-reports"
            element={
              <PrivateRoute allowedRoles={["HR"]}>
                <DepartmentReports />
              </PrivateRoute>
            }
          />
          <Route
            path="attendance-incentive"
            element={<AttendanceIncentiveManagement />}
          />
          <Route
            path="additional-salary"
            element={<AdditionalSalaryManagement />}
          />
          <Route
            path="holiday-salary"
            element={<HolidaySalary />}
          />
          <Route
            path="hostel-attendance-incentive"
            element={<HostelAttendanceIncentiveManagement />}
          />
          <Route path="employee-loans" element={<EmployeeLoanManagement />} />
          <Route path="ot-hours" element={<OTHoursManagement />} />
          <Route path="ot-reports" element={<OTReport />} />
          <Route path="castes" element={<CasteManagement />} />
          <Route path="religions" element={<RelionManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="strength-report" element={<StrengthReport />} />
          <Route path="strength-report-old" element={<StrengthReportOld />} />
          <Route path="employee-shifts" element={<EmployeeShiftManagement />} />
          <Route path="deduction" element={<Deduction />} />
          <Route path="deduction-report" element={<DeductionReport />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="documents" element={<EmployeeDcouments/>}/>
          <Route path="relations" element={<EmployeeRelation/>}/>

        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// function App() {
//     return (
//         <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
//         <BrowserRouter>
//             <div className="flex h-screen bg-gray-100">
//                 {/* --- Sidebar Navigation --- */}
//                 <nav className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl overflow-y-auto">
//                     {/* Sidebar Header */}
//                     <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-6 border-b border-blue-700 shadow">
//                         <h2 className="text-2xl font-bold text-white">📊 Payroll System</h2>
//                     </div>

//                     {/* Sidebar Menu */}
//                     <ul className="py-4 space-y-1">
//                         {/* Master Data Section */}
//                         <li className="px-4 py-3 text-xs font-bold text-blue-200 uppercase tracking-wider">Master Data</li>
//                         <li>
//                             <Link to="/companies" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🏢 Company Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/departments" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 💼 Department Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/designations" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🎯 Designation Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/employment-types" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📋 Employment Type Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/employer-grades" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📊 Employee Grade Management
//                             </Link>
//                         </li>

//                         {/* Leave Management Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Leave Management</li>
//                         <li>
//                             <Link to="/leave-policies" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📄 Leave Policy Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/leave-periods" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📅 Leave Period Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/leave-types" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🏷️ Leave Type Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/leave-allocations" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📑 Leave Allocation Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/leave-requests" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🏖️ My Leave Requests
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/leave-approvals" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 ✅ Leave Approvals
//                             </Link>
//                         </li>

//                         {/* Attendance & Shift Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Attendance & Shifts</li>
//                         <li>
//                             <Link to="/shift-types" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 ⏰ Shift Type Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/shift-assignments" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📋 Shift Assignment Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/attendance" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 ✅ Attendance Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/holiday-lists" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🎉 Holiday List Management
//                             </Link>
//                         </li>

//                         {/* Biometric & Bus Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Biometric & Transport</li>
//                         <li>
//                             <Link to="/biometric-devices" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📟 Biometric Device Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/biometric-punches" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📠 Biometric Punch Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/buses" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🚌 Bus Management
//                             </Link>
//                         </li>

//                         {/* Employee Management Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Employee Management</li>
//                         <li>
//                             <Link to="/employees" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 👥 Employee Management
//                             </Link>
//                         </li>

//                         {/* Salary Management Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Salary Management</li>
//                         <li>
//                             <Link to="/salary-component" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 💰 Salary Component Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/formula-builder" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🧮 Formula Builder
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/employee-salaries" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 💵 Employee Salary Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/salary-generation" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🧾 Salary Generation
//                             </Link>
//                         </li>

//                         {/* Reports Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Reports</li>
//                         <li>
//                             <Link to="/salary-reports" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📊 Salary Reports
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/employee-reports" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 📈 Employee Reports
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/statutory-reports" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 ⚖️ Statutory Reports
//                             </Link>
//                         </li>

//                         {/* Administration Section */}
//                         <li className="px-4 py-3 mt-4 text-xs font-bold text-blue-200 uppercase tracking-wider">Administration</li>
//                         <li>
//                             <Link to="/user-management" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 👤 User Management
//                             </Link>
//                         </li>
//                         <li>
//                             <Link to="/login-page" className="flex items-center px-6 py-3 hover:bg-blue-700 transition duration-200 rounded-lg mx-2">
//                                 🔐 Login Page
//                             </Link>
//                         </li>
//                     </ul>
//                 </nav>

//                 {/* --- Main Content Area --- */}
//                 <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
//                     <Routes>
// <Route path="/" element={<LoginPage />} />
// <Route path="/companies" element={<CompanyManagement />} />
// <Route path="/departments" element={<DepartmentManagement />} />
// <Route path="/designations" element={<DesignationManagement/>} />
// <Route path="/employment-types" element={<EmploymentTypeManagement/>} />
// <Route path="/employer-grades" element={<EmployerGradeManagement/>} />
// <Route path="/leave-policies" element={<LeavePolicyManagement/>} />
// <Route path="/leave-periods" element={<LeavePeriodManagement />} />
// <Route path="/leave-types" element={<LeaveTypeManagement />} />
// <Route path="/holiday-lists" element={<HolidayListManagement />} />
// <Route path="/shift-types" element={<ShiftTypeManagement />} />
// <Route path="/shift-assignments" element={<ShiftAssignmentManagement />} />
// <Route path="/buses" element={<BusManagement />} />
// <Route path="/biometric-devices" element={<BiometricDeviceManagement />} />
// <Route path="/biometric-punches" element={<BiometricAttendance />} />
// <Route path="/attendance" element={<AttendanceManagement />} />
// <Route path="/employees" element={<EmployeeManagement />} />
// <Route path="/leave-allocations" element={<LeaveAllocationManagement />} />
// <Route path="/leave-requests" element={<LeaveRequestManagement />} />
// <Route path="/leave-approvals" element={<LeaveApprovalManagement />} />
// <Route path="/salary-component" element={<SalaryComponentManagement />} />
// <Route path="/formula-builder" element={<FormulaBuilder />} />
// <Route path="/employee-salaries" element={<EmployeeSalaryManagement />} />
// <Route path="/salary-generation" element={<SalaryGenerationManagement />} />
// <Route path="/salary-reports" element={<SalaryReports />} />
// <Route path="/employee-reports" element={<EmployeeReports />} />
// <Route path="/statutory-reports" element={<StatutoryReports />} />
// <Route path="/user-management" element={<UserManagement />} />
// <Route path="/login-page" element={<LoginPage />} />
// <Route path="*" element={<NotFound />} />
//                     </Routes>
//                 </main>
//             </div>
//         </BrowserRouter>
//         </GoogleOAuthProvider>
//     );
// }

// export default App;
