/**
 * seeder.js
 * @description :: functions that seeds mock data to run the application
 */
const {
  generateStrongPassword,
  cryptoFUN,
  validateNumbers,
} = require('../helpers/function');

const bcrypt = require('bcrypt');
const countries = require('../model/country');
const state = require('../model/state');
const authConstant = require('../constants/authConstant');
const Role = require('../model/role');
const ProjectRoute = require('../model/projectRoute');
const RouteRole = require('../model/routeRole');
const UserRole = require('../model/userRole');
const { replaceAll } = require('../utils/common');
const dbService = require('../utils/dbService');
const {
  country, stateJson 
} = require('../data/index');
const user = require('../model/user');
const superAdminSettings = require('../model/superAdminSettings');

/* seeds default users */
async function seedDeleteLeaveRecord () {
  try {
    await user.updateMany(
      { versions: { $ne: 1 } },
      {
        $set: {
          versions: 1,
          carryForwardLeave:0 
        },
        $pull: {
          leaveBalanceHistory: {
            $or: [
              { year: { $ne: 2025 } },
              {
                month: { $ne: 4 },
                year: 2025 
              }
            ]
          }
        }
      }
    );
    console.info('Leave Request Data seeded 🍺');
  } catch (error) {
    console.log('User seeder failed due to ', error.message);
  }
}

async function seedUser () {
  try {
    let userToBeInserted = {};
    userToBeInserted = {
      password: 'Admin@1234',
      isDeleted: false,
      username: '',
      firstName: 'Rajesh Sharma',
      primaryEmail: 'rajeshsdsharma@gmail.com',
      isActive: true,
      userType: authConstant.USER_TYPES.SUPER_ADMIN,
    };
    (userToBeInserted.primaryEmail = cryptoFUN(
      userToBeInserted.primaryEmail.toLowerCase(),
      'encrypt'
    )),
    (userToBeInserted.password = await bcrypt.hash(
      userToBeInserted.password,
      8
    ));
    let usera = await dbService.updateOne(
      user,
      { username: 'SUPER_ADMIN' },
      userToBeInserted,
      { upsert: true }
    );
    console.info('Users seeded 🍺');
  } catch (error) {
    console.log('User seeder failed due to ', error.message);
  }
}

async function seedSuperAdminSettings () {
  try {
    const isRecordExist = await superAdminSettings.countDocuments();
    if (isRecordExist){
      console.log('Super admin settings already seeded');
      return;
    }
    const data = {
      salaryList: [
        {
          title: 'Basic',
          value: 50,
        },
        {
          title: 'HRA',
          value: 30,
        },
        {
          title: 'Other Allowances',
          value: 20,
        },
      ],
      note: 'The salary mentioned above includes only the Basic, HRA, and Other Allowances components. It reflects the actual paid days in the month. Loss of Pay (LOP) for 15 days has been accounted for in the calculation. This is a system-generated payslip and does not require a signature.'
    };
    await superAdminSettings.create(data);
    console.info('Super admin settings seeded 🍺');
  } catch (error) {
    console.log('Super admin settings failed due to ', error.message);
  }
}
async function seedLocation () {
  try {
    await countries.insertMany(country);
    await state.insertMany(stateJson);
    console.info('Country and state seeded 🍺');
  } catch (error) {
    console.log('User seeder failed due to ', error.message);
  }
}
/* seeds roles */
async function seedRole () {
  try {
    const roles = ['SUPER_ADMIN', 'SUPER_ADMIN', 'EMPLOYEE', 'TEAM_LEAD', 'HR'];
    const insertedRoles = await dbService.findMany(Role, { code: { $in: roles.map((role) => role.toUpperCase()) }, });
    const rolesToInsert = [];
    roles.forEach((role) => {
      if (
        !insertedRoles.find(
          (insertedRole) => insertedRole.code === role.toUpperCase()
        )
      ) {
        rolesToInsert.push({
          name: role,
          code: role.toUpperCase(),
          weight: 1,
        });
      }
    });
    if (rolesToInsert.length) {
      const result = await dbService.create(Role, rolesToInsert);
      if (result) console.log('Role seeded 🍺');
      else console.log('Role seeder failed!');
    } else {
      console.log('Role is upto date 🍺');
    }
  } catch (error) {
    console.log('Role seeder failed due to ', error.message);
  }
}

/* seeds routes of project */
async function seedProjectRoutes (routes) {
  try {
    if (routes && routes.length) {
      let routeName = '';
      const dbRoutes = await dbService.findMany(ProjectRoute, {});
      let routeArr = [];
      let routeObj = {};
      routes.forEach((route) => {
        routeName = `${replaceAll(route.path.toLowerCase(), '/', '_')}`;
        route.methods.forEach((method) => {
          routeObj = dbRoutes.find(
            (dbRoute) =>
              dbRoute.route_name === routeName && dbRoute.method === method
          );
          if (!routeObj) {
            routeArr.push({
              uri: route.path.toLowerCase(),
              method: method,
              route_name: routeName,
            });
          }
        });
      });
      if (routeArr.length) {
        const result = await dbService.create(ProjectRoute, routeArr);
        if (result) console.info('ProjectRoute model seeded 🍺');
        else console.info('ProjectRoute seeder failed.');
      } else {
        console.info('ProjectRoute is upto date 🍺');
      }
    }
  } catch (error) {
    console.log('ProjectRoute seeder failed due to ', error.message);
  }
}

/* seeds role for routes */
async function seedRouteRole () {
  try {
    const routeRoles = [
      {
        route: '/super-admin/user/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/create',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/super-admin/user/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/addbulk',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/super-admin/user/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/list',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/super-admin/user/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/user/:id',
        role: 'EMPLOYEE',
        method: 'GET',
      },
      {
        route: '/super-admin/user/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/user/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/count',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/super-admin/user/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/update/:id',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/partial-update/:id',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/updatebulk',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/softdelete/:id',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/softdeletemany',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/user/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/user/delete/:id',
        role: 'EMPLOYEE',
        method: 'DELETE',
      },
      {
        route: '/super-admin/user/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/user/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/user/deletemany',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/super-admin/user/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/usertokens/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/usertokens/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/usertokens/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/usertokens/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/usertokens/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/usertokens/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/usertokens/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/usertokens/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/usertokens/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/usertokens/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/usertokens/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/usertokens/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/role/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/role/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/role/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/role/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/role/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/role/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/role/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/role/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/role/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/role/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/role/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/role/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/projectroute/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/projectroute/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/projectroute/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/projectroute/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/projectroute/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/projectroute/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/projectroute/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/projectroute/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/projectroute/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/projectroute/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/projectroute/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/projectroute/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/routerole/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/routerole/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/routerole/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/routerole/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/routerole/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/routerole/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/routerole/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/routerole/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/routerole/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/routerole/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/routerole/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/routerole/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/userrole/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/userrole/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/userrole/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/userrole/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/super-admin/userrole/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/super-admin/userrole/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/userrole/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/userrole/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/userrole/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/userrole/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/super-admin/userrole/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/super-admin/userrole/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/create',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/addbulk',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/list',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/user/:id',
        role: 'EMPLOYEE',
        method: 'GET',
      },
      {
        route: '/device/api/v1/user/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/user/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/count',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/update/:id',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/partial-update/:id',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/updatebulk',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/softdelete/:id',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/softdeletemany',
        role: 'EMPLOYEE',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/user/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/user/delete/:id',
        role: 'EMPLOYEE',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/user/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/user/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/deletemany',
        role: 'EMPLOYEE',
        method: 'POST',
      },
      {
        route: '/device/api/v1/user/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/usertokens/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/usertokens/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/usertokens/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/usertokens/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/usertokens/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/usertokens/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/usertokens/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/usertokens/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/usertokens/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/usertokens/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/usertokens/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/usertokens/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/role/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/role/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/role/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/role/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/role/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/role/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/role/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/role/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/role/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/role/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/role/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/role/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/projectroute/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/projectroute/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/projectroute/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/projectroute/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/projectroute/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/projectroute/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/projectroute/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/projectroute/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/projectroute/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/projectroute/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/projectroute/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/projectroute/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/routerole/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/routerole/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/routerole/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/routerole/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/routerole/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/routerole/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/routerole/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/routerole/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/routerole/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/routerole/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/routerole/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/routerole/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/userrole/create',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/userrole/addbulk',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/userrole/list',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/userrole/:id',
        role: 'SUPER_ADMIN',
        method: 'GET',
      },
      {
        route: '/device/api/v1/userrole/count',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
      {
        route: '/device/api/v1/userrole/update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/userrole/partial-update/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/userrole/updatebulk',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/userrole/softdelete/:id',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/userrole/softdeletemany',
        role: 'SUPER_ADMIN',
        method: 'PUT',
      },
      {
        route: '/device/api/v1/userrole/delete/:id',
        role: 'SUPER_ADMIN',
        method: 'DELETE',
      },
      {
        route: '/device/api/v1/userrole/deletemany',
        role: 'SUPER_ADMIN',
        method: 'POST',
      },
    ];
    if (routeRoles && routeRoles.length) {
      const routes = [
        ...new Set(
          routeRoles.map((routeRole) => routeRole.route.toLowerCase())
        ),
      ];
      const routeMethods = [
        ...new Set(routeRoles.map((routeRole) => routeRole.method)),
      ];
      const roles = [
        'SUPER_ADMIN',
        'SUPER_ADMIN',
        'EMPLOYEE',
        'TEAM_LEAD',
        'HR',
      ];
      const insertedProjectRoute = await dbService.findMany(ProjectRoute, {
        uri: { $in: routes },
        method: { $in: routeMethods },
        isActive: true,
        isDeleted: false,
      });
      const insertedRoles = await dbService.findMany(Role, {
        code: { $in: roles.map((role) => role.toUpperCase()) },
        isActive: true,
        isDeleted: false,
      });
      let projectRouteId = '';
      let roleId = '';
      let createRouteRoles = routeRoles.map((routeRole) => {
        projectRouteId = insertedProjectRoute.find(
          (pr) =>
            pr.uri === routeRole.route.toLowerCase() &&
            pr.method === routeRole.method
        );
        roleId = insertedRoles.find(
          (r) => r.code === routeRole.role.toUpperCase()
        );
        if (projectRouteId && roleId) {
          return {
            roleId: roleId.id,
            routeId: projectRouteId.id,
          };
        }
      });
      createRouteRoles = createRouteRoles.filter(Boolean);
      const routeRolesToBeInserted = [];
      let routeRoleObj = {};

      await Promise.all(
        createRouteRoles.map(async (routeRole) => {
          routeRoleObj = await dbService.findOne(RouteRole, {
            routeId: routeRole.routeId,
            roleId: routeRole.roleId,
          });
          if (!routeRoleObj) {
            routeRolesToBeInserted.push({
              routeId: routeRole.routeId,
              roleId: routeRole.roleId,
            });
          }
        })
      );
      if (routeRolesToBeInserted.length) {
        const result = await dbService.create(
          RouteRole,
          routeRolesToBeInserted
        );
        if (result) console.log('RouteRole seeded 🍺');
        else console.log('RouteRole seeder failed!');
      } else {
        console.log('RouteRole is upto date 🍺');
      }
    }
  } catch (error) {
    console.log('RouteRole seeder failed due to ', error.message);
  }
}

/* seeds roles for users */
async function seedUserRole () {
  try {
    const userRoles = [
      {
        username: 'admin',
        password: 'tRGyeP7QRgtYinN',
      },
      {
        username: 'SUPER_ADMIN',
        password: 'zcB7oXQrNxQuNIs',
      },
    ];
    const defaultRoles = await dbService.findMany(Role);
    const insertedUsers = await dbService.findMany(User, { username: { $in: userRoles.map((userRole) => userRole.username) }, });
    let user = {};
    const userRolesArr = [];
    userRoles.map((userRole) => {
      user = insertedUsers.find(
        (user) =>
          user.username === userRole.username &&
          user.isPasswordMatch(userRole.password) &&
          user.isActive &&
          !user.isDeleted
      );
      if (user) {
        if (user.userType === authConstant.USER_TYPES.SUPER_ADMIN) {
          userRolesArr.push({
            userId: user.id,
            roleId: defaultRoles.find((d) => d.code === 'SUPER_ADMIN')._id,
          });
        } else if (user.userType === authConstant.USER_TYPES.SUPER_ADMIN) {
          userRolesArr.push({
            userId: user.id,
            roleId: defaultRoles.find((d) => d.code === 'SUPER_ADMIN')._id,
          });
        } else if (user.userType === authConstant.USER_TYPES.EMPLOYEE) {
          userRolesArr.push({
            userId: user.id,
            roleId: defaultRoles.find((d) => d.code === 'EMPLOYEE')._id,
          });
        } else if (user.userType === authConstant.USER_TYPES.HR) {
          userRolesArr.push({
            userId: user.id,
            roleId: defaultRoles.find((d) => d.code === 'HR')._id,
          });
        } else {
          userRolesArr.push({
            userId: user.id,
            roleId: defaultRoles.find((d) => d.code === 'TEAM_LEAD')._id,
          });
        }
      }
    });
    let userRoleObj = {};
    const userRolesToBeInserted = [];
    if (userRolesArr.length) {
      await Promise.all(
        userRolesArr.map(async (userRole) => {
          userRoleObj = await dbService.findOne(UserRole, {
            userId: userRole.userId,
            roleId: userRole.roleId,
          });
          if (!userRoleObj) {
            userRolesToBeInserted.push({
              userId: userRole.userId,
              roleId: userRole.roleId,
            });
          }
        })
      );
      if (userRolesToBeInserted.length) {
        const result = await dbService.create(UserRole, userRolesToBeInserted);
        if (result) console.log('UserRole seeded 🍺');
        else console.log('UserRole seeder failed');
      } else {
        console.log('UserRole is upto date 🍺');
      }
    }
  } catch (error) {
    console.log('UserRole seeder failed due to ', error.message);
  }
}

async function seedData (allRegisterRoutes) {
  await seedUser();
  await seedRole();
  await seedProjectRoutes(allRegisterRoutes);
  await seedRouteRole();
  await seedUserRole();
  await seedLocation();
}
module.exports = {
  seedData,
  seedSuperAdminSettings ,
  seedDeleteLeaveRecord,
};
