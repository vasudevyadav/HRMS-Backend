/**
 * routeRoleRoutes.js
 * @description :: CRUD API routes for routeRole
 */

const express = require('express');
const router = express.Router();
const routeRoleController = require('../../controller/super-admin/routeRoleController');
const {
  PLATFORM, USER_TYPES 
} =  require('../../constants/authConstant'); 
const auth = require('../../middleware/auth');
const checkRolePermission = require('../../middleware/checkRolePermission');

router.route('/super-admin/routerole/create').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.addRouteRole);
router.route('/super-admin/routerole/addBulk').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.bulkInsertRouteRole);
router.route('/super-admin/routerole/list').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.findAllRouteRole);
router.route('/super-admin/routerole/count').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.getRouteRoleCount);
router.route('/super-admin/routerole/updateBulk').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.bulkUpdateRouteRole);
router.route('/super-admin/routerole/softDeleteMany').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.softDeleteManyRouteRole);
router.route('/super-admin/routerole/deleteMany').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.deleteManyRouteRole);
router.route('/super-admin/routerole/softDelete/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.softDeleteRouteRole);
router.route('/super-admin/routerole/partial-update/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.partialUpdateRouteRole);
router.route('/super-admin/routerole/update/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.updateRouteRole);    
router.route('/super-admin/routerole/:id').get(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.getRouteRole);
router.route('/super-admin/routerole/delete/:id').delete(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,routeRoleController.deleteRouteRole);

module.exports = router;
