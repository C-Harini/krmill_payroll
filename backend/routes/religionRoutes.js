const express = require('express');
const router = express.Router();
const {
    getAllReligions,
    getReligionById,
    createReligion,
    updateReligion,
    deleteReligion,
} = require('../controllers/religionController');

// const { protect } = require('../middleware/authMiddleware'); // uncomment when auth is ready

/**
 * GET  /api/religions?companyId=1   → get all religions for a company
 * POST /api/religions               → create a new religion
 */
router.get('/', getAllReligions);
router.post('/', createReligion);

/**
 * GET    /api/religions/:id  → get single religion
 * PUT    /api/religions/:id  → update religion
 * DELETE /api/religions/:id  → delete religion
 */
router.get('/:id', getReligionById);
router.put('/:id', updateReligion);
router.delete('/:id', deleteReligion);

module.exports = router;