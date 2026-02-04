/**
 * superAdminSettings.js
 * @description :: model of a database collection super admin settings
 */

const mongoose = require('mongoose');
let idValidator = require('mongoose-id-validator');

const Schema = mongoose.Schema;
const schema = new Schema(
  {
    salaryList:[{
      title: {
        type: String,
        default: '',
      },
      value: {
        type: Number,
        default: 0,
      },
    }],
    defaultLeaveQuota: {
      type: Number,
      default:1
    },
    paidHoliday: {
      type: Number,
      default:1
    },
    optioanlPaidHoliday: {
      type: Number,
      default:1
    },
    note: {
      type: String,
      default:''
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
  { timestamps: true, }
);
schema.plugin(idValidator);
const superAdminSettings = mongoose.model('superAdminSettings', schema);
module.exports = superAdminSettings;
