// routes/statutoryReports.js
const express = require('express');
const router = express.Router();
const statutoryReportsController = require('../controllers/statutoryReportsController');

// ==========================================
// EPF REPORT ROUTES
// ==========================================
router.get('/pf', statutoryReportsController.getPFReport);
router.get('/pf/download/pdf', statutoryReportsController.downloadPFReportPDF);

// ==========================================
// ESI REPORT ROUTES
// ==========================================
router.get('/esi', statutoryReportsController.getESIReport);
router.get('/esi/download/pdf', statutoryReportsController.downloadESIReportPDF);

// ==========================================
// TAX DEDUCTION REPORT ROUTES
// ==========================================
router.get('/tax', statutoryReportsController.getTaxReport);

// ==========================================
// PROFESSIONAL TAX REPORT ROUTES
// ==========================================
router.get('/professional-tax', statutoryReportsController.getProfessionalTaxReport);
router.get('/professional-tax/download/pdf', statutoryReportsController.downloadPTReportPDF);

// ==========================================
// LOAN/ADVANCE REPORT ROUTES
// ==========================================
router.get('/loan', statutoryReportsController.getLoanReport);

// ==========================================
// COMBINED EXCEL DOWNLOAD
// ==========================================
router.get('/download/excel', statutoryReportsController.downloadStatutoryReportsExcel);

module.exports = router;
