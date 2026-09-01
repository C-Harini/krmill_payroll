const express = require("express");
const router = express.Router();

const {
  createAttendanceIncentive,
  getAttendanceIncentives,
  updateAttendanceIncentive,
  deleteAttendanceIncentive,
  recalculateIncentive,
  bulkSaveIncentives,
  saveOneIncentive,
  getDailyEntries,
  saveDailyEntries,
  getConditions,
  createCondition,
  updateCondition,
  deleteCondition,
  resetConditions,
  getPackagingEntries,
  savePackagingEntries,
  getPackagingSummary,
} = require("../controllers/AttendanceIncentiveController");

// ── Specific named routes FIRST ──────────────────────────────────────────────
router.get("/packaging-entries", getPackagingEntries);
router.post("/packaging-entries", savePackagingEntries);
router.get("/packaging-summary", getPackagingSummary);

router.get("/conditions", getConditions);
router.post("/conditions/reset", resetConditions);
router.post("/conditions", createCondition);
router.put("/conditions/:id", updateCondition);
router.delete("/conditions/:id", deleteCondition);

router.get("/daily-entries", getDailyEntries);
router.post("/daily-entries", saveDailyEntries);
router.post("/save-one", saveOneIncentive);
router.post("/calculate", recalculateIncentive);
router.post("/bulk-save", bulkSaveIncentives);

router.get("/", getAttendanceIncentives);
router.post("/", createAttendanceIncentive);

// ── Wildcard /:id routes LAST ─────────────────────────────────────────────────
router.put("/:id", updateAttendanceIncentive);
router.delete("/:id", deleteAttendanceIncentive);

module.exports = router;
