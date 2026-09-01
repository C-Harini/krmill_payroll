const express = require('express');
const router = express.Router();
const {
    getAllCastes,
    getCasteById,
    createCaste,
    updateCaste,
    deleteCaste,
    getCastesGrouped,
} = require('../controllers/casteController');

// const { protect } = require('../middleware/authMiddleware'); // uncomment when auth is ready

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Static routes (/grouped) must come BEFORE dynamic routes (/:id)
// to prevent Express treating "grouped" as an :id value.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/castes/grouped?companyId=1
 * Returns all castes for a company grouped by community category
 * { General: [...], BC: [...], OBC: [...], ... }
 */
router.get('/grouped', getCastesGrouped);

/**
 * GET /api/castes?companyId=1
 * GET /api/castes?companyId=1&category=BC
 * Returns all castes for a company, optionally filtered by category
 */
router.get('/', getAllCastes);

/**
 * GET /api/castes/:id
 * Returns a single caste by its ID
 */
router.get('/:id', getCasteById);

/**
 * POST /api/castes
 * Creates a new caste — companyId must be selected first
 * Body: { companyId, communityCategory, casteName, casteCode, description?, status? }
 */
router.post('/', createCaste);

/**
 * PUT /api/castes/:id
 * Updates an existing caste
 * Body: { communityCategory?, casteName?, casteCode?, description?, status? }
 */
router.put('/:id', updateCaste);

/**
 * DELETE /api/castes/:id
 * Deletes a caste by ID
 */
router.delete('/:id', deleteCaste);

module.exports = router;