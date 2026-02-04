/**
 * index.js
 * @description :: index route file of admin platform.
 */

const express = require('express');
const router = express.Router();
const { API, API_PREFIX } = require('../../constants/authConstant');
router.use(`${API}${API_PREFIX.HR}/auth`, require('./auth'));
router.use(`${API}${API_PREFIX.HR}/blog`, require('./blog'));
router.use(`${API}${API_PREFIX.HR}/contact-us`, require('./contactUs'));
router.use(`${API}${API_PREFIX.HR}/holiday`, require('./holiday'));
router.use(`${API}${API_PREFIX.HR}/employee`, require('./employee'));
router.use(`${API}${API_PREFIX.HR}/user-session`, require('./userSession'));
router.use(`${API}${API_PREFIX.HR}/leave`, require('./leave'));
router.use(`${API}${API_PREFIX.HR}/attendance`, require('./attendance'));
router.use(`${API}${API_PREFIX.HR}/job`, require('./job'));
router.use(`${API}${API_PREFIX.HR}/department`,require('./department'));
router.use(`${API}${API_PREFIX.HR}/dashboard`,require('./dashboard'));

module.exports = router;
