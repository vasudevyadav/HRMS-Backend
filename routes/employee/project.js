/**
 * project.js
 * @description :: routes of project APIs
 */

const express = require('express');
const router = express.Router();
const projectController = require('../../controller/employee/projectController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/get-project-details/:id').get(tokenCheck(), projectController.getProjectDetails);

router.route('/get-project-list').post(tokenCheck(), projectController.getProjectList);

module.exports = router;
