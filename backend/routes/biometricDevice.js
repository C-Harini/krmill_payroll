const express = require('express');
const router = express.Router();
const biometricDeviceController = require('../controllers/biometricDeviceController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

router.get('/', biometricDeviceController.getBiometricDevicesByCompany);
router.get('/:id', biometricDeviceController.getBiometricDeviceById);
router.post('/', biometricDeviceController.createBiometricDevice);
router.put('/:id', biometricDeviceController.updateBiometricDevice);
router.delete('/:id', biometricDeviceController.deleteBiometricDevice);
router.patch('/:id/toggle-status', biometricDeviceController.toggleBiometricDeviceStatus);

module.exports = router;