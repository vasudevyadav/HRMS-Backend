/**
 * job.js
 * @description :: routes for Job management APIs
 */

const express = require('express');
const router = express.Router();
const jobController = require('../../controller/hr/jobController'); // Adjust path according to your project structure
const tokenCheck = require('../../middleware/tokenCheck');

// Route to add a new job
router.route('/add-job').post(tokenCheck(), jobController.addJob);
router.route('/edit-job').put(tokenCheck(), jobController.editJob);
router.route('/get-job-details/:id').get(tokenCheck(), jobController.getJobDetails);
router.route('/delete-job/:id').delete(tokenCheck(), jobController.deleteJob);
router.route('/get-job-list').post(tokenCheck(), jobController.getJobList);
router.route('/manage-job-status').put(tokenCheck(), jobController.manageJobStatus);

router.route('/get-job-application-list').post(tokenCheck(), jobController.getJobApplicationList);
router.route('/get-job-application-details/:id').get(tokenCheck(), jobController.getJobApplicationDetails);

module.exports = router;
