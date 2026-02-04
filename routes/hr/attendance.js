/**
 * auth.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const attendanceController = require('../../controller/employee/attendanceController');
const employeeAttendanceController = require('../../controller/hr/employeeAttendanceController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/get-today-details').get(tokenCheck(), attendanceController.getTodayDetails);
router.route('/check-in').post(tokenCheck(), attendanceController.checkIn);
router.route('/create-work-session').post(tokenCheck(), attendanceController.createWorkSession);
router.route('/end-work-session').post(tokenCheck(), attendanceController.endWorkSession);
router.route('/end-other-checkout-session').post(tokenCheck(), attendanceController.endOtherCheckoutSession);
router.route('/submit-request').post(tokenCheck(), attendanceController.submitRequest);
router.route('/get-attendance-list').post(tokenCheck(), attendanceController.getAttendanceList);
router.route('/get-attendance-details').get(tokenCheck(), attendanceController.getAttendanceDetails);

router.route('/get-today-attendance').get(tokenCheck(), employeeAttendanceController.getTodayAttendance);
router.route('/get-employee-request').get(tokenCheck(), employeeAttendanceController.getSubmitRequest);
router.route('/update-request-status').put(tokenCheck(), employeeAttendanceController.updateRequestStatus);

router.route('/mark-self-attendance').post(tokenCheck(), employeeAttendanceController.markSelfAttendace);

module.exports = router;
