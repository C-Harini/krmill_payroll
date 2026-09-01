const express = require("express");
const router = express.Router();

const {
  createOTHours,
  getOTHours,
  updateOTHours,
  deleteOTHours,
  getOTHoursByFilter,
  deleteOTHoursByEmployeeAndDate,
  getOTHoursStats,
  getOTHoursMultipleEntry,
  saveOTHoursMultipleEntry,
  updateSingleOTEntry,
  deleteOTHoursMultipleEntry,
} = require("../controllers/otHoursController");

// ✅ Multiple Entry Endpoints
router.get("/multiple-entry", getOTHoursMultipleEntry);
router.post("/multiple-entry", saveOTHoursMultipleEntry);
router.put("/multiple-entry/:id", updateSingleOTEntry);
router.post("/multiple-entry/delete", deleteOTHoursMultipleEntry);

// router.get()


// ✅ POST - Create OT Hours (Bulk)
router.post("/", createOTHours);

// ✅ GET - Get all OT Hours
router.get("/", getOTHours);

// ✅ GET - Get OT Hours with filters
router.get("/filter", getOTHoursByFilter);

// ✅ GET - Get OT Hours Statistics
router.get("/stats", getOTHoursStats);

// ✅ PUT - Update OT Hours
router.put("/:id", updateOTHours);

// ✅ DELETE - Delete OT Hours by ID
router.delete("/:id", deleteOTHours);

// ✅ DELETE - Delete OT Hours by Employee & Date
router.delete("/:employeeId/:date", deleteOTHoursByEmployeeAndDate);

module.exports = router;