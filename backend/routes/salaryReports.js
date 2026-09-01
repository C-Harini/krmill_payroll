// routes/salaryReports.js
const express = require('express');
const router = express.Router();
const salaryReportsController = require('../controllers/salaryReportsController');

// ==========================================
// DETAILED SALARY REPORT ROUTES
// ==========================================

// Get salary report with pagination
router.get('/salary-report', salaryReportsController.getSalaryReport);
router.get("/payslip-list", salaryReportsController.getPayslipList);
// Download salary report as PDF
router.get('/salary-report/download/pdf', salaryReportsController.downloadSalaryReportPDF);

// Download salary report as Excel
router.get('/salary-report/download/excel', salaryReportsController.downloadSalaryReportExcel);

// ==========================================
// BANK STATEMENT ROUTES
// ==========================================

// Get bank statement
router.get('/bank-statement', salaryReportsController.getBankStatement);

// Download bank statement as PDF
router.get('/bank-statement/download/pdf', salaryReportsController.downloadBankStatementPDF);

// Download bank statement as Excel
router.get('/bank-statement/download/excel', salaryReportsController.downloadBankStatementExcel);

// ==========================================
// PAYSLIP ROUTES
// ==========================================

// Download individual payslip
router.get('/payslip/:id/download', salaryReportsController.downloadPayslip);

module.exports = router;
