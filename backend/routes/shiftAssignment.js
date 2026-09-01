const express = require('express');
const router = express.Router();
const shiftAssignmentController = require('../controllers/shiftAssignmentController');
//const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

// GET routes
router.get('/', shiftAssignmentController.getShiftAssignments);
router.get('/:id', shiftAssignmentController.getShiftAssignmentById);

// POST routes
router.post('/', shiftAssignmentController.createShiftAssignment);
router.post('/bulk-delete', shiftAssignmentController.bulkDeleteShiftAssignments);

// PUT routes
router.put('/:id', shiftAssignmentController.updateShiftAssignment);

// PATCH routes
router.patch('/:id/cancel', shiftAssignmentController.cancelShiftAssignment);

// DELETE routes
router.delete('/:id', shiftAssignmentController.deleteShiftAssignment);

module.exports = router;