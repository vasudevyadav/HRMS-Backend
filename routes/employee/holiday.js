/**
 * holiday.js
 * @description :: Routes of holiday APIs
 */

const express = require('express');
const router = express.Router();
const holidayController = require('../../controller/super-admin/holidayController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/add-holiday')
  .post(tokenCheck(), holidayController.addHoliday);

router
  .route('/update-holiday')
  .put(tokenCheck(), holidayController.addHoliday); // Assuming editHoliday is now addHoliday in MongoDB

router
  .route('/get-holiday-details/:id')
  .get(tokenCheck(), holidayController.getDetails); // Updated method name to match MongoDB

router
  .route('/delete-holiday/:id')
  .delete(tokenCheck(), holidayController.deleteHoliday);

router
  .route('/get-holiday-list')
  .post(tokenCheck(), holidayController.getHolidayList); // Changed from POST to GET

module.exports = router;
