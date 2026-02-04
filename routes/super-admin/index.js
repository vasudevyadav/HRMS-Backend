/**
 * index.js
 * @description :: index route file of admin platform.
 */

const {
  API, API_PREFIX 
} = require('../../constants/authConstant');
const express = require('express');
const router = express.Router();
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/dashboard`, require('./dashboard'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/auth`, require('./auth'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/leave`, require('./leave'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/holiday`, require('./holiday'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/department`,require('./department'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/team`, require('./team'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/attendance`, require('./attendance'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/user-session`, require('./userSession'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/client`, require('./client'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/invoice`, require('./invoice'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/receiver`, require('./receiver'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/project`, require('./project'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/sprint`, require('./sprint'));
router.use(`${API}${API_PREFIX.SUPER_ADMIN}/task`, require('./task'));

router.use(require('./userRoutes'));
router.use(require('./roleRoutes'));
router.use(require('./projectRouteRoutes'));
router.use(require('./routeRoleRoutes'));
router.use(require('./userRoleRoutes'));

module.exports = router;
