// // Copy this ENTIRE file to: routes/attendanceRoutes.js

// const express = require('express');
// const router = express.Router();
// const attendanceController = require('../controllers/attendanceController');

// // If you have authentication middleware, uncomment and adjust:
// // const { protect, authorize } = require('../middleware/authMiddleware');

// // ============================================
// // ATTENDANCE GENERATION ROUTES (Priority routes first)
// // ============================================

// // Generate attendance from biometric punches
// // Body: { companyId, startDate, endDate, employeeIds? }
// router.post('/generate', attendanceController.generateAttendance);

// // ============================================
// // SUMMARY & REPORTS (Before dynamic routes)
// // ============================================

// // Get attendance summary/statistics
// // Query params: companyId, startDate, endDate, employeeId
// router.get('/summary', attendanceController.getAttendanceSummary);

// // ============================================
// // APPROVAL ROUTES (Specific action routes)
// // ============================================

// // Approve attendance record
// // Body: { userId }
// router.patch('/:id/approve', attendanceController.approveAttendance);

// // ============================================
// // CRUD OPERATIONS
// // ============================================

// // Get all attendance records with filters (main endpoint for frontend table)
// // Query params: companyId, startDate, endDate, employeeId, status, page, limit
// router.get('/', attendanceController.getAttendance);

// // Get single attendance record by ID (MUST BE LAST in GET routes)
// router.get('/:id', attendanceController.getAttendanceById);

// // Update attendance record
// // Body: { status?, workingHours?, remarks?, isLate?, lateByMinutes?, ... }
// router.put('/:id', attendanceController.updateAttendance);

// // Delete attendance record
// router.delete('/:id', attendanceController.deleteAttendance);

// module.exports = router;

























const express = require("express");
const router = express.Router();

const biometricPunchController = require("../controllers/biometricPunchController");

// ============================================
// AUTO-SYNC MANAGEMENT ROUTES (KEEP FIRST)
// ============================================
router.get("/auto-sync/status", biometricPunchController.getAutoSyncStatus);
router.post("/auto-sync/start", biometricPunchController.startAutoSync);
router.post("/auto-sync/stop", biometricPunchController.stopAutoSync);
router.post("/auto-sync/trigger", biometricPunchController.triggerManualSync);

router.get("/employee/:employeeId/daily", biometricPunchController.getEmployeeDailySummary);
router.get("/fetch-from-device/:deviceId", biometricPunchController.fetchPunchesFromDevice);
router.post("/fetch-and-import/:deviceId", biometricPunchController.fetchAndImportPunches);

router.get("/", biometricPunchController.getBiometricPunches);
router.post("/", biometricPunchController.recordPunch);

router.get("/:id", biometricPunchController.getPunchById);
router.put("/:id", biometricPunchController.updatePunch);
router.delete("/:id", biometricPunchController.deletePunch);


module.exports = router;
