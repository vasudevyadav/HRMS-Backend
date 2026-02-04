/**
 * index.js
 * @description :: index route of platforms
 */

const express = require('express');
const router = express.Router();
const commonController = require('../controller/commonController');
router.route('/api/get-country-list').post(commonController.getCountryList);
router.route('/api/get-state-list').post(commonController.getStateList);
router.route('/api/upload-file/:type').post(commonController.uploadFile);

router
  .route('/api/get-filter-country-list')
  .post(commonController.getFilterCountryList);
router
  .route('/api/get-filter-state-list')
  .post(commonController.getFilterStateList);
router
  .route('/api/get-department-list')
  .post(commonController.getDepartmentList);
router
  .route('/api/get-filter-department-list')
  .post(commonController.getFilterDepartmentList);
router
  .route('/api/get-employee-list')
  .post(commonController.getEmployeeList);

router
  .route('/api/get-client-list')
  .post(commonController.getClientList);

router
  .route('/api/get-filter-client-list')
  .post(commonController.getFilterClientList);

router
  .route('/api/get-team-lead-list')
  .post(commonController.getTeamLeadList);

router
  .route('/api/get-filter-team-lead-list')
  .post(commonController.getFilterTeamLeadList);

router.use(require('./super-admin/index'));
router.use(require('./employee/index'));
router.use(require('./hr/index'));
router.use(require('./team-lead/index'));
router.use(require('./client/index'));
router.use(require('./front/index'));

module.exports = router;
