/* eslint-disable object-curly-newline */
const { leave, employee } = require('../../model');
const {
  generateStrongPassword,
  validateNumbers,
  checkUser,
  validateDates,
} = require('../../helpers/function');
const dbService = require('../../utils/dbService');
const { LEAVE_TYPE } =  require('../../constants/authConstant');

exports.getEmployeeLeaveList = async (req, res) => {
  try {
    const { query = {}, options = {}, search, isCountOnly } = req.body;

    // Base aggregation pipeline
    const pipeline = [
      {
        $match: {
          ...query,
          isDeleted: false, // Optional: filter out deleted records
        },
      },
      {
        $lookup: {
          from: 'users', // Replace with the correct employee collection name
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employeeId',
        },
      },
      {
        $unwind: {
          path: '$employeeId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users', // Replace with the correct employee collection name
          localField: 'updatedBy',
          foreignField: '_id',
          as: 'updatedBy',
        },
      },
      {
        $unwind: {
          path: '$updatedBy',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Add search functionality
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search,
              $options: 'i' } },
            { description: { $regex: search,
              $options: 'i' } },
            { remark: { $regex: search,
              $options: 'i' } },
            { leaveTypeName: { $regex: search,
              $options: 'i' } },
            { 'employeeId.firstName': { $regex: search,
              $options: 'i' } },
            { 'employeeId.lastName': { $regex: search,
              $options: 'i' } },
          ],
        },
      });
    }

    // Projection to limit the fields in the result
    pipeline.push({
      $project: {
        title: 1,
        leaveType: 1,
        leaveTypeName: 1,
        startDate: 1,
        endDate: 1,
        'updatedBy.firstName': 1,
        'updatedBy.lastName': 1,
        'employeeId.firstName': 1,
        'employeeId.lastName': 1,
        'employeeId.primaryEmail': 1,
        'employeeId.primaryNumber': 1,
        description: 1,
        documentName: 1,
        remark: 1,
        leaveStatus: 1,
        revertLimit: 1,
        createdAt: 1,
      },
    });

    // Sorting by createdAt in descending order
    pipeline.push({ $sort: { createdAt: -1 } });

    // Count-only functionality
    if (isCountOnly) {
      const totalRecords = await dbService.aggregate(leave, pipeline);
      return res.success({ data: { totalRecords: totalRecords.length } });
    }

    // Pagination
    const paginatedResult = await dbService.aggregatePaginate(leave, pipeline, options);

    // Handle no records found
    if (!paginatedResult.data.length) {
      return res.recordNotFound();
    }
    const imageUrl = `${process.env.CLOUD_FRONT_URL}leave/`;
    // Return success response
    return res.success({
      status: 'SUCCESS',
      message: 'Your request is successfully executed',
      data: { data: paginatedResult.data,
        imageUrl },
    });
  } catch (error) {
    console.error('Error:', error); // Debugging log
    return res.internalServerError({ message: error.message });
  }
};

exports.manageLeave = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const { remark, leaveStatus, _id } = req.body;
    if (!userData || !remark || !leaveStatus || !_id) {
      return res.badRequest({
        message: 'remark, leaveStatus, _id are required.',
      });
    }
    if (leaveStatus == '1' || leaveStatus == '2') {
      const foundLeave = await dbService.findOne(
        leave,
        { _id },
        {
          leaveStatus: 1,
          startDate: 1,
          endDate: 1,
        }
      );
      if (!foundLeave) {
        return res.recordNotFound({ message: 'Leave not found...' });
      }

      if (userData.userType == 1 || userData.userType == 4) {
        if (foundLeave.leaveStatus == 0) {
          const updateData = {
            _id,
            leaveStatus,
            remark,
            updatedBy: userData._id
          };
          const updateLeave = await dbService.updateOne(
            leave,
            { _id },
            updateData,
            { new: true }
          );
          const data = await leave.findOne({ _id }).populate('employeeId');
          if (!updateLeave) return res.failure({ message: 'Update failed' });
          return res.success({
            message: `Leave has been ${foundLeave.leaveStatus == 1 ? 'rejected' : 'approved'}.`,
            data,
          });
        } else {
          return res.failure({
            message: `Your leave request is already ${foundLeave.leaveStatus == 1 ? 'rejected' : 'approved'}.`,
          });
        }
      } else {
        return res.failure({
          message: 'You are not authorised to performed any action for the leave request.',
        });
      }
    } else {
      return res.failure({ message: `Invalid userType` });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.revertLeave = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const { _id } = req.body;
    if (!userData || !_id) {
      return res.badRequest({ message: '_id are required.' });
    }
    const foundLeave = await dbService.findOne(
      leave,
      { _id },
      {
        leaveStatus: 1,
        startDate: 1,
        endDate: 1,
        revertLimit: 1,
      }
    );
    if (!foundLeave) {
      return res.recordNotFound({ message: 'Leave not found...' });
    }

    if (userData.userType == 1 || userData.userType == 4) {
      if (foundLeave.leaveStatus == 1 || foundLeave.leaveStatus == 2) {
        if (foundLeave.revertLimit == 3) {
          return res.failure({
            message: 'Leave can only be reverted three times. Limit reached.',
          });
        }
        const updateData = {
          _id,
          leaveStatus: 0,
          remark: '',
          revertLimit: foundLeave.revertLimit + 1,
          updatedBy: userData._id
        };
        const updateLeave = await dbService.updateOne(
          leave,
          { _id },
          updateData,
          { new: true }
        );

        const leaveDetails = await leave
          .findOne({ _id })
          .populate('employeeId');
        if (!updateLeave) return res.failure({ message: 'Update failed' });
        return res.success({
          message: 'Leave has been successfully reverted.',
          data: leaveDetails,
        });
      } else {
        return res.failure({
          message: 'Your leave request has already been reverted.',
        });
      }
    } else {
      return res.failure({
        message: 'You are not authorised to performed any action for the leave request.',
      });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.deleteLeave = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const { leaveId } = req.params;
    if (!userData || !leaveId) {
      return res.badRequest({ message: 'leaveId is required.' });
    }
    const foundLeave = await dbService.findOne(leave,{ leaveId });
    if (!foundLeave) {
      return res.recordNotFound({ message: 'Leave not found...' });
    }

    if (userData.userType == 1 || userData.userType == 4) {
      await leave.deleteOne({ _id: leaveId });
      return res.success({ message: 'Leave application successfully deleted.' });
    } else {
      return res.failure({
        message: 'You are not authorised to performed any action for the leave request.',
      });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateLeave = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const { leaveId, title, leaveType, startDate, endDate, description } = req.body;
    if (!userData || !leaveId || !title || !leaveType || !startDate || !endDate || !description) {
      return res.badRequest({ message:'title, leaveType, startDate, endDate, description are required.' });
    }
    
    const foundLeave = await dbService.findOne(leave,{ leaveId });
    if (!foundLeave) {
      return res.recordNotFound({ message: 'Leave not found...' });
    }

    let leaveTypeName = '';
    if (leaveType == 1){
      leaveTypeName = LEAVE_TYPE.HL;
    } else if (leaveType == 2){
      leaveTypeName = LEAVE_TYPE.FL;
    } else if (leaveType == 3){
      leaveTypeName = LEAVE_TYPE.ML;
    } else {
      return res.failure({ message: 'Invalid Leave Type' });
    }

    if (userData.userType == 1 || userData.userType == 4) {
      const dataToCreate = { title,
        leaveType,
        startDate,
        endDate,
        description };
      await leave.findByIdAndUpdate(leaveId, dataToCreate, { new: true });
      const leaveDetails = await leave.findOne({ _id: leaveId }).populate('employeeId');
      return res.success({ 
        data: leaveDetails, 
        message: 'Leave data updated successfully.' 
      });
    } else {
      return res.failure({ message: 'You are not authorised to performed any action for the leave request.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
