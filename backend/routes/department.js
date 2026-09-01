const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
//const authMiddleware = require('../middleware/auth');

//router.use(authMiddleware);

// GET /api/departments/count/active - must be BEFORE /:id
router.get('/count/active', departmentController.getDepartmentCount);

// GET /api/departments?companyId=1
router.get('/', departmentController.getDepartmentsByCompany);

// POST /api/departments
router.post('/', departmentController.createDepartment);

// PUT /api/departments/:id
router.put('/:id', departmentController.updateDepartment);

// DELETE /api/departments/:id
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
