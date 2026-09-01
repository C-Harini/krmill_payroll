const { HolidayList, Holiday, Company } = require('../models');

exports.getHolidayListsByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });
    try {
        const lists = await HolidayList.findAll({ where: { companyId }, order: [['startDate', 'DESC']] });
        res.status(200).json(lists);
    } catch (error) { res.status(500).json({ message: 'Server Error', error: error.message }); }
};

exports.createHolidayList = async (req, res) => {
    try {
        const newList = await HolidayList.create({ ...req.body, companyId: req.body.companyId });
        res.status(201).json(newList);
    } catch (error) {
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') message = error.errors.map(err => err.message).join(' ');
        res.status(400).json({ message });
    }
};

exports.updateHolidayList = async (req, res) => {
    try {
        const list = await HolidayList.findByPk(req.params.id);
        if (!list) return res.status(404).json({ message: 'Holiday List not found' });
        await list.update(req.body);
        res.status(200).json(list);
    } catch (error) { res.status(500).json({ message: 'Server Error', error: error.message }); }
};

exports.deleteHolidayList = async (req, res) => {
    try {
        const list = await HolidayList.findByPk(req.params.id);
        if (!list) return res.status(404).json({ message: 'Holiday List not found' });
        await list.destroy(); // Cascading delete will remove associated holidays
        res.status(200).json({ message: 'Holiday List deleted successfully' });
    } catch (error) { res.status(500).json({ message: 'Server Error', error: error.message }); }
};