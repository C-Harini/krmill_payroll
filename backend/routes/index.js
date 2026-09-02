const express = require('express');
const router = express.Router();

// Import other route files
const companyRoutes = require('./company');
const departmentRoutes = require('./department');
const designationRoutes = require('./designation');
const employmentTypeRoutes = require('./employmentType');
const employergradeRoutes = require('./employerGrade');
const leavePolicyRoutes = require('./leavePolicy');
const leavePeriodRoutes = require('./leavePeriod');
const leaveTypeRoutes = require('./leaveType');
const holidayListRoutes = require('./holidayList');
const holidayRoutes = require('./holiday');
const shiftTypeRoutes = require('./shiftType');
const shiftAssignmentRoutes = require('./shiftAssignment');
const busRoutes = require('./bus');
const biometricDeviceRoutes = require('./biometricDevice');
const employeeRoutes = require('./employee');
const leaveAllocationRoutes = require('./leaveAllocation');
const SalaryComponentRoutes = require('./salaryComponent');
const formulaRoutes = require('./formulaRoutes');
const employeeSalaryRoutes = require('./employeeSalary');
const biometricPunchRoutes = require('./biometricPunchRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const userRoutes = require('./user');
const salaryGenerationRoutes = require('./salaryGeneration');
const salaryReportsRoutes = require('./salaryReports');
const employeeReportsRoutes = require('./employeeReports');
const statuatoryReportsRoutes = require('./statutoryReports');
const authRoutes = require('./auth');
const additionalSalaryRoutes = require("./additionalSalaryRoutes");
const leaveRequestRoutes = require('./leaveRequest');
const attendanceIncentiveRoutes = require("./AttendanceIncentiveRoutes");
const hostelAttendanceIncentiveRoutes = require("./HostelAttendanceIncentiveRoutes");
const employeeShiftRoutes = require("./employeeShifts");
const employeeLoanRoutes = require("./employeeLoan");
const otHoursRoutes = require("./otHoursRoutes");
const eightEightRoutes = require("./eightEightRoutes");
const casteRoutes = require("./casteRoutes");
const religionRoutes = require("./religionRoutes");
const categoryRoutes = require("./categoryRoutes");
const strengthReport = require("./strengthReportRoutes");
const strengthReportOld = require("./strengthReportOldRoutes");
const deductionRoutes = require('./deductionRoutes');
const reportRoutes = require('./reportRoutes');
const holidaySalaryRoutes = require('./holidaySalaryRoutes');
const attendanceReportRoutes = require('./attendanceReportRoutes');
const lunchRoutes = require('./lunchRoutes');
const attendanceLockRoutes = require('./attendanceLockRoutes');

// ... inside the function

// Define API routes
router.use('/attendance-lock', attendanceLockRoutes);
router.use("/attendance-incentives", attendanceIncentiveRoutes);
router.use('/companies', companyRoutes);
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/employment-types', employmentTypeRoutes);
router.use('/employer-grades', employergradeRoutes);
router.use('/leave-policies', leavePolicyRoutes);
router.use('/leave-periods', leavePeriodRoutes);
router.use('/leave-types', leaveTypeRoutes);
router.use('/holiday-lists', holidayListRoutes);
router.use('/holidays', holidayRoutes);
router.use('/shift-types', shiftTypeRoutes);
router.use('/shift-assignments', shiftAssignmentRoutes);
router.use('/buses', busRoutes);
router.use('/biometric-devices', biometricDeviceRoutes);
router.use('/employees', employeeRoutes);
router.use('/leave-allocations', leaveAllocationRoutes);
router.use('/auth', authRoutes); // Auth routes
router.use("/additional-salaries", additionalSalaryRoutes);
router.use("/hostel-attendance-incentives", hostelAttendanceIncentiveRoutes);
router.use("/employee-shifts", employeeShiftRoutes);
// ⭐ NEW: Leave request routes
router.use('/leave-requests', leaveRequestRoutes);

router.use('/salary-components', SalaryComponentRoutes);
router.use('/formulas', formulaRoutes);
router.use('/employee-salary', employeeSalaryRoutes);
router.use('/biometric-punches', biometricPunchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/users', userRoutes);
router.use('/salary-generation', salaryGenerationRoutes);
router.use('/salary-reports', salaryReportsRoutes);
router.use('/employee-reports', employeeReportsRoutes);
router.use('/statutory-reports', statuatoryReportsRoutes);
router.use('/employee-loans', employeeLoanRoutes); // Employee loan routes
router.use("/ot-hours", otHoursRoutes);
router.use("/eight-eight", eightEightRoutes);
router.use("/castes", casteRoutes);
router.use("/religions", religionRoutes);
router.use('/categories', categoryRoutes);
router.use('/strength-report', strengthReport);
router.use('/strength-report-old', strengthReportOld);
router.use('/deductions', deductionRoutes);
router.use('/reports', reportRoutes);
router.use('/holiday-salary', holidaySalaryRoutes);
router.use('/lunch', lunchRoutes);
router.use('/attendance-report', attendanceReportRoutes);

// router.use('/import', importRoutes);
router.get('/test', (req, res) => {
    res.json({ message: 'Biometric punch routes are working' });
});


module.exports = router;