/**
 * contactUs.js
 * @description :: routes of contactUs APIs
 */

const express = require('express');
const router = express.Router();
const contactUsController = require('../../controller/hr/contactUsController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/submit-contact-us').post(tokenCheck(), contactUsController.submitContactUs);
router.route('/get-contact-us-list').post(tokenCheck(), contactUsController.getContactUsList);
router.route('/get-carrer-list').post(tokenCheck(), contactUsController.getCarrerList);

module.exports = router;
