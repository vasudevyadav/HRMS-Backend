const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const idValidator = require('mongoose-id-validator');

const Schema = mongoose.Schema;

const sprintSchema = new Schema(
  {
    sprintName: {
      type: String,
      required: [true, 'Sprint name is required'],
      minlength: [3, 'Sprint name must be at least 3 characters long'],
      maxlength: [100, 'Sprint name cannot exceed 100 characters'],
    },
    sprintUrl: {
      type: String,
      default: '',
      maxlength: [200, 'Sprint URL cannot exceed 200 characters'],
    },
    sprintDuration: {
      type: String,
      required: [true, 'Sprint duration is required'],
    },
    nonWorkingDays: {
      type: [String], // Array of strings representing non-working days
      default: [],
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
    completionDate: {
      type: Date,
      required: [true, 'Completion date is required'],
      validate: {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid completion date',
      },
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'project', // Ensure this matches the actual model name
      required: [true, 'Project is required'],
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

// Pre-save hook to set defaults
sprintSchema.pre('save', async function (next) {
  if (this.isNew) {
    this.isDeleted = false;
    this.isActive = true;
  }
  next();
});

// Pre-insertMany hook to set defaults for bulk insert
sprintSchema.pre('insertMany', async function (next, docs) {
  if (docs && docs.length) {
    for (let index = 0; index < docs.length; index++) {
      const element = docs[index];
      element.isDeleted = false;
      element.isActive = true;
    }
  }
  next();
});

sprintSchema.plugin(mongoosePaginate);
sprintSchema.plugin(idValidator);

// Create the Sprint model
const Sprint = mongoose.model('Sprint', sprintSchema);

module.exports = Sprint;
