/**
 * auth.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../../controller/employee/employeeController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/create-employee')
  .post(tokenCheck(), employeeController.createEmployee);
router
  .route('/get-employee-page-list')
  .post(tokenCheck(), employeeController.getEmployeePageList);
router
  .route('/send-employee-credentials')
  .post(tokenCheck(), employeeController.sendCredentialMail);
router
  .route('/get-employee-details/:id')
  .get(employeeController.getEmployeeDetails);
router
  .route('/update-employee-status/:id')
  .put(tokenCheck(), employeeController.updateEmployeeStatus);
module.exports = router;
