const { ShiftType, Company, HolidayList } = require('../models');

// @desc    Get all shift types for a specific company
// @route   GET /api/shift-types?companyId=1
// @access  Private
exports.getShiftTypesByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const types = await ShiftType.findAll({
            where: { companyId },
            include: [
                {
                    model: HolidayList,
                    as: 'holidayList',
                    attributes: ['id', 'name'],
                    required: false,
                }
            ],
            order: [['name', 'ASC']],
        });
        res.status(200).json(types);
    } catch (error) {
        console.error('Error fetching shift types:', error);
        res.status(500).json({ message: 'Server Error', error: error.message, stack: error.stack });
    }
};

// @desc    Get a single shift type by ID
// @route   GET /api/shift-types/:id
// @access  Private
exports.getShiftTypeById = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await ShiftType.findByPk(id, {
            include: [
                {
                    model: HolidayList,
                    as: 'holidayList',
                    attributes: ['id', 'name'],
                    required: false,
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name'],
                    required: false,
                }
            ],
        });
        
        if (!type) return res.status(404).json({ message: 'Shift Type not found' });
        
        res.status(200).json(type);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new shift type
// @route   POST /api/shift-types
// @access  Private
exports.createShiftType = async (req, res) => {
    try {
        const newType = await ShiftType.create(req.body);
        res.status(201).json(newType);
    } catch (error) {
        console.error(error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A shift type with this name already exists for this company.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Update a shift type
// @route   PUT /api/shift-types/:id
// @access  Private
exports.updateShiftType = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await ShiftType.findByPk(id);
        if (!type) return res.status(404).json({ message: 'Shift Type not found' });

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

// @desc    Delete a shift type
// @route   DELETE /api/shift-types/:id
// @access  Private
exports.deleteShiftType = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await ShiftType.findByPk(id);
        if (!type) return res.status(404).json({ message: 'Shift Type not found' });

        // TODO: Add a check here to prevent deletion if the type is linked to employee shifts or attendance records
        await type.destroy();
        res.status(200).json({ message: 'Shift Type deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Toggle shift type status (Active/Inactive)
// @route   PATCH /api/shift-types/:id/toggle-status
// @access  Private
exports.toggleShiftTypeStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await ShiftType.findByPk(id);
        if (!type) return res.status(404).json({ message: 'Shift Type not found' });

        const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
        await type.update({ status: newStatus });
        
        res.status(200).json({ 
            message: `Shift Type status changed to ${newStatus}`,
            shiftType: type 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};