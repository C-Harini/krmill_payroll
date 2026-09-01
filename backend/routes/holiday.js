const express = require('express'); const router = express.Router();
const holidayController = require('../controllers/holidayController');
router.get('/list/:listId', holidayController.getHolidaysByListId);
router.post('/', holidayController.createHoliday);
router.put('/:id', holidayController.updateHoliday);
router.delete('/:id', holidayController.deleteHoliday);
module.exports = router;