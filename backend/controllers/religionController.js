const { Religion, Company } = require('../models');
const { Op } = require('sequelize');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify company exists
// ─────────────────────────────────────────────────────────────────────────────
const verifyCompany = async (companyId) => {
    const company = await Company.findByPk(companyId);
    return company;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all religions for a company
// @route   GET /api/religions?companyId=1
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllReligions = async (req, res) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json({ message: 'companyId is required' });
        }

        const company = await verifyCompany(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const religions = await Religion.findAll({
            where: { companyId },
            order: [['religionName', 'ASC']],
        });

        res.status(200).json(religions);
    } catch (error) {
        console.error('getAllReligions error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single religion by ID
// @route   GET /api/religions/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getReligionById = async (req, res) => {
    try {
        const { id } = req.params;

        const religion = await Religion.findByPk(id);
        if (!religion) {
            return res.status(404).json({ message: 'Religion not found' });
        }

        res.status(200).json(religion);
    } catch (error) {
        console.error('getReligionById error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new religion
// @route   POST /api/religions
// @access  Private
// Body:    { companyId, religionName, religionCode, description, status }
// ─────────────────────────────────────────────────────────────────────────────
exports.createReligion = async (req, res) => {
    try {
        const { companyId, religionName, religionCode, description, status } = req.body;

        // ── Required field validation ─────────────────────────────────────
        if (!companyId || !religionName || !religionCode) {
            return res.status(400).json({
                message: 'Missing required fields: companyId, religionName, religionCode',
            });
        }

        // ── Verify company exists ─────────────────────────────────────────
        const company = await verifyCompany(companyId);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // ── Check duplicate religionCode within the same company ──────────
        const existingByCode = await Religion.findOne({
            where: { companyId, religionCode: religionCode.toUpperCase() },
        });
        if (existingByCode) {
            return res.status(409).json({
                message: `Religion code '${religionCode.toUpperCase()}' already exists for this company`,
            });
        }

        // ── Check duplicate religionName within the same company ──────────
        const existingByName = await Religion.findOne({
            where: { companyId, religionName },
        });
        if (existingByName) {
            return res.status(409).json({
                message: `Religion '${religionName}' already exists for this company`,
            });
        }

        // ── Create ────────────────────────────────────────────────────────
        const newReligion = await Religion.create({
            companyId,
            religionName,
            religionCode: religionCode.toUpperCase(),
            description: description || null,
            status: status || 'Active',
        });

        res.status(201).json(newReligion);
    } catch (error) {
        console.error('createReligion error:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Duplicate religion entry for this company' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map((e) => e.message).join(', ') });
        }

        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a religion
// @route   PUT /api/religions/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.updateReligion = async (req, res) => {
    try {
        const { id } = req.params;
        const { religionName, religionCode, description, status } = req.body;

        const religion = await Religion.findByPk(id);
        if (!religion) {
            return res.status(404).json({ message: 'Religion not found' });
        }

        // ── Check duplicate religionCode (excluding self) ─────────────────
        if (religionCode) {
            const existingByCode = await Religion.findOne({
                where: {
                    companyId: religion.companyId,
                    religionCode: religionCode.toUpperCase(),
                    id: { [Op.ne]: id },
                },
            });
            if (existingByCode) {
                return res.status(409).json({
                    message: `Religion code '${religionCode.toUpperCase()}' already exists for this company`,
                });
            }
        }

        // ── Check duplicate religionName (excluding self) ─────────────────
        if (religionName) {
            const existingByName = await Religion.findOne({
                where: {
                    companyId: religion.companyId,
                    religionName,
                    id: { [Op.ne]: id },
                },
            });
            if (existingByName) {
                return res.status(409).json({
                    message: `Religion '${religionName}' already exists for this company`,
                });
            }
        }

        // ── Update ────────────────────────────────────────────────────────
        await religion.update({
            religionName: religionName || religion.religionName,
            religionCode: religionCode ? religionCode.toUpperCase() : religion.religionCode,
            description: description !== undefined ? description : religion.description,
            status: status || religion.status,
        });

        const updated = await Religion.findByPk(id);
        res.status(200).json(updated);
    } catch (error) {
        console.error('updateReligion error:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map((e) => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a religion
// @route   DELETE /api/religions/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteReligion = async (req, res) => {
    try {
        const { id } = req.params;

        const religion = await Religion.findByPk(id);
        if (!religion) {
            return res.status(404).json({ message: 'Religion not found' });
        }

        await religion.destroy();
        res.status(200).json({ message: 'Religion deleted successfully' });
    } catch (error) {
        console.error('deleteReligion error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};