/**
 * sprint.js
 * @description :: routes of sprint APIs
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/team-lead/dashboardController');
const employeeController = require('../../controller/employee/employeeController');

const tokenCheck = require('../../middleware/tokenCheck');

router.route('/get-dashboard-data').get(tokenCheck(), dashboardController.getDashboardData);
router.route('/update-employee-profile/:id').put(tokenCheck(), employeeController.updateEmployeeProfile);

module.exports = router;
