/**
 * project.js
 * @description :: routes of project APIs
 */

const express = require('express');
const router = express.Router();
const projectController = require('../../controller/client/projectController');
const tokenCheck = require('../../middleware/tokenCheck');

// Route to get details of a specific project
router.route('/get-project-details/:id').get(tokenCheck(), projectController.getProjectDetails);

// Route to get a list of projects
router.route('/get-project-list').post(tokenCheck(), projectController.getProjectList);

// Route to get details of a specific sprint
router.route('/get-sprint-details/:id').get(tokenCheck(), projectController.getSprintDetails);

// Route to get a list of sprints
router.route('/get-sprint-list').post(tokenCheck(), projectController.getSprintList);

router.route('/get-task-list').post(tokenCheck(), projectController.getTaskList);

router.route('/get-task-details/:id').get(tokenCheck(), projectController.getTaskDetails);

module.exports = router;
