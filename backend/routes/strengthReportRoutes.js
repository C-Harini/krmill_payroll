const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/strengthReportController");

// GET /api/strength-report?companyId=1&date=2025-12-16
router.get("/", ctrl.getStrengthReport);

// GET /api/strength-report/export-excel?companyId=1&date=2025-12-16
router.get("/export-excel", ctrl.exportStrengthReportExcel);

module.exports = router;
