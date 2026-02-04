/**
 * employeeRequest.js
 * @description :: model of a database collection for work sessions, linked to the session collection
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
let idValidator = require('mongoose-id-validator');

const myCustomLabels = {
  totalDocs: 'itemCount',
  docs: 'data',
  limit: 'perPage',
  page: 'currentPage',
  nextPage: 'prev',
  prevPage: 'prev',
  totalPages: 'pageCount',
  pagingCounter: 'slNo',
  meta: 'paginator',
};
mongoosePaginate.paginate.options = { customLabels: myCustomLabels };
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    title:{
      type: String,
      default: null,
    },
    description:{
      type: String,
      default: null,
    },
    requestStatus: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

/*
 * requestStatus
 * 0 - pending
 * 1 - approved
 * 2 - rejected
 */

schema.pre('save', async function (next) {
  this.isDeleted = false;
  // this.isActive = true;
  next();
});

schema.index({ description: 'text' });

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

const employeeRequest = mongoose.model('employeeRequest', schema);
module.exports = employeeRequest;
