const express = require("express");
const router = express.Router();

const shiftSummaryController = require("../controllers/employeeShiftController");
const shiftReportController = require("../controllers/shiftReportController");

// const authMiddleware = require('../middleware/auth');
// router.use(authMiddleware);

// =====================================================
// SHIFT SUMMARY ROUTES — /api/attendance
// =====================================================

// GET Monthly Shift Summary (existing)
// GET /api/attendance/shift-summary?companyId=1&month=2&year=2026
router.get("/shift-summary", shiftSummaryController.getShiftSummary);

// POST Rebuild Shift Summary (backfill)
// POST /api/attendance/shift-summary/rebuild
router.post("/shift-summary/rebuild", shiftSummaryController.rebuildShiftSummary);

// =====================================================
// SHIFT REPORT ROUTES — /api/attendance
// =====================================================

// GET Shift Report (date range, with/without EL)
// GET /api/attendance/shift-report?companyId=1&startDate=2026-01-01&endDate=2026-03-31&reportType=with_el
// reportType options: shift_report | with_el | without_el
router.get("/shift-report", shiftReportController.getShiftReport);

module.exports = router;