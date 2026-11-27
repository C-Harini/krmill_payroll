const express = require('express');
const router = express.Router();
const {
    getAllWorkloadEmployees,
    getAvailableEmployees,
    addWorkloadEmployees,
    deleteWorkloadEmployee,
    bulkDeleteWorkloadEmployees,
} = require('../controllers/workloadEmployeeController');

router.get('/', getAllWorkloadEmployees);
router.get('/available', getAvailableEmployees);
router.post('/bulk-delete', bulkDeleteWorkloadEmployees);
router.post('/', addWorkloadEmployees);
router.delete('/:id', deleteWorkloadEmployee);

module.exports = router;
