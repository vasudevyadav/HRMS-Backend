/**
 * applyJob.js
 * @description :: model of a database collection applyJob
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
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'job',
      required:true,
    },
    fullName: {
      type: String,
      required: true,
    },
    emailAddress: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    fileData: {
      type: String,
      required: true,
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

// Define the virtual for job details
schema.virtual('jobDetails', {
  ref: 'job', // Reference to the job model
  localField: 'jobId', // The job's _id in the Job collection
  foreignField: '_id', // The jobId field in the applyJob collection
  justOne: true, // Set to true to get a single document
});

// Set options to include virtuals in JSON and object responses
schema.set('toObject', { virtuals: true });
schema.set('toJSON', { virtuals: true });

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const applyJob = mongoose.model('applyJob', schema);
module.exports = applyJob;
