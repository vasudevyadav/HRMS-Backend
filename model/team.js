/**
 * team.js
 * @description :: model of a database collection team
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
/*
 * const teamMemberSchema = new Schema({
 *   employeeId: {
 *     type: Schema.Types.ObjectId,
 *     ref: 'user',
 *     required: true,
 *   },
 *   name: {
 *     type: String,
 *     default:''
 *   },
 * });
 */
const schema = new Schema(
  {
    teamName: {
      type: String,
      required: true,
    },
    reportingManager: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    teamMemberList: {
      type: [Schema.Types.ObjectId],
      ref: 'user',
      default: [],
    },
    type: {
      type: String,
      enum: ['PRIVATE', 'PUBLIC'],
      default: 'PRIVATE',
      required: true,
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

const team = mongoose.model('team', schema);
module.exports = team;
