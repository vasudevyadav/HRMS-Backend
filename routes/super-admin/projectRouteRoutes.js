/**
 * projectRouteRoutes.js
 * @description :: CRUD API routes for projectRoute
 */

const express = require('express');
const router = express.Router();
const projectRouteController = require('../../controller/super-admin/projectRouteController');
const {
  PLATFORM, USER_TYPES 
} =  require('../../constants/authConstant'); 
const auth = require('../../middleware/auth');
const checkRolePermission = require('../../middleware/checkRolePermission');

router.route('/super-admin/projectroute/create').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.addProjectRoute);
router.route('/super-admin/projectroute/addBulk').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.bulkInsertProjectRoute);
router.route('/super-admin/projectroute/list').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.findAllProjectRoute);
router.route('/super-admin/projectroute/count').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.getProjectRouteCount);
router.route('/super-admin/projectroute/updateBulk').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.bulkUpdateProjectRoute);
router.route('/super-admin/projectroute/softDeleteMany').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.softDeleteManyProjectRoute);
router.route('/super-admin/projectroute/deleteMany').post(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.deleteManyProjectRoute);
router.route('/super-admin/projectroute/softDelete/:id').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.softDeleteProjectRoute);
router.route('/super-admin/projectroute/partial-update/:id').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.partialUpdateProjectRoute);
router.route('/super-admin/projectroute/update/:id').put(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.updateProjectRoute);    
router.route('/super-admin/projectroute/:id').get(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.getProjectRoute);
router.route('/super-admin/projectroute/delete/:id').delete(auth(PLATFORM.WEB,USER_TYPES.SUPER_ADMIN),checkRolePermission,projectRouteController.deleteProjectRoute);

module.exports = router;
