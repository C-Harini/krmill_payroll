const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Define count route BEFORE /:id routes
router.get('/count/active', departmentController.getDepartmentCount);

router.route('/')
  .get(departmentController.getDepartmentsByCompany)
  .post(departmentController.createDepartment);

router.route('/:id')
  .put(departmentController.updateDepartment)
  .delete(departmentController.deleteDepartment);

module.exports = router;