/**
 * sprint.js
 * @description :: routes of sprint APIs
 */

const express = require('express');
const router = express.Router();
const sprintController = require('../../controller/team-lead/sprintController');
const tokenCheck = require('../../middleware/tokenCheck');

// Route to add a new sprint
router.route('/add-sprint').post(tokenCheck(), sprintController.addSprint);

// Route to update an existing sprint
router.route('/update-sprint').put(tokenCheck(), sprintController.updateSprint);

// Route to get details of a specific sprint
router.route('/get-sprint-details/:id').get(tokenCheck(), sprintController.getSprintDetails);

// Route to update the status of a specific sprint
router.route('/update-sprint-status/:id').put(tokenCheck(), sprintController.updateSprintStatus);

// Route to delete a specific sprint
router.route('/delete-sprint/:id').delete(tokenCheck(), sprintController.deleteSprint);

// Route to get a list of sprints
router.route('/get-sprint-list').post(tokenCheck(), sprintController.getSprintList);

// Route to get a list of sprints
router.route('/get-sprint-data/:projectId').get(tokenCheck(), sprintController.getSprintData);

module.exports = router;
