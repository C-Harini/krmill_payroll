const express = require("express");
const router = express.Router();

const hostelAttendanceIncentiveController = require("../controllers/hostelAttendanceIncentiveController");
const attendanceIncentiveController = require("../controllers/AttendanceIncentiveController");

// Specific named calculation routes FIRST
router.get("/calculations", hostelAttendanceIncentiveController.getHostelIncentiveCalculations);
router.post("/calculate", hostelAttendanceIncentiveController.recalculateHostelIncentive);
router.post("/bulk-save", hostelAttendanceIncentiveController.bulkSaveHostelIncentives);

// Hostel Incentive Conditions routes (specifically for HOSTEL)
router.get("/conditions", (req, res, next) => {
  req.query.gradeKey = "HOSTEL";
  return attendanceIncentiveController.getConditions(req, res, next);
});
router.post("/conditions/reset", (req, res, next) => {
  req.body.gradeKey = "HOSTEL";
  return attendanceIncentiveController.resetConditions(req, res, next);
});
router.post("/conditions", (req, res, next) => {
  req.body.gradeKey = "HOSTEL";
  req.body.gradeName = req.body.gradeName || "Hostel";
  return attendanceIncentiveController.createCondition(req, res, next);
});
router.put("/conditions/:id", (req, res, next) => {
  req.body.gradeKey = "HOSTEL";
  return attendanceIncentiveController.updateCondition(req, res, next);
});
router.delete("/conditions/:id", attendanceIncentiveController.deleteCondition);

router.get("/", hostelAttendanceIncentiveController.getAll);
router.post("/", hostelAttendanceIncentiveController.create);
router.put("/:id", hostelAttendanceIncentiveController.update);
router.delete("/:id", hostelAttendanceIncentiveController.remove);

module.exports = router;
