/**
 * invoice.js
 * @description :: model of a database collection invoice
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
    invoiceNumber: {
      type: String,
      required: true,
      default: '' 
    },
    
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },

    to: {
      type: Schema.Types.ObjectId,
      ref: 'receiver',
      required: true 
    },

    from: {
      name: {
        type: String,
        required: true,
        default: '' 
      },
      phone: {
        type: String,
        default: '' 
      },
      address: {
        type: String,
        default: '' 
      },
    },
    currency: {
      code: {
        type: String,
        required: true,
        default: ''
      },
      symbol: { // corrected from "symble"
        type: String,
        default: ''
      },
    },    
    invoiceDate: {
      type: Date,
      default: Date.now 
    },
    dueDate: {
      type: Date,
      default: null 
    },

    items: [
      {
        description: {
          type: String,
          default: '' 
        },
        price: {
          type: Number,
          default: 0 
        },
      },
    ],

    subTotal: {
      type: Number,
      default: 0 
    },
    taxAmount: {
      type: Number,
      default: 0 
    },
    totalAmount: {
      type: Number,
      default: 0 
    },
    convertedTotalAmount: {
      type: Number,
      default: 0 
    },

    accountDetails: {
      accountName: {
        type: String,
        required: true,
        default: '' 
      },
      accountNumber: {
        type: String,
        default: '' 
      },
      bankName: {
        type: String,
        default: '' 
      },
      ifscCode: {
        type: String,
        default: '' 
      },
      panNumber: {
        type: String,
        default: '' 
      },
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'patily refund'],
      default: 'pending',
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

schema.pre('insertMany', async function (next, docs) {
  if (docs?.length) {
    docs.forEach(doc => {
      doc.isDeleted = false;
      doc.isActive = true;
    });
  }
  next();
});
schema.virtual('clientDetails', {
  ref: 'user', // Reference to the 'user' model
  localField: 'clientId', // The field in this schema that references the user's _id
  foreignField: '_id', // The field in the 'user' collection (referenced collection)
  justOne: true, // Since 'clientId' refers to a single document
});
schema.set('toObject', { virtuals: true });
schema.set('toJSON', { virtuals: true });
schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const Invoice = mongoose.model('Invoice', schema);

module.exports = Invoice;
