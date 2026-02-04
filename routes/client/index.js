/**
 * index.js
 * @description :: index route file of admin platform.
 */

const express = require('express');
const router = express.Router();
const {
  API, API_PREFIX 
} = require('../../constants/authConstant');
router.use(`${API}${API_PREFIX.CLIENT}/auth`, require('./auth'));
router.use(`${API}${API_PREFIX.CLIENT}/invoice`, require('./invoice'));
router.use(`${API}${API_PREFIX.CLIENT}/project`, require('./project'));
router.use(`${API}${API_PREFIX.CLIENT}/dashboard`, require('./dashboard'));

module.exports = router;
