/**
 * leave.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const leaveController = require('../../controller/employee/leaveController');
const empLeaveController = require('../../controller/super-admin/leaveController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/add-leave').post(tokenCheck(), leaveController.addLeave);
router.route('/get-leave-list').post(tokenCheck(), leaveController.getEmployeeLeaveList);
router.route('/get-employee-leave-list').post(tokenCheck(), empLeaveController.getEmployeeLeaveList);

module.exports = router;
