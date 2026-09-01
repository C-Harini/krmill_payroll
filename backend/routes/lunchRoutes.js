const express = require("express");
const router = express.Router();

const {
  downloadLunchLogs,
  postLunchLogs,
  getLunchRecords,
  getEmployeeLunchReport,
  getNoPunchReport,
  getLateInReport
} = require("../controllers/lunchController");

// ✅ Download biometric lunch raw punches
router.post("/download", downloadLunchLogs);

// ✅ Process and post lunch attendance
router.post("/post", postLunchLogs);

// ✅ Get regular processed lunch reports
router.get("/", getLunchRecords);

// ✅ Get employee-specific lunch history
router.get("/employee/:empId", getEmployeeLunchReport);

// ✅ Get missed-punches report
router.get("/no-punch", getNoPunchReport);

// ✅ Get late-returns report
router.get("/late-in", getLateInReport);

module.exports = router;
