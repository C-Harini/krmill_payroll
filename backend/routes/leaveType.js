const express = require('express');
const router = express.Router();
const leaveTypeController = require('../controllers/leaveTypeController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

router.get('/', leaveTypeController.getLeaveTypesByCompany);
router.post('/', leaveTypeController.createLeaveType);
router.put('/:id', leaveTypeController.updateLeaveType);
router.delete('/:id', leaveTypeController.deleteLeaveType);

module.exports = router;