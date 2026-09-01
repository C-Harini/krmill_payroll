const { EmploymentType, Company } = require('../models');

// @desc    Get all employment types for a specific company
// @route   GET /api/employment-types?companyId=1
// @access  Private
exports.getEmploymentTypesByCompany = async (req, res) => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const employmentTypes = await EmploymentType.findAll({
            where: { companyId },
            include: [{ model: Company, attributes: ['name'] }] // Optionally include company name
        });
        res.status(200).json(employmentTypes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single employment type by ID
// @route   GET /api/employment-types/:id
// @access  Private
exports.getEmploymentTypeById = async (req, res) => {
    try {
        const employmentType = await EmploymentType.findByPk(req.params.id, {
            include: [{ model: Company, attributes: ['name'] }]
        });
        if (!employmentType) {
            return res.status(404).json({ message: 'Employment type not found' });
        }
        res.status(200).json(employmentType);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new employment type
// @route   POST /api/employment-types
// @access  Private
exports.createEmploymentType = async (req, res) => {
    const { name, status, companyId } = req.body;

    if (!name || !companyId) {
        return res.status(400).json({ message: 'Missing required fields: name or companyId' });
    }

    try {
        const newEmploymentType = await EmploymentType.create({
            name,
            status,
            companyId,
        });
        res.status(201).json(newEmploymentType);
    } catch (error) {
        console.error(error);
        // Handle validation errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Employment type name already exists for this company.' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update an employment type
// @route   PUT /api/employment-types/:id
// @access  Private
exports.updateEmploymentType = async (req, res) => {
    const { id } = req.params;
    const { name, status, companyId } = req.body;

    try {
        const employmentType = await EmploymentType.findByPk(id);
        if (!employmentType) {
            return res.status(404).json({ message: 'Employment type not found' });
        }

        // Optional: Add a check to ensure the user can only update employment types of their company
        // if (employmentType.companyId !== req.user.companyId) {
        //   return res.status(403).json({ message: 'Forbidden' });
        // }

        await employmentType.update({ name, status, companyId });
        res.status(200).json(employmentType);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Employment type name already exists for this company.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete an employment type
// @route   DELETE /api/employment-types/:id
// @access  Private
exports.deleteEmploymentType = async (req, res) => {
    const { id } = req.params;

    try {
        const employmentType = await EmploymentType.findByPk(id);
        if (!employmentType) {
            return res.status(404).json({ message: 'Employment type not found' });
        }

        // Optional: Add a check to ensure the user can only delete employment types of their company
        // if (employmentType.companyId !== req.user.companyId) {
        //   return res.status(403).json({ message: 'Forbidden' });
        // }

        await employmentType.destroy();
        res.status(200).json({ message: 'Employment type deleted successfully' });
    } catch (error) {
        console.error(error);
        // Handle foreign key constraint errors if employment type has employees
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Cannot delete employment type with associated employees.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};