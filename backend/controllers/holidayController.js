const { Holiday, HolidayList } = require('../models');

// @desc    Get all holidays for a specific list
// @route   GET /api/holidays/list/:listId
// @access  Private
exports.getHolidaysByListId = async (req, res) => {
    const { listId } = req.params;
    try {
        const holidays = await Holiday.findAll({ where: { holidayListId: listId }, order: [['date', 'ASC']] });
        res.status(200).json(holidays);
    } catch (error) {
        console.error('Error fetching holidays:', error); // Added logging
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new holiday
// @route   POST /api/holidays
// @access  Private
exports.createHoliday = async (req, res) => {
    const { date, description, holidayListId } = req.body;

    // Basic validation
    if (!date || !description || !holidayListId) {
        return res.status(400).json({ message: 'Date, description, and holidayListId are required.' });
    }

    try {
        const newHoliday = await Holiday.create({ date, description, holidayListId });
        res.status(201).json(newHoliday);
    } catch (error) {
        console.error('Error creating holiday:', error); // Added logging
        let message = 'Server Error';

        // Handle specific, known errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A holiday for this date already exists in this list.';
        } else if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        }

        res.status(400).json({ message });
    }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private
exports.updateHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByPk(req.params.id);
        if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
        await holiday.update(req.body);
        res.status(200).json(holiday);
    } catch (error) {
        console.error('Error updating holiday:', error); // Added logging
        let message = 'Server Error';
        if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'A holiday for this date already exists in this list.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private
exports.deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByPk(req.params.id);
        if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
        await holiday.destroy();
        res.status(200).json({ message: 'Holiday deleted successfully' });
    } catch (error) {
        console.error('Error deleting holiday:', error); // Added logging
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};