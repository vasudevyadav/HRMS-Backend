/**
 * roleRoutes.js
 * @description :: CRUD API routes for role
 */

const express = require('express');
const router = express.Router();
const roleController = require('../../controller/super-admin/roleController');
const {
  PLATFORM, USER_TYPES 
} =  require('../../constants/authConstant'); 
const auth = require('../../middleware/auth');
const checkRolePermission = require('../../middleware/checkRolePermission');

router.route('/super-admin/role/create').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.addRole);
router.route('/super-admin/role/addBulk').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.bulkInsertRole);
router.route('/super-admin/role/list').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.findAllRole);
router.route('/super-admin/role/count').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.getRoleCount);
router.route('/super-admin/role/updateBulk').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.bulkUpdateRole);
router.route('/super-admin/role/softDeleteMany').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.softDeleteManyRole);
router.route('/super-admin/role/deleteMany').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.deleteManyRole);
router.route('/super-admin/role/softDelete/:id').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.softDeleteRole);
router.route('/super-admin/role/partial-update/:id').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.partialUpdateRole);
router.route('/super-admin/role/update/:id').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.updateRole);    
router.route('/super-admin/role/:id').get(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.getRole);
router.route('/super-admin/role/delete/:id').delete(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,roleController.deleteRole);

module.exports = router;
