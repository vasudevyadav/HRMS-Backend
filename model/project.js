const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const idValidator = require('mongoose-id-validator');
const crypto = require('crypto');

// Define custom labels for pagination
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

// Set custom labels for pagination
mongoosePaginate.paginate.options = { customLabels: myCustomLabels };

const Schema = mongoose.Schema;

// Define the project schema
const projectSchema = new Schema(
  {
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      minlength: [3, 'Project name must be at least 3 characters long'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    projectOwner: {
      type: Schema.Types.ObjectId,
      ref: 'user', // Ensure this matches the actual model name
      required: [true, 'Project owner is required'],
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
    },
    projectStatus: {
      type: String,
      enum: ['Planned', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
      default: 'Planned',
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Urgent', 'No Priority'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'Medium',
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
    projectMembers: [{
      type: Schema.Types.ObjectId,
      ref: 'user', // Ensure this matches the actual model name
    }],
    privacy: {
      type: String,
      enum: {
        values: ['Public', 'Private'],
        message: '{VALUE} is not a valid privacy level',
      },
      default: 'Public',
    },
    key: {
      type: String,
      unique: true,
      minlength: [2, 'Key must be at least 2 characters long'],
      maxlength: [5, 'Key cannot exceed 5 characters'],
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
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

// Function to generate a unique key based on projectName
async function generateUniqueKey (projectName) {
  let key;
  let isUnique = false;

  while (!isUnique) {
    // Generate a key based on the projectName
    key = generateKeyFromName(projectName);

    // Check if the key already exists in the database
    const existingProject = await Project.findOne({ key });
    if (!existingProject) {
      isUnique = true; // Key is unique
    } else {
      // Append a random string to the projectName and try again
      projectName = `${projectName}${Math.random().toString(36).substring(2, 4)}`;
    }
  }

  return key;
}

// Function to generate a key from projectName
function generateKeyFromName (projectName) {
  // Create a hash from the projectName
  const hash = crypto.createHash('sha1').update(projectName).digest('hex');

  // Convert the hash to a key with a fixed length
  return hash.substring(0, 5).toUpperCase(); // Adjust length as needed
}

// Pre-save hook to ensure defaults for certain fields
projectSchema.pre('save', async function (next) {
  if (!this.key) {
    this.key = await generateUniqueKey(this.projectName);
  }
  next();
});
// Virtual to get related sprints
projectSchema.virtual('sprints', {
  ref: 'Sprint', // Model to use
  localField: '_id', // Field in the Project model
  foreignField: 'projectId', // Field in the Sprint model that references Project
  justOne: true
});
projectSchema.virtual('clientDetails', {
  ref: 'user', // Reference to the 'user' model
  localField: 'clientId', // The field in this schema that references the user's _id
  foreignField: '_id', // The field in the 'user' collection (referenced collection)
  justOne: true, // Since 'clientId' refers to a single document
});
projectSchema.set('toObject', { virtuals: true });
projectSchema.set('toJSON', { virtuals: true });
// Apply plugins
projectSchema.plugin(mongoosePaginate);
projectSchema.plugin(idValidator);

// Create the Project model
const Project = mongoose.model('project', projectSchema);

module.exports = Project;
