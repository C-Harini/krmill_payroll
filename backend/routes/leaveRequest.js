const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');
// const authMiddleware = require('../middleware/auth'); // Uncomment when auth is ready

// router.use(authMiddleware);

// ============================================
// LEAVE REQUEST CRUD
// ============================================

// Get all leave requests with filters
router.get('/', leaveRequestController.getLeaveRequests);

// Get single leave request by ID
router.get('/:id', leaveRequestController.getLeaveRequestById);

// Create new leave request (can be draft or submitted)
router.post('/', leaveRequestController.createLeaveRequest);

// Update leave request (draft only)
router.put('/:id', leaveRequestController.updateLeaveRequest);

// Submit draft for approval
router.post('/:id/submit', leaveRequestController.submitLeaveRequest);

// Delete leave request (soft delete)
router.delete('/:id', leaveRequestController.deleteLeaveRequest);

// ============================================
// APPROVAL WORKFLOW
// ============================================

// Approve or reject leave request
// router.post('/:id/process', leaveRequestController.processLeaveApproval);

// Cancel leave request
router.post('/:id/cancel', leaveRequestController.cancelLeaveRequest);

// Get pending approvals for an approver
router.get('/approvals/pending', leaveRequestController.getPendingApprovals);

// router.get('/', leaveRequestController.getAllLeaveRequests);

// Approve / Reject leave request
router.post('/:id/action', leaveRequestController.processLeaveApproval);

// ============================================
// REPORTS & CALENDAR
// ============================================

// Get team leave calendar
router.get('/calendar/team', leaveRequestController.getTeamLeaveCalendar);

// Get employee leave summary
router.get('/summary/employee', leaveRequestController.getEmployeeLeaveSummary);

module.exports = router;