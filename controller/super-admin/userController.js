/**
 * userController.js
 * @description : exports action methods for user.
 */

const User = require('../../model/user');
const SuperAdminSettings = require('../../model/superAdminSettings');
const userSchemaKey = require('../../utils/validation/userValidation');
const validation = require('../../utils/validateRequest');
const dbService = require('../../utils/dbService');
const ObjectId = require('mongodb').ObjectId;
const auth = require('../../services/auth');
const deleteDependentService = require('../../utils/deleteDependent');
const utils = require('../../utils/common');
const { USER_TYPES } = require('../../constants/authConstant');
const { cryptoFUN } = require('../../helpers/function');
const { sendEmail } = require('../../helpers/emailService');
const {
  attendance, leave,
  department, holiday
} = require('../../model');
const salaryRecordModel = require('../../model/salary-record.model');
const ExcelJS = require('exceljs');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { generatePdfFromEjs } = require('../../middleware/pdfGenerator');
const { emailQueue } = require('../../queues/emailQueue');
const START_MONTH = 5;  // May
const START_YEAR = 2025;

/**
 * @description : get information of logged-in User.
 * @param {Object} req : authentication token is required
 * @param {Object} res : Logged-in user information
 * @return {Object} : Logged-in user information {status, message, data}
 */
const getLoggedInUserInfo = async (req, res) => {
  try {
    const query = {
      _id: req.user.id,
      isDeleted: false
    };
    query.isActive = true;
    let foundUser = await dbService.findOne(User, query);
    if (!foundUser) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : create document of User in mongodb collection.
 * @param {Object} req : request including body for creating document.
 * @param {Object} res : response of created document
 * @return {Object} : created User. {status, message, data}
 */
const addUser = async (req, res) => {
  try {
    let dataToCreate = { ...req.body || {} };
    let validateRequest = validation.validateParamsWithJoi(
      dataToCreate,
      userSchemaKey.schemaKeys);
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    dataToCreate.addedBy = req.user.id;
    dataToCreate = new User(dataToCreate);
    let createdUser = await dbService.create(User, dataToCreate);
    return res.success({ data: createdUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : create multiple documents of User in mongodb collection.
 * @param {Object} req : request including body for creating documents.
 * @param {Object} res : response of created documents.
 * @return {Object} : created Users. {status, message, data}
 */
const bulkInsertUser = async (req, res) => {
  try {
    if (req.body && (!Array.isArray(req.body.data) || req.body.data.length < 1)) {
      return res.badRequest();
    }
    let dataToCreate = [...req.body.data];
    for (let i = 0; i < dataToCreate.length; i++) {
      dataToCreate[i] = {
        ...dataToCreate[i],
        addedBy: req.user.id
      };
    }
    let createdUsers = await dbService.create(User, dataToCreate);
    createdUsers = { count: createdUsers ? createdUsers.length : 0 };
    return res.success({ data: { count: createdUsers.count || 0 } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : find all documents of User from collection based on query and options.
 * @param {Object} req : request including option and query. {query, options : {page, limit, pagination, populate}, isCountOnly}
 * @param {Object} res : response contains data found from collection.
 * @return {Object} : found User(s). {status, message, data}
 */
const findAllUser = async (req, res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      userSchemaKey.findFilterKeys,
      User.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    query._id = { $ne: req.user.id };
    if (req.body && req.body.query && req.body.query._id) {
      query._id.$in = [req.body.query._id];
    }
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(User, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    let foundUsers = await dbService.paginate(User, query, options);
    if (!foundUsers || !foundUsers.data || !foundUsers.data.length) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUsers });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : find document of User from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains document retrieved from table.
 * @return {Object} : found User. {status, message, data}
 */
const getUser = async (req, res) => {
  try {
    let query = {};
    if (!ObjectId.isValid(req.params.id)) {
      return res.validationError({ message: 'invalid objectId.' });
    }
    query._id = req.params.id;
    let options = {};
    let foundUser = await dbService.findOne(User, query, options);
    if (!foundUser) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUser });
  }
  catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : returns total number of documents of User.
 * @param {Object} req : request including where object to apply filters in req body 
 * @param {Object} res : response that returns total number of documents.
 * @return {Object} : number of documents. {status, message, data}
 */
const getUserCount = async (req, res) => {
  try {
    let where = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      userSchemaKey.findFilterKeys,
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.where === 'object' && req.body.where !== null) {
      where = { ...req.body.where };
    }
    let countedUser = await dbService.count(User, where);
    return res.success({ data: { count: countedUser } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : update document of User with data by id.
 * @param {Object} req : request including id in request params and data in request body.
 * @param {Object} res : response of updated User.
 * @return {Object} : updated User. {status, message, data}
 */
const updateUser = async (req, res) => {
  try {
    let dataToUpdate = {
      ...req.body,
      updatedBy: req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = {
      _id: {
        $eq: req.params.id,
        $ne: req.user.id
      }
    };
    let updatedUser = await dbService.updateOne(User, query, dataToUpdate);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : update multiple records of User with data by filter.
 * @param {Object} req : request including filter and data in request body.
 * @param {Object} res : response of updated Users.
 * @return {Object} : updated Users. {status, message, data}
 */
const bulkUpdateUser = async (req, res) => {
  try {
    let filter = req.body && req.body.filter ? { ...req.body.filter } : {};
    let dataToUpdate = {};
    delete dataToUpdate['addedBy'];
    if (req.body && typeof req.body.data === 'object' && req.body.data !== null) {
      dataToUpdate = {
        ...req.body.data,
        updatedBy: req.user.id
      };
    }
    let updatedUser = await dbService.updateMany(User, filter, dataToUpdate);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: { count: updatedUser } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : partially update document of User with data by id;
 * @param {obj} req : request including id in request params and data in request body.
 * @param {obj} res : response of updated User.
 * @return {obj} : updated User. {status, message, data}
 */
const partialUpdateUser = async (req, res) => {
  try {
    if (!req.params.id) {
      res.badRequest({ message: 'Insufficient request parameters! id is required.' });
    }
    delete req.body['addedBy'];
    let dataToUpdate = {
      ...req.body,
      updatedBy: req.user.id,
    };
    let validateRequest = validation.validateParamsWithJoi(
      dataToUpdate,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    const query = {
      _id: {
        $eq: req.params.id,
        $ne: req.user.id
      }
    };
    let updatedUser = await dbService.updateOne(User, query, dataToUpdate);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : deactivate document of User from table by id;
 * @param {Object} req : request including id in request params.
 * @param {Object} res : response contains updated document of User.
 * @return {Object} : deactivated User. {status, message, data}
 */
const softDeleteUser = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.' });
    }
    const query = {
      _id: {
        $eq: req.params.id,
        $ne: req.user.id
      }
    };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedUser = await deleteDependentService.softDeleteUser(query, updateBody);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : delete document of User from table.
 * @param {Object} req : request including id as req param.
 * @param {Object} res : response contains deleted document.
 * @return {Object} : deleted User. {status, message, data}
 */
const deleteUser = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.' });
    }
    const query = {
      _id: {
        $eq: req.params.id,
        $ne: req.user.id
      }
    };
    let deletedUser;
    if (req.body.isWarning) {
      deletedUser = await deleteDependentService.countUser(query);
    } else {
      deletedUser = await deleteDependentService.deleteUser(query);
    }
    if (!deletedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: deletedUser });
  }
  catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : delete documents of User in table by using ids.
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains no of documents deleted.
 * @return {Object} : no of documents deleted. {status, message, data}
 */
const deleteManyUser = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = {
      _id: {
        $in: ids,
        $ne: req.user.id
      }
    };
    let deletedUser;
    if (req.body.isWarning) {
      deletedUser = await deleteDependentService.countUser(query);
    }
    else {
      deletedUser = await deleteDependentService.deleteUser(query);
    }
    if (!deletedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: deletedUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : deactivate multiple documents of User from table by ids;
 * @param {Object} req : request including array of ids in request body.
 * @param {Object} res : response contains updated documents of User.
 * @return {Object} : number of deactivated documents of User. {status, message, data}
 */
const softDeleteManyUser = async (req, res) => {
  try {
    let ids = req.body.ids;
    if (!ids || !Array.isArray(ids) || ids.length < 1) {
      return res.badRequest();
    }
    const query = {
      _id: {
        $in: ids,
        $ne: req.user.id
      }
    };
    const updateBody = {
      isDeleted: true,
      updatedBy: req.user.id,
    };
    let updatedUser = await deleteDependentService.softDeleteUser(query, updateBody);
    if (!updatedUser) {
      return res.recordNotFound();
    }
    return res.success({ data: updatedUser });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : change password
 * @param {Object} req : request including user credentials.
 * @param {Object} res : response contains updated user document.
 * @return {Object} : updated user document {status, message, data}
 */
const changePassword = async (req, res) => {
  try {
    let params = req.body;
    if (!req.user.id || !params.newPassword || !params.oldPassword) {
      return res.validationError({ message: 'Please Provide userId, new Password and Old password' });
    }
    let result = await auth.changePassword({
      ...params,
      userId: req.user.id
    });
    if (result.flag) {
      return res.failure({ message: result.data });
    }
    return res.success({ message: result.data });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : update user profile.
 * @param {Object} req : request including user profile details to update in request body.
 * @param {Object} res : updated user document.
 * @return {Object} : updated user document. {status, message, data}
 */
const updateProfile = async (req, res) => {
  try {
    let data = req.body;
    let validateRequest = validation.validateParamsWithJoi(
      data,
      userSchemaKey.updateSchemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}` });
    }
    delete data.password;
    delete data.createdAt;
    delete data.updatedAt;
    if (data.id) delete data.id;
    let result = await dbService.updateOne(User, { _id: req.user.id }, data, { new: true });
    if (!result) {
      return res.recordNotFound();
    }
    return res.success({ data: result });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.validationError({ message: `Invalid Data, Validation Failed at ${error.message}` });
    }
    if (error.code && error.code === 11000) {
      return res.validationError({ message: 'Data duplication found.' });
    }
    return res.internalServerError({ message: error.message });
  }
};
const updateSalaryQuota = async (req, res) => {
  try {
    let data = req.body;
    if (req.user.userType !== 1) {
      return res.unAuthorized();
    }
    if (!data.salaryList?.length) {
      return res.validationError({ message: `Invalid values in parameters, salaryList required` });
    }
    const total = data.salaryList.reduce((sum, item) => sum + Number(item.value), 0);

    if (total !== 100) {
      return res.validationError({ message: 'Invalid values in parameters, salaryList total must equal 100' });
    }
    let result = await dbService.updateOne(SuperAdminSettings, { _id: data._id }, data, { new: true });
    if (!result) {
      return res.recordNotFound();
    }
    return res.success({ data: result });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.validationError({ message: `Invalid Data, Validation Failed at ${error.message}` });
    }
    return res.internalServerError({ message: error.message });
  }
};
const updateLeaveQuota = async (req, res) => {
  try {
    let data = req.body;
    if (req.user.userType !== 1) {
      return res.unAuthorized();
    }
    if (!data.defaultLeaveQuota) {
      return res.validationError({ message: `Invalid values in parameters, defaultLeaveQuota required` });
    }
    let result = await dbService.updateOne(SuperAdminSettings, { _id: data._id }, {
      defaultLeaveQuota: Number(data.defaultLeaveQuota),
      paidHoliday: Number(data.paidHoliday),
      optioanlPaidHoliday: Number(data.optioanlPaidHoliday),
      note: data.note
    }, { new: true });
    if (!result) {
      return res.recordNotFound();
    }
    return res.success({ data: result });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.validationError({ message: `Invalid Data, Validation Failed at ${error.message}` });
    }
    return res.internalServerError({ message: error.message });
  }
};
const getQuotaDetails = async (req, res) => {
  try {
    let data = req.body;
    let result = await dbService.findOne(SuperAdminSettings);
    if (!result) {
      return res.recordNotFound();
    }
    return res.success({ data: result });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.validationError({ message: `Invalid Data, Validation Failed at ${error.message}` });
    }
    return res.internalServerError({ message: error.message });
  }
};

const bulkUpdateEmployeeSalaries = async (req, res) => {
  try {
    let data = req.body;
    if (req.user.userType !== 1) {
      return res.unAuthorized();
    }

    const bulkOps = data.map(user => ({
      updateOne: {
        filter: {
          _id: user._id,
          type: USER_TYPES.EMPLOYEE
        },
        update: { $set: { currentBasicSalary: user.basicSalary } },
      },
    }));

    /*
     * const bulkOps = data.salaryUpdates.map(({
     * _id, basicSalary, effectiveFrom, remark 
     * }) => ({
     * updateOne: {
     *  filter: {
     *    _id,
     *    type: USER_TYPES.EMPLOYEE 
     *  },
     *  update: {
     *    $set: { currentBasicSalary: basicSalary },
     *    $push: {
     *      salaryHistory: {
     *        basicSalary,
     *        effectiveFrom,
     *        remarks: remark || '',
     *      },
     *    },
     *  },
     * },
     * })); 
     */

    if (bulkOps.length > 0) {
      const result = await User.bulkWrite(bulkOps);
      return res.success({ data: result });
    } else {
      console.log('No salary updates to perform.');
      return res.recordNotFound({ message: 'No salary updates to perform' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

function getWorkingDays (start, end) {
  let count = 0;
  let current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // Exclude Saturday & Sunday
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function isNextMonth (lastMonth, lastYear, targetMonth, targetYear) {
  if (lastMonth === 12) {
    return Number(targetMonth) === 1 && Number(targetYear) === lastYear + 1;
  } else {
    return Number(targetMonth) === lastMonth + 1 && Number(targetYear) === lastYear;
  }
}

const getEmployeeSalaryData = async (req, res) => {
  try {
    const {
      month, year
    } = req.body.query;
    const {
      page, limit
    } = req.body.options;
    const { search } = req.body;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    const effectiveEndDate = isCurrentMonth ? today : endDate;
    const totalDays = endDate.getDate();
    const workingDays = getWorkingDays(startDate, endDate);
    const holidayData = await holiday.find({
      isDeleted: false,
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        }
      ]
    }).lean();
    let holidays = 0;
    let workingHolidays = 0;
    for (const holiday of holidayData) {
      const start = new Date(Math.max(new Date(holiday.startDate), startDate));
      const end = new Date(Math.min(new Date(holiday.endDate || holiday.startDate), endDate));
      // +1 to include the end date as well
      const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      holidays += diffDays;

      const diffHolidayDays = getWorkingDays(holiday.startDate, holiday.endDate);
      workingHolidays += diffHolidayDays;
    }
    
    const settings = await SuperAdminSettings.findOne();
    const defaultLeaveQuota = settings?.defaultLeaveQuota ?? 1;

    const skip = (page - 1) * limit;

    const whereMatched = {
      userType: { $nin: [USER_TYPES.SUPER_ADMIN, USER_TYPES.CLIENT] },
      isDeleted: false,
      isActive: true,
      currentBasicSalary: { $gt: 0 }, // Add this line
    };
    if (search && search.trim() !== '') {
      whereMatched.$or = [
        {
          firstName: {
            $regex: search,
            $options: 'i' 
          } 
        },
        {
          lastName: {
            $regex: search,
            $options: 'i' 
          } 
        },
        {
          employeeCode: {
            $regex: search,
            $options: 'i' 
          } 
        },
      ];
    }
    const [employees, totalEmployees] = await Promise.all([
      User.find(whereMatched).skip(skip).limit(limit).lean(),
      User.countDocuments(whereMatched),
    ]);
    // console.log('employees',JSON.stringify(employees));

    const paginatedData = await Promise.all(

      employees.map(async (employee) => {
        const where = {
          userId: employee._id,
          salaryMonth: month,
          salaryYear: year,
        };
        const employeeSalaryData = await salaryRecordModel.findOne(where).lean();
        if (employeeSalaryData) {
          const decryptedEmail = cryptoFUN(employee?.primaryEmail || '', 'decrypt');
          return {
            employeeId: employeeSalaryData.userId,
            ...employeeSalaryData.data,
            EmployeeEmail: decryptedEmail,
            isApproved: employeeSalaryData.isApproved
          };
        } else {
          const [attendances, leaves] = await Promise.all([
            attendance.find({
              userId: employee._id,
              checkInTime: {
                $gte: startDate,
                $lte: effectiveEndDate
              },
            }),
            leave.find({
              employeeId: employee._id,
              leaveStatus: 1,
              startDate: { $lte: effectiveEndDate },
              endDate: { $gte: startDate },
            }),
          ]);

          const presentDays = attendances.length;

          // Count leave days
          let leaveDays = 0;
          for (const leaveItem of leaves) {
            const from = new Date(Math.max(leaveItem.startDate.getTime(), startDate.getTime()));
            const to = new Date(Math.min(leaveItem.endDate.getTime(), effectiveEndDate.getTime()));

            if (leaveItem.leaveType === 1) {
              leaveDays += 0.5;
            } else if (leaveItem.leaveType === 2) {
              if (from.getDay() !== 0 && from.getDay() !== 6) leaveDays += 1;
            } else if (leaveItem.leaveType === 3) {
              for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
                const day = d.getDay();
                if (day !== 0 && day !== 6) leaveDays++;
              }
            }
          }

          const absentDays = Math.max(workingDays - presentDays - workingHolidays - leaveDays, 0);
          const salaryRecord = (employee.salaryHistory || [])
            .filter((record) => new Date(record.effectiveFrom) <= endDate)
            .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];

          const basicSalary = salaryRecord?.basicSalary ?? employee.currentBasicSalary;
          const perDaySalary = Math.round(basicSalary / workingDays);

          let earned = defaultLeaveQuota;
          let used = 0;
          let previous = 0;
          let carryForward = 0;
          let unpaidLeave = 0;
          if (!isCurrentMonth) {
            const history = (employee.leaveBalanceHistory || []).find(
              (h) => h.month === month && h.year === year
            );
            if (history) {
              earned = history?.earned ?? defaultLeaveQuota;
              used = history?.used ?? 0;
              previous = history?.previous ?? 0;
              carryForward = history?.carryForward ?? 0;

              const totalLeaveAndAbsent = leaveDays + absentDays;
              unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
            } else {
              previous = employee.carryForwardLeave ?? 0;
              earned = defaultLeaveQuota;
              const totalPaidLeave = previous + earned;
              const totalLeaveAndAbsent = leaveDays + absentDays;
              used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
              unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
              carryForward = totalPaidLeave - used;
  
              // ⛔️ Block any month earlier than May 2025
              if (year < START_YEAR || (year === START_YEAR && month < START_MONTH)) {
                console.log('False updating condition');
              } else {
                const latest = employee.leaveBalanceHistory.at(-1);
                const isSequential = latest
                  ? isNextMonth(latest.month, latest.year, month, year)
                  : month === START_MONTH && year === START_YEAR; // allow only May 2025 as first record

                if (isSequential || !latest) {
                  await User.updateOne(
                    { _id: employee._id },
                    {
                      $set: { carryForwardLeave: carryForward },
                      $push: {
                        leaveBalanceHistory: {
                          month,
                          year,
                          earned,
                          used,
                          previous,
                          carryForward,
                        },
                      },
                    }
                  );
                }
              }
            }
          } else {
            previous = employee.carryForwardLeave ?? 0;
            const totalPaidLeave = previous + earned;
            const totalLeaveAndAbsent = leaveDays + absentDays;
            used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
            unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
            carryForward = totalPaidLeave - used;
          }

          const totalUnpaid = isCurrentMonth ? unpaidLeave : Math.max(leaveDays + absentDays - used, 0);
          const deduction = Math.round(perDaySalary * totalUnpaid);
          const totalSalary = Math.round(basicSalary - deduction);

          let salaryBreakdown = {};
          if (Array.isArray(settings.salaryList) && settings.salaryList.length) {
            settings.salaryList.forEach((item) => {
              salaryBreakdown[item.title] = Math.round((item.value / 100) * basicSalary);
            });
          }
          return {
            employeeId: employee._id,
            EmployeeName: `${employee.firstName} ${employee.lastName}`,
            EmployeeCode: employee.employeeCode,
            EmployeeEmail: cryptoFUN(employee.primaryEmail, 'decrypt'),
            TotalDays: totalDays,
            WorkingDays: workingDays,
            Present: presentDays,
            Absent: absentDays,
            Leave: leaveDays,
            holidays: workingHolidays,
            leaveDetails: {
              previous,
              earned,
              used,
              carryForward,
            },
            TotalSalary: totalSalary,
            salaryDetails: {
              actualSalary: basicSalary,
              perDaySalary,
              deduction,
              final: totalSalary,
            },
            salaryBreakdown
          };
        }
      })
    );

    const paginator = {
      itemCount: totalEmployees,
      perPage: limit,
      currentPage: page,
      pageCount: Math.ceil(totalEmployees / limit),
      slNo: skip + 1,
      hasNextPage: page * limit < totalEmployees,
      hasPrevPage: page > 1,
    };

    return res.success({
      data: {
        paginatedData,
        paginator,
      },
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const employeeSalaryData = async (req, res) => {
  try {
    const {
      employeeId, month, year
    } = req.body;
    const employee = await User.findById(employeeId);

    if (!employee) {
      return res.recordNotFound({ message: 'No user found' });
    }

    const where = {
      userId: employeeId,
      salaryMonth: month,
      salaryYear: year,
    };
    const employeeSalaryData = await salaryRecordModel.findOne(where).lean();
    if (employeeSalaryData) {
      return res.success({ data: employeeSalaryData });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    const effectiveEndDate = isCurrentMonth ? today : endDate;
    const totalDays = endDate.getDate();
    const workingDays = getWorkingDays(startDate, endDate);

    // Calculate Holiday Days
    const holidayData = await holiday.find({
      isDeleted: false,
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        }
      ]
    }).lean();
    let holidays = 0;
    let workingHolidays = 0;
    for (const holiday of holidayData) {
      const start = new Date(Math.max(new Date(holiday.startDate), startDate));
      const end = new Date(Math.min(new Date(holiday.endDate || holiday.startDate), endDate));
      // +1 to include the end date as well
      const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      holidays += diffDays;

      const diffHolidayDays = getWorkingDays(holiday.startDate, holiday.endDate);
      workingHolidays += diffHolidayDays;
    }

    const settings = await SuperAdminSettings.findOne();
    const defaultLeaveQuota = settings?.defaultLeaveQuota ?? 1;

    const [attendances, leaves] = await Promise.all([
      attendance.find({
        userId: employeeId,
        checkInTime: {
          $gte: startDate,
          $lte: effectiveEndDate
        },
      }),
      leave.find({
        employeeId: employeeId,
        leaveStatus: 1,
        startDate: { $lte: effectiveEndDate },
        endDate: { $gte: startDate },
      }),
    ]);

    const presentDays = attendances.length;
    let leaveDays = 0;
    for (const leaveItem of leaves) {
      const from = new Date(Math.max(leaveItem.startDate.getTime(), startDate.getTime()));
      const to = new Date(Math.min(leaveItem.endDate.getTime(), effectiveEndDate.getTime()));

      if (leaveItem.leaveType === 1) {
        leaveDays += 0.5;
      } else if (leaveItem.leaveType === 2) {
        if (from.getDay() !== 0 && from.getDay() !== 6) leaveDays += 1;
      } else if (leaveItem.leaveType === 3) {
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const day = d.getDay();
          if (day !== 0 && day !== 6) leaveDays++;
        }
      }
    }

    const absentDays = Math.max(workingDays - presentDays - workingHolidays - leaveDays, 0);
    const salaryRecord = (employee.salaryHistory || [])
      .filter((record) => new Date(record.effectiveFrom) <= endDate)
      .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];

    const basicSalary = salaryRecord?.basicSalary ?? employee.currentBasicSalary;
    const perDaySalary = Math.round(basicSalary / workingDays);

    let earned = defaultLeaveQuota;
    let used = 0;
    let previous = 0;
    let carryForward = 0;
    let unpaidLeave = 0;

    if (!isCurrentMonth) {
      const history = (employee.leaveBalanceHistory || []).find(
        (h) => h.month === month && h.year === year
      );
      if (history) {
        earned = history?.earned ?? defaultLeaveQuota;
        used = history?.used ?? 0;
        previous = history?.previous ?? 0;
        carryForward = history?.carryForward ?? 0;

        const totalLeaveAndAbsent = leaveDays + absentDays;
        unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
      } else {
        previous = employee.carryForwardLeave ?? 0;
        earned = defaultLeaveQuota;
        const totalPaidLeave = previous + earned;
        const totalLeaveAndAbsent = leaveDays + absentDays;
        used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
        unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
        carryForward = totalPaidLeave - used;
      }
    } else {
      previous = employee.carryForwardLeave ?? 0;
      const totalPaidLeave = previous + earned;
      const totalLeaveAndAbsent = leaveDays + absentDays;
      used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
      unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
      carryForward = totalPaidLeave - used;
    }

    const totalUnpaid = isCurrentMonth ? unpaidLeave : Math.max(leaveDays + absentDays - used, 0);
    const deduction = Math.round(perDaySalary * totalUnpaid);
    const totalSalary = Math.round(basicSalary - deduction);

    let salaryBreakdown = {};
    if (Array.isArray(settings.salaryList) && settings.salaryList.length) {
      settings.salaryList.forEach((item) => {
        salaryBreakdown[item.title] = Math.round((item.value / 100) * basicSalary);
      });
    }

    const finalData = {
      EmployeeName: `${employee.firstName} ${employee.lastName}`,
      EmployeeCode: employee.employeeCode,
      TotalDays: totalDays,
      WorkingDays: workingDays,
      Present: presentDays,
      Absent: absentDays,
      Leave: leaveDays,
      holidays: workingHolidays,
      leaveDetails: {
        previous,
        earned,
        used,
        carryForward,
      },
      TotalSalary: totalSalary,
      salaryDetails: {
        actualSalary: basicSalary,
        perDaySalary,
        deduction,
        final: totalSalary,
      },
      salaryBreakdown,
      note: settings?.note ?? ''
    };

    return res.success({ data: finalData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const submitEmployeeSalaryRecord = async (req, res) => {
  try {
    const {
      employeeId, month, year, salaryData
    } = req.body;
    if (!employeeId || !month || !year || !salaryData) {
      throw new Error('Missing required parameters to upsert salary record.');
    }
    const result = await salaryRecordModel.findOneAndUpdate(
      {
        userId: employeeId,
        salaryMonth: month,
        salaryYear: year,
      },
      { $set: { data: salaryData, } },
      {
        new: true,
        upsert: true,
      }
    );
    return res.success({ data: result });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const exportEmployeeSalaryData = async (req, res) => {
  try {
    const {
      month, year
    } = req.params;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    const effectiveEndDate = isCurrentMonth ? today : endDate;
    const totalDays = endDate.getDate();
    const workingDays = getWorkingDays(startDate, endDate);

    const settings = await SuperAdminSettings.findOne();
    const defaultLeaveQuota = settings?.defaultLeaveQuota ?? 1;

    const whereMatched = {
      userType: { $nin: [USER_TYPES.SUPER_ADMIN, USER_TYPES.CLIENT] },
      isDeleted: false,
      isActive: true,
      currentBasicSalary: { $gt: 0 }, // Add this line
    };
    const employees = await User.find(whereMatched).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Salary_${month}_${year}`);

    // Excel Columns
    sheet.columns = [
      {
        header: 'Sr No.',
        key: 'sr',
        width: 10
      },
      {
        header: 'Employee Name',
        key: 'name',
        width: 25
      },
      {
        header: 'Total Days',
        key: 'totalDays',
        width: 12
      },
      {
        header: 'Working Days',
        key: 'workingDays',
        width: 15
      },
      {
        header: 'Present Days',
        key: 'present',
        width: 15
      },
      {
        header: 'Absent Days',
        key: 'absent',
        width: 15
      },
      {
        header: 'Leave Details',
        key: 'leaveData',
        width: 30
      },
      {
        header: 'Basic Salary',
        key: 'basic',
        width: 15
      },
      {
        header: 'Per Day Salary',
        key: 'perDay',
        width: 15
      },
      {
        header: 'Deduction',
        key: 'deduction',
        width: 15
      },
      {
        header: 'Final Salary',
        key: 'final',
        width: 15
      },
    ];
    let sr = 1;
    for (const employee of employees) {
      const [attendances, leaves] = await Promise.all([
        attendance.find({
          userId: employee._id,
          checkInTime: {
            $gte: startDate,
            $lte: effectiveEndDate
          },
        }),
        leave.find({
          employeeId: employee._id,
          leaveStatus: 1,
          startDate: { $lte: effectiveEndDate },
          endDate: { $gte: startDate },
        }),
      ]);

      const presentDays = attendances.length;
      // Count leave days
      let leaveDays = 0;
      for (const leaveItem of leaves) {
        const from = new Date(Math.max(leaveItem.startDate.getTime(), startDate.getTime()));
        const to = new Date(Math.min(leaveItem.endDate.getTime(), effectiveEndDate.getTime()));

        if (leaveItem.leaveType === 1) {
          leaveDays += 0.5;
        } else if (leaveItem.leaveType === 2) {
          if (from.getDay() !== 0 && from.getDay() !== 6) leaveDays += 1;
        } else if (leaveItem.leaveType === 3) {
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) leaveDays++;
          }
        }
      }

      const absentDays = Math.max(workingDays - presentDays - leaveDays, 0);
      const salaryRecord = (employee.salaryHistory || [])
        .filter((record) => new Date(record.effectiveFrom) <= endDate)
        .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];

      const basicSalary = salaryRecord?.basicSalary ?? employee.currentBasicSalary;
      const perDaySalary = Math.round(basicSalary / workingDays);

      let earned = defaultLeaveQuota;
      let used = 0;
      let previous = 0;
      let carryForward = 0;
      let unpaidLeave = 0;

      if (!isCurrentMonth) {
        const history = (employee.leaveBalanceHistory || []).find(
          (h) => h.month === month && h.year === year
        );
        if (history) {
          earned = history?.earned ?? defaultLeaveQuota;
          used = history?.used ?? 0;
          previous = history?.previous ?? 0;
          carryForward = history?.carryForward ?? 0;

          const totalLeaveAndAbsent = leaveDays + absentDays;
          unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
        } else {
          previous = employee.carryForwardLeave ?? 0;
          earned = defaultLeaveQuota;
          const totalPaidLeave = previous + earned;
          const totalLeaveAndAbsent = leaveDays + absentDays;
          used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
          unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
          carryForward = totalPaidLeave - used;
        }
      } else {
        previous = employee.carryForwardLeave ?? 0;
        const totalPaidLeave = previous + earned;
        const totalLeaveAndAbsent = leaveDays + absentDays;
        used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
        unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
        carryForward = totalPaidLeave - used;
      }
      const totalUnpaid = isCurrentMonth ? unpaidLeave : Math.max(leaveDays + absentDays - used, 0);
      const deduction = Math.round(perDaySalary * totalUnpaid);
      const totalSalary = Math.round(basicSalary - deduction);

      const leaveData = `Previous : ${previous}, Earned : ${earned}, Leave Used: ${used}, Carry Forward : ${carryForward}`;
      // Add to Excel
      sheet.addRow({
        sr: sr,
        name: `${employee.firstName} ${employee.lastName} - (${employee.employeeCode})`,
        totalDays,
        workingDays,
        present: presentDays,
        absent: absentDays,
        leaveData,
        basic: Math.round(basicSalary),
        perDay: Math.round(perDaySalary),
        deduction: Math.round(deduction),
        final: totalSalary,
      });
      sr++;
    }

    /*
     * const exportPath = path.join(__dirname, `../../exports/salary_${month}_${year}.xlsx`);
     * Create export folder if it doesn't exist
     */
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Create the file path
    const exportPath = path.join(exportDir, `salary_${month}_${year}.xlsx`);
    await workbook.xlsx.writeFile(exportPath);

    res.download(exportPath, `Salary_${month}_${year}.xlsx`, (err) => {
      if (err) return res.status(500).send('Could not download file');
      fs.unlinkSync(exportPath); // Clean up after download
    });
  } catch (error) {
    console.error('Export error:', error);
    return res.internalServerError({ message: error.message });
  }
};

const approveEmployeeSalary = async (req, res) => {
  try {
    const {
      employeeId, month, year
    } = req.body;

    if (!employeeId || !month || !year) {
      return res.validationError({ message: `Invalid values employeeId, month & year required` });
    }
    await approveAllAndSendAllEmailAttachment(employeeId, month, year);
    let result = await dbService.updateOne(salaryRecordModel, {
      userId: employeeId,
      salaryMonth: month,
      salaryYear: year
    }, { isApproved: true }, { new: true });

    if (!result) {
      return res.recordNotFound();
    }
    return res.success({ data: result });
  } catch (error) {
    console.error('Export error:', error);
    return res.internalServerError({ message: error.message });
  }
};

const approveAllAndSendAllEmailAttachment = async (employeeId = null, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const effectiveEndDate = isCurrentMonth ? today : endDate;
  const totalDays = endDate.getDate();
  const workingDays = getWorkingDays(startDate, endDate);

  // Calulate Holiday Days
  const holidayData = await holiday.find({
    isDeleted: false,
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      }
    ]
  }).lean();
  let holidays = 0;
  let workingHolidays = 0;
  for (const holiday of holidayData) {
    const start = new Date(Math.max(new Date(holiday.startDate), startDate));
    const end = new Date(Math.min(new Date(holiday.endDate || holiday.startDate), endDate));
    // +1 to include the end date as well
    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    holidays += diffDays;

    const diffHolidayDays = getWorkingDays(holiday.startDate, holiday.endDate);
    workingHolidays += diffHolidayDays;
  }

  const settings = await SuperAdminSettings.findOne();
  const defaultLeaveQuota = settings?.defaultLeaveQuota ?? 1;

  let whereMatched = {
    userType: { $nin: [USER_TYPES.SUPER_ADMIN, USER_TYPES.CLIENT] },
    isDeleted: false,
    isActive: true,
    currentBasicSalary: { $gt: 0 }, // Add this line
  };

  if (employeeId){
    whereMatched = {
      _id: employeeId,
      isDeleted: false,
      isActive: true,
    };
  } 

  const employees = await User.find(whereMatched).lean();

  await Promise.all(employees.map(async (employee) => {
    const where = {
      userId: employee._id,
      salaryMonth: month,
      salaryYear: year,
    };
    const employeeSalaryData = await salaryRecordModel.findOne(where).lean();
    if (!employeeSalaryData) {
      const [attendances, leaves] = await Promise.all([
        attendance.find({
          userId: employee._id,
          checkInTime: {
            $gte: startDate,
            $lte: effectiveEndDate
          },
        }),
        leave.find({
          employeeId: employee._id,
          leaveStatus: 1,
          startDate: { $lte: effectiveEndDate },
          endDate: { $gte: startDate },
        }),
      ]);

      const presentDays = attendances.length;

      // Count leave days
      let leaveDays = 0;
      for (const leaveItem of leaves) {
        const from = new Date(Math.max(leaveItem.startDate.getTime(), startDate.getTime()));
        const to = new Date(Math.min(leaveItem.endDate.getTime(), effectiveEndDate.getTime()));

        if (leaveItem.leaveType === 1) {
          leaveDays += 0.5;
        } else if (leaveItem.leaveType === 2) {
          if (from.getDay() !== 0 && from.getDay() !== 6) leaveDays += 1;
        } else if (leaveItem.leaveType === 3) {
          for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) leaveDays++;
          }
        }
      }

      const absentDays = Math.max(workingDays - presentDays - workingHolidays - leaveDays, 0);
      const salaryRecord = (employee.salaryHistory || [])
        .filter((record) => new Date(record.effectiveFrom) <= endDate)
        .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0]; //[]

      const basicSalary = salaryRecord?.basicSalary ?? employee.currentBasicSalary;
      const perDaySalary = Math.round(basicSalary / workingDays);

      let earned = defaultLeaveQuota;
      let used = 0;
      let previous = 0;
      let carryForward = 0;
      let unpaidLeave = 0;

      previous = employee.carryForwardLeave ?? 0;
      earned = defaultLeaveQuota;
      const totalPaidLeave = previous + earned;
      const totalLeaveAndAbsent = leaveDays + absentDays;
      used = Math.min(totalLeaveAndAbsent, totalPaidLeave);
      unpaidLeave = Math.max(totalLeaveAndAbsent - used, 0);
      carryForward = totalPaidLeave - used;

      const latest = employee.leaveBalanceHistory.at(-1);
      const isSequential = latest
        ? isNextMonth(latest.month, latest.year, month, year)
        : month === START_MONTH && year === START_YEAR; // allow only May 2025 as first record
      if (isSequential || !latest) {
        // Save runtime-calculated leaveBalanceHistory for that past month
        await User.updateOne(
          { _id: employee._id },
          {
            $set: { carryForwardLeave: carryForward },
            $push: {
              leaveBalanceHistory: {
                month,
                year,
                earned,
                used,
                previous,
                carryForward,
              },
            },
          }
        );
      }

      const totalUnpaid = isCurrentMonth ? unpaidLeave : Math.max(leaveDays + absentDays - used, 0);
      const deduction = Math.round(perDaySalary * totalUnpaid);
      const totalSalary = Math.round(basicSalary - deduction);

      let salaryBreakdown = {};
      if (Array.isArray(settings.salaryList) && settings.salaryList.length) {
        settings.salaryList.forEach((item) => {
          salaryBreakdown[item.title] = Math.round((item.value / 100) * basicSalary);
        });
      }

      const salaryRecordData = {
        salaryMonth: month,
        salaryYear: year,
        userId: employee._id,
        isApproved: true,
        data: {
          EmployeeName: `${employee.firstName} ${employee.lastName}`,
          EmployeeCode: employee.employeeCode,
          TotalDays: totalDays,
          WorkingDays: workingDays,
          Present: presentDays,
          Absent: absentDays,
          Leave: leaveDays,
          holidays: workingHolidays,
          leaveDetails: {
            previous,
            earned,
            used,
            carryForward,
          },
          TotalSalary: totalSalary,
          salaryDetails: {
            actualSalary: basicSalary,
            perDaySalary,
            deduction,
            final: totalSalary,
          },
          salaryBreakdown,
          note: settings?.note ?? '',
          grossEarnings: basicSalary,
          totalDeductions: deduction,
          netPayable: totalSalary,
          deductions: [{
            name: 'Leave Deduction',
            amount: deduction
          }],
          payPeriod: `${month} ${year}`,
          isNote: true
        }
      };
      await salaryRecordModel.create(salaryRecordData);
    } else {
      await dbService.updateOne(salaryRecordModel, {
        userId: employee._id,
        salaryMonth: month,
        salaryYear: year
      }, { isApproved: true }, { new: true });
    }
  }));

  return true;
};

const approveAllEmployeeSalary = async (req, res) => {
  try {
    const {
      month: month2, year: year2
    } = req.body;
    const month = Number(month2);
    const year = Number(year2);

    if (!month || !year) {
      return res.validationError({ message: `Invalid values month & year required` });
    }

    // Get current month and year
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const currentYear = today.getFullYear();

    // Calculate previous month and year
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }
    if (month === currentMonth && year === currentYear) {
      return res.failure({ message: 'You can not approved & submit salary for the current month' });
    }

    if (month === previousMonth && year === previousYear) {
      await approveAllAndSendAllEmailAttachment(null, month, year);
      return res.success({ message: `All employee salary submited & approved for ${month} ${year}` });
    } else {
      return res.failure({ message: 'Can only process just the previous month' });
    }
  } catch (error) {
    console.error('Export error:', error);
    return res.internalServerError({ message: error.message });
  }
};

const sendEmailWithAttachment = async (req, res) => {
  try {
    const {
      employeeId, email, month, year
    } = req.body;
    const file = req.file;
    if (!file) {
      return res.failure({ message: 'No file uploaded' });
    }

    const startDate = dayjs(`${year}-${month}-01`).format('DD-MM-YYYY');
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').format('DD-MM-YYYY');
    const employeeData = await User.findById(employeeId).lean();
    const departmentData = await department.findById(employeeData.departmentId).lean();

    const where = {
      userId: employeeId,
      salaryMonth: Number(month),
      salaryYear: Number(year),
    };
    const employeeSalaryData = await salaryRecordModel.findOne(where).lean();
    if (!employeeSalaryData) {
      return res.failure({ message: 'No salary record found.' });
    }

    const templatePath = path.join(__dirname, '../../views/templates/salary-slip-email.ejs');
    const htmlTemplate = await ejs.render(fs.readFileSync(templatePath, 'utf8'), {
      username: employeeData.firstName ? `${employeeData.firstName} ${employeeData.lastName}` : 'User',
      employeeCode: employeeData.employeeCode,
      department: departmentData.departmentName,
      paymentPeriod: `${startDate} - ${endDate}`,
      paymentDate: dayjs(new Date()).format('DD-MM-YYYY'),
      finalAmount: employeeSalaryData?.data?.netPayable
    });

    const mailOptions = {
      from: process.env.EMAIL_HOST_USER,
      to: email,
      subject: `Gohashinclude - ${month} ${year} Salary Slip`,
      html: htmlTemplate,
      attachments: [
        {
          filename: file.originalname,
          path: file.path,
        },
      ],
    };

    // Send email
    await sendEmail(mailOptions);
    // Optionally delete the file after sending
    fs.unlinkSync(file.path);
    return res.success({ message: `Salary slip sent successfully to ${email}` });
  } catch (error) {
    console.error('Export error:', error);
    return res.internalServerError({ message: error.message });
  }
};

const sendAllSalaryAttachments = async (req, res) => {
  try {
    const {
      month: month2, year: year2
    } = req.body;
    const month = Number(month2);
    const year = Number(year2);
    if (!month || !year) {
      return res.validationError({ message: `Invalid values month & year required` });
    }

    const monthName = dayjs().month(month - 1).format('MMMM');
    // Get current month and year
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const currentYear = today.getFullYear();

    // Calculate previous month and year
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }
    if (month == currentMonth && year == currentYear) {
      return res.failure({ message: 'You can not approved & submit salary for the current month' });
    }

    if (month === previousMonth && year === previousYear) {
      await approveAllAndSendAllEmailAttachment(month, year);

      const whereMatched = {
        userType: { $nin: [USER_TYPES.SUPER_ADMIN, USER_TYPES.CLIENT] },
        isDeleted: false,
        isActive: true,
        currentBasicSalary: { $gt: 0 }, // Add this line
      };
      const employees = await User.find(whereMatched).lean();
      await Promise.all(
        employees.map((employee) =>
          emailQueue.add('send-salary-slip', {
            userId: employee._id,
            month,
            year,
          })
        )
      );
      return res.success({ message: `All employee salary submited & approved for ${monthName} ${year}` });
    } else {
      return res.failure({ message: 'Can only process just the previous month' });
    }
  } catch (error) {
    console.error('Export error:', error);
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  getLoggedInUserInfo,
  addUser,
  bulkInsertUser,
  findAllUser,
  getUser,
  getUserCount,
  updateUser,
  bulkUpdateUser,
  partialUpdateUser,
  softDeleteUser,
  deleteUser,
  deleteManyUser,
  softDeleteManyUser,
  changePassword,
  updateProfile,
  updateSalaryQuota,
  updateLeaveQuota,
  getQuotaDetails,
  bulkUpdateEmployeeSalaries,
  getEmployeeSalaryData,
  employeeSalaryData,
  submitEmployeeSalaryRecord,
  exportEmployeeSalaryData,
  approveEmployeeSalary,
  sendEmailWithAttachment,
  approveAllEmployeeSalary,
  sendAllSalaryAttachments
};