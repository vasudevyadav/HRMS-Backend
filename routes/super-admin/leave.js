/**
 * leave.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const leaveController = require('../../controller/super-admin/leaveController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/get-employee-leave-list').post(tokenCheck(), leaveController.getEmployeeLeaveList);
router.route('/manage-leave').put(tokenCheck(), leaveController.manageLeave);
router.route('/revert-leave').put(tokenCheck(), leaveController.revertLeave);
module.exports = router;
