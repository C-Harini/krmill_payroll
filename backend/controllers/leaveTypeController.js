const { LeaveType, Company } = require('../models');

// @desc    Get all leave types for a specific company
// @route   GET /api/leave-types?companyId=1
// @access  Private
exports.getLeaveTypesByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const types = await LeaveType.findAll({
            where: { companyId },
            order: [['name', 'ASC']],
        });
        res.status(200).json(types);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new leave type
// @route   POST /api/leave-types
// @access  Private
exports.createLeaveType = async (req, res) => {
    try {
        const newType = await LeaveType.create(req.body);
        res.status(201).json(newType);
    } catch (error) {
        console.error(error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A leave type with this name already exists for this company.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Update a leave type
// @route   PUT /api/leave-types/:id
// @access  Private
exports.updateLeaveType = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await LeaveType.findByPk(id);
        if (!type) return res.status(404).json({ message: 'Leave Type not found' });

        await type.update(req.body);
        res.status(200).json(type);
    } catch (error) {
        console.error(error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete a leave type
// @route   DELETE /api/leave-types/:id
// @access  Private
exports.deleteLeaveType = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await LeaveType.findByPk(id);
        if (!type) return res.status(404).json({ message: 'Leave Type not found' });

        // TODO: Add a check here to prevent deletion if the type is linked to leave allocations or policies
        await type.destroy();
        res.status(200).json({ message: 'Leave Type deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};