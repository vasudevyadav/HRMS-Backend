/**
 * project.js
 * @description :: routes of project APIs
 */

const express = require('express');
const router = express.Router();
const projectController = require('../../controller/team-lead/projectController');
const tokenCheck = require('../../middleware/tokenCheck');

// Route to add a new project
router.route('/add-project').post(tokenCheck(), projectController.addProject);

// Route to update an existing project
router.route('/update-project').post(tokenCheck(), projectController.updateProject);

// Route to get details of a specific project
router.route('/get-project-details/:id').get(tokenCheck(), projectController.getProjectDetails);

// Route to update the status of a specific project
router.route('/update-project-status/:id').put(tokenCheck(), projectController.updateProjectStatus);

// Route to delete a specific project
router.route('/delete-project/:id').delete(tokenCheck(), projectController.deleteProject);

// Route to get a list of projects
router.route('/get-project-list').post(tokenCheck(), projectController.getProjectList);

router.route('/get-user-list').get(tokenCheck(), projectController.getUserList);

module.exports = router;
