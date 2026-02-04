/**
 * invoice.js
 * @description :: routes of invoice APIs
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../../controller/client/invoiceController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/get-invoice-details/:id')
  .get(tokenCheck(), invoiceController.getInvoiceDetails);

router
  .route('/get-invoice-list')
  .post(tokenCheck(), invoiceController.getInvoiceList);

router
  .route('/update-invoice-status/:id')
  .put(tokenCheck(), invoiceController.updateInvoiceStatus);

module.exports = router;
