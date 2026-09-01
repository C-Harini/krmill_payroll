const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designationController');
//const authMiddleware = require('../middleware/auth'); // Middleware to protect routes

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

// GET /api/designations?companyId=1 - Get all designations for a specific company
router.get('/', designationController.getDesignationsByCompany);

// GET /api/designations/:id - Get a single designation by ID
router.get('/:id', designationController.getDesignationById);

// POST /api/designations - Create a new designation
router.post('/', designationController.createDesignation);

// PUT /api/designations/:id - Update a designation
router.put('/:id', designationController.updateDesignation);

// DELETE /api/designations/:id - Delete a designation
router.delete('/:id', designationController.deleteDesignation);

module.exports = router;