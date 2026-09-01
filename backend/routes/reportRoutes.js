const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// Get all available report fields with metadata
router.get("/fields", reportController.getReportFields);

// Get distinct values for a specific field (for filter dropdowns)
router.get("/distinct-values/:fieldName", reportController.getDistinctValues);

// Generate report (preview)
router.post("/generate", reportController.generateReport);

// Department attendance & overtime reports
router.post("/attendance", reportController.generateDepartmentAttendanceReport);
router.post("/overtime", reportController.generateDepartmentOvertimeReport);
router.post("/overtime/hours-wise", reportController.generateDepartmentOvertimeHoursWiseReport);
router.post("/overtime/day-wise", reportController.generateDepartmentOvertimeDayWiseReport);
router.post("/overtime/abstract", reportController.generateDepartmentOvertimeAbstractReport);

// Download report as Excel
router.post("/download/excel", reportController.downloadExcel);

// Download report as PDF
router.post("/download/pdf", reportController.downloadPdf);

module.exports = router;
