/**
 * team.js
 * @description :: routes of authentication APIs
 */

const express = require('express');
const router = express.Router();
const teamController = require('../../controller/super-admin/teamController');
const tokenCheck = require('../../middleware/tokenCheck');

router.route('/add-team').post(tokenCheck(), teamController.addTeam);
router
  .route('/add-team-member')
  .post(tokenCheck(), teamController.addTeamMember);
router.route('/edit-team').put(tokenCheck(), teamController.editTeam);
router
  .route('/get-team-details/:id')
  .get(tokenCheck(), teamController.getTeamDetails);
router.route('/get-team-list').post(tokenCheck(), teamController.getTeamList);
router
  .route('/get-team-member-list')
  .get(tokenCheck(), teamController.getTeamMemberList);
router
  .route('/delete-team/:id')
  .delete(tokenCheck(), teamController.deleteTeam);
module.exports = router;
