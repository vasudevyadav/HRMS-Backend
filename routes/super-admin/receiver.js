/**
 * receiver.js
 * @description :: routes of receiver APIs
 */

const express = require('express');
const router = express.Router();
const receiverController = require('../../controller/super-admin/receiverController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/add-receiver')
  .post(tokenCheck(), receiverController.addReceiver);

router
  .route('/update-receiver/:id')
  .put(tokenCheck(), receiverController.updateReceiver);

router
  .route('/delete-receiver/:id')
  .delete(tokenCheck(), receiverController.deleteReceiver);

router
  .route('/receiver-details/:id')
  .get(tokenCheck(), receiverController.getReceiverDetails);  
router
  .route('/receiver-list')
  .post(tokenCheck(), receiverController.receiverList);

module.exports = router;
