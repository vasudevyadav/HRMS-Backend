/**
 * index.js
 * @description :: index route file of admin platform.
 */

const express = require('express');
const router = express.Router();
const {
  API, API_PREFIX 
} = require('../../constants/authConstant');
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/employee`, require('./employee'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/auth`, require('./auth'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/leave`, require('./leave'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/attendance`, require('./attendance'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/holiday`, require('./holiday'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/project`, require('./project'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/sprint`, require('./sprint'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/task`, require('./task'));
router.use(`${API}${API_PREFIX.EMPLOYEE}/dashboard`, require('./dashboard'));


module.exports = router;
