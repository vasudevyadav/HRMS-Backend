/**
 * index.js
 * @description :: index route file of admin platform.
 */

const express = require('express');
const router = express.Router();
const {
  API, API_PREFIX 
} = require('../../constants/authConstant');
router.use(`${API}/front`, require('./front'));

module.exports = router;
