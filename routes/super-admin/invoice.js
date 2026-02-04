/**
 * invoice.js
 * @description :: routes of invoice APIs
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../../controller/super-admin/invoiceController');
const tokenCheck = require('../../middleware/tokenCheck');

router
  .route('/add-invoice')
  .post(tokenCheck(), invoiceController.addInvoice);

router
  .route('/get-invoice-number')
  .get(tokenCheck(), invoiceController.getInvoiceNumber);

router
  .route('/update-invoice')
  .put(tokenCheck(), invoiceController.updateInvoice);

router
  .route('/get-invoice-details/:id')
  .get(tokenCheck(), invoiceController.getInvoiceDetails);

router
  .route('/delete-invoice/:id')
  .delete(tokenCheck(), invoiceController.deleteInvoice);

router
  .route('/get-invoice-list')
  .post(tokenCheck(), invoiceController.getInvoiceList);

router
  .route('/update-invoice-status/:id')
  .put(tokenCheck(), invoiceController.updateInvoiceStatus);

module.exports = router;
