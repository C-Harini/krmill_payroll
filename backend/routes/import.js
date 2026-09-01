const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');

// --- MOVE MULTER HERE ---
const upload = require('multer')({ dest: 'uploads/' });

// Apply the upload middleware directly to the route
router.post('/holidays', upload.single('holidaysFile'), importController.uploadAndProcessHolidays);

// This route is standard JSON, so it doesn't need multer
router.get('/status/:jobId', importController.getImportStatus);

module.exports = router;