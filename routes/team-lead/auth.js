/**
 * auth.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const authController = require('../../controller/super-admin/authController');
const { PLATFORM, USER_TYPES } = require('../../constants/authConstant');
const loginPrefix = require('../../middleware/loginPrefix');

router.route('/register').post(authController.register);
router.route('/get-user-details').post(loginPrefix(USER_TYPES.TEAM_LEAD),authController.getUserDetails);
router
  .route('/login')
  .post(loginPrefix(USER_TYPES.TEAM_LEAD), authController.login);
router
  .route('/forgot-password')
  .post(loginPrefix(USER_TYPES.TEAM_LEAD), authController.forgotPassword);
router
  .route('/validate-reset-password')
  .post(loginPrefix(USER_TYPES.TEAM_LEAD), authController.validateResetPassword);
router
  .route('/reset-password')
  .put(loginPrefix(USER_TYPES.TEAM_LEAD), authController.resetPassword);
router.route('/change-password').put(loginPrefix(USER_TYPES.TEAM_LEAD), authController.changePassword);
router
  .route('/logout')
  .post(auth(PLATFORM.WEB, USER_TYPES.TEAM_LEAD), authController.logout);
module.exports = router;
