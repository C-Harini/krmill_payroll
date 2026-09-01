// ============================================================
// routes/attendanceReportRoutes.js
// ============================================================
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceReportController");

// GET /api/attendance-report
router.get("/", ctrl.getAttendanceReport);

module.exports = router;
