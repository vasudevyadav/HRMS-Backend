/**
 * holiday.js
 * @description :: model of a database collection holiday
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
let idValidator = require('mongoose-id-validator');

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
const schema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'user',  // Assuming 'user' is the related model
      default: null,
    },
    title: {
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
    colorCode: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'holiday',
    },
    holidayType: {
      type: String,
      enum: ['MULTIPLE', 'SINGLE', 'HALF_DAY'],
      default: 'SINGLE',
    },
    description: {
      type: String,
      default: '',
    },    
    optional: {
      type: Boolean,
      default: false,
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

const holiday = mongoose.model('holiday', schema);
module.exports = holiday;
