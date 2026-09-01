const { LeavePolicy, Company, EmploymentType } = require('../models');

// @desc    Get all leave policies for a specific company
// @route   GET /api/leave-policies?companyId=1
// @access  Private
exports.getLeavePoliciesByCompany = async (req, res) => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const leavePolicies = await LeavePolicy.findAll({
            where: { companyId },
            include: [
                { model: Company, attributes: ['name'] },
                { model: EmploymentType, attributes: ['name'] }
            ]
        });
        res.status(200).json(leavePolicies);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single leave policy by ID
// @route   GET /api/leave-policies/:id
// @access  Private
exports.getLeavePolicyById = async (req, res) => {
    try {
        const leavePolicy = await LeavePolicy.findByPk(req.params.id, {
            include: [
                { model: Company, attributes: ['name'] },
                { model: EmploymentType, attributes: ['name'] }
            ]
        });
        if (!leavePolicy) {
            return res.status(404).json({ message: 'Leave policy not found' });
        }
        res.status(200).json(leavePolicy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new leave policy
// @route   POST /api/leave-policies
// @access  Private
exports.createLeavePolicy = async (req, res) => {
    const { 
        name, leaveType, employmentTypeId, accrualFrequency, 
        accrualDays, maxCarryForward, allowEncashment, 
        encashmentRules, companyId, status 
    } = req.body;

    if (!name || !leaveType || !companyId) {
        return res.status(400).json({ message: 'Missing required fields: name, leaveType, or companyId' });
    }

    try {
        const newLeavePolicy = await LeavePolicy.create({
            name,
            leaveType,
            employmentTypeId: employmentTypeId || null,
            accrualFrequency,
            accrualDays,
            maxCarryForward,
            allowEncashment,
            encashmentRules,
            companyId,
            status
        });
        res.status(201).json(newLeavePolicy);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a leave policy
// @route   PUT /api/leave-policies/:id
// @access  Private
exports.updateLeavePolicy = async (req, res) => {
    const { id } = req.params;
    const { 
        name, leaveType, employmentTypeId, accrualFrequency, 
        accrualDays, maxCarryForward, allowEncashment, 
        encashmentRules, companyId, status 
    } = req.body;

    try {
        const leavePolicy = await LeavePolicy.findByPk(id);
        if (!leavePolicy) {
            return res.status(404).json({ message: 'Leave policy not found' });
        }

        await leavePolicy.update({ 
            name, leaveType, employmentTypeId: employmentTypeId || null,
 accrualFrequency, 
            accrualDays, maxCarryForward, allowEncashment, 
            encashmentRules, companyId, status 
        });
        res.status(200).json(leavePolicy);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a leave policy
// @route   DELETE /api/leave-policies/:id
// @access  Private
exports.deleteLeavePolicy = async (req, res) => {
    const { id } = req.params;

    try {
        const leavePolicy = await LeavePolicy.findByPk(id);
        if (!leavePolicy) {
            return res.status(404).json({ message: 'Leave policy not found' });
        }

        await leavePolicy.destroy();
        res.status(200).json({ message: 'Leave policy deleted successfully' });
    } catch (error) {
        console.error(error);
        // Handle foreign key constraint errors if policy has employees assigned
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Cannot delete policy with assigned employees.' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};