const express = require('express');
const router = express.Router();
const employmentTypeController = require('../controllers/employmentTypeController');
//const authMiddleware = require('../middleware/auth'); // Middleware to protect routes

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

// GET /api/employment-types?companyId=1 - Get all employment types for a specific company
router.get('/', employmentTypeController.getEmploymentTypesByCompany);

// GET /api/employment-types/:id - Get a single employment type by ID
router.get('/:id', employmentTypeController.getEmploymentTypeById);

// POST /api/employment-types - Create a new employment type
router.post('/', employmentTypeController.createEmploymentType);

// PUT /api/employment-types/:id - Update an employment type
router.put('/:id', employmentTypeController.updateEmploymentType);

// DELETE /api/employment-types/:id - Delete an employment type
router.delete('/:id', employmentTypeController.deleteEmploymentType);

module.exports = router;