const express = require('express');
const router = express.Router();
const leavePeriodController = require('../controllers/leavePeriodController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

router.get('/', leavePeriodController.getLeavePeriodsByCompany);
router.post('/', leavePeriodController.createLeavePeriod);
router.put('/:id', leavePeriodController.updateLeavePeriod);
router.delete('/:id', leavePeriodController.deleteLeavePeriod);

module.exports = router;