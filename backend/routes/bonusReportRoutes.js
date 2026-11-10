// ============================================================
// routes/bonusReportRoutes.js
// ============================================================
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/bonusReportController");

// GET /api/bonus-report
router.get("/", ctrl.getBonusReport);

// GET /api/bonus-report/export/excel
router.get("/export/excel", ctrl.exportBonusReportExcel);

// GET /api/bonus-report/export/pdf
router.get("/export/pdf", ctrl.exportBonusReportPdf);

module.exports = router;

