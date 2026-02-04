const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const idValidator = require('mongoose-id-validator');
const Schema = mongoose.Schema;

const taskHistorySchema = new Schema({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    default: null, // e.g. "status", "taskName"
  },
  oldValue: {
    type: Schema.Types.Mixed,
    default: null,
  },
  newValue: {
    type: Schema.Types.Mixed,
    default: null,
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
}, { timestamps: true });

taskHistorySchema.plugin(mongoosePaginate);
taskHistorySchema.plugin(idValidator);

module.exports = mongoose.model('TaskHistory', taskHistorySchema);
