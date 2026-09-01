const express = require('express'); const router = express.Router();
const holidayListController = require('../controllers/holidayListController');
router.get('/', holidayListController.getHolidayListsByCompany);
router.post('/', holidayListController.createHolidayList);
router.put('/:id', holidayListController.updateHolidayList);
router.delete('/:id', holidayListController.deleteHolidayList);
module.exports = router;