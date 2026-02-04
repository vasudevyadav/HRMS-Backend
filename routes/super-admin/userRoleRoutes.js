/**
 * userRoleRoutes.js
 * @description :: CRUD API routes for userRole
 */

const express = require('express');
const router = express.Router();
const userRoleController = require('../../controller/super-admin/userRoleController');
const {
  PLATFORM, USER_TYPES 
} =  require('../../constants/authConstant'); 
const auth = require('../../middleware/auth');
const checkRolePermission = require('../../middleware/checkRolePermission');

router.route('/super-admin/userrole/create').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.addUserRole);
router.route('/super-admin/userrole/addBulk').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.bulkInsertUserRole);
router.route('/super-admin/userrole/list').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.findAllUserRole);
router.route('/super-admin/userrole/count').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.getUserRoleCount);
router.route('/super-admin/userrole/updateBulk').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.bulkUpdateUserRole);
router.route('/super-admin/userrole/softDeleteMany').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.softDeleteManyUserRole);
router.route('/super-admin/userrole/deleteMany').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.deleteManyUserRole);
router.route('/super-admin/userrole/softDelete/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.softDeleteUserRole);
router.route('/super-admin/userrole/partial-update/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.partialUpdateUserRole);
router.route('/super-admin/userrole/update/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.updateUserRole);    
router.route('/super-admin/userrole/:id').get(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.getUserRole);
router.route('/super-admin/userrole/delete/:id').delete(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userRoleController.deleteUserRole);

module.exports = router;
