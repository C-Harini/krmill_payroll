const express = require('express');
const router = express.Router();
const deductionController = require('../controllers/deductionController');
//const authMiddleware = require('../middleware/auth');

//router.use(authMiddleware);

// GET /api/deductions/report - Consolidated report (must be BEFORE /:id routes)
router.get('/report', deductionController.getConsolidatedReport);

// GET /api/deductions?companyId=1&month=1&year=2026 - Get deductions with filters
router.get('/', deductionController.getDeductions);

// POST /api/deductions - Create a deduction entry
router.post('/', deductionController.createDeduction);

// PUT /api/deductions/:id - Update a deduction entry
router.put('/:id', deductionController.updateDeduction);

// DELETE /api/deductions/:id - Delete a deduction entry
router.delete('/:id', deductionController.deleteDeduction);

module.exports = router;
