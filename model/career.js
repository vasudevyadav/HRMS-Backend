/**
 * career.js
 * @description :: model of a database collection career
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
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'job',
    },
    fullName: {
      type: String,
      default: '',
    },
    emailAddress: {
      type: String,
      default: '',
    },
    totalExperience: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    resumeFileName: {
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
schema.index({ message: 'text' });
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

// Define the virtual for job details
schema.virtual('jobDetails', {
  ref: 'job', 
  localField: 'jobId', 
  foreignField: '_id', 
  justOne: true,
});

// Set options to include virtuals in JSON and object responses
schema.set('toObject', { virtuals: true });
schema.set('toJSON', { virtuals: true });

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const career = mongoose.model('career', schema);
module.exports = career;
