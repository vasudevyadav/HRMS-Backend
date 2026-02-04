/* eslint-disable linebreak-style */
const { leave } = require('../../model');
const {
  generateStrongPassword,
  validateNumbers,
  checkUser,
  validateDates,
} = require('../../helpers/function');
const dbService = require('../../utils/dbService');
const { LEAVE_TYPE } =  require('../../constants/authConstant');

exports.addLeave = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const {
      title, leaveType, startDate, endDate, description, documentName 
    } = req.body;
    if (
      !userData ||
      !title ||
      !leaveType ||
      !startDate ||
      !endDate ||
      !description
    ) {
      return res.badRequest({
        message:
          'title, leaveType, startDate, endDate, description are required.',
      });
    }
    const {
      valid, message 
    } = await validateDates(startDate, endDate);
    if (!valid) {
      return res.failure({ message: message });
    }
    if (userData.userType == 1) {
      return res.failure({ message: 'Super admin is not on leave' });
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
    const dataToCreate = {
      title,
      leaveType,
      startDate,
      endDate,
      description,
      documentName,
      employeeId: userData._id,
    };
    if (leaveType == 1 || leaveType == 2) {
      dataToCreate.startDate = startDate;
      dataToCreate.endDate = startDate;
    }

    const checkLeave = await leave.findOne({
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
        {
          startDate: { $gte: startDate },
          endDate: { $lte: endDate },
        },
      ],
      employeeId: userData._id,
    });

    if (checkLeave) {
      return res.failure({ message: 'Leave already exists for this date range', });
    }
    const createLeave = await dbService.create(leave, dataToCreate);
    if (createLeave) {
      lastData = await leave.findOne(
        { _id: createLeave._id },
        {
          isActive: 0,
          isDeleted: 0,
          addedBy: 0,
          updatedBy: 0,
          updatedAt: 0,
          remark: 0,
        }
      );
      messageType = 'Add';
      token = createLeave.id;
    }
    return res.success({
      message: `Leave Request Submitted Successfully`,
      data: {
        messageType,
        token,
        lastData,
      },
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getEmployeeLeaveList = async (req, res) => {
  try {
    const { _id: employeeId } = req['user-data'];
    let {
      search, query = {}, options = {}, isCountOnly 
    } = req.body;
    query.employeeId = employeeId;
    /* let {
      search, query = {}, options = {}, isCountOnly 
    } = req.body;

    query.employeeId = employeeId;
    if (search) {
      const searchRegex = {
        $regex: search,
        $options: 'i' 
      };
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { remark: searchRegex },
        { leaveTypeName: searchRegex },
      ];
    }

    if (isCountOnly) {
      const totalRecords = await dbService.count(leave, query);
      return res.success({ data: { totalRecords } });
    }

    options.sort = { createdAt: -1 };  // Sort by `createdAt` in descending order
    options.projection = {
      isActive: 0,
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
      employeeId: 0,
    };

    const leavesData = await dbService.paginate(leave, query, options);
    if (!leavesData?.data?.length) return res.recordNotFound();

    const imageUrl = `${process.env.CLOUD_FRONT_URL}leave/`; */
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
    return res.success({ data: { data: paginatedResult.data, imageUrl } });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
