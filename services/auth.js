/**
 * auth.js
 * @description :: functions used in authentication
 */

const User = require('../model/user');
const dbService = require('../utils/dbService');
const userTokens = require('../model/userTokens');
const {
  generateStrongPassword,
  cryptoFUN,
  validateNumbers,
} = require('../helpers/function');

const {
  JWT,
  LOGIN_ACCESS,
  PLATFORM,
  MAX_LOGIN_RETRY_LIMIT,
  LOGIN_REACTIVE_TIME,
  FORGOT_PASSWORD_WITH,
  USER_TYPES,
} = require('../constants/authConstant');
const jwt = require('jsonwebtoken');
const common = require('../utils/common');
const dayjs = require('dayjs');
const bcrypt = require('bcrypt');
const emailService = require('./email');
const smsService = require('./sms');
const ejs = require('ejs');
const uuid = require('uuid').v4;

/**
 * @description : generate JWT token for authentication.
 * @param {Object} user : user who wants to login.
 * @param {string} secret : secret for JWT.
 * @return {string}  : returns JWT token.
 */
const generateToken = async (user, secret) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    secret,
    { expiresIn: JWT.EXPIRES_IN * 60 }
  );
};

/**
 * @description : login user.
 * @param {string} username : username of user.
 * @param {string} password : password of user.
 * @param {string} platform : platform.
 * @param {boolean} roleAccess: a flag to request user`s role access
 * @return {Object} : returns authentication status. {flag, data}
 */
const loginUser = async (
  username,
  password,
  platform,
  roleAccess,
  userRole
) => {
  try {
    username = cryptoFUN(username.toLowerCase(), 'encrypt');
    let where = { $or: [{ username: username }, { primaryEmail: username }] };
    where.isActive = true;
    where.isDeleted = false;
    let user = await dbService.findOne(User, where);
    if (user) {
      if (user.loginRetryLimit >= MAX_LOGIN_RETRY_LIMIT) {
        let now = dayjs();
        if (user.loginReactiveTime) {
          let limitTime = dayjs(user.loginReactiveTime);
          if (limitTime > now) {
            let expireTime = dayjs().add(LOGIN_REACTIVE_TIME, 'minute');
            if (!(limitTime > expireTime)) {
              return {
                flag: true,
                data: `you have exceed the number of limit.you can login after ${common.getDifferenceOfTwoDatesInTime(now, limitTime)}.`,
              };
            }
            await dbService.updateOne(
              User,
              { _id: user.id },
              {
                loginReactiveTime: expireTime.toISOString(),
                loginRetryLimit: user.loginRetryLimit + 1,
              }
            );
            return {
              flag: true,
              data: `you have exceed the number of limit.you can login after ${common.getDifferenceOfTwoDatesInTime(now, expireTime)}.`,
            };
          } else {
            user = await dbService.updateOne(
              User,
              { _id: user.id },
              {
                loginReactiveTime: '',
                loginRetryLimit: 0,
              },
              { new: true }
            );
          }
        } else {
          // send error
          let expireTime = dayjs().add(LOGIN_REACTIVE_TIME, 'minute');
          await dbService.updateOne(
            User,
            {
              _id: user.id,
              isActive: true,
              isDeleted: false,
            },
            {
              loginReactiveTime: expireTime.toISOString(),
              loginRetryLimit: user.loginRetryLimit + 1,
            }
          );
          return {
            flag: true,
            data: `you have exceed the number of limit.you can login after ${common.getDifferenceOfTwoDatesInTime(now, expireTime)}.`,
          };
        }
      }
      if (password) {
        if (userRole == 2 || userRole == 3 || userRole == 4 || userRole == 5) {
          const isPasswordMatched = cryptoFUN(password, 'encrypt');
          if (isPasswordMatched != user.password) {
            await dbService.updateOne(
              User,
              {
                _id: user.id,
                isActive: true,
                isDeleted: false,
              },
              { loginRetryLimit: user.loginRetryLimit + 1 }
            );
            return {
              flag: true,
              data: 'Incorrect Password',
            };
          }
        } else {
          const isPasswordMatched = await bcrypt.compare(
            password,
            user.password
          );
          if (!isPasswordMatched) {
            await dbService.updateOne(
              User,
              {
                _id: user.id,
                isActive: true,
                isDeleted: false,
              },
              { loginRetryLimit: user.loginRetryLimit + 1 }
            );
            return {
              flag: true,
              data: 'Incorrect Password',
            };
          }
        }
      }
      const userData = user.toJSON();
      let token;
      if (!user.userType) {
        return {
          flag: true,
          data: 'You have not been assigned any role',
        };
      }
      if (platform == PLATFORM.WEB) {
        let checkType = false;
        if (userRole == user.userType) {
          checkType = true;
        }
        if (!checkType) {
          return {
            flag: true,
            data: 'You are unable to access this platform',
          };
        }

        token = await generateToken(userData, JWT.USER_SECRET);
      }
      if (platform == PLATFORM.MOBILE) {
        return {
          flag: true,
          data: 'you are unable to access this platform from mobile',
        };
      }
      if (user.loginRetryLimit) {
        await dbService.updateOne(
          User,
          { _id: user.id },
          {
            loginRetryLimit: 0,
            loginReactiveTime: '',
          }
        );
      }
      console.log('token',token);
      let expire = dayjs().add(JWT.EXPIRES_IN, 'second').toISOString();
      await dbService.create(userTokens, {
        userId: user.id,
        token: token,
        tokenExpiredTime: expire,
      });
      let userToReturn = {
        ...userData,
        token,
      };
      if (roleAccess) {
        userToReturn.roleAccess = await common.getRoleAccessData(user.id);
      }
      return {
        flag: false,
        data: userToReturn,
      };
    } else {
      return {
        flag: true,
        data: 'User not exists',
      };
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 * @description : change password.
 * @param {Object} params : object of new password, old password and user`s id.
 * @return {Object}  : returns status of change password. {flag,data}
 */
const changePassword = async (params) => {
  try {
    let password = params.newPassword;
    let oldPassword = params.oldPassword;
    let where = {
      _id: params.userId,
      isActive: true,
      isDeleted: false,
    };
    let user = await dbService.findOne(User, where);
    if (user && user.id) {
      let isPasswordMatch = await user.isPasswordMatch(oldPassword);
      if (!isPasswordMatch) {
        return {
          flag: true,
          data: 'Incorrect old password',
        };
      }
      password = await bcrypt.hash(password, 8);
      let updatedUser = dbService.updateOne(User, where, { password: password, });
      if (updatedUser) {
        return {
          flag: false,
          data: 'Password changed successfully',
        };
      }
      return {
        flag: true,
        data: 'password can not changed due to some error.please try again',
      };
    }
    return {
      flag: true,
      data: 'User not found',
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 * @description : reset password.
 * @param {Object} user : user document
 * @param {string} newPassword : new password to be set.
 * @return {}  : returns status whether new password is set or not. {flag, data}
 */
const resetPassword = async (user, newPassword) => {
  try {
    let where = {
      _id: user.id,
      isActive: true,
      isDeleted: false,
    };
    const dbUser = await dbService.findOne(User, where);
    if (!dbUser) {
      return {
        flag: true,
        data: 'User not found',
      };
    }
    const { userType } = user;
    if (userType == 2 || userType == 3 || userType == 4 || userRole == 5) {
      newPassword = cryptoFUN(newPassword, 'encrypt');
    } else {
      newPassword = await bcrypt.hash(newPassword, 8);
    }
    await dbService.updateOne(User, where, {
      password: newPassword,
      recoveryCode: '',
      linkExpiryTime: null,
      loginRetryLimit: 0,
    });
    return {
      flag: false,
      data: 'Password reset successfully',
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  loginUser,
  changePassword,
  resetPassword,
};
