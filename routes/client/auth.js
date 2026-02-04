/**
 * auth.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const authController = require('../../controller/super-admin/authController');
const {
  PLATFORM, USER_TYPES 
} = require('../../constants/authConstant');
const loginPrefix = require('../../middleware/loginPrefix');

router.route('/get-user-details').post(loginPrefix(USER_TYPES.CLIENT),authController.getUserDetails);
router
  .route('/login')
  .post(loginPrefix(USER_TYPES.CLIENT), authController.login);
router
  .route('/forgot-password')
  .post(loginPrefix(USER_TYPES.CLIENT), authController.forgotPassword);
router
  .route('/validate-reset-password')
  .post(loginPrefix(USER_TYPES.CLIENT), authController.validateResetPassword);
router
  .route('/reset-password')
  .put(loginPrefix(USER_TYPES.CLIENT), authController.resetPassword);
router.route('/change-password').put(loginPrefix(USER_TYPES.CLIENT), authController.changePassword);
router
  .route('/logout')
  .post(auth(PLATFORM.WEB, USER_TYPES.CLIENT), authController.logout);
module.exports = router;
