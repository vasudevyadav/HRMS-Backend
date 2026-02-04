/**
 * dashboard.js
 * @description :: routes of dashboard APIs
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../../controller/client/dashboardController');
const employeeController = require('../../controller/employee/employeeController');

const tokenCheck = require('../../middleware/tokenCheck');

router.route('/dashboard').get(tokenCheck(), dashboardController.dashboardData);
router.route('/update-employee-profile/:id').put(tokenCheck(), employeeController.updateEmployeeProfile);

module.exports = router;
