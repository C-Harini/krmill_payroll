const express = require('express');
const router = express.Router();
const employeeSalaryController = require('../controllers/employeeSalaryController');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Employee Salary route is working!' });
});

// Get all salary structures with filters
router.get('/', employeeSalaryController.getEmployeeSalaries);

// Get current active salary for an employee
router.get('/current/:employeeId', employeeSalaryController.getCurrentSalary);

// Get salary for specific date
router.get('/by-date/:employeeId', employeeSalaryController.getSalaryForDate);

// Get salary history for an employee
router.get('/history/:employeeId', employeeSalaryController.getSalaryHistory);

// Get revision history for an employee
router.get('/revisions/:employeeId', employeeSalaryController.getRevisionHistory);

// Assign initial salary
router.post('/assign', employeeSalaryController.assignSalary);

// ✨ NEW: Bulk assign salaries
router.post('/bulk-assign', employeeSalaryController.bulkAssignSalary);

// Revise salary (hike, promotion, etc.)
router.post('/revise', employeeSalaryController.reviseSalary);

// Update salary structure (edit existing)
router.put('/:id', employeeSalaryController.updateSalary);

// Delete salary structure
router.delete('/:id', employeeSalaryController.deleteSalary);

module.exports = router;
