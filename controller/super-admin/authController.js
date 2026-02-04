/**
 * authController.js
 * @description :: exports authentication methods
 */

const User = require('../../model/user');
const dbService = require('../../utils/dbService');
const {
  userTokens, session 
} = require('../../model');
const dayjs = require('dayjs');
const userSchemaKey = require('../../utils/validation/userValidation');
const validation = require('../../utils/validateRequest');
const authConstant = require('../../constants/authConstant');
const authService = require('../../services/auth');
const common = require('../../utils/common');
const uuid = require('uuid').v4;
const bcrypt = require('bcrypt');
const { cryptoFUN } = require('../../helpers/function');
const DeviceDetector = require('node-device-detector');
const ejs = require('ejs');
const path = require('path');
const { sendEmailWithAttachment } = require('../../helpers/mailer');
const {
  API, API_PREFIX 
} = require('../../constants/authConstant');
const requestIp = require('request-ip');
/**
 * @description : user registration
 * @param {Object} req : request for register
 * @param {Object} res : response for register
 * @return {Object} : response for register {status, message, data}
 */
const register = async (req, res) => {
  try {
    let validateRequest = validation.validateParamsWithJoi(
      req.body,
      userSchemaKey.schemaKeys
    );
    if (!validateRequest.isValid) {
      return res.validationError({ message: `Invalid values in parameters, ${validateRequest.message}`, });
    }
    let isEmptyPassword = false;
    if (!req.body.password) {
      isEmptyPassword = true;
      req.body.password = Math.random().toString(36).slice(2);
    }
    const data = new User({
      ...req.body,
      userType: authConstant.USER_TYPES.SUPER_ADMIN,
    });

    let checkUniqueFields = await common.checkUniqueFieldsInDatabase(
      User,
      ['username', 'email'],
      data,
      'REGISTER'
    );
    if (checkUniqueFields.isDuplicate) {
      return res.validationError({ message: `${checkUniqueFields.value} already exists.Unique ${checkUniqueFields.field} are allowed.`, });
    }

    const result = await dbService.create(User, data);
    if (isEmptyPassword && req.body.email) {
      await authService.sendPasswordByEmail({
        email: req.body.email,
        password: req.body.password,
      });
    }
    if (isEmptyPassword && req.body.mobileNo) {
      await authService.sendPasswordBySMS({
        mobileNo: req.body.mobileNo,
        password: req.body.password,
      });
    }
    return res.success({ data: result });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : login with username and password
 * @param {Object} req : request for login
 * @param {Object} res : response for login
 * @return {Object} : response for login {status, message, data}
 */
const login = async (req, res, next) => {
  try {
    let {
      username, password, deviceIp
    } = req.body;

    console.log('req.body',req.body);
    if (!username || !password) {
      return res.badRequest({
        message:
          'Insufficient request parameters! username and password are required.',
      });
    }

    let roleAccess = false;
    if (req.body.includeRoleAccess) {
      roleAccess = req.body.includeRoleAccess;
    }

    let result = await authService.loginUser(
      username,
      password,
      authConstant.PLATFORM.WEB,
      roleAccess,
      req.userRole
    );

    if (result.flag) {
      return res.badRequest({ message: result.data });
    }

    let where = {
      deviceType: 'PRIMARY',
      userId: result.data._id,
      isActive: true,
    };

    let userSession = await dbService.findOne(session, where);

    const detector = new DeviceDetector();
    const deviceDetails = detector.detect(req.headers['user-agent']);
    /* const userIp = req.ip; // Get the user's IP address */
    // const userIp = requestIp.getClientIp(req); // Get public IP
    const userIp = deviceIp; // Get public IP

    if (!userSession) {
      await dbService.create(session, {
        userId: result.data._id,
        deviceDetails: deviceDetails,
        deviceType: 'PRIMARY',
        isActive: true,
        loginIPs: [userIp],
      });

      return res.success({
        data: result.data,
        message: 'Login Successful. This device is set as primary.',
      });
    } else {
      const isSameDevice =
        JSON.stringify(userSession.deviceDetails) ===
        JSON.stringify(deviceDetails);

      if (isSameDevice && userSession.loginIPs.includes(userIp)) {
        userSession.loginIPs.push(userIp);
        await userSession.save();
        return res.success({
          data: result.data,
          message: 'Login Successful. You can check in from this device.',
        });
      } else {
        if (!isSameDevice){
          await dbService.create(session, {
            userId: result.data._id,
            deviceDetails: deviceDetails,
            isActive: true,
            loginIPs: [userIp],
          });
        }
        return res.success({
          data: result.data,
          message: 'Login Successful. You cannot check in from this device.',
        });
      }
    }
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const token = req.headers.authorization.replace('Bearer ', '') || null;
    if (!token) {
      return res.badRequest({ message: 'Insufficient request parameters! token is required.', });
    }
    let userAuth = await dbService.findOne(userTokens, { token: token });
    if (!userAuth) {
      return res.unAuthorized({ message: 'Invalid token' });
    }
    let where = { _id: userAuth.userId };
    let getData = await dbService.findOne(
      User,
      where,
      // '_id firstName username primaryEmail userType'
    );
    if (getData) {
      if (getData.primaryEmail) {
        getData.primaryEmail = cryptoFUN(getData.primaryEmail, 'decrypt');
      } 
      if (getData.secondaryEmail) {
        getData.secondaryEmail = cryptoFUN(getData.secondaryEmail, 'decrypt');
      } 
      if (getData.primaryNumber) {
        if (getData.userType === authConstant.USER_TYPES.CLIENT){
          getData.primaryNumber = cryptoFUN(getData.primaryNumber, 'decrypt');
        } else {
          getData.primaryNumber = cryptoFUN(getData.primaryNumber, 'decrypt');
        }
      } 
      if (getData.secondaryNumber) {
        getData.secondaryNumber = cryptoFUN(getData.secondaryNumber, 'decrypt');
      }
      getData.password = cryptoFUN(getData.password, 'decrypt');
      return res.success({ data: getData });
    } else {
      return res.recordNotFound({ message: 'User Not Foundd' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : send email or sms to user with OTP on forgot password
 * @param {Object} req : request for forgotPassword
 * @param {Object} res : response for forgotPassword
 * @return {Object} : response for forgotPassword {status, message, data}
 */
const forgotPassword = async (req, res) => {
  const params = req.body;
  try {
    if (!params.email) {
      return res.badRequest({ message: 'Insufficient request parameters! email is required.', });
    }
    let email = params.email.toString().toLowerCase();
    email = cryptoFUN(email, 'encrypt');
    let where = {
      primaryEmail: email,
      userType: req.userRole,
    };
    where.isDeleted = false;
    params.primaryEmail = params.email.toString().toLowerCase();
    let found = await dbService.findOne(User, where);
    if (!found) {
      return res.recordNotFound({ message:'Email not found.' });
    }
    if (found.isActive == 0) {
      return res.failure({ message: 'You are blocked by Admin, Please contact to Admin.', });
    }
    let token = uuid();
    let expires = dayjs();
    expires = expires
      .add(authConstant.FORGOT_PASSWORD_WITH.EXPIRE_TIME, 'minute')
      .toISOString();
    let updateData = {
      recoveryCode: token,
      linkExpiryTime: expires,
      linkStatus: 0,
    };
    await dbService.updateOne(User, { _id: found._id }, updateData);
    const userRoute = Object.entries(authConstant.USER_TYPES).find(([key, value]) => value === req.userRole);
    const apiRoute = `${API_PREFIX[userRoute[0]]}`;
    const htmlContent = await ejs.renderFile(
      path.join('views', 'templates', 'resetPassword.ejs'),
      {
        username: found.firstName ? `${found.firstName} ${found.lastName}` : 'User',
        resetLink: `${process.env.BASE_URL}${apiRoute}/update-password/?id=${updateData.recoveryCode}`
      }
    );

    const emailSent = await sendEmailWithAttachment(params.primaryEmail, 'Password Reset Instructions', htmlContent,'');
   
    if (!emailSent) {
      return res.failure({ message: 'Failed to send the password reset email. Please try again later.' });
    }
    return res.success({
      message:
        ' Please check your inbox. we have sent you the password reset steps.',
      data: { token },
    });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : validate OTP
 * @param {Object} req : request for validateResetPasswordOtp
 * @param {Object} res : response for validateResetPasswordOtp
 * @return {Object} : response for validateResetPasswordOtp  {status, message, data}
 */

const validateResetPassword = async (req, res) => {
  const params = req.body;
  try {
    if (!params.token) {
      return res.badRequest({ message: 'Insufficient request parameters! token is required.', });
    }
    let found = await dbService.findOne(User, {
      recoveryCode: params.token,
      // userType: req.userRole,
    });
    if (!found) {
      return res.failure({
        data:{ type:1 },
        message: 'Invalid Link' 
      });
    }
    if (found.linkExpiryTime) {
      if (dayjs(new Date()).isAfter(dayjs(found.linkExpiryTime))) {
        // link expire
        return res.failure({
          data:{ type : 2 },
          message: 'Your reset password link is expired or invalid',
        });
      }
    }
    return res.success({ message: 'Valid Link' });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/**
 * @description : reset password with code and new password
 * @param {Object} req : request for resetPassword
 * @param {Object} res : response for resetPassword
 * @return {Object} : response for resetPassword {status, message, data}
 */
const resetPassword = async (req, res) => {
  const params = req.body;
  try {
    if (!params.token || !params.newPassword) {
      return res.badRequest({
        message:
          'Insufficient request parameters! token and newPassword is required.',
      });
    }
    const where = {
      userType: req.userRole,
      recoveryCode: params.token,
      isActive: true,
      isDeleted: false,
    };
    let found = await dbService.findOne(User, where);
    if (!found || !found.linkExpiryTime) {
      return res.failure({ message: 'Invalid token' });
    }
    if (dayjs(new Date()).isAfter(dayjs(found.linkExpiryTime))) {
      return res.failure({ message: 'Your reset password link is expired or invalid', });
    }
    let response = await authService.resetPassword(found, params.newPassword);
    if (!response || response.flag) {
      return res.failure({ message: response.data });
    }
    return res.success({ message: response.data });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};

/**
 * @description : logout user
 * @param {Object} req : request for logout
 * @param {Object} res : response for logout
 * @return {Object} : response for logout {status, message, data}
 */
const logout = async (req, res) => {
  try {
    let userToken = await dbService.findOne(userTokens, {
      token: req.headers.authorization.replace('Bearer ', ''),
      userId: req.user.id,
    });
    let updatedDocument = { isTokenExpired: true };
    await dbService.updateOne(
      userTokens,
      { _id: userToken.id },
      updatedDocument
    );
    return res.success({ message: 'Logged Out Successfully' });
  } catch (error) {
    return res.internalServerError({ data: error.message });
  }
};
const changePassword = async (req, res) => {
  try {
    const {
      oldPassword, newPassword 
    } = req.body;
    if (!oldPassword || !newPassword) {
      return res.badRequest({
        message:
          'Insufficient request parameters! oldPassword, newPassword, token is required.',
      });
    }
    const token = req.headers.authorization.replace('Bearer ', '') || null;
    if (!token) {
      return res.badRequest({ message: 'Insufficient request parameters! token is required.', });
    }

    let userAuth = await dbService.findOne(userTokens, { token: token });
    if (!userAuth) {
      return res.failure({ message: 'Invalid token' });
    }

    // Retrieve user record from the database using userAuth.userId
    let userCheck = await dbService.findOne(User, { _id: userAuth.userId });
    if (!userCheck) {
      return res.failure({ message: 'User not found' });
    }
    const { userRole } = req;
    let newUpdatedPassword = '';
    if (userRole == 2 || userRole == 3 || userRole == 4 || userRole == 5) {
      newUpdatedPassword = cryptoFUN(oldPassword, 'encrypt');
      if (newUpdatedPassword != userCheck.password) {
        await dbService.updateOne(
          User,
          {
            _id: userCheck._id,
            isActive: true,
            isDeleted: false,
          },
          { loginRetryLimit: userCheck.loginRetryLimit + 1 }
        );
        return res.failure({ message: 'Old password is incorrect' });
      }
      newUpdatedPassword = cryptoFUN(newPassword, 'encrypt');
    } else {
      const isPasswordMatched = await bcrypt.compare(
        oldPassword,
        userCheck.password
      );
      if (!isPasswordMatched) {
        await dbService.updateOne(
          User,
          {
            _id: userCheck._id,
            isActive: true,
            isDeleted: false,
          },
          { loginRetryLimit: userCheck.loginRetryLimit + 1 }
        );
        return res.failure({ message: 'Old password is incorrect' });
      }
      newUpdatedPassword = await bcrypt.hash(newPassword, 8);
    }
    await dbService.updateOne(
      User,
      { _id: userAuth.userId },
      { password: newUpdatedPassword }
    );
    return res.success({ message: 'Password updated successfully.' });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  validateResetPassword,
  resetPassword,
  logout,
  getUserDetails,
  changePassword,
};
