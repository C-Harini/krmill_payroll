const { Company } = require('../models');

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private (Super Admin)

exports.getCompanies = async (req, res) => {
    try {
        const companies = await Company.findAll({
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json(companies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Get a single company by ID
// @route   GET /api/companies/:id
// @access  Private
exports.getCompanyById = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        res.status(200).json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


exports.createCompany = async (req, res) => {
    try {
        const newCompany = await Company.create(req.body);
        return res.status(201).json(newCompany);
    } catch (error) {
        console.error(error);

        let message = 'Server Error'; // ✅ FIX: declare message

        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(err => {
                switch (err.path) {
                    case 'name':
                        return 'Company name is required.';
                    case 'email':
                        return err.type === 'isEmail'
                            ? 'Please provide a valid email address.'
                            : 'Email address is invalid.';
                    case 'registrationNumber':
                        return 'Registration number is required.';
                    case 'phone':
                        return 'Please provide a valid phone number.';
                    default:
                        return err.message;
                }
            });
            message = errors.join(' ');
        } 
        else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A company with this name or registration number already exists.';
        }

        return res.status(400).json({ message }); // ✅ always JSON
    }
};



// @desc    Create a new company
// @route   POST /api/companies
// @access  Private



exports.updateCompany = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        await company.update(req.body);
        return res.status(200).json(company);
    } catch (error) {
        console.error(error);

        let message = 'Server Error'; // ✅ FIX

        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(err => {
                switch (err.path) {
                    case 'name':
                        return 'Company name is required.';
                    case 'email':
                        return err.type === 'isEmail'
                            ? 'Please provide a valid email address.'
                            : 'Email address is invalid.';
                    case 'registrationNumber':
                        return 'Registration number is required.';
                    case 'phone':
                        return 'Please provide a valid phone number.';
                    default:
                        return err.message;
                }
            });
            message = errors.join(' ');
        } 
        else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A company with this name or registration number already exists.';
        }

        return res.status(400).json({ message });
    }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private


// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private
exports.deleteCompany = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }
        await company.destroy();
        res.status(200).json({ message: 'Company deleted successfully' });
    } catch (error) {
        console.error(error);
        // Handle foreign key constraint errors if company has departments
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Cannot delete company with associated departments.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};