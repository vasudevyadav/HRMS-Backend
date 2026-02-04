/**
 * client.js
 * @description :: routes of client APIs
 */

const express = require('express');
const router = express.Router();
const clientController = require('../../controller/super-admin/clientController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/add-client')
  .post(tokenCheck(), clientController.addClient);

router
  .route('/update-client')
  .put(tokenCheck(), clientController.updateClient);

router
  .route('/get-client-details/:id')
  .get(tokenCheck(), clientController.getClientDetails);

router
  .route('/delete-client/:id')
  .delete(tokenCheck(), clientController.deleteClient);

router
  .route('/get-client-list')
  .post(tokenCheck(), clientController.getClientList);

router
  .route('/update-client-status/:id')
  .put(tokenCheck(), clientController.updateClientStatus);

module.exports = router;