/**
 * authConstant.js
 * @description :: constants used in authentication
 */

const JWT = {
  USER_SECRET: 'myjwtadminsecret',
  EXPIRES_IN: 10000,
};

const USER_TYPES = {
  SUPER_ADMIN: 1,
  EMPLOYEE: 2,
  TEAM_LEAD: 3,
  HR: 4,
  CLIENT: 5,
};
const LEAVE_TYPE = {
  HL: 'Half Day Leave',
  FL: 'Full Day Leave',
  ML: 'Multiple Day Leave',
};
const API = '/api';
const API_PREFIX = {
  SUPER_ADMIN: '/super-admin',
  EMPLOYEE: '/employee',
  HR: '/hr',
  TEAM_LEAD: '/team-lead',
  CLIENT: '/client',
};

const PLATFORM = {
  WEB: 1,
  MOBILE: 2,
};

let LOGIN_ACCESS = {
  [USER_TYPES.SUPER_ADMIN]: [USER_TYPES.SUPER_ADMIN],
  [USER_TYPES.EMPLOYEE]: [USER_TYPES.EMPLOYEE],
  [USER_TYPES.TEAM_LEAD]: [USER_TYPES.TEAM_LEAD],
  [USER_TYPES.HR]: [USER_TYPES.HR],
};

const MAX_LOGIN_RETRY_LIMIT = 100;
const LOGIN_REACTIVE_TIME = 20;

const FORGOT_PASSWORD_WITH = {
  LINK: {
    email: true,
    sms: true,
  },
  EXPIRE_TIME: 20,
};

module.exports = {
  JWT,
  USER_TYPES,
  PLATFORM,
  MAX_LOGIN_RETRY_LIMIT,
  LOGIN_REACTIVE_TIME,
  FORGOT_PASSWORD_WITH,
  LOGIN_ACCESS,
  API_PREFIX,
  API,
  LEAVE_TYPE
};
