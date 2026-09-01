const express = require('express');
const router = express.Router();
const salaryGenerationController = require('../controllers/salaryGenerationController');
// const authMiddleware = require('../middleware/auth'); // Uncomment when ready

// Apply authentication middleware to all routes
// router.use(authMiddleware);

// Generate salary for employees
router.post('/generate', salaryGenerationController.generateSalary);

// Get salary generations with filters
router.get('/', salaryGenerationController.getSalaryGenerations);

// Get salary summary
router.get('/summary', salaryGenerationController.getSalarySummary);

// Get salary generation by ID
router.get('/:id', salaryGenerationController.getSalaryGenerationById);

// Approve salary
router.patch('/:id/approve', salaryGenerationController.approveSalary);

// Mark salary as paid
router.patch('/:id/pay', salaryGenerationController.paySalary);

// Delete salary generation
router.delete('/:id', salaryGenerationController.deleteSalaryGeneration);

module.exports = router;
