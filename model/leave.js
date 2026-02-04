const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
let idValidator = require('mongoose-id-validator');
const { USER_TYPES } = require('../constants/authConstant');
const { convertObjectToEnum } = require('../utils/common');

const leaveTypeNames = {
  1: 'Half Day Leave',
  2: 'Full Day Leave',
  3: 'Multiple Day Leave',
  // Add more mappings as needed
};

const myCustomLabels = {
  totalDocs: 'itemCount',
  docs: 'data',
  limit: 'perPage',
  page: 'currentPage',
  nextPage: 'next',
  prevPage: 'prev',
  prevPage: 'prev',
  totalPages: 'pageCount',
  pagingCounter: 'slNo',
  meta: 'paginator',
};
mongoosePaginate.paginate.options = { customLabels: myCustomLabels };

const Schema = mongoose.Schema;
const schema = new Schema(
  {
    title: {
      type: String,
      default: '',
    },
    leaveType: {
      type: Number,
      default: '',
    },
    leaveTypeName: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    remark: {
      type: String,
      default: '',
    },
    leaveStatus: {
      type: Number,
      default: 0,
    },
    documentName: {
      type: String,
      default: '',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    revertLimit: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
);

// Pre-save hook to set leaveTypeName based on leaveType
schema.pre('save', async function (next) {
  this.isDeleted = false;
  this.isActive = true;

  // Set leaveTypeName based on leaveType
  if (this.leaveType && leaveTypeNames[this.leaveType]) {
    this.leaveTypeName = leaveTypeNames[this.leaveType];
  } else {
    this.leaveTypeName = ''; // Set to default if not found in mapping
  }

  next();
});

schema.index({ description: 'text' });

schema.pre('insertMany', async function (next, docs) {
  if (docs && docs.length) {
    for (let index = 0; index < docs.length; index++) {
      const element = docs[index];
      element.isDeleted = false;
      element.isActive = true;

      // Set leaveTypeName based on leaveType
      if (element.leaveType && leaveTypeNames[element.leaveType]) {
        element.leaveTypeName = leaveTypeNames[element.leaveType];
      } else {
        element.leaveTypeName = ''; // Set to default if not found in mapping
      }
    }
  }
  next();
});

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const leave = mongoose.model('leave', schema);
module.exports = leave;
