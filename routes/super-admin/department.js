/**
 * department.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const departmentController = require('../../controller/super-admin/departmentController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/add-department')
  .post(tokenCheck(), departmentController.addDepartment);
router
  .route('/edit-department')
  .put(tokenCheck(), departmentController.editDepartment);
router
  .route('/get-department-details/:id')
  .get(tokenCheck(), departmentController.getDepartmentDetails);
router
  .route('/delete-department/:id')
  .delete(tokenCheck(), departmentController.deleteDepartment);

router
  .route('/get-department-list')
  .post(tokenCheck(), departmentController.getDepartmentList);
module.exports = router;
