// Update your routes/leaveAllocation.js file

const express = require('express');
const router = express.Router();
const leaveAllocationController = require('../controllers/leaveAllocationController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

// Reports
router.get('/reports/balance', leaveAllocationController.getLeaveBalanceReport);

// Monthly Accrual Processing
router.post('/process-accrual', leaveAllocationController.processMonthlyAccrual);

// ⚠️ CRITICAL: Bulk Upload MUST come BEFORE the regular POST '/' route
// Otherwise Express will try to match '/bulk' as a regular POST with 'bulk' as a parameter
router.post('/bulk', leaveAllocationController.bulkCreateLeaveAllocations);

// CRUD Operations
router.get('/', leaveAllocationController.getLeaveAllocations);
router.get('/:id', leaveAllocationController.getLeaveAllocationById);
router.post('/', leaveAllocationController.createLeaveAllocation);  // This must come AFTER /bulk
router.put('/:id', leaveAllocationController.updateLeaveAllocation);
router.delete('/:id', leaveAllocationController.deleteLeaveAllocation);

module.exports = router;

// ============================================
// IMPORTANT: Make sure this route file is imported in your main server file (app.js or server.js)
// Example:
// const leaveAllocationRoutes = require('./routes/leaveAllocation');
// app.use('/api/leave-allocations', leaveAllocationRoutes);