/**
 * job.js
 * @description :: model of a database collection job
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const idValidator = require('mongoose-id-validator');

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
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    employmentTypes: [
      { type: String, }
    ],
    role: {
      type: String,
      required: true,
    },
    skills: [
      { type: String, }
    ],
    workingSchedule: [
      { type: String, }
    ],
    locations: [
      { type: String, }
    ],
    expiredDate: {
      type: Date,
      required: true,
    },
    salary: {
      price: {
        type: Number,
        required: true,
      },
      type: { type: String, },
      negotiable: {
        type: Boolean,
        default: false,
      },
    },
    benefits: [
      { type: String, }
    ],
    experience: {
      type: String,
      required: true,
    },
    publishStatus: {
      type: Boolean,
      default: true,
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

schema.pre('save', function (next) {
  if (this.isNew) {
    this.isDeleted = false;
    this.isActive = true;
  }
  next();
});

schema.pre('insertMany', function (next, docs) {
  if (docs && docs.length) {
    docs.forEach(doc => {
      doc.isDeleted = false;
      doc.isActive = true;
    });
  }
  next();
});
schema.virtual('applyJobCount', {
  ref: 'applyJob', // Reference to the applyJob model
  localField: '_id', // The job's _id in the Job collection
  foreignField: 'jobId', // The jobId field in applyJob collection
  count: true // Get count of related documents instead of documents themselves
});
schema.set('toObject', { virtuals: true });
schema.set('toJSON', { virtuals: true });

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const job = mongoose.model('job', schema);
module.exports = job;
