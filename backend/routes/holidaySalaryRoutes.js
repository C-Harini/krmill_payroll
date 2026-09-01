const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/holidaySalaryController");

// GET  /api/holiday-salary/fetch?companyId=&date=&holidayListId=&employmentTypeId=&departmentId=
router.get("/fetch", ctrl.fetchHolidayAttendance);

// GET  /api/holiday-salary/report?companyId=&from=&to=&departmentId=
router.get("/report", ctrl.getMonthReport);

// POST /api/holiday-salary/pay/:id
router.post("/pay/:id", ctrl.markPaid);

// POST /api/holiday-salary/pay-all  { ids: [1,2,3] }
router.post("/pay-all", ctrl.payAll);

module.exports = router;
