const { LeavePeriod, Company } = require('../models');

// @desc    Get all leave periods for a specific company
// @route   GET /api/leave-periods?companyId=1
// @access  Private
exports.getLeavePeriodsByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const periods = await LeavePeriod.findAll({
            where: { companyId },
            order: [['startDate', 'DESC']],
        });
        res.status(200).json(periods);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Helper function to deactivate all other active periods for a company
const deactivateOtherPeriods = async (companyId, currentPeriodId) => {
    await LeavePeriod.update(
        { status: 'Inactive' },
        {
            where: {
                companyId,
                status: 'Active',
                id: { [require('sequelize').Op.ne]: currentPeriodId }, // Exclude the current period
            },
        }
    );
};

// @desc    Create a new leave period
// @route   POST /api/leave-periods
// @access  Private
exports.createLeavePeriod = async (req, res) => {
    const { name, startDate, endDate, status, companyId } = req.body;
    if (!name || !startDate || !endDate || !companyId) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const newPeriod = await LeavePeriod.create({ name, startDate, endDate, status, companyId });

        // If the new period is active, deactivate all others for this company
        if (status === 'Active') {
            await deactivateOtherPeriods(companyId, newPeriod.id);
        }

        res.status(201).json(newPeriod);
    } catch (error) {
        console.error(error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => {
                if (err.message === 'End date must be after the start date.') return err.message;
                return `${err.path.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required.`;
            }).join(' ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A leave period with this name already exists for this company.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Update a leave period
// @route   PUT /api/leave-periods/:id
// @access  Private
exports.updateLeavePeriod = async (req, res) => {
    const { id } = req.params;
    const { name, startDate, endDate, status, companyId } = req.body;

    try {
        const period = await LeavePeriod.findByPk(id);
        if (!period) return res.status(404).json({ message: 'Leave Period not found' });

        await period.update({ name, startDate, endDate, status, companyId });

        // If the updated period is now active, deactivate all others for this company
        if (status === 'Active') {
            await deactivateOtherPeriods(companyId, period.id);
        }

        res.status(200).json(period);
    } catch (error) {
        console.error(error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => {
                if (err.message === 'End date must be after the start date.') return err.message;
                return `${err.path.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required.`;
            }).join(' ');
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete a leave period
// @route   DELETE /api/leave-periods/:id
// @access  Private
exports.deleteLeavePeriod = async (req, res) => {
    const { id } = req.params;
    try {
        const period = await LeavePeriod.findByPk(id);
        if (!period) return res.status(404).json({ message: 'Leave Period not found' });

        // TODO: Add a check here to prevent deletion if the period is linked to leave allocations
        // const allocationsCount = await LeaveAllocation.count({ where: { leavePeriodId: id } });
        // if (allocationsCount > 0) {
        //   return res.status(400).json({ message: 'Cannot delete a leave period that is in use.' });
        // }

        await period.destroy();
        res.status(200).json({ message: 'Leave Period deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};