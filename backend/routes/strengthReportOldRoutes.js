const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/strengthReportOldController");

// GET /api/strength-report-old?companyId=1&date=2025-12-16
router.get("/", ctrl.getStrengthReport);

// GET /api/strength-report-old/export-excel?companyId=1&date=2025-12-16
router.get("/export-excel", ctrl.exportStrengthReportExcel);

module.exports = router;
