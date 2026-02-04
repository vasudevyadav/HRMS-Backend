/**
 * contactUs.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const frontController = require('../../controller/front/frontController');
const tokenCheck = require('../../middleware/tokenCheck');
const jobController = require('../../controller/front/jobController');

router.route('/submit-contact-us').post(frontController.submitContactUs);
/* router.route('/submit-carrer-form').post(frontController.submitCarrerForm); */
router.route('/submit-job-application').post(frontController.submitCarrerForm);
router.route('/get-blog-list').get(frontController.getBlogList);
router.route('/get-blog-details/:blog_slug').get(frontController.getBlogDetails);

router.route('/get-job-list').get(jobController.getJobList);
router.route('/get-job-details/:id').get(jobController.getJobDetails);
/* router.route('/submit-job-application').post(jobController.submitJobApplication); */

module.exports = router;
