const express = require('express');
const router = express.Router();
const {
    getAllWorkloads,
    getWorkloadById,
    createWorkload,
    updateWorkload,
    deleteWorkload,
    bulkDeleteWorkloads,
} = require('../controllers/workloadMasterController');

router.get('/', getAllWorkloads);
router.post('/bulk-delete', bulkDeleteWorkloads);
router.get('/:id', getWorkloadById);
router.post('/', createWorkload);
router.put('/:id', updateWorkload);
router.delete('/:id', deleteWorkload);

module.exports = router;
