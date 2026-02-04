const {
  userTokens,
  workSession,
  attendance,
  session,
  employeeRequest,
  holiday,
  leave,
} = require('../../model');
const mongoose = require('mongoose');
const dbService = require('../../utils/dbService');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
const DeviceDetector = require('node-device-detector');

exports.getTodayDetails = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (!token) {
      return res.badRequest({ message: 'Insufficient request parameters! token is required.', });
    }

    const userAuth = await dbService.findOne(userTokens, { token });
    if (!userAuth) {
      return res.unAuthorized({ message: 'Invalid token' });
    }

    const detector = new DeviceDetector();
    const deviceDetails = detector.detect(req.headers['user-agent']);

    const where = {
      userId: userAuth.userId,
      deviceDetails,
      isActive: true,
    };
    const userSession = await dbService.findOne(session, where, { deviceType: 1 });
    if (!userSession) {
      return res.unAuthorized({ message: 'You have an invalid session!' });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayAttendance = await dbService.findOne(attendance, {
      userId: userAuth.userId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    let response = {
      currentStatus: 'not-checked-in',
      availableActions: [
        {
          value: 'check-in',
          label: 'Check In',
        },
      ],
    };

    if (todayAttendance) {
      if (todayAttendance.checkOutTime) {
        response.currentStatus = 'checked-out';
        response.availableActions = [];
      } else if (!todayAttendance.lunchInTime) {
        response.currentStatus = 'checked-in';
        response.availableActions = [
          {
            value: 'check-out',
            label: 'Check Out',
          },
          {
            value: 'lunch-check-in',
            label: 'Lunch Check-In',
          },
          {
            value: 'other-check-in',
            label: 'Other Check-In',
          },
        ];
      } else if (todayAttendance.lunchInTime && !todayAttendance.lunchOutTime) {
        response.currentStatus = 'lunch-checked-in';
        response.availableActions = [
          {
            value: 'lunch-check-out',
            label: 'Lunch Check-Out',
          },
        ];
      } else if (todayAttendance.lunchOutTime) {
        response.currentStatus = 'lunch-checked-out';
        response.availableActions = [
          {
            value: 'other-check-in',
            label: 'Other Check-In',
          },
          {
            value: 'check-out',
            label: 'Check Out',
          },
        ];
      }

      const lastOtherCheckIn =
        todayAttendance.otherTime?.[todayAttendance.otherTime.length - 1];
      if (lastOtherCheckIn && !lastOtherCheckIn.otherCheckOutTime) {
        response.currentStatus = 'other-checked-in';
        response.availableActions = [
          {
            value: 'other-check-out',
            label: 'Other Check-Out',
          },
        ];
      }
    }
    const activeWorkSession = await dbService.findOne(workSession, {
      userId: userAuth.userId,
      startTime: { $lte: new Date() },
      endTime: null,
    });

    return res.success({
      data: {
        session: userSession,
        todayAttendance,
        status: response.currentStatus,
        availableActions: response.availableActions,
        workSession: activeWorkSession,
      },
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.checkIn = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const { checkInType } = req.body;

    if (!userData || !checkInType) {
      return res.badRequest({ message: 'checkInType is required.' });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayAttendance = await dbService.findOne(attendance, {
      userId: userData._id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    let response = {
      currentStatus: null,
      availableActions: [],
    };
    const activeWorkSession = await dbService.findOne(workSession, {
      userId: userData._id,
      endTime: null,
      isActive: true,
    });

    if (activeWorkSession) {
      return res.failure({ message: 'Please complete your work session first', });
    }
    if (checkInType === 'check-in' && !todayAttendance) {
      const checkIndata = await dbService.create(attendance, {
        userId: userData._id,
        checkInTime: new Date(),
        attendanceStatus: 1,
      });
      response.currentStatus = 'checked-in';
      response.todayAttendance = checkIndata;
      response.availableActions = [
        {
          value: 'check-out',
          label: 'Check Out',
        },
        {
          value: 'lunch-check-in',
          label: 'Lunch Check-In',
        },
        {
          value: 'other-check-in',
          label: 'Other Check-In',
        },
      ];
      return res.success({
        message: 'Checked in successfully.',
        data: response,
      });
    } else if (
      checkInType === 'check-out' &&
      todayAttendance &&
      !todayAttendance.checkOutTime
    ) {
      todayAttendance.checkOutTime = new Date();
      await todayAttendance.save();
      response.currentStatus = 'checked-out';
      response.availableActions = [];
      response.todayAttendance = todayAttendance;
      return res.success({
        message: 'Checked out successfully.',
        data: response,
      });
    } else if (
      checkInType === 'lunch-check-in' &&
      todayAttendance &&
      !todayAttendance.lunchInTime
    ) {
      todayAttendance.lunchInTime = new Date();
      await todayAttendance.save();
      response.currentStatus = 'lunch-checked-in';
      response.availableActions = [
        {
          value: 'lunch-check-out',
          label: 'Lunch Check-Out',
        },
      ];
      response.todayAttendance = todayAttendance;
      return res.success({
        message: 'Lunch check-in successful.',
        data: response,
      });
    } else if (
      checkInType === 'lunch-check-out' &&
      todayAttendance &&
      todayAttendance.lunchInTime &&
      !todayAttendance.lunchOutTime
    ) {
      todayAttendance.lunchOutTime = new Date();
      await todayAttendance.save();
      response.currentStatus = 'lunch-checked-out';
      response.availableActions = [
        {
          value: 'other-check-in',
          label: 'Other Check-In',
        },
        {
          value: 'check-out',
          label: 'Check Out',
        },
      ];
      response.todayAttendance = todayAttendance;
      return res.success({
        message: 'Lunch check-out successful.',
        data: response,
      });
    } else if (checkInType === 'other-check-in' && todayAttendance) {
      const lastOtherCheckIn =
        todayAttendance.otherTime[todayAttendance.otherTime.length - 1];
      if (!lastOtherCheckIn || lastOtherCheckIn.otherCheckOutTime) {
        todayAttendance.otherTime.push({ otherCheckInTime: new Date() });
        await todayAttendance.save();
        response.currentStatus = 'other-checked-in';
        response.availableActions = [
          {
            value: 'other-check-out',
            label: 'Other Check-Out',
          },
        ];
        response.todayAttendance = todayAttendance;
        return res.success({
          message: 'Other check-in successful.',
          data: response,
        });
      } else {
        return res.failure({
          message: 'An active other check-in already exists.',
          data: response,
        });
      }
    } else if (checkInType === 'other-check-out' && todayAttendance) {
      const lastOtherCheckIn =
        todayAttendance.otherTime[todayAttendance.otherTime.length - 1];
      if (lastOtherCheckIn && !lastOtherCheckIn.otherCheckOutTime) {
        lastOtherCheckIn.otherCheckOutTime = new Date();
        await todayAttendance.save();
        response.currentStatus = 'other-checked-out';
        response.availableActions = [
          {
            value: 'other-check-in',
            label: 'Other Check-In',
          },
          {
            value: 'check-out',
            label: 'Check Out',
          },
        ];
        response.todayAttendance = todayAttendance;
        return res.success({
          message: 'Other check-out successful.',
          data: response,
        });
      } else {
        return res.failure({
          message: 'No active other check-in found.',
          data: response,
        });
      }
    } else {
      return res.failure({
        message: 'Invalid check-in/check-out request.',
        data: response,
      });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.createWorkSession = async (req, res, next) => {
  try {
    const userData = req['user-data'];

    // Check if the user has an active work session
    const activeWorkSession = await dbService.findOne(workSession, {
      userId: userData._id,
      endTime: null,
      isActive: true,
    });

    if (activeWorkSession) {
      return res.failure({ message: 'Please complete your active work session first', });
    }

    // Fetch today's attendance to check lunch or other sessions
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayAttendance = await dbService.findOne(attendance, {
      addedBy: userData._id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (todayAttendance) {
      if (todayAttendance.lunchInTime && !todayAttendance.lunchOutTime) {
        return res.failure({
          message:
            'Lunch check-in is active. Please check out from lunch first.',
        });
      }

      const lastOtherCheckIn =
        todayAttendance.otherTime?.[todayAttendance.otherTime.length - 1];
      if (lastOtherCheckIn && !lastOtherCheckIn.otherCheckOutTime) {
        return res.failure({
          message:
            'Another check-in is active. Please check out from it first.',
        });
      }
    }

    // Create a new work session if no other session or lunch check-in is active
    const newWorkSession = await dbService.create(workSession, {
      userId: userData._id,
      startTime: new Date(),
    });

    return res.success({
      message: 'Work session started successfully',
      data: newWorkSession,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.endWorkSession = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const {
      sessionId, workSessionReport
    } = req.body;

    // Validate request
    if (!sessionId || !workSessionReport) {
      return res.badRequest({ message: 'Session ID and work session report are required.', });
    }

    // Find the work session by ID
    const session = await dbService.findOne(workSession, {
      _id: sessionId,
      userId: userData._id,
      endTime: null,
      isActive: true,
    });

    if (!session) {
      return res.recordNotFound({ message: 'Active work session not found for the provided session ID.', });
    }

    // Update the session with end time and work session report
    session.endTime = new Date();
    session.workSessionReport = workSessionReport;
    session.isActive = false;

    await session.save();

    return res.success({
      message: 'Work session ended successfully',
      data: session,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.endOtherCheckoutSession = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const { otherCheckReport } = req.body;

    // Validate request
    if (!otherCheckReport) {
      return res.badRequest({ message: 'Other session report is required.', });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayAttendance = await dbService.findOne(attendance, {
      userId: userData._id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });
    let response = {
      currentStatus: null,
      availableActions: [],
    };
    const lastOtherCheckIn =
      todayAttendance.otherTime[todayAttendance.otherTime.length - 1];
    if (lastOtherCheckIn && !lastOtherCheckIn.otherCheckOutTime) {
      lastOtherCheckIn.otherCheckOutTime = new Date();
      lastOtherCheckIn.otherCheckReport = otherCheckReport;
      await todayAttendance.save();
      response.currentStatus = 'other-checked-out';
      response.availableActions = [
        {
          value: 'other-check-in',
          label: 'Other Check-In',
        },
        {
          value: 'check-out',
          label: 'Check Out',
        },
      ];
      response.todayAttendance = todayAttendance;

      return res.success({
        message: 'Other session ended successfully.',
        data: response,
      });
    } else {
      return res.failure({
        message: 'No active other check-in found.',
        data: response,
      });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.submitRequest = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const {
      title, description
    } = req.body;
    if (!title || !description) {
      return res.badRequest({ message: 'title, description are required.' });
    }
    const dataToCreate = {
      title,
      description,
      userId: userData._id,
    };
    const createRequest = await dbService.create(employeeRequest, dataToCreate);
    return res.success({
      message: `Request Submitted Successfully`,
      data: createRequest,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

/*
 * exports.getAttendanceList = async (req, res) => {
 * try {
 *  const userData = req['user-data'];
 *  const userId = userData._id;
 *  const options = req.body.options || {};
 *  const page = req.body.page || 1;
 *  const limit = req.body.limit || 10;
 *  const offset = (page - 1) * limit;
 *  const query = { userId };
 *  const today = new Date();
 *
 *  const firstEntry = await attendance.findOne(
 *    query,
 *    {
 *      checkInTime: 1,
 *      checkOutTime: 1,
 *      attendanceStatus: 1,
 *      createdAt: 1,
 *      updatedAt: 1,
 *    },
 *    { sort: { createdAt: 1 } }
 *  );
 *  if (!firstEntry) {
 *    return res.success({
 *      data: [],
 *      paginator: {
 *        itemCount: 0,
 *        pageCount: 0,
 *        currentPage: page,
 *        perPage: limit,
 *      },
 *    });
 *  }
 *
 *  const startDate = firstEntry.checkInTime;
 *  const endDate = today;
 *
 *  const daysArray = [];
 *  let currentDate = new Date(startDate);
 *
 *  while (currentDate <= endDate) {
 *    daysArray.push(new Date(currentDate));
 *    currentDate.setDate(currentDate.getDate() + 1);
 *  }
 *
 *  daysArray.reverse();
 *
 *  const attendanceRecords = await dbService.findMany(
 *    attendance,
 *    {
 *      userId: userId,
 *      checkInTime: { $gte: startDate, $lte: endDate },
 *    },
 *    options
 *  );
 *
 *  const leaveRecords = await dbService.findMany(leave, {
 *    userId: userId,
 *    leaveStatus: 1,
 *    leaveDate: { $gte: startDate, $lte: endDate },
 *  });
 *
 *  const holidays = await dbService.findMany(holiday, {
 *    $or: [
 *      { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
 *      { startDate: { $gte: startDate, $lte: endDate } },
 *    ],
 *  });
 *
 *  const finalData = [];
 *
 *  for (const date of daysArray) {
 *    let foundRecord = attendanceRecords.find((att) => {
 *      return new Date(att.checkInTime).toDateString() === date.toDateString();
 *    });
 *
 *    if (foundRecord) {
 *      finalData.push(foundRecord);
 *    } else {
 *      const leaveRecord = leaveRecords.find((leave) => {
 *        return (
 *          new Date(leave.leaveDate).toDateString() === date.toDateString()
 *        );
 *      });
 *
 *      if (leaveRecord) {
 *        finalData.push({
 *          attendanceStatus: 2, // on leave
 *          createdAt: date,
 *          _id: new mongoose.Types.ObjectId(),
 *          ...leaveRecord._doc,
 *        });
 *      } else {
 *        // Check for holiday
 *        const holidayRecord = holidays.find((holiday) => {
 *          return (
 *            date >= new Date(holiday.startDate) &&
 *            date <= new Date(holiday.endDate)
 *          );
 *        });
 *
 *        if (holidayRecord) {
 *          finalData.push({
 *            attendanceStatus: 3, // holiday
 *            createdAt: date,
 *            _id: new mongoose.Types.ObjectId(),
 *            ...holidayRecord._doc,
 *          });
 *        } else {
 *          // Check for weekend (Saturday/Sunday)
 *          const dayOfWeek = date.getDay();
 *          if (dayOfWeek === 0 || dayOfWeek === 6) {
 *            finalData.push({
 *              attendanceStatus: 4,
 *              createdAt: date,
 *              _id: new mongoose.Types.ObjectId()
 *            });
 *          } else {
 *            finalData.push({
 *              attendanceStatus: 0,
 *              createdAt: date,
 *              _id: new mongoose.Types.ObjectId()
 *            });
 *          }
 *        }
 *      }
 *    }
 *  }
 *
 *  const paginatedData = finalData.slice(offset, offset + limit);
 *  const itemCount = finalData.length;
 *  const pageCount = Math.ceil(itemCount / limit);
 *
 *  const paginator = {
 *    itemCount: itemCount,
 *    offset: offset,
 *    perPage: limit,
 *    pageCount: pageCount,
 *    currentPage: page,
 *    slNo: offset + 1,
 *    hasPrevPage: page > 1,
 *    hasNextPage: page < pageCount,
 *    prev: page > 1 ? page - 1 : null,
 *    next: page < pageCount ? page + 1 : null,
 *  };
 *
 *  return res.success({ data: { data: paginatedData, paginator } });
 * } catch (error) {
 *  return res.internalServerError({ message: error.message });
 * }
 * };
 */

/*
 * exports.getAttendanceList = async (req, res) => {
 * try {
 *  const userData = req['user-data'];
 *  const userId = userData._id;
 *  let query = { userId };
 *  let options = {};
 * 
 *  // Text search filter
 *  if (req.body.search) {
 *    query.$text = { $search: req.body.search };
 *  }
 * 
 *  // Merging additional query filters
 *  if (typeof req.body.query === 'object' && req.body.query !== null) {
 *    query = {
 *      ...req.body.query,
 *      ...query,
 *    };
 *  }
 * 
 *  // Extract pagination details from options
 *  const page = req.body.options?.page || 1;
 *  const limit = req.body.options?.limit || 10;
 *  const offset = (page - 1) * limit;
 * 
 *  // If only count is needed
 *  if (req.body.isCountOnly) {
 *    let totalRecords = await dbService.count(attendance, query);
 *    return res.success({ data: { totalRecords } });
 *  }
 * 
 *  // Fetch the earliest attendance record to determine the startDate
 *  const firstEntry = await dbService.findOne(
 *    attendance,
 *    query,
 *    {},
 *    { sort: { checkInTime: 1 } }
 *  );
 *  if (!firstEntry) {
 *    return res.success({
 *      data: [],
 *      paginator: {
 *        itemCount: 0,
 *        pageCount: 0,
 *        currentPage: page,
 *        perPage: limit,
 *      },
 *    });
 *  }
 * 
 *  const startDate = new Date(firstEntry.checkInTime);
 *  const endDate = new Date(); // Current date as endDate
 * 
 *  // Create an array of dates from the start date to today
 *  const daysArray = [];
 *  let currentDate = new Date(startDate);
 *  while (currentDate < endDate) {
 *    daysArray.push(new Date(currentDate));
 *    currentDate.setDate(currentDate.getDate() + 1);
 *  }
 *  daysArray.reverse(); // Optional: reverse to get the most recent dates first
 * 
 *  // Fetch attendance records within the date range
 *  const attendanceRecords = await dbService.findMany(attendance, {
 *    userId,
 *    checkInTime: {
 *      $gte: startDate,
 *      $lte: endDate,
 *    },
 *  });
 * 
 *  // Handle projection: Manually remove unwanted fields
 *  const filteredAttendanceRecords = attendanceRecords.map((record) => {
 *    const {
 *      isActive,
 *      isDeleted,
 *      addedBy,
 *      updatedBy,
 *      updatedAt,
 *      userId,
 *      ...rest
 *    } = record._doc;
 *    return rest;
 *  });
 * 
 *  // Fetch leave records within the date range
 *  const leaveRecords = await dbService.findMany(leave, {
 *    userId,
 *    leaveStatus: 1,
 *    leaveDate: {
 *      $gte: startDate,
 *      $lte: endDate,
 *    },
 *  });
 * 
 *  // Fetch holidays within the date range
 *  const holidays = await dbService.findMany(holiday, {
 *    $or: [
 *      {
 *        startDate: { $lte: endDate },
 *        endDate: { $gte: startDate },
 *      },
 *      {
 *        startDate: {
 *          $gte: startDate,
 *          $lte: endDate,
 *        },
 *      },
 *    ],
 *  });
 * 
 *  // Prepare the final data list
 *  const finalData = [];
 *  for (const date of daysArray) {
 *    let foundRecord = filteredAttendanceRecords.find((att) => {
 *      return new Date(att.checkInTime).toDateString() === date.toDateString();
 *    });
 * 
 *    if (foundRecord) {
 *      finalData.push(foundRecord);
 *    } else {
 *      const leaveRecord = leaveRecords.find((leave) => {
 *        return (
 *          new Date(leave.leaveDate).toDateString() === date.toDateString()
 *        );
 *      });
 * 
 *      if (leaveRecord) {
 *        finalData.push({
 *          attendanceStatus: 2, // on leave
 *          createdAt: date,
 *          _id: new mongoose.Types.ObjectId(),
 *          ...leaveRecord._doc,
 *        });
 *      } else {
 *        const holidayRecord = holidays.find((holiday) => {
 *          return (
 *            date >= new Date(holiday.startDate) &&
 *            date <= new Date(holiday.endDate)
 *          );
 *        });
 * 
 *        if (holidayRecord) {
 *          finalData.push({
 *            attendanceStatus: 3, // holiday
 *            createdAt: date,
 *            _id: new mongoose.Types.ObjectId(),
 *            ...holidayRecord._doc,
 *          });
 *        } else {
 *          const dayOfWeek = date.getDay();
 *          if (dayOfWeek === 0 || dayOfWeek === 6) {
 *            finalData.push({
 *              attendanceStatus: 4, // weekend
 *              createdAt: date,
 *              _id: new mongoose.Types.ObjectId(),
 *            });
 *          } else {
 *            finalData.push({
 *              attendanceStatus: 0, // absent
 *              createdAt: date,
 *              _id: new mongoose.Types.ObjectId(),
 *            });
 *          }
 *        }
 *      }
 *    }
 *  }
 * 
 *  // Paginate the final data
 *  const paginatedData = finalData.slice(offset, offset + limit);
 *  const itemCount = finalData.length;
 *  const pageCount = Math.ceil(itemCount / limit);
 * 
 *  const paginator = {
 *    itemCount,
 *    offset,
 *    perPage: limit,
 *    pageCount,
 *    currentPage: page,
 *    slNo: offset + 1,
 *    hasPrevPage: page > 1,
 *    hasNextPage: page < pageCount,
 *    prev: page > 1 ? page - 1 : null,
 *    next: page < pageCount ? page + 1 : null,
 *  };
 * 
 *  return res.success({
 *    data: {
 *      data: paginatedData,
 *      paginator,
 *    },
 *  });
 * } catch (error) {
 *  console.error('Error in getAttendanceList:', error);
 *  return res.internalServerError({ message: error.message });
 * }
 * }; 
 */
exports.getAttendanceList = async (req, res) => {
  try {
    const userData = req['user-data'];
    const userId = req.body.query.employee ?? userData._id;
    let query = { userId };
    let options = {};

    if (req.body.search) {
      query.$text = { $search: req.body.search };
    }

    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = {
        ...req.body.query,
        ...query,
      };
    }
    delete query['employee'];

    const page = req.body.options?.page || 1;
    const limit = req.body.options?.limit || 10;
    const offset = (page - 1) * limit;

    if (req.body.isCountOnly) {
      const totalRecords = await dbService.count(attendance, query);
      return res.success({ data: { totalRecords } });
    }

    const firstEntry = await dbService.findOne(
      attendance,
      query,
      {},
      { sort: { checkInTime: 1 } }
    );

    if (!firstEntry) {
      return res.success({
        data: [],
        paginator: {
          itemCount: 0,
          pageCount: 0,
          currentPage: page,
          perPage: limit,
        },
      });
    }

    let startDate, endDate;
    let isCurrentMonth = false;

    if (query.month && query.year) {
      const month = parseInt(query.month, 10) - 1;
      const year = parseInt(query.year, 10);
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const firstCheckInDate = new Date(firstEntry.checkInTime);
      const firstCheckInMonth = firstCheckInDate.getMonth();
      const firstCheckInYear = firstCheckInDate.getFullYear();

      if (
        year > currentYear ||
        (year === currentYear && month > currentMonth) ||
        year < firstCheckInYear ||
        (year === firstCheckInYear && month < firstCheckInMonth)
      ) {
        startDate = null;
        endDate = null;
      } else {
        startDate = year === firstCheckInYear && month === firstCheckInMonth
          ? new Date(firstCheckInDate)
          : new Date(year, month, 1);
        startDate.setHours(0, 0, 0, 0);

        endDate = year === currentYear && month === currentMonth
          ? new Date().setHours(23, 59, 59, 999)
          : new Date(year, month + 1, 0, 23, 59, 59);
        endDate = new Date(endDate);

        // Set the flag if it's the current month
        isCurrentMonth = year === currentYear && month === currentMonth;
      }
    } else {
      startDate = new Date(firstEntry.checkInTime);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const daysArray = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      daysArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch all records in range
    const [attendanceRecords, workSessionRecords, leaveRecords, holidays, empRequest] = await Promise.all([
      dbService.findMany(attendance, {
        userId,
        checkInTime: {
          $gte: startDate,
          $lte: endDate
        },
      }),
      dbService.findMany(workSession, {
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        },
      }),
      dbService.findMany(leave, {
        employeeId: userId,
        leaveStatus: 1,
        leaveDate: {
          $gte: startDate,
          $lte: endDate
        },
      }),
      dbService.findMany(holiday, {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      }),
      dbService.findMany(employeeRequest, {
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        },
      }),
    ]);

    // Preprocess to maps
    const attendanceMap = new Map();
    attendanceRecords.forEach((att) => {
      const dateKey = new Date(att.checkInTime).toDateString();
      const {
        isActive, isDeleted, addedBy, updatedBy, updatedAt, userId, ...rest
      } = att._doc;
      attendanceMap.set(dateKey, rest);
    });
    
    const leaveMap = new Map();
    leaveRecords.forEach((lv) => {
      const { startDate, endDate } = lv
      let currenttt = new Date(startDate);
      const lastttt = new Date(endDate);
      while (currenttt <= lastttt) {
        const dateKey = currenttt.toDateString();
        leaveMap.set(dateKey, lv);
        currenttt.setDate(currenttt.getDate() + 1);
      }
    });

    const workSessionsByDate = workSessionRecords.reduce((acc, session) => {
      const dateStr = new Date(session.createdAt).toDateString();
      acc[dateStr] = acc[dateStr] || [];
      acc[dateStr].push(session);
      return acc;
    }, {});
    const employeeRequestByDate = empRequest.reduce((acc, request) => {
      const dateStr = new Date(request.createdAt).toDateString();
      acc[dateStr] = acc[dateStr] || [];
      acc[dateStr].push(request);
      return acc;
    }, {});

    const holidayList = holidays.map(h => ({
      start: new Date(h.startDate).setHours(0, 0, 0, 0),
      end: new Date(h.endDate).setHours(23, 59, 59, 999),
      data: h,
    }));

    const finalData = [];
    for (const date of daysArray) {
      const dateStr = date.toDateString();
      const checkDate = date.setHours(0, 0, 0, 0);

      if (attendanceMap.has(dateStr)) {
        finalData.push({
          ...attendanceMap.get(dateStr),
          workSessions: workSessionsByDate[dateStr] || [],
          employeeRequestData: employeeRequestByDate[dateStr] || [],

          createdAt: date,
        });
      } else if (leaveMap.has(dateStr)) {
        finalData.push({
          ...leaveMap.get(dateStr)._doc,
          attendanceStatus: 2,
          createdAt: date,
          _id: new mongoose.Types.ObjectId(),
          workSessions: workSessionsByDate[dateStr] || [],
          employeeRequestData: employeeRequestByDate[dateStr] || [],
        });
      } else {
        const holidayMatch = holidayList.find(
          (h) => checkDate >= h.start && checkDate <= h.end
        );
        if (holidayMatch) {
          finalData.push({
            attendanceStatus: 3,
            _id: new mongoose.Types.ObjectId(),
            ...holidayMatch.data._doc,
            workSessions: workSessionsByDate[dateStr] || [],
            employeeRequestData: employeeRequestByDate[dateStr] || [],

            createdAt: date,
          });
        } else {
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          finalData.push({
            attendanceStatus: isWeekend ? 4 : 0,
            createdAt: date,
            _id: new mongoose.Types.ObjectId(),
            workSessions: workSessionsByDate[dateStr] || [],
            employeeRequestData: employeeRequestByDate[dateStr] || [],

          });
        }
      }
    }

    // Sorting based on the month
    if (isCurrentMonth) {
      finalData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // DESC for current month
    } else {
      finalData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // ASC for other months
    }

    const paginatedData = finalData.slice(offset, offset + limit);
    const itemCount = finalData.length;
    const pageCount = Math.ceil(itemCount / limit);

    const paginator = {
      itemCount,
      offset,
      perPage: limit,
      pageCount,
      currentPage: page,
      slNo: offset + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < pageCount,
      prev: page > 1 ? page - 1 : null,
      next: page < pageCount ? page + 1 : null,
    };

    return res.success({
      data: {
        data: paginatedData,
        paginator,
      },
    });
  } catch (error) {
    console.error('Error in getAttendanceList:', error);
    return res.internalServerError({ message: error.message });
  }
};

exports.getAttendanceDetails = async (req, res) => {
  try {
    const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
    dayjs.extend(isSameOrBefore);
    const userData = req['user-data'];
    const period = req.query['period'] || 'day';
    const userId = userData._id;

    if (!userId) {
      return res.badRequest({ message: 'User ID is required.', });
    }

    let startDate, endDate;
    const today = dayjs().startOf('day');

    switch (period) {
    case 'day':
      startDate = today;
      endDate = today.add(1, 'day');
      break;
    case 'week':
      startDate = today.startOf('week');
      endDate = startDate.add(7, 'day');
      break;
    case 'month':
      startDate = today.startOf('month');
      endDate = startDate.add(1, 'month');
      break;
    default:
      return res.badRequest({ message: 'Invalid period. Use "day", "week", or "month".', });
    }

    // Get attendance records for the period
    const attendanceRecords = await attendance
      .find({
        userId: userId,
        createdAt: {
          $gte: startDate.toDate(),
          $lt: endDate.toDate(),
        },
      })
      .sort({ createdAt: 1 });

    // Get work sessions for the period
    const workSessions = await workSession
      .find({
        userId: userId,
        startTime: {
          $gte: startDate.toDate(),
          $lt: endDate.toDate(),
        },
      })
      .sort({ startTime: 1 });

    if (attendanceRecords.length === 0 && workSessions.length === 0) {
      return res.recordNotFound({ message: `No attendance data found for the ${period}`, });
    }

    // Helper functions
    const calculateHours = (start, end) => {
      return start && end ? dayjs(end).diff(dayjs(start), 'hour', true) : 0;
    };

    const formatTime = (time) =>
      time ? dayjs(time).format('hh:mm:ss A') : 'N/A';

    function formatDecimalHours (decimalHours) {
      const totalMinutes = decimalHours * 60;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      const seconds = Math.floor((decimalHours * 3600) % 60);
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      return formattedTime;
    }

    // Process daily data
    const periodTableData = [];
    const periodChartData = [];
    let dailyDetails = null;
    const workSessionRecords = await dbService.findMany(workSession, {
      userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });
    const workSessionsByDate = workSessionRecords.reduce((acc, session) => {
      const dateStr = new Date(session.createdAt).toDateString();
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(session);
      return acc;
    }, {});
    for (
      let date = startDate;
      date.isSameOrBefore(endDate.subtract(1, 'day'));
      date = date.add(1, 'day')
    ) {
      const dateStr = date.format('ddd MMM DD YYYY');
      const attendanceRecord = attendanceRecords.find((record) =>
        dayjs(record.createdAt).isSame(date, 'day')
      );

      const dailyWorkSessions = workSessions.filter((session) =>
        dayjs(session.startTime).isSame(date, 'day')
      );

      let lunchHours = 0;
      let otherHours = 0;
      let workHours = 0;
      let officeHours = 0;

      if (attendanceRecord) {
        lunchHours = calculateHours(
          attendanceRecord.lunchInTime,
          attendanceRecord.lunchOutTime
        );
        officeHours = calculateHours(
          attendanceRecord.checkInTime,
          attendanceRecord.checkOutTime
        );

        attendanceRecord.otherTime.forEach((time) => {
          otherHours += calculateHours(
            time.otherCheckInTime,
            time.otherCheckOutTime
          );
        });
      }

      dailyWorkSessions.forEach((session) => {
        workHours += calculateHours(session.startTime, session.endTime);
      });

      const totalHours = lunchHours + otherHours + workHours + officeHours;
      const dailyData = {
        date: date.format('DD MMM YYYY'),
        attendanceStatus: attendanceRecord
          ? attendanceRecord.attendanceStatus
          : 0,
        officeIn: formatTime(attendanceRecord?.checkInTime),
        lunchIn: formatTime(attendanceRecord?.lunchInTime),
        lunchOut: formatTime(attendanceRecord?.lunchOutTime),
        officeOut: formatTime(attendanceRecord?.checkOutTime),
        lunchHours: formatDecimalHours(lunchHours),
        otherHours: formatDecimalHours(otherHours),
        officeHours: formatDecimalHours(officeHours),
        workHours: formatDecimalHours(workHours),
        totalHours: formatDecimalHours(totalHours),
        workSessions: workSessionsByDate[dateStr] || [],
      };

      periodTableData.push(dailyData);
      periodChartData.push(parseFloat(totalHours.toFixed(2)));

      if (date.isSame(today, 'day')) {
        dailyDetails = dailyData;
      }
    }

    // Prepare daily attendance chart data
    const dailyAttendanceChart = {
      categories: ['Lunch Hour', 'Other Hour', 'Work Hour', 'Office Hour'],
      series: [
        {
          name: 'Hours',
          data: dailyDetails
            ? [
              parseFloat(dailyDetails.lunchHours),
              parseFloat(dailyDetails.otherHours),
              parseFloat(dailyDetails.workHours),
              parseFloat(dailyDetails.officeHours),
            ]
            : [0, 0, 0, 0],
        },
      ],
    };

    // Prepare period chart data
    const periodChart = {
      categories: periodTableData.map((data) => {
        if (period === 'week') {
          return dayjs(data.date).format('ddd');
        } else if (period === 'month') {
          return dayjs(data.date).date();
        } else {
          return data.date;
        }
      }),
      series: [
        {
          name: 'Total Hours',
          data: periodChartData,
        },
      ],
    };

    return res.success({
      message: `Attendance details retrieved successfully for the ${period}`,
      data: {
        dailyAttendanceChart,
        periodChart,
        dailyDetails,
        periodTableData,
      },
    });
  } catch (error) {
    console.error('Error in getAttendanceDetails:', error);
    return res.internalServerError({ message: error.message });
  }
};
