const { Caste, Company } = require('../models');
const { Op } = require('sequelize');

// Valid community categories (mirrors frontend dropdown)
const VALID_CATEGORIES = ['General', 'BC', 'OBC', 'MBC', 'SC', 'ST', 'OC'];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify company exists
// ─────────────────────────────────────────────────────────────────────────────
const verifyCompany = async (companyId) => {
    const company = await Company.findByPk(companyId);
    return company;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all castes for a company (optionally filter by category)
// @route   GET /api/castes?companyId=1&category=BC
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllCastes = async (req, res) => {
    try {
        const { companyId, category } = req.query;

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        // Confirm company exists
        const company = await verifyCompany(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const where = { companyId };

        // Optional filter by community category
        if (category) {
            if (!VALID_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
                });
            }
            where.communityCategory = category;
        }

        const castes = await Caste.findAll({
            where,
            order: [
                ['communityCategory', 'ASC'],
                ['casteName', 'ASC'],
            ],
        });

        res.status(200).json(castes);
    } catch (error) {
        console.error('getAllCastes error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single caste by ID
// @route   GET /api/castes/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getCasteById = async (req, res) => {
    try {
        const { id } = req.params;

        const caste = await Caste.findByPk(id);

        if (!caste) {
            return res.status(404).json({ message: 'Caste not found' });
        }

        res.status(200).json(caste);
    } catch (error) {
        console.error('getCasteById error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new caste (company must be selected first)
// @route   POST /api/castes
// @access  Private
// Body:    { companyId, communityCategory, casteName, casteCode, description, status }
// ─────────────────────────────────────────────────────────────────────────────
exports.createCaste = async (req, res) => {
    try {
        const { companyId, communityCategory, casteName, casteCode, description, status } = req.body;

        // ── Required field validation ─────────────────────────────────────
        if (!companyId || !communityCategory || !casteName || !casteCode) {
            return res.status(400).json({
                message: 'Missing required fields: companyId, communityCategory, casteName, casteCode',
            });
        }

        // ── Validate community category ───────────────────────────────────
        if (!VALID_CATEGORIES.includes(communityCategory)) {
            return res.status(400).json({
                message: `Invalid communityCategory. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
            });
        }

        // ── Verify company exists ─────────────────────────────────────────
        const company = await verifyCompany(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // ── Check duplicate casteCode within the same company ─────────────
        const existingByCode = await Caste.findOne({
            where: { companyId, casteCode: casteCode.toUpperCase() },
        });
        if (existingByCode) {
            return res.status(409).json({
                message: `Caste code '${casteCode.toUpperCase()}' already exists for this company`,
            });
        }

        // ── Check duplicate casteName within same company + category ───────
        const existingByName = await Caste.findOne({
            where: { companyId, communityCategory, casteName },
        });
        if (existingByName) {
            return res.status(409).json({
                message: `Caste '${casteName}' already exists under ${communityCategory} for this company`,
            });
        }

        // ── Create ────────────────────────────────────────────────────────
        const newCaste = await Caste.create({
            companyId,
            communityCategory,
            casteName,
            casteCode: casteCode.toUpperCase(),
            description: description || null,
            status: status || 'Active',
        });

        res.status(201).json(newCaste);
    } catch (error) {
        console.error('createCaste error:', error);

        // Handle Sequelize unique constraint error as a safety net
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Duplicate caste entry for this company' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map((e) => e.message).join(', ') });
        }

        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a caste
// @route   PUT /api/castes/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.updateCaste = async (req, res) => {
    try {
        const { id } = req.params;
        const { communityCategory, casteName, casteCode, description, status } = req.body;

        const caste = await Caste.findByPk(id);
        if (!caste) {
            return res.status(404).json({ message: 'Caste not found' });
        }

        // ── Validate category if being changed ────────────────────────────
        if (communityCategory && !VALID_CATEGORIES.includes(communityCategory)) {
            return res.status(400).json({
                message: `Invalid communityCategory. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
            });
        }

        // ── Check duplicate casteCode (excluding self) ────────────────────
        if (casteCode) {
            const existingByCode = await Caste.findOne({
                where: {
                    companyId: caste.companyId,
                    casteCode: casteCode.toUpperCase(),
                    id: { [Op.ne]: id },
                },
            });
            if (existingByCode) {
                return res.status(409).json({
                    message: `Caste code '${casteCode.toUpperCase()}' already exists for this company`,
                });
            }
        }

        // ── Check duplicate casteName in same company + category (excl. self)
        const resolvedCategory = communityCategory || caste.communityCategory;
        const resolvedName = casteName || caste.casteName;

        const existingByName = await Caste.findOne({
            where: {
                companyId: caste.companyId,
                communityCategory: resolvedCategory,
                casteName: resolvedName,
                id: { [Op.ne]: id },
            },
        });
        if (existingByName) {
            return res.status(409).json({
                message: `Caste '${resolvedName}' already exists under ${resolvedCategory} for this company`,
            });
        }

        // ── Update ────────────────────────────────────────────────────────
        await caste.update({
            communityCategory: communityCategory || caste.communityCategory,
            casteName: casteName || caste.casteName,
            casteCode: casteCode ? casteCode.toUpperCase() : caste.casteCode,
            description: description !== undefined ? description : caste.description,
            status: status || caste.status,
        });

        const updated = await Caste.findByPk(id);

        res.status(200).json(updated);
    } catch (error) {
        console.error('updateCaste error:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map((e) => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a caste
// @route   DELETE /api/castes/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteCaste = async (req, res) => {
    try {
        const { id } = req.params;

        const caste = await Caste.findByPk(id);
        if (!caste) {
            return res.status(404).json({ message: 'Caste not found' });
        }

        await caste.destroy();
        res.status(200).json({ message: 'Caste deleted successfully' });
    } catch (error) {
        console.error('deleteCaste error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all castes grouped by community category for a company
// @route   GET /api/castes/grouped?companyId=1
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getCastesGrouped = async (req, res) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        const company = await verifyCompany(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const castes = await Caste.findAll({
            where: { companyId },
            order: [
                ['communityCategory', 'ASC'],
                ['casteName', 'ASC'],
            ],
        });

        // Group by communityCategory
        const grouped = VALID_CATEGORIES.reduce((acc, cat) => {
            acc[cat] = castes.filter((c) => c.communityCategory === cat);
            return acc;
        }, {});

        res.status(200).json(grouped);
    } catch (error) {
        console.error('getCastesGrouped error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};