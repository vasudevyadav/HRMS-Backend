const { holiday } = require('../../model');
const dbService = require('../../utils/dbService');

const addHoliday = async (req, res) => {
  try {
    const requestParam = req.body;
    const {
      id, title, startDate, endDate, color, holidayType, description, optional
    } = requestParam;

    if (!title || !startDate || !endDate || !holidayType) {
      return res.badRequest({ message: 'Insufficient request parameters! title, startDate, endDate, holidayType is required.' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); // remove time part for accurate comparison

    const newStart = new Date(startDate);
    newStart.setHours(0, 0, 0, 0);

    const newEnd = new Date(endDate);
    newEnd.setHours(0, 0, 0, 0);

    // Block current date from being in range
    if (
      (newStart.getTime() <= today.getTime() && today.getTime() <= newEnd.getTime()) ||
      newStart.getTime() === today.getTime() ||
      newEnd.getTime() === today.getTime()
    ) {
      return res.failure({ message: 'Cannot add a holiday on today\'s date.' });
    }

    let query = {
      $or: [
        // Case 1: New holiday's start date falls within an existing holiday
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(startDate) }
        },
        // Case 2: New holiday's end date falls within an existing holiday
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(endDate) }
        },
        // Case 3: New holiday completely overlaps an existing holiday
        {
          startDate: { $gte: new Date(startDate) },
          endDate: { $lte: new Date(endDate) }
        },
        // Case 4: An existing holiday completely overlaps the new holiday
        {
          startDate: { $lte: new Date(startDate) },
          endDate: { $gte: new Date(endDate) }
        }
      ]
    };

    if (id) query._id = { $ne: id };

    if (await holiday.findOne(query)) {
      return res.failure({ message: 'A holiday already exists within the specified date range.' });
    }

    const dataToCreate = {
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      colorCode: color,
      holidayType: holidayType.value,
      description,
      optional
    };

    const messageType = id ? 'update' : 'insert';
    let token = '';

    if (id) {
      token = id;
      await holiday.updateOne({ _id: id }, dataToCreate);
    } else {
      const newHoliday = await holiday.create(dataToCreate);
      token = newHoliday._id;
    }
    const getData = await holiday.findOne({ _id: token });

    return res.success({
      message: `Holiday ${id ? 'Updated' : 'Added'} Successfully`,
      data: {
        messageType,
        token,
        getData
      }
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const getDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.' });
    }
    const getData = await holiday.findOne(
      { _id: id },
      {
        addedBy: 0,
        updatedBy: 0,
        updatedAt: 0,
        isDeleted: 0
      }
    );
    if (getData) {
      return res.success({ data: getData });
    } else {
      return res.recordNotFound({ message: 'Holiday not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'Insufficient request parameters! id is required.' });
    }

    const getData = await holiday.findOne({ _id: id });
    if (getData) {
      const current = new Date();
      current.setHours(0, 0, 0, 0);

      const end = new Date(getData.endDate);
      end.setHours(0, 0, 0, 0);

      // ❌ Only block if holiday is in the past
      if (current.getTime() > end.getTime()) {
        return res.failure({ message: 'Cannot delete past holiday.' });
      }

      try {
        await holiday.deleteOne({ _id: id });
      } catch (error) {
        return res.failure({ message: 'This holiday could not be deleted' });
      }

      return res.success({ message: 'Holiday Deleted' });
    } else {
      return res.recordNotFound({ message: 'Invalid Id' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const getHolidayList = async (req, res) => {
  try {
    const getData = await holiday.find({})
      .select('-addedBy -updatedBy -updatedAt -isDeleted')
      .sort({ startDate: 1 });
    return res.success({
      data: getData,
      message: 'Holiday List'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  addHoliday,
  getDetails,
  deleteHoliday,
  getHolidayList
};
