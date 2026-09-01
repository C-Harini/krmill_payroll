const { Designation, Company } = require('../models');

// @desc    Get all designations for a specific company
// @route   GET /api/designations?companyId=1
// @access  Private
exports.getDesignationsByCompany = async (req, res) => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const designations = await Designation.findAll({
            where: { companyId },
            include: [{ model: Company, attributes: ['name'] }] // Optionally include company name
        });
        res.status(200).json(designations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single designation by ID
// @route   GET /api/designations/:id
// @access  Private
exports.getDesignationById = async (req, res) => {
    try {
        const designation = await Designation.findByPk(req.params.id, {
            include: [{ model: Company, attributes: ['name'] }]
        });
        if (!designation) {
            return res.status(404).json({ message: 'Designation not found' });
        }
        res.status(200).json(designation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new designation
// @route   POST /api/designations
// @access  Private
exports.createDesignation = async (req, res) => {
    const { name, acronym, status, companyId } = req.body;

    if (!name || !acronym || !companyId) {
        return res.status(400).json({ message: 'Missing required fields: name, acronym, or companyId' });
    }

    try {
        const newDesignation = await Designation.create({
            name,
            acronym,
            status,
            companyId,
        });
        res.status(201).json(newDesignation);
    } catch (error) {
        console.error(error);
        // Handle validation errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Designation name or acronym already exists for this company.' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a designation
// @route   PUT /api/designations/:id
// @access  Private
exports.updateDesignation = async (req, res) => {
    const { id } = req.params;
    const { name, acronym, status, companyId } = req.body;

    try {
        const designation = await Designation.findByPk(id);
        if (!designation) {
            return res.status(404).json({ message: 'Designation not found' });
        }

        // Optional: Add a check to ensure the user can only update designations of their company
        // if (designation.companyId !== req.user.companyId) {
        //   return res.status(403).json({ message: 'Forbidden' });
        // }

        await designation.update({ name, acronym, status, companyId });
        res.status(200).json(designation);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Designation name or acronym already exists for this company.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a designation
// @route   DELETE /api/designations/:id
// @access  Private
exports.deleteDesignation = async (req, res) => {
    const { id } = req.params;

    try {
        const designation = await Designation.findByPk(id);
        if (!designation) {
            return res.status(404).json({ message: 'Designation not found' });
        }

        // Optional: Add a check to ensure the user can only delete designations of their company
        // if (designation.companyId !== req.user.companyId) {
        //   return res.status(403).json({ message: 'Forbidden' });
        // }

        await designation.destroy();
        res.status(200).json({ message: 'Designation deleted successfully' });
    } catch (error) {
        console.error(error);
        // Handle foreign key constraint errors if designation has employees
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Cannot delete designation with associated employees.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};