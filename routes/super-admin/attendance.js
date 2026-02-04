/**
 * attendance.js
 * @description :: routes of attendance APIs
 */

const express = require('express');
const router = express.Router();
const tokenCheck = require('../../middleware/tokenCheck');
const attendanceController = require('../../controller/employee/attendanceController');
const employeeAttendanceController = require('../../controller/hr/employeeAttendanceController');

router.route('/get-attendance-list').post(tokenCheck(), attendanceController.getAttendanceList);
router.route('/get-today-attendance').get(tokenCheck(), employeeAttendanceController.getTodayAttendance);
module.exports = router;
