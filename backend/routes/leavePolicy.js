const express = require('express');
const router = express.Router();
const leavePolicyController = require('../controllers/leavePolicyController');
//const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

router.get('/', leavePolicyController.getLeavePoliciesByCompany);
router.get('/:id', leavePolicyController.getLeavePolicyById);
router.post('/', leavePolicyController.createLeavePolicy);
router.put('/:id', leavePolicyController.updateLeavePolicy);
router.delete('/:id', leavePolicyController.deleteLeavePolicy);

module.exports = router;