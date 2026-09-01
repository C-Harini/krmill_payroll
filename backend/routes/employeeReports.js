// // routes/employeeReports.js - FIXED VERSION
// const express = require('express');
// const router = express.Router();
// const employeeReportsController = require('../controllers/employeeReportsController');

// // ==========================================
// // EMPLOYEE REPORTS ROUTES
// // ==========================================

// // 1. Employee Details Report
// router.get('/employee-details', employeeReportsController.getEmployeeDetails);

// // 2. Leave Balance Report
// router.get('/leave-balance', employeeReportsController.getLeaveBalance);

// // 3. Leave Taken Report
// router.get('/leave-taken', employeeReportsController.getLeaveTaken);

// // 4. Attendance Report
// router.get('/attendance', employeeReportsController.getAttendanceReport);

// // 5. Biometric Punch Report
// router.get('/biometric', employeeReportsController.getBiometricReport);

// // 6. Comprehensive Employee Report
// router.get('/comprehensive', employeeReportsController.getComprehensiveReport);

// // 7. Export Employee Details to PDF
// router.get('/export/employee-details-pdf', employeeReportsController.exportEmployeeDetailsPDF);
// router.get('/export/employee-details-excel', employeeReportsController.exportEmployeeDetailsExcel);

// // 8. Status Discrepancy Report
// router.get('/discrepancy', employeeReportsController.getDiscrepancyReport);
// module.exports = router;

// routes/employeeReports.js - COMPLETE VERSION
const express = require('express');
const router = express.Router();
const employeeReportsController = require('../controllers/employeeReportsController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Data routes
router.get('/employee-details', employeeReportsController.getEmployeeDetails);
router.get('/leave-balance', employeeReportsController.getLeaveBalance);
router.get('/leave-taken', employeeReportsController.getLeaveTaken);
router.get('/attendance', employeeReportsController.getAttendanceReport);
router.get('/biometric', employeeReportsController.getBiometricReport);
router.get('/comprehensive', employeeReportsController.getComprehensiveReport);
router.get('/discrepancy', employeeReportsController.getDiscrepancyReport);
router.post('/discrepancy/approve', auth, upload.single('document'), employeeReportsController.approveDiscrepancy);
router.get('/discrepancy/history', auth, employeeReportsController.getDiscrepancyHistory);

// Export routes - THESE WERE MISSING
router.get('/export/employee-details-pdf', employeeReportsController.exportEmployeeDetailsPDF);
router.get('/export/employee-details-excel', employeeReportsController.exportEmployeeDetailsExcel);
router.get('/export/leave-balance-pdf', employeeReportsController.exportLeaveBalancePDF);
router.get('/export/leave-balance-excel', employeeReportsController.exportLeaveBalanceExcel);
router.get('/export/leave-taken-pdf', employeeReportsController.exportLeaveTakenPDF);
router.get('/export/leave-taken-excel', employeeReportsController.exportLeaveTakenExcel);
router.get('/export/attendance-pdf', employeeReportsController.exportAttendancePDF);
router.get('/export/attendance-excel', employeeReportsController.exportAttendanceExcel);
router.get('/export/biometric-pdf', employeeReportsController.exportBiometricPDF);
router.get('/export/biometric-excel', employeeReportsController.exportBiometricExcel);
router.get('/export/comprehensive-pdf', employeeReportsController.exportComprehensivePDF);
router.get('/export/comprehensive-excel', employeeReportsController.exportComprehensiveExcel);

module.exports = router;