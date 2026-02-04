const user = require('../../model/user');
const {
  generateStrongPassword,
  cryptoFUN,
  validateNumbers,
} = require('../../helpers/function');
const dbService = require('../../utils/dbService');
const userRoleSchemaKey = require('../../utils/validation/userRoleValidation');
const validation = require('../../utils/validateRequest');
const { sendEmailWithAttachment } = require('../../helpers/mailer');
const { sendEmail } = require('../../helpers/emailService');

const {
  API, API_PREFIX, USER_TYPES
} = require('../../constants/authConstant');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

async function checkIfExists(where, id) {
  if (id) where._id = { $ne: id };
  return !!(await dbService.findOne(user, where));
}

async function updateDetails(requestParam, foundUser, stepNumber, updateData) {
  if (!foundUser.completedStep.split(',').includes(stepNumber)) {
    updateData.stepNumber = stepNumber;
    updateData.completedStep = foundUser.completedStep
      ? `${foundUser.completedStep},${stepNumber}`
      : stepNumber;
  }
  return !!(await dbService.updateOne(
    user,
    { _id: requestParam.id },
    updateData,
    { new: true }
  ));
}

exports.createEmployee = async (req, res, next) => {
  try {
    const {
      id, employeeCode, primaryNumber, primaryEmail, stepNumber, departmentName, userRole
    } =
      req.body;
    if (!stepNumber)
      return res.badRequest({ message: 'stepNumber is required.' });

    if (stepNumber === '1') {
      if (!employeeCode || !primaryNumber || !primaryEmail || !departmentName || !userRole) {
        return res.badRequest({ message: 'employeeCode, primaryNumber, primaryEmail, departmentName, userRole are required.', });
      }

      const checks = [
        {
          field: 'employeeCode',
          value: employeeCode,
        },
        {
          field: 'primaryNumber',
          value: primaryNumber,
        },
        {
          field: 'primaryEmail',
          value: primaryEmail,
        },
      ];

      for (const check of checks) {
        if (await checkIfExists({ [check.field]: check.value }, id)) {
          return res.failure({ message: `${check.field} already exists` });
        }
      }
    } else {
      const foundUser = await dbService.findOne(
        user,
        { _id: id },
        {
          stepNumber: 1,
          completedStep: 1,
        }
      );
      if (!foundUser)
        return res.recordNotFound({ message: 'Employee not found...' });

      const updateData = {};
      let requiredFields;
      let attribute;

      if (stepNumber === '2') {
        attribute =
          'currentAddressLine1 currentAddressLine2 currentCountryId currentStateId currentPincode currentCityName sameAsCurrentAddress permanentAddressLine1 permanentAddressLine2 permanentCountryId permanentStateId permanentPincode permanentCityName';
        requiredFields = [
          'currentAddressLine1',
          'currentCountryName',
          'currentStateName',
          'currentPincode',
          'id',
        ];
        Object.assign(updateData, {
          currentAddressLine1: req.body.currentAddressLine1,
          currentAddressLine2: req.body.currentAddressLine2,
          currentCountryId: req.body.currentCountryName._id,
          currentStateId: req.body.currentStateName._id,
          currentPincode: req.body.currentPincode,
          currentCityName: req.body.currentCityName,
          sameAsCurrentAddress: req.body.sameAsCurrentAddress,
          permanentAddressLine1: req.body.sameAsCurrentAddress
            ? req.body.currentAddressLine1
            : req.body.permanentAddressLine1,
          permanentAddressLine2: req.body.sameAsCurrentAddress
            ? req.body.currentAddressLine2
            : req.body.permanentAddressLine2,
          permanentCountryId: req.body.sameAsCurrentAddress
            ? req.body.currentCountryName._id
            : req.body.permanentCountryName._id,
          permanentStateId: req.body.sameAsCurrentAddress
            ? req.body.currentStateName._id
            : req.body.permanentStateName._id,
          permanentPincode: req.body.sameAsCurrentAddress
            ? req.body.currentPincode
            : req.body.permanentPincode,
          permanentCityName: req.body.sameAsCurrentAddress
            ? req.body.currentCityName
            : req.body.permanentCityName,
        });
      } else if (stepNumber === '3') {
        attribute = 'esiNumber pfNumber perMonthSalary monthYearSalary';
        requiredFields = [
          'esiNumber',
          'pfNumber',
          'perMonthSalary',
          'monthYearSalary',
          'id',
        ];
        Object.assign(updateData, {
          esiNumber: req.body.esiNumber,
          pfNumber: req.body.pfNumber,
          perMonthSalary: req.body.perMonthSalary,
          monthYearSalary: req.body.monthYearSalary,
        });

        const checkESI = await validateNumbers(req.body.esiNumber, '');
        if (!checkESI.isESIValid)
          return res.failure({ message: 'Invalid ESI number.' });

        const checkPF = await validateNumbers('', req.body.pfNumber);
        if (!checkPF.isPFValid)
          return res.failure({ message: 'Invalid PF number.' });
      } else if (stepNumber === '4') {
        attribute = 'bankName accountHolderName accountNumber ifscCode branch';
        requiredFields = [
          'bankName',
          'accountHolderName',
          'accountNumber',
          'ifscCode',
          'branch',
          'id',
        ];
        Object.assign(updateData, {
          bankName: req.body.bankName,
          accountHolderName: req.body.accountHolderName,
          accountNumber: req.body.accountNumber,
          ifscCode: req.body.ifscCode,
          branch: req.body.branch,
        });
      } else if (stepNumber === '5') {
        attribute = 'document';
        requiredFields = ['document', 'id'];
        Object.assign(updateData, { document: req.body.document });
      }
      for (const field of requiredFields) {
        if (!req.body[field])
          return res.badRequest({ message: `${field} is required.` });
      }

      const updateStatus = await updateDetails(
        req.body,
        foundUser,
        stepNumber,
        updateData
      );
      if (!updateStatus) return res.failure({ message: 'Update failed' });
      const lastData = await user.findOne({ _id: id }, attribute).populate('currentCountryId', 'countryName')
        .populate('permanentCountryId', 'countryName')
        .populate('currentStateId', 'stateName')
        .populate('permanentStateId', 'stateName');
      return res.success({
        message: `${stepNumber} Details Updated Successfully`,
        data: { lastData },
      });
    }

    const dataToCreate = {
      ...req.body,
      primaryEmail: cryptoFUN(primaryEmail.toLowerCase(), 'encrypt'),
      secondaryEmail: req.body.secondaryEmail
        ? cryptoFUN(req.body.secondaryEmail.toLowerCase(), 'encrypt')
        : undefined,
      primaryNumber: cryptoFUN(primaryNumber, 'encrypt'),
      secondaryNumber: req.body.secondaryNumber
        ? cryptoFUN(req.body.secondaryNumber, 'encrypt')
        : undefined,
    };
    dataToCreate.departmentId = dataToCreate.departmentName._id;
    dataToCreate.departmentName = dataToCreate.departmentName.departmentName;
    dataToCreate.maritalStatus = dataToCreate.maritalStatus.label;
    dataToCreate.religion = dataToCreate.religion.label;
    dataToCreate.castCategory = dataToCreate.castCategory.label;
    dataToCreate.userType = dataToCreate.userRole._id;
    if (userRole._id == 1) {
      return res.recordNotFound({ message: 'Invalid user role' });
    }
    let messageType, token, lastData;

    if (id) {
      const foundUser = await dbService.findOne(user, { _id: id });
      if (!foundUser)
        return res.recordNotFound({ message: 'Employee not found...' });

      const updatedUser = await dbService.updateOne(
        user,
        { _id: id },
        dataToCreate
      );
      if (!updatedUser) return res.recordNotFound();

      lastData = await user.findOne({ _id: id }).populate('currentCountryId', 'countryName')
        .populate('permanentCountryId', 'countryName')
        .populate('currentStateId', 'stateName')
        .populate('permanentStateId', 'stateName')
        .populate('departmentId', 'departmentName');
      messageType = 'update';
      token = id;
    } else {
      const password = generateStrongPassword(8);
      dataToCreate.password = cryptoFUN(password, 'encrypt');
      dataToCreate.stepNumber = 1;
      dataToCreate.completedStep = 1;

      const newEmployee = await dbService.create(user, dataToCreate);
      if (newEmployee) {
        lastData = await user.findOne({ _id: newEmployee.id }).populate('currentCountryId', 'countryName')
          .populate('permanentCountryId', 'countryName')
          .populate('currentStateId', 'stateName')
          .populate('permanentStateId', 'stateName')
          .populate('departmentId', 'departmentName');
        messageType = 'Add';
        token = newEmployee.id;
      }
    }
    lastData.primaryEmail = cryptoFUN(
      lastData.primaryEmail,
      'decrypt'
    );
    lastData.secondaryEmail = lastData.secondaryEmail
      ? cryptoFUN(lastData.secondaryEmail, 'decrypt')
      : undefined;
    lastData.primaryNumber = cryptoFUN(
      lastData.primaryNumber,
      'decrypt'
    );
    lastData.secondaryNumber = lastData.secondaryNumber
      ? cryptoFUN(lastData.secondaryNumber, 'decrypt')
      : undefined;
    delete lastData.password;
    lastData.userRole = lastData.userType;
    return res.success({
      message: `1 Details Added Successfully`,
      data: {
        messageType,
        token,
        lastData,
      },
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getEmployeeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.', });
    }
    let where = { _id: id };
    const _obj = await user
      .findOne(where)
      .select(
        '-resetPasswordLink -isDeleted -addedBy -updatedBy -recoveryCode -linkExpiryTime -linkStatus -loginRetryLimit -loginReactiveTime -updatedAt'
      )
      .populate('currentCountryId', 'countryName')
      .populate('permanentCountryId', 'countryName')
      .populate('currentStateId', 'stateName')
      .populate('permanentStateId', 'stateName')
      .populate('departmentId', 'departmentName')
      .exec();
    if (_obj) {
      const getData = _obj.toJSON();
      getData.primaryEmail = cryptoFUN(getData.primaryEmail, 'decrypt');
      getData.secondaryEmail = getData.secondaryEmail
        ? cryptoFUN(getData.secondaryEmail, 'decrypt')
        : undefined;
      getData.primaryNumber = cryptoFUN(getData.primaryNumber, 'decrypt');
      getData.secondaryNumber = getData.secondaryNumber
        ? cryptoFUN(getData.secondaryNumber, 'decrypt')
        : undefined;
      getData.password = getData.password
        ? cryptoFUN(getData.password, 'decrypt')
        : undefined;

      getData.userRole = getData.userType;
      return res.success({ data: getData });
    } else {
      return res.recordNotFound({ message: 'Employee data not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.', });
    }
    let where = { _id: id };
    let getData = await user.findOne(where);
    if (getData) {
      await dbService.updateOne(
        user,
        { _id: id },
        { isActive: !getData.isActive },
      );

      getData = await user.findOne(where, {
        firstName: 1,
        lastName: 1,
        employeeCode: 1,
        designation: 1,
        departmentName: 1,
        primaryNumber: 1,
        primaryEmail: 1,
        isActive: 1,
        userType: 1
      }).populate('departmentId', 'departmentName');
      getData.primaryNumber = cryptoFUN(getData.primaryNumber, 'decrypt');
      getData.primaryEmail = cryptoFUN(getData.primaryEmail, 'decrypt');
      return res.success({ data: getData });
    } else {
      return res.recordNotFound({ message: 'Employee data not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { userProfile } = req.body;
    if (!id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.', });
    }
    const getData = await dbService.updateOne(
      user,
      { _id: id },
      { userProfile },
    );
    return res.success({ data: getData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getEmployeePageList = async (req, res) => {
  try {
    let options = {};
    let query = {};
    let validateRequest = validation.validateFilterWithJoi(
      req.body,
      userRoleSchemaKey.findFilterKeys,
      user.schema.obj
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `${validateRequest.message}` });
    }
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.search) {
      // Using regex to search across multiple fields
      const searchTerm = req.body.search;
      query.$or = [
        {
          departmentName: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
        {
          firstName: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
        {
          lastName: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
        {
          employeeCode: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
        {
          designation: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
        {
          primaryNumber: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
      ];
    }
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(user, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }
    if (query.userType && ![1, 5].includes(query.userType)) {
      query.userType = query.userType; // show only if it's not 1 or 5
    } else {
      query.userType = { $nin: [1, 5] }; // exclude 1 and 5
    }
    if (!options.populate) {
      options.populate = [];
    }

    options.populate.push({
      path: 'departmentId',
      select: 'departmentName',
    });
    options.sort = { employeeCode: 1 };

    options.projection = {
      departmentName: 1,
      firstName: 1,
      lastName: 1,
      employeeCode: 1,
      designation: 1,
      primaryNumber: 1,
      isActive: 1,
      userType: 1,
      dateOfJoining: 1,
      primaryEmail: 1,
    };
    let foundUserRoles = await dbService.paginate(user, query, options);
    if (!foundUserRoles || !foundUserRoles.data || !foundUserRoles.data.length) {
      return res.recordNotFound();
    }
    foundUserRoles.data.forEach((employee) => {
      employee.primaryNumber = employee.primaryNumber
        ? cryptoFUN(employee.primaryNumber, 'decrypt')
        : '';
      employee.primaryEmail = employee.primaryEmail
        ? cryptoFUN(employee.primaryEmail, 'decrypt')
        : '';
    });
    return res.success({ data: foundUserRoles });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }

};

exports.sendCredentialMail = async (req, res, next) => {
  try {
    const {
      toEmail, empId
    } = req.body;

    if (!empId || !toEmail) {
      return res.badRequest({ message: 'empId and toEmail are required.', });
    }
    const where = { _id: empId };
    let found = await dbService.findOne(user, where);
    if (!found) {
      return res.recordNotFound({ message: 'Email not found.' });
    }
    if (found.isActive == 0) {
      return res.failure({ message: 'You are blocked by Admin, Please contact to Admin.', });
    }
    if (found.userType == 1) {
      return res.failure({ message: 'You have not access .', });
    }

    const userRoute = Object.entries(USER_TYPES).find(([key, value]) => value === found.userType);
    const apiRoute = `${API_PREFIX[userRoute[0]]}`;
    const primaryEmail = cryptoFUN(found.primaryEmail.toLowerCase(), 'decrypt');
    const password = cryptoFUN(found.password.toLowerCase(), 'decrypt');

    const templatePath = path.join(__dirname, '../../views/templates/sendCredentials.ejs');
    const htmlTemplate = await ejs.render(fs.readFileSync(templatePath, 'utf8'), {
      username: found.firstName ? `${found.firstName} ${found.lastName}` : 'User',
      url: `${process.env.FRONT_URL}${apiRoute}/sign-in`,
      userEmail: primaryEmail,
      password,
    });
    const mailOptions = {
      from: process.env.EMAIL_HOST_USER,
      to: toEmail,
      subject: `Gohash HRMS Panel Access Credentials`,
      html: htmlTemplate,
    };

    // Send email
    await sendEmail(mailOptions);

    return res.success({ message: `Credentials sent successfully to ${toEmail}` });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
