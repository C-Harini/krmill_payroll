const express = require("express");
const router = express.Router();

const hostelAttendanceIncentiveController = require("../controllers/hostelAttendanceIncentiveController");

// Specific named calculation routes FIRST
router.get("/calculations", hostelAttendanceIncentiveController.getHostelIncentiveCalculations);
router.post("/calculate", hostelAttendanceIncentiveController.recalculateHostelIncentive);
router.post("/bulk-save", hostelAttendanceIncentiveController.bulkSaveHostelIncentives);

router.get("/", hostelAttendanceIncentiveController.getAll);
router.post("/", hostelAttendanceIncentiveController.create);
router.put("/:id", hostelAttendanceIncentiveController.update);
router.delete("/:id", hostelAttendanceIncentiveController.remove);

module.exports = router;
