/**
 * userRoutes.js
 * @description :: CRUD API routes for user
 */

const express = require('express');
const router = express.Router();
const userController = require('../../controller/super-admin/userController');
const {
  PLATFORM, USER_TYPES 
} =  require('../../constants/authConstant'); 
const auth = require('../../middleware/auth');
const checkRolePermission = require('../../middleware/checkRolePermission');
const upload = require('../../middleware/upload');

router.route('/super-admin/user/me').get(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.getLoggedInUserInfo);
router.route('/super-admin/user/create').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.addUser);
router.route('/super-admin/user/list').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.findAllUser);
router.route('/super-admin/user/count').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.getUserCount);
router.route('/super-admin/user/:id').get(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.getUser);
router.route('/super-admin/user/update/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.updateUser);    
router.route('/super-admin/user/partial-update/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.partialUpdateUser);
router.route('/super-admin/user/softDelete/:id').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.softDeleteUser);
router.route('/super-admin/user/softDeleteMany').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.softDeleteManyUser);
router.route('/super-admin/user/addBulk').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.bulkInsertUser);
router.route('/super-admin/user/updateBulk').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.bulkUpdateUser);
router.route('/super-admin/user/delete/:id').delete(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.deleteUser);
router.route('/super-admin/user/deleteMany').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),checkRolePermission,userController.deleteManyUser);
router.route('/super-admin/user/change-password').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.changePassword);
router.route('/super-admin/user/update-profile').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.updateProfile);
router.route('/api/super-admin/user/update-salary-quota').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.updateSalaryQuota);
router.route('/api/super-admin/user/update-leave-quota').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.updateLeaveQuota);
router.route('/api/super-admin/user/get-quota-details').get(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.getQuotaDetails);

// Earning Management Routes
router.route('/api/super-admin/user/update-employees-salary').put(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.bulkUpdateEmployeeSalaries);
router.route('/api/super-admin/user/get-employees-salary-data').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.getEmployeeSalaryData);
router.route('/api/super-admin/user/employee-salary-data').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.employeeSalaryData);
router.route('/api/super-admin/user/submit-employee-salary-record').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.submitEmployeeSalaryRecord);
router.route('/api/super-admin/user/export-employee-salary-data/:month/:year').get(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.exportEmployeeSalaryData);
router.route('/api/super-admin/user/approve-employee-salary').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.approveEmployeeSalary);
router.route('/api/super-admin/user/send-email-salary-attachment').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN), upload.single('attachment'),userController.sendEmailWithAttachment);
router.route('/api/super-admin/user/approve-all-employee-salary').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.approveAllEmployeeSalary);
router.route('/api/super-admin/user/send-all-salary-attachment').post(auth(PLATFORM.WEB, USER_TYPES.SUPER_ADMIN),userController.sendAllSalaryAttachments);

module.exports = router;
