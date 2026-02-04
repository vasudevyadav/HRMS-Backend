/**
 * sprint.js
 * @description :: routes of sprint APIs
 */

const express = require('express');
const router = express.Router();
const sprintController = require('../../controller/employee/sprintController');
const tokenCheck = require('../../middleware/tokenCheck');

// Route to get details of a specific sprint
router.route('/get-sprint-details/:id').get(tokenCheck(), sprintController.getSprintDetails);

// Route to get a list of sprints
router.route('/get-sprint-list').post(tokenCheck(), sprintController.getSprintList);

// Route to get a list of sprints
router.route('/get-sprint-data/:projectId').get(tokenCheck(), sprintController.getSprintData);

module.exports = router;
