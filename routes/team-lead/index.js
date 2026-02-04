/**
 * index.js
 * @description :: index route file of admin platform.
 */

const express = require('express');
const router = express.Router();
const { API, API_PREFIX } = require('../../constants/authConstant');
router.use(`${API}${API_PREFIX.TEAM_LEAD}/auth`, require('./auth'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/leave`, require('./leave'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/attendance`, require('./attendance'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/holiday`, require('./holiday'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/project`, require('./project'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/sprint`, require('./sprint'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/task`, require('./task'));
router.use(`${API}${API_PREFIX.TEAM_LEAD}/dashboard`, require('./dashboard'));

module.exports = router;
