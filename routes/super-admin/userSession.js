/**
 * userSession.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const userSessionController = require('../../controller/hr/userSessionController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/get-employee-session-list').post(tokenCheck(), userSessionController.getEmployeeSessionList);
router.route('/get-employee-session-details').post(tokenCheck(), userSessionController.getEmployeeSessionDetails);
router.route('/terminate-session').put(tokenCheck(), userSessionController.terminateSession);
module.exports = router;
