const express = require('express');
const router = express.Router();
const shiftTypeController = require('../controllers/shiftTypeController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

router.get('/', shiftTypeController.getShiftTypesByCompany);
router.get('/:id', shiftTypeController.getShiftTypeById);
router.post('/', shiftTypeController.createShiftType);
router.put('/:id', shiftTypeController.updateShiftType);
router.delete('/:id', shiftTypeController.deleteShiftType);
router.patch('/:id/toggle-status', shiftTypeController.toggleShiftTypeStatus);

module.exports = router;