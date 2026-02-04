/**
 * user.js
 * @description :: model of a database collection user
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
let idValidator = require('mongoose-id-validator');
const { USER_TYPES } = require('../constants/authConstant');
const { convertObjectToEnum } = require('../utils/common');

const myCustomLabels = {
  totalDocs: 'itemCount',
  docs: 'data',
  limit: 'perPage',
  page: 'currentPage',
  nextPage: 'next',
  prevPage: 'prev',
  totalPages: 'pageCount',
  pagingCounter: 'slNo',
  meta: 'paginator',
};
mongoosePaginate.paginate.options = { customLabels: myCustomLabels };
const Schema = mongoose.Schema;
const documentSchema = new Schema({
  documentName: { type: String },
  documentFileName: { type: String },
  fileName: { type: String },
});
const schema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'client',
      default: null,
    },
    userProfile: {
      type: String,
      default: '',
    },
    username: {
      type: String,
      default: '',
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    dob: {
      type: Date,
      default: '',
    },
    employeeCode: {
      type: String,
      default: '',
    },
    currentBasicSalary: {
      type: Number,
      default: 0 
    },
    salaryHistory: [
      {
        basicSalary: Number,
        effectiveFrom: Date,
        remarks: String,
      }
    ],
    carryForwardLeave: {
      type: Number,
      default: 0
    },
    leaveBalanceHistory: [{
      month: Number,
      year: Number,
      earned: Number,
      used: Number,
      previous: Number,
      carryForward: Number
    }],
    departmentName: {
      type: String,
      default: '',
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'department',
      default: null,
    },
    designation: {
      type: String,
      default: '',
    },
    aadharNumber: {
      type: String,
      default: '',
    },
    maritalStatus: {
      type: String,
      default: '',
    },
    religion: {
      type: String,
      default: '',
    },
    castCategory: {
      type: String,
      default: '',
    },
    dateOfProfession: {
      type: Date,
      default: null,
    },
    dateOfJoining: {
      type: Date,
      default: null,
    },
    primaryNumber: {
      type: String,
      default: '',
    },
    secondaryNumber: {
      type: String,
      default: '',
    },
    primaryEmail: {
      type: String,
      default: '',
    },
    secondaryEmail: {
      type: String,
      default: '',
    },
    emergencyContactNumber: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      default: '',
    },
    setpNumber: {
      type: Number,
      default: 0,
    },
    completedStep: {
      type: String,
      default: '',
    },
    userType: {
      type: Number,
      default: USER_TYPES.EMPLOYEE,
    },
    currentAddressLine1: {
      type: String,
      default: '',
    },
    currentAddressLine2: {
      type: String,
      default: '',
    },
    currentCityName: {
      type: String,
      default: '',
    },
    currentCountryId: {
      type: Schema.Types.ObjectId,
      ref: 'countries',
      default: null,
    },
    currentStateId: {
      type: Schema.Types.ObjectId,
      ref: 'state',
      default: null,
    },
    currentPincode: {
      type: String,
      default: '',
    },
    sameAsCurrentAddress: {
      type: Boolean,
      default: false,
    },
    permanentAddressLine1: {
      type: String,
      default: '',
    },
    permanentAddressLine2: {
      type: String,
      default: '',
    },
    permanentCityName: {
      type: String,
      default: '',
    },
    permanentCountryId: {
      type: Schema.Types.ObjectId,
      ref: 'countries',
      default: null,
    },
    permanentStateId: {
      type: Schema.Types.ObjectId,
      ref: 'state',
      default: null,
    },
    permanentPincode: {
      type: String,
      default: '',
    },
    esiNumber: {
      type: String,
      default: '',
    },
    pfNumber: {
      type: String,
      default: '',
    },
    perMonthSalary: {
      type: String,
      default: '',
    },
    monthYearSalary: {
      type: String,
      default: '',
    },
    bankName: {
      type: String,
      default: '',
    },
    accountHolderName: {
      type: String,
      default: '',
    },
    accountNumber: {
      type: String,
      default: '',
    },
    ifscCode: {
      type: String,
      default: '',
    },
    branch: {
      type: String,
      default: '',
    },
    githubUrl: {
      type: String,
      default: '',
    },
    linkedinUrl: {
      type: String,
      default: '',
    },
    document: {
      type: [documentSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    recoveryCode: { type: String },
    linkExpiryTime: { type: String },
    linkStatus: { type: Number },

    resetPasswordLink: {
      code: String,
      expireTime: Date,
    },

    loginRetryLimit: {
      type: Number,
      default: 0,
    },

    versions: {
      type: Number,
      default: 1,
    },

    loginReactiveTime: { type: Date },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
);
schema.pre('save', async function (next) {
  this.isDeleted = false;
  this.isActive = true;
  next();
});
schema.index({
  addressLine1: 'text',
  addressLine2: 'text',
  city: 'text',
  permanentAddressLine1: 'text',
  permanentAddressLine2: 'text',
  permanentCity: 'text',
});
schema.pre('insertMany', async function (next, docs) {
  if (docs && docs.length) {
    for (let index = 0; index < docs.length; index++) {
      const element = docs[index];
      element.isDeleted = false;
      element.isActive = true;
    }
  }
  next();
});

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);
const user = mongoose.model('user', schema);
module.exports = user;
