/**
 * dashboard.js
 * @description :: routes of dashboard APIs
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/super-admin/dashboardController');
const employeeAttendanceController = require('../../controller/hr/employeeAttendanceController');
const employeeController = require('../../controller/employee/employeeController');

const tokenCheck = require('../../middleware/tokenCheck');

router.route('/dashboard').get(tokenCheck(), dashboardController.dashboardData);
router.route('/get-employee-request').get(tokenCheck(), employeeAttendanceController.getSubmitRequest);
router.route('/update-request-status').put(tokenCheck(), employeeAttendanceController.updateRequestStatus);
router.route('/update-employee-profile/:id').put(tokenCheck(), employeeController.updateEmployeeProfile);


module.exports = router;
