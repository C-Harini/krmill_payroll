const { EmployerGrade, Company } = require('../models');

// @desc    Get all employer grades for a specific company
// @route   GET /api/employer-grades?companyId=1
// @access  Private
exports.getEmployerGradesByCompany = async (req, res) => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const employerGrades = await EmployerGrade.findAll({
            where: { companyId },
            include: [{ model: Company, attributes: ['name'] }]
        });
        res.status(200).json(employerGrades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single employer grade by ID
// @route   GET /api/employer-grades/:id
// @access  Private
exports.getEmployerGradeById = async (req, res) => {
    try {
        const employerGrade = await EmployerGrade.findByPk(req.params.id, {
            include: [{ model: Company, attributes: ['name'] }]
        });
        if (!employerGrade) {
            return res.status(404).json({ message: 'Employer grade not found' });
        }
        res.status(200).json(employerGrade);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new employer grade
// @route   POST /api/employer-grades
// @access  Private
exports.createEmployerGrade = async (req, res) => {
    const { name, defaultSalaryStructure, status, companyId } = req.body;

    if (!name || !companyId) {
        return res.status(400).json({ message: 'Missing required fields: name or companyId' });
    }

    try {
        const newEmployerGrade = await EmployerGrade.create({
            name,
            defaultSalaryStructure,
            status,
            companyId,
        });
        res.status(201).json(newEmployerGrade);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Employer grade name already exists for this company.' });
        }
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update an employer grade
// @route   PUT /api/employer-grades/:id
// @access  Private
exports.updateEmployerGrade = async (req, res) => {
    const { id } = req.params;
    const { name, defaultSalaryStructure, status, companyId } = req.body;

    try {
        const employerGrade = await EmployerGrade.findByPk(id);
        if (!employerGrade) {
            return res.status(404).json({ message: 'Employer grade not found' });
        }

        await employerGrade.update({ name, defaultSalaryStructure, status, companyId });
        res.status(200).json(employerGrade);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Employer grade name already exists for this company.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete an employer grade
// @route   DELETE /api/employer-grades/:id
// @access  Private
exports.deleteEmployerGrade = async (req, res) => {
    const { id } = req.params;

    try {
        const employerGrade = await EmployerGrade.findByPk(id);
        if (!employerGrade) {
            return res.status(404).json({ message: 'Employer grade not found' });
        }

        await employerGrade.destroy();
        res.status(200).json({ message: 'Employer grade deleted successfully' });
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Cannot delete employer grade with associated employees.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};