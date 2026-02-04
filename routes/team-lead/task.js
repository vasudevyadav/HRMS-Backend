/**
 * sprint.js
 * @description :: routes of sprint APIs
 */

const express = require('express');
const router = express.Router();
const sprintController = require('../../controller/team-lead/sprintController');
const taskController = require('../../controller/team-lead/taskController');
const projectController = require('../../controller/team-lead/projectController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/add-task').post(tokenCheck(), taskController.addTask);
router.route('/update-task').put(tokenCheck(), taskController.updateTask);
router.route('/get-task-details/:id').get(tokenCheck(), taskController.getTaskDetails);
router.route('/update-task-status/:id').patch(tokenCheck(), taskController.updateTaskStatus);
router.route('/delete-task/:id').delete(tokenCheck(), taskController.deleteTask);
router.route('/get-task-list').post(tokenCheck(), taskController.getTaskList);
router.route('/get-task-history/:taskId').get(tokenCheck(), taskController.getTaskHistory);

router.route('/project-list').get(tokenCheck(), taskController.projectList);
router.route('/get-sprint-list/:projectId').get(tokenCheck(), taskController.getSprintList);
router.route('/get-user-list').get(tokenCheck(), projectController.getUserList);
/*
 * Route to get a list of sprints
 * router.route('/get-sprint-data/:projectId').get(tokenCheck(), sprintController.getSprintData);
 */

module.exports = router;
