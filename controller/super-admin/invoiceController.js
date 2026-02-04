const {
  invoice, client,
  user
} = require('../../model');
const { convertCurrency } = require('../../utils/currency');
const dbService = require('../../utils/dbService');
const mongoose = require('mongoose');

// Generate unique Invoice Number
async function generateUniqueInvoiceNumber(invoiceNumber) {
  let newInvoiceNumber;

  if (invoiceNumber) {
    const existingInvoice = await invoice.findOne({ invoiceNumber });

    if (!existingInvoice) {
      return invoiceNumber;
    }
  }

  // Find latest invoice number in DB
  const latestInvoice = await invoice
    .findOne({ invoiceNumber: { $regex: /^INV-\d+$/ } })
    .sort({ createdAt: -1 })
    .lean();

  if (latestInvoice && latestInvoice.invoiceNumber) {
    const latestNumber = parseInt(latestInvoice.invoiceNumber.replace('INV-', ''), 10);
    const nextNumber = latestNumber + 1;
    newInvoiceNumber = `INV-${nextNumber}`;
  } else {
    // Start from 1001 if no invoice exists
    newInvoiceNumber = 'INV-1001';
  }

  return newInvoiceNumber;
}

exports.addInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      clientId,
      invoiceDate,
      dueDate,
      items,
      subTotal,
      taxAmount,
      totalAmount,
      from,
      to,
      accountDetails,
      currency
    } = req.body;

    // Validate required fields
    if (
      !clientId ||
      !invoiceDate ||
      !dueDate ||
      !items ||
      !subTotal ||
      !taxAmount ||
      !totalAmount ||
      !from ||
      !to ||
      !accountDetails ||
      !currency ||
      !invoiceNumber
    ) {
      return res.badRequest({ message: 'clientId, invoiceDate, dueDate, items, subTotal, taxAmount, totalAmount, from, to, and accountDetails, currency are required.' });
    }

    const isClientExist = await user.findOne({
      _id: clientId,
      userType: 5,
      isDeleted: false
    });
    if (!isClientExist) {
      return res.recordNotFound({ message: 'Client not found' });
    }

    const newInvoiceNumber = await generateUniqueInvoiceNumber(invoiceNumber);
    // 🪙 Convert totalAmount to INR using your utility
    const conversionResult = await convertCurrency({
      currency: currency.code,
      amount: totalAmount,
    });

    if (conversionResult.error) {
      return res.failure({
        message: 'Currency conversion failed',
        data: conversionResult.message
      });
    }
    const dataToCreate = {
      clientId,
      invoiceNumber: newInvoiceNumber,
      invoiceDate,
      dueDate,
      items,
      subTotal,
      taxAmount,
      totalAmount,
      from,
      to,
      accountDetails,
      currency,
      convertedTotalAmount: parseFloat(conversionResult.converted),

    };

    const newInvoice = await dbService.create(invoice, dataToCreate);

    return res.success({
      message: 'Invoice added successfully',
      data: newInvoice
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const {
      id,
      clientId,
      invoiceDate,
      dueDate,
      items,
      subTotal,
      taxAmount,
      totalAmount,
      from,
      to,
      accountDetails,
      currency,
    } = req.body;

    if (
      !id ||
      !clientId ||
      !invoiceDate ||
      !dueDate ||
      !items ||
      !subTotal ||
      !taxAmount ||
      !totalAmount ||
      !from ||
      !to ||
      !accountDetails ||
      !currency
    ) {
      return res.badRequest({ message: 'id, clientId, invoiceDate, dueDate, items, subTotal, taxAmount, totalAmount, from, to, and accountDetails are required.' });
    }

    const where = {
      _id: id,
      isDeleted: false
    };
    const existingInvoice = await invoice.findOne(where);

    if (!existingInvoice) {
      return res.recordNotFound({ message: 'Invoice not found' });
    }
    const isClientExist = await user.findOne({
      _id: clientId,
      userType: 5,
      isDeleted: false
    });
    if (!isClientExist) {
      return res.recordNotFound({ message: 'Client not found' });
    }

    // 🪙 Convert totalAmount to INR using your utility
    const conversionResult = await convertCurrency({
      currency: currency.code,
      amount: totalAmount,
    });

    if (conversionResult.error) {
      return res.failure({
        message: 'Currency conversion failed',
        data: conversionResult.details || conversionResult.error
      });
    }
    const dataToUpdate = {
      clientId,
      invoiceDate,
      dueDate,
      items,
      subTotal,
      taxAmount,
      totalAmount,
      from,
      to,
      accountDetails,
      currency,
      convertedTotalAmount: parseFloat(conversionResult.converted), // INR value
    };

    const updatedInvoice = await dbService.updateOne(invoice, { _id: id }, dataToUpdate);

    return res.success({
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const where = {
      _id: id,
      isDeleted: false
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
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }
    const invoiceData = await invoice.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false
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
    await dbService.updateMany(invoice, {
      status: { $ne: 'paid' },
      dueDate: { $lt: new Date() },
      isDeleted: false
    }, { status: 'overdue' });
    let query = req.body.query || {};
    let options = req.body.options || {};

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
    options.populate.push(
      // {
      //   path: 'clientId',
      //   select: 'firstName lastName',
      // },
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

exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const invoiceData = await invoice.findOne({ _id: id });

    if (invoiceData) {
      if (invoiceData.isDeleted) {
        return res.failure({ message: 'Invoice is already deleted.' });
      }

      await dbService.updateOne(invoice, { _id: id }, { isDeleted: true });

      return res.success({
        data: invoiceData,
        message: 'Invoice successfully marked as deleted.'
      });
    } else {
      return res.recordNotFound({ message: 'Invoice not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getInvoiceNumber = async (req, res) => {
  try {
    // Find the latest invoice based on createdAt or invoiceNumber (choose your strategy)
    const latestInvoice = await invoice.findOne().sort({ createdAt: -1 });

    let newInvoiceNumber;

    if (latestInvoice && latestInvoice.invoiceNumber) {
      // Extract the number, increment by 1
      const lastNumber = parseInt(latestInvoice.invoiceNumber.replace(/\D/g, ''), 10); // removes non-digit characters
      newInvoiceNumber = `INV-${lastNumber + 1}`;
    } else {
      // No previous invoice found, start fresh
      newInvoiceNumber = 'INV-1001';
    }
    const from = {
      'name': 'GOHASHINCLUDE PVT. LTD.',
      'address': 'Nirman Nagar E, P.No.-31 1st Floor, Shree Krishna Tower, Ajmer Rd, opp. Asopa Hospital, Jaipur, Rajasthan 302024',
      'phone': '096369 22144'
    };
    return res.success({
      data: {
        invoiceNumber: newInvoiceNumber,
        from
      },
      message: 'Get Invoice Number'
    });

  } catch (error) {
    console.error('Error in getInvoiceNumber:', error);
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
        sum: { $sum: '$convertedTotalAmount' }
      }
    }
  ]);

  return result[0] || {
    count: 0,
    sum: 0
  };
};