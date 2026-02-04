const {
  invoice, client
} = require('../../model');
const dbService = require('../../utils/dbService');
const mongoose = require('mongoose');

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const userData = req['user-data'];

    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const where = {
      _id: id,
      isDeleted: false,
      clientId:userData.clientId
    };
    let invoiceData = await invoice.findOne(where);

    if (!invoiceData) {
      return res.recordNotFound({ message: 'Invoice not found' });
    }

    const newStatus = invoiceData.status === 'paid' ? 'unpaid' : 'paid';
    await dbService.updateOne(invoice, { _id: id }, { status: newStatus });

    invoiceData = await invoice.findOne(where);

    return res.success({
      data: invoiceData,
      message: `Invoice status updated to ${newStatus} successfully.`
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getInvoiceDetails = async (req, res) => {
  try {
    const userData = req['user-data'];

    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }
    const invoiceData = await invoice.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false,
          clientId:userData._id
        }
      },
      {
        $lookup: {
          from: 'receivers',
          localField: 'to',
          foreignField: '_id',
          as: 'receiverDetails'
        }
      },
      {
        $unwind: {
          path: '$receiverDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users', // Target collection (user model)
          localField: 'clientId', // Field in 'client' collection
          foreignField: '_id', // Field in 'user' collection
          as: 'clientDetails'
        }
      },
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $project: {
          updatedAt: 0,
          isDeleted: 0,
          addedBy: 0,
          updatedBy: 0,
          'receiverDetails.isActive': 0,
          'receiverDetails.isDeleted': 0,
          'receiverDetails.createdAt': 0,
          'receiverDetails.updatedAt': 0,
          'receiverDetails.addedBy': 0,
          'receiverDetails.updatedBy': 0,
          'receiverDetails.__v': 0,
          'clientDetails.isActive': 0,
          'clientDetails.isDeleted': 0,
          'clientDetails.createdAt': 0,
          'clientDetails.updatedAt': 0,
          'clientDetails.addedBy': 0,
          'clientDetails.updatedBy': 0,
          'clientDetails.__v': 0,
          'clientDetails.password': 0,
          'clientDetails.contactNumber': 0,
          'clientDetails.address': 0,
          'clientDetails.email': 0,
          'clientDetails.clientId': 0,
        }
      }
    ]);

    if (invoiceData.length > 0) {
      return res.success({
        data: invoiceData[0],
        message: 'Invoice details fetched successfully'
      });
    } else {
      return res.recordNotFound({ message: 'Invoice not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getInvoiceList = async (req, res) => {
  try {
    const userData = req['user-data'];

    await dbService.updateMany(invoice, {
      status: { $ne: 'paid' },
      dueDate: { $lt: new Date() },
      isDeleted: false
    }, { status: 'overdue' });
    let query = req.body.query || {};
    let options = req.body.options || {};
    query.clientId = userData._id;
    if (req.body.search) {
      const searchTerm = req.body.search;
      query.$or = [
        {
          invoiceNumber: {
            $regex: searchTerm,
            $options: 'i'
          }
        },
      ];
    }

    query.isDeleted = false;
    if (!options.populate) {
      options.populate = [];
    }
    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0
    };
    options.populate.push({
      path: 'clientId',
      select: 'firstName lastName',
    },
    {
      path: 'clientDetails',
      select: '_id firstName lastName'
    },    
    {
      path: 'to',
      select: 'name phone',
    });
    options.sort = { createdAt: -1 };
    options.lean = { virtuals: true };
    if (req.body.isCountOnly) {
      const totalRecords = await dbService.count(invoice, query);
      return res.success({ data: { totalRecords } });
    }
    const now = new Date();
    const [total, paid, pending, overdue, patilyRefund] = await Promise.all([
      getCountAndSum({ ...query }),
      getCountAndSum({
        ...query,
        status: 'paid' 
      }),
      getCountAndSum({
        ...query,
        status: 'pending' 
      }),
      getCountAndSum({
        ...query,
        status: { $ne: 'paid' },
        dueDate: { $lt: now }
      }),
      getCountAndSum({
        ...query,
        status: 'patily refund' 
      }),
    ]);
    const invoices = await dbService.paginate(invoice, query, options);

    if (!invoices || !invoices.data || !invoices.data.length) {
      return res.recordNotFound();
    }

    return res.success({
      data: {
        invoices,
        counts: {
          totalInvoices: {
            count: total.count,
            totalAmount: total.sum
          },
          paidInvoices: {
            count: paid.count,
            totalAmount: paid.sum
          },
          pendingInvoices: {
            count: pending.count,
            totalAmount: pending.sum
          },
          overdueInvoices: {
            count: overdue.count,
            totalAmount: overdue.sum
          },
          patilyRefundInvoices: {
            count: patilyRefund.count,
            totalAmount: patilyRefund.sum
          }
        }
      }
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const getCountAndSum = async (match) => {
  const result = await invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        sum: { $sum: '$totalAmount' }
      }
    }
  ]);

  return result[0] || {
    count: 0,
    sum: 0 
  };
};