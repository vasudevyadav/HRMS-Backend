const mongoose = require('mongoose');

const SalaryRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true 
  },
  salaryMonth: {
    type: Number,
    required: true 
  }, // 1 = Jan, 12 = Dec
  salaryYear: {
    type: Number,
    required: true 
  },
  data: {
    type: Object,
    required: true 
  }, // entire salary data
  isApproved: {
    type: Boolean,
    default: false
  }, 
}, { timestamps: true });

module.exports = mongoose.model('SalaryRecord', SalaryRecordSchema);
