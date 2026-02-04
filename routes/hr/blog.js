/**
 * leave.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const blogController = require('../../controller/hr/blogController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/add-blog').post(tokenCheck(), blogController.addBlog);
router.route('/update-blog').post(tokenCheck(), blogController.updateBlog);
router.route('/get-blog-details/:id').get(tokenCheck(), blogController.getBlogDetails);
router.route('/update-blog-status/:id').put(tokenCheck(), blogController.updateBlogStatus);
router.route('/delete-blog/:id').delete(tokenCheck(), blogController.deleteBlog);
router
  .route('/get-blog-list')
  .post(tokenCheck(), blogController.getBlogList);

module.exports = router;
