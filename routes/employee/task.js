/**
 * sprint.js
 * @description :: routes of sprint APIs
 */

const express = require('express');
const router = express.Router();
const taskController = require('../../controller/employee/taskController');
const projectController = require('../../controller/employee/projectController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/get-task-details/:id').get(tokenCheck(), taskController.getTaskDetails);
router.route('/get-task-list').post(tokenCheck(), taskController.getTaskList);
router.route('/get-task-history/:taskId').get(tokenCheck(), taskController.getTaskHistory);

router.route('/project-list').get(tokenCheck(), taskController.projectList);
router.route('/get-sprint-list/:projectId').get(tokenCheck(), taskController.getSprintList);
router.route('/get-user-list').get(tokenCheck(), projectController.getUserList);
router.route('/update-task-status/:id').patch(tokenCheck(), taskController.updateTaskStatus);

/*
 * Route to get a list of sprints
 * router.route('/get-sprint-data/:projectId').get(tokenCheck(), sprintController.getSprintData);
 */

module.exports = router;
