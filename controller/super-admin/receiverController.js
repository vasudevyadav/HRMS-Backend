const { receiver } = require('../../model');
const dbService = require('../../utils/dbService');

exports.addReceiver = async (req, res) => {
  try {
    const {
      name, phone, address
    } = req.body;

    if (!name || !phone || !address) {
      return res.badRequest({ message: 'name, phone and address are required.' });
    }

    const dataToCreate = {
      name,
      phone,
      address,
    };

    const newReceiver = await dbService.create(receiver, dataToCreate);
    return res.success({
      message: 'Receiver added successfully',
      data: newReceiver
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.updateReceiver = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, address 
    } = req.body;

    if (!id) {
      return res.badRequest({ message: 'Receiver ID is required.' });
    }

    if (!name && !phone && !address) {
      return res.badRequest({ message: 'At least one field (name, phone, or address) is required to update.' });
    }

    const receiverData = await receiver.findOne({ _id: id });

    if (!receiverData) {
      return res.recordNotFound({ message: 'Receiver not found.' });
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (phone) dataToUpdate.phone = phone;
    if (address) dataToUpdate.address = address;

    const updatedReceiver = await dbService.updateOne(receiver, { _id: id }, dataToUpdate);

    return res.success({
      message: 'Receiver updated successfully',
      data: updatedReceiver
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.deleteReceiver = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Receiver ID is required.' });
    }

    const receiverData = await receiver.findOne({ _id: id });

    if (receiverData) {
      if (receiverData.isDeleted) {
        return res.failure({ message: 'Receiver is already deleted.' });
      }

      await dbService.updateOne(receiver, { _id: id }, { isDeleted: true });

      return res.success({
        data: receiverData,
        message: 'Receiver successfully marked as deleted.'
      });
    } else {
      return res.recordNotFound({ message: 'Receiver not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getReceiverDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const receiverData = await receiver.findOne(
      {
        _id: id,
        isDeleted: false 
      },
      {
        updatedAt: 0,
        isDeleted: 0,
        addedBy: 0,
        updatedBy: 0
      }
    );

    if (receiverData) {
      return res.success({
        data: receiverData,
        message: 'Receiver details fetched successfully'
      });
    } else {
      return res.recordNotFound({ message: 'Receiver not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.receiverList = async (req, res) => {
  try {
    const { search } = req.body;
  
    // Build filter
    const filter = {};
    filter.isDeleted = false;
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // case-insensitive
      filter.$or = [
        { 'name': searchRegex },
        { 'email': searchRegex },
        { 'phone': searchRegex },
      ];
    }
  
    // Find unique receivers
    const receivers = await receiver.aggregate([
      { $match: filter },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          address: 1,
          phone:1,
        },
      },
      { $sort: { name: 1 } },
    ]);
  
    return res.success({
      message: 'Receiver list fetched successfully',
      data: receivers
    });

  } catch (error) {
    console.error('Error fetching receiver list:', error);
    return res.internalServerError({ message: error.message });
  }
};