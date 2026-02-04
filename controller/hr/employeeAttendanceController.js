const {
  userTokens,
  workSession,
  attendance,
  session,
  employeeRequest,
  holiday,
  leave,
  user
} = require('../../model');
const mongoose = require('mongoose');
const dbService = require('../../utils/dbService');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
const { USER_TYPES } = require('../../constants/authConstant');
const DeviceDetector = require('node-device-detector');
  
exports.getTodayAttendance = async (req, res) => {
  try {
    let {
      page, limit, search, calendarDate 
    } = req.query;
    // Ensure page and limit are positive integers
    page = Math.max(1, parseInt(page, 10));
    limit = Math.max(1, parseInt(limit, 10));

    const query = {
      userType: { $ne: USER_TYPES.SUPER_ADMIN },
      isDeleted: false,
      isActive: true 
    };
    if (search) {
      query.$or = [
        {
          firstName: {
            $regex: search,
            $options: 'i' 
          } 
        },
        {
          lastName: {
            $regex: search,
            $options: 'i' 
          } 
        },
      ];
    }
    const totalDocs = await user.countDocuments(query);
    const getUsers = await user.aggregate([
      { $match: query },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { 
        $project: { 
          _id: 1,
          firstName: 1,
          lastName: 1  
        } 
      },
    ]);
    
    const date = new Date(calendarDate);
    let startDate = new Date(calendarDate).setUTCHours(0, 0, 0, 0);
    let endDate = new Date(calendarDate).setUTCHours(23, 59, 59, 999);
    
    const finalData = [];
    let i = 0;
    for (const element of getUsers) {
      const userId  = element._id;
      let userAttenQuery = {
        $gte: startDate,
        $lte: endDate,
      };
      const attendanceRecords = await dbService.findMany(attendance, {
        userId,
        checkInTime: userAttenQuery,
      });
      
      const filteredAttendanceRecords = attendanceRecords.map((record) => {
        const {
          isActive,
          isDeleted,
          addedBy,
          updatedBy,
          updatedAt,
          userId,
          ...rest
        } = record._doc;
        return rest;
      });

      // Fetch work session records within the date range
      const workSessionRecords = await dbService.findMany(workSession, {
        userId,
        createdAt: userAttenQuery,
      });

      // Group work sessions by date
      const workSessionsByDate = workSessionRecords.reduce((acc, session) => {
        const dateStr = new Date(session.createdAt).toDateString();
        if (!acc[dateStr]) {
          acc[dateStr] = [];
        }
        acc[dateStr].push(session);
        return acc;
      }, {});
      // Fetch leave records within the date range
      const leaveRecords = await dbService.findMany(leave, {
        userId,
        leaveStatus: 1,
        leaveDate: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      // Fetch holidays within the date range
      const holidays = await dbService.findMany(holiday, {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      });

      const dateStr = date.toDateString();
      let foundRecord = filteredAttendanceRecords.find((att) => {
        return new Date(att.checkInTime).toDateString() === dateStr;
      });
  
      if (foundRecord) {
        // Include all work sessions for this date
        foundRecord.workSessions = workSessionsByDate[dateStr] || [];
        finalData.push(foundRecord);
      } else {
        const leaveRecord = leaveRecords.find((leave) => {
          return new Date(leave.leaveDate).toDateString() === dateStr;
        });
  
        if (leaveRecord) {
          finalData.push({
            attendanceStatus: 2, // on leave
            _id: new mongoose.Types.ObjectId(),
            ...leaveRecord._doc,
            workSessions: workSessionsByDate[dateStr] || [],
            createdAt: date,
          });
        } else {
          const holidayRecord = holidays.find((holiday) => {
            const holidayStart = new Date(holiday.startDate).setUTCHours(0, 0, 0, 0);;
            const holidayEnd = new Date(holiday.endDate).setUTCHours(23, 59, 59, 999);;
  
            const checkDate = date.setUTCHours(0, 0, 0, 0);
            return checkDate >= holidayStart && checkDate <= holidayEnd;
          });
          if (holidayRecord) {
            finalData.push({
              attendanceStatus: 3, // holiday
              createdAt: date,
              _id: new mongoose.Types.ObjectId(),
              ...holidayRecord._doc,
              workSessions: workSessionsByDate[dateStr] || [],
            });
          } else {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              finalData.push({
                attendanceStatus: 4, // weekend
                createdAt: date,
                _id: new mongoose.Types.ObjectId(),
                workSessions: workSessionsByDate[dateStr] || [],
              });
            } else {
              finalData.push({
                attendanceStatus: 0, // absent
                createdAt: date,
                _id: new mongoose.Types.ObjectId(),
                workSessions: workSessionsByDate[dateStr] || [],
              });
            }
          }
        }
      }
      finalData[i].userDetails = element;
      i++;
    }

    const paginator = {
      itemCount: totalDocs,
      perPage: limit,
      pageCount: Math.ceil(totalDocs / limit),
      currentPage: page,
      slNo: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page * limit < totalDocs,
      prev: page > 1 ? page - 1 : null,
      next: page * limit < totalDocs ? page + 1 : null,
    };
  
    return res.success({ 
      data: { 
        finalData, 
        paginator 
      } 
    });
  } catch (error) {
    console.error('Error in getAttendanceList:', error);
    return res.internalServerError({ message: error.message });
  }
};

exports.getSubmitRequest = async (req, res) => {
  try {
    let {
      page, limit, search 
    } = req.query;
    page = Math.max(1, parseInt(page, 10));
    limit = Math.max(1, parseInt(limit, 10));
    const options = {
      sort: { createdAt: -1 }, // Sort by createdAt in descending order
      page,
      limit,
    };
    
    const query = {};
    if (search) {
      query.$or = [
        {
          firstName: {
            $regex: search,
            $options: 'i' 
          } 
        },
      ];
    }
    if (!options.populate) {
      options.populate = [];
    }
    options.populate.push({
      path: 'userId',
      select: 'firstName lastName',
    });
    options.projection = {
      firstName: 1,
      lastName: 1,
      title: 1,
      description: 1,
      requestStatus: 1,
      createdAt: 1,
    };
    let userRequest = await dbService.paginate(employeeRequest, query, options);
    return res.success({ data: userRequest });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const userData = req['user-data'];
    const {
      requestId, requestStatus 
    } = req.body;
    if (userData.userType == 1 || userData.userType == 4) {
      const request = await employeeRequest.findByIdAndUpdate(requestId, { requestStatus }, { new: true });
      if (!request) {
        return res.notFound({ message: 'Request not found' });
      }
      const lastRecord = await employeeRequest.findOne({ _id: requestId }).populate('userId','firstName lastName');
      return res.success({ data: lastRecord });
    } else {
      return res.failure({ message: 'You are not authorised to performed any action for the request.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.markSelfAttendace = async (req, res) => {
  try {
    const userData = req['user-data'];
    const {
      employeeId, calendarDate, status 
    } = req.body;
    if (userData.userType == 1 || userData.userType == 4) {
      if (status === 'Absent'){
        let startDate = new Date(calendarDate).setUTCHours(0, 0, 0, 0);
        let endDate = new Date(calendarDate).setUTCHours(23, 59, 59, 999);
        let userAttenQuery = {
          userId: employeeId,
          checkInTime: {
            $gte: startDate,
            $lte: endDate 
          },
        };
        await attendance.deleteOne(userAttenQuery);
        return res.success({ message: 'Employee marks as absent for selected date.' });
      } else if (status === 'Present'){
        let startDate = new Date(calendarDate).setUTCHours(3, 30, 0, 0); // 9:30 AM IST is 3:30 AM UTC
        let endDate = new Date(calendarDate).setUTCHours(13, 0, 0, 0); // 6:30 PM IST is 13:00 UTC
        await dbService.create(attendance, {
          userId: employeeId,
          checkInTime: startDate,
          checkOutTime: endDate,
          attendanceStatus: 1,
        });
        return res.success({ message: 'Employee marks as present for selected date.' });
      } else {
        return res.failure({ message: 'Invalid status for update attendance.' });
      }
    } else {
      return res.failure({ message: 'You are not authorised to performed any action for the request.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};