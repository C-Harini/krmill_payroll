const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// const authMiddleware = require('../middleware/auth'); // Uncomment when ready

// Apply authentication middleware to all routes
// router.use(authMiddleware);

// User CRUD operations
router.post('/', userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
// router.get('/employee/:id', userController.getEmployeeById);  

// Special routes
router.post('/generate-number', userController.generateUserNumber);
router.get('/phone/:phoneNumber', userController.getUserByPhoneNumber);
router.get('/email/:email', userController.getUserByEmail);
router.get('/:id/company', userController.getUserCompany);

// Password management
router.patch('/:id/password', userController.updatePassword);

// Status management
router.patch('/:id/toggle-status', userController.toggleUserStatus);
router.patch('/:id/last-login', userController.updateLastLogin);

module.exports = router;