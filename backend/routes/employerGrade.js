const express = require('express');
const router = express.Router();
const employerGradeController = require('../controllers/employerGradeController');
//const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

router.get('/', employerGradeController.getEmployerGradesByCompany);
router.get('/:id', employerGradeController.getEmployerGradeById);
router.post('/', employerGradeController.createEmployerGrade);
router.put('/:id', employerGradeController.updateEmployerGrade);
router.delete('/:id', employerGradeController.deleteEmployerGrade);

module.exports = router;