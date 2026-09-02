// ============================================================
// routes/attendanceLockRoutes.js
// ============================================================

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceLockController");

// GET /api/attendance-lock/status?companyId=1&date=2026-09-01
router.get("/status", ctrl.getLockStatus);

// POST /api/attendance-lock/toggle
router.post("/toggle", ctrl.toggleLock);

// GET /api/attendance-lock/list?companyId=1&startDate=...&endDate=...
router.get("/list", ctrl.getLockedDates);

module.exports = router;
