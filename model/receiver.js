/**
 * receiver.js
 * @description :: model of a database collection Receiver
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
    name: {
      type: String,
      required: true 
    },
    phone: {
      type: String,
      default: '' 
    },
    email: {
      type: String,
      default: '' 
    },
    address: {
      type: String,
      default: '' 
    },
    isActive: {
      type: Boolean,
      default: true 
    },
    isDeleted: {
      type: Boolean,
      default: false 
    },
    createdAt: {
      type: Date,
      default: Date.now 
    },
    updatedAt: {
      type: Date,
      default: Date.now 
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null 
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null 
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

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const Receiver = mongoose.model('receiver', schema);

module.exports = Receiver;
