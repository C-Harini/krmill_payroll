// ============================================================
// routes/attendanceRoutes.js
// ============================================================

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceController");
router.get("/regenerate-job/:jobId", ctrl.getRegenerateJobStatus);

// ── Real-time ─────────────────────────────────────────────────
// POST /api/attendance/punch-webhook    ← biometric device
// GET  /api/attendance/live-dashboard   ← live status for frontend
router.post("/punch-webhook", ctrl.punchWebhook);
router.get("/live-dashboard", ctrl.liveDashboard);

// ── Admin ─────────────────────────────────────────────────────
// POST /api/attendance/regenerate       ← force re-finalize
// GET  /api/attendance/cron-status      ← show schedule
router.post("/regenerate", ctrl.regenerateAttendance);
router.get("/cron-status", ctrl.getCronStatus);

// ── Reports ───────────────────────────────────────────────────
// GET /api/attendance/summary
// GET /api/attendance/permission-summary
router.get("/summary", ctrl.getAttendanceSummary);
router.get("/permission-summary", ctrl.getPermissionSummary);

// ── Multiple Entry CRUD ──
router.get("/multiple-entry", ctrl.getMultipleEntryAttendance);
router.post("/multiple-entry", ctrl.saveMultipleEntryAttendance);
router.put("/multiple-entry/:id", ctrl.updateMultipleEntryAttendance);
router.post("/multiple-entry/delete", ctrl.deleteMultipleEntryAttendance);

// ── CRUD ──────────────────────────────────────────────────────
// GET    /api/attendance
// GET    /api/attendance/:id
// PUT    /api/attendance/:id
// DELETE /api/attendance/:id
// PATCH  /api/attendance/:id/approve
router.get("/", ctrl.getAttendance);
router.get("/:id", ctrl.getAttendanceById);
router.put("/:id", ctrl.updateAttendance);
router.delete("/:id", ctrl.deleteAttendance);
router.patch("/:id/approve", ctrl.approveAttendance);

module.exports = router;
