const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const idValidator = require('mongoose-id-validator');
const TaskHistory = require('./taskHistory'); // <-- make sure you import it correctly
const User = require('./user'); // <-- replace with actual path
const Project = require('./project'); // <-- replace with actual path
const Sprint = require('./sprint'); // <-- replace with actual path

const Schema = mongoose.Schema;

async function generateTaskId () {
  const { customAlphabet } = await import('nanoid');
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);
  return nanoid();
}

const taskSchema = new Schema(
  {
    taskId: {
      type: String,
      unique: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'project', 
      default: null,
    },
    sprintId: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint', 
      default: null,
    },
    taskAssigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'user', 
      required: [true, 'Task Assignee is required'],
    },
    taskName: {
      type: String,
      required: [true, 'Task name is required'],
      minlength: [3, 'Task name must be at least 3 characters long'],
      maxlength: [100, 'Task name cannot exceed 100 characters'],
    },
    taskUrl: {
      type: String,
      default: '',
      maxlength: [200, 'Task URL cannot exceed 200 characters'],
    },
    taskPriority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Urgent', 'No Priority'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
    },
    taskType: {
      type: String,
      enum: {
        values: ['Feature', 'Bug', 'Task'],
        message: '{VALUE} is not a valid type',
      },
      default: 'Task',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      validate: {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid start date',
      },
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid end date',
      },
    },
    taskDescription: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Not Started',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
  { timestamps: true }
);

// Auto-generate taskId for new tasks
taskSchema.pre('save', async function (next) {
  this.wasNew = this.isNew;
  if (this.isNew) {
    this.isDeleted = false;
    this.isActive = true;

    let isUnique = false;
    while (!isUnique) {
      const newId = await generateTaskId();
      const existing = await mongoose.models.Task.findOne({ taskId: newId });
      if (!existing) {
        this.taskId = newId;
        isUnique = true;
      }
    }
  }
  next();
});

// Log creation history
taskSchema.post('save', async function (doc) {
  if (doc.wasNew) {
    await TaskHistory.create({
      taskId: doc._id,
      action: 'Created',
      changedBy: doc.addedBy,
    });
  }
});

// Log update history using findOneAndUpdate
taskSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  const taskId = this.getQuery()._id;
  if (!update || !taskId) return next();

  const original = await mongoose.models.Task.findById(taskId).lean();
  if (!original) return next();

  const fieldsToTrack = [
    'projectId', 'sprintId', 'taskAssigneeId', 'taskName', 'taskPriority',
    'taskType', 'startDate', 'endDate', 'taskDescription', 'status',
  ];

  const fieldLabels = {
    projectId: 'Project',
    sprintId: 'Sprint',
    taskAssigneeId: 'Assignee',
    taskName: 'Task Name',
    taskPriority: 'Priority',
    taskType: 'Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    taskDescription: 'Description',
    status: 'Status',
  };

  const updatedBy = update.updatedBy;

  for (const field of fieldsToTrack) {
    if (!update.hasOwnProperty(field)) continue;

    const originalValue = original[field];
    const updatedValue = update[field];

    const stringify = val =>
      val instanceof mongoose.Types.ObjectId ? val.toString() :
        val instanceof Date ? new Date(val).toISOString() :
          typeof val === 'string' && !isNaN(Date.parse(val)) ? new Date(val).toISOString() : // <-- handle string dates
            typeof val === 'boolean' ? val.toString() :
              val ?? '';

    const oldStr = stringify(originalValue);
    const newStr = stringify(updatedValue);

    if (oldStr === newStr) continue;

    let oldValue = originalValue;
    let newValue = updatedValue;
    let action = `${fieldLabels[field]} Changed`;

    // Enrich with full object names
    if (['projectId', 'sprintId', 'taskAssigneeId'].includes(field)) {
      if (field === 'projectId') {
        const oldProject = oldValue ? await Project.findById(oldValue).lean() : null;
        const newProject = newValue ? await Project.findById(newValue).lean() : null;
        oldValue = oldProject?.projectName || null;
        newValue = newProject?.projectName || null;
      }
      if (field === 'sprintId') {
        const oldSprint = oldValue ? await Sprint.findById(oldValue).lean() : null;
        const newSprint = newValue ? await Sprint.findById(newValue).lean() : null;
        oldValue = oldSprint?.sprintName || null;
        newValue = newSprint?.sprintName || null;
      }
      if (field === 'taskAssigneeId') {
        const oldUser = oldValue ? await User.findById(oldValue).lean() : null;
        const newUser = newValue ? await User.findById(newValue).lean() : null;
        oldValue = oldUser ? `${oldUser.firstName} ${oldUser.lastName}` : null;
        newValue = newUser ? `${newUser.firstName} ${newUser.lastName}` : null;
      }
    }

    await TaskHistory.create({
      taskId,
      field,
      action,
      oldValue,
      newValue,
      changedBy: updatedBy,
    });
  }
  next();
});

// Pre-insertMany for bulk task creation
taskSchema.pre('insertMany', async function (next, docs) {
  if (docs && docs.length) {
    for (let index = 0; index < docs.length; index++) {
      const element = docs[index];
      element.isDeleted = false;
      element.isActive = true;

      let isUnique = false;
      while (!isUnique) {
        const newId = await generateTaskId();
        const existing = await mongoose.models.Task.findOne({ taskId: newId });
        if (!existing) {
          element.taskId = newId;
          isUnique = true;
        }
      }
    }
  }
  next();
});

taskSchema.plugin(mongoosePaginate);
taskSchema.plugin(idValidator);

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
