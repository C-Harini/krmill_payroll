const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

router.get('/', busController.getBusesByCompany);
router.get('/:id', busController.getBusById);
router.post('/', busController.createBus);
router.put('/:id', busController.updateBus);
router.delete('/:id', busController.deleteBus);
router.patch('/:id/toggle-status', busController.toggleBusStatus);

module.exports = router;