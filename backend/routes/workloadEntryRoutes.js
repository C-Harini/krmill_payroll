const express = require('express');
const router = express.Router();
const {
    getWorkloadEntriesByDate,
    saveWorkloadEntries,
    getWorkloadEntryDates,
} = require('../controllers/workloadEntryController');

router.get('/dates', getWorkloadEntryDates);
router.get('/', getWorkloadEntriesByDate);
router.post('/save', saveWorkloadEntries);

module.exports = router;
