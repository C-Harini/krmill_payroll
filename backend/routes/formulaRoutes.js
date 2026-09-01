const express = require('express');
const router = express.Router();
const formulaController = require('../controllers/formulaController');
//const authMiddleware = require('../middleware/auth'); // Middleware to protect routes

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

// GET /api/formulas?companyId=1&isActive=true - Get all formulas for a specific company
router.get('/', formulaController.getFormulasByCompany);

// GET /api/formulas/components/:companyId - Get available salary components for formula building
router.get('/components/:companyId', formulaController.getAvailableComponents);

// GET /api/formulas/designations/:companyId - Get available designations
router.get('/designations/:companyId', formulaController.getAvailableDesignations);

// GET /api/formulas/employee-types/:companyId - Get available employee types
router.get('/employee-types/:companyId', formulaController.getAvailableEmployeeTypes);

// GET /api/formulas/employee/:employeeId - Get formulas for specific employee
router.get('/employee/:employeeId', formulaController.getFormulasForEmployee);

// POST /api/formulas/validate - Validate a formula
router.post('/validate', formulaController.validateFormulaEndpoint);

// POST /api/formulas/test - Test formula with sample data
router.post('/test', formulaController.testFormula);

// POST /api/formulas - Create a new formula
router.post('/', formulaController.createFormula);

// GET /api/formulas/:id - Get a single formula by ID
router.get('/:id', formulaController.getFormulaById);

// PUT /api/formulas/:id - Update a formula
router.put('/:id', formulaController.updateFormula);

// DELETE /api/formulas/:id - Delete a formula
router.delete('/:id', formulaController.deleteFormula);

module.exports = router;