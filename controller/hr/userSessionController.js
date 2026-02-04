const { session } = require('../../model');
const {
  generateStrongPassword,
  validateNumbers,
  checkUser,
  validateDates,
} = require('../../helpers/function');
const dbService = require('../../utils/dbService');
exports.getEmployeeSessionList = async (req, res) => {
  try {
    const { _id: employeeId } = req['user-data'];
    let {
      search, query = {}, options = {}, isCountOnly 
    } = req.body;

    // Initialize query and options
    query = query || {};
    options = options || {};

    // MongoDB aggregation pipeline
    const pipeline = [
      {
        $match: {
          ...query,
          deviceType: 'PRIMARY',
          isActive: true,
        }
      }, // Match the query criteria
      { $sort: { createdAt: -1 } }, // Sort by createdAt in descending order
      {
        $group: {
          _id: '$userId', // Group by userId
          latestSession: { $first: '$$ROOT' } // Get the first document in each group
        }
      },
      { $replaceRoot: { newRoot: '$latestSession' } }, // Replace the root with the latest session
      {
        $lookup: {
          from: 'users', // Collection name where user details are stored
          localField: 'userId',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { 
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: true 
        }
      }, // Unwind the userData array
    ];

    // Add search condition for username
    if (search) {
      pipeline.push({
        $match: {
          'userData.firstName': { $regex: search, $options: 'i' }
        }
      });
    }

    // Add final projection
    pipeline.push({
      $project: {
        'userData.firstName': 1,
        'userData.lastName': 1,
        _id: 1,
        userId: 1,
        deviceDetails: 1,
        deviceType: 1,
        createdAt: 1,
        loginIPs: 1,
      }
    });

    // Fetching results from aggregation pipeline with pagination
    const latestSessions = await dbService.aggregatePaginate(session, pipeline, options);

    // Handle no records found
    if (!latestSessions.data.length) {
      return res.recordNotFound();
    }

    // Return success response with found sessions
    return res.success({
      status: 'SUCCESS',
      message: 'Your request is successfully executed',
      data: latestSessions
    });
  } catch (error) {
    console.error('Error:', error); // Log the error for debugging
    return res.internalServerError({ message: error.message });
  }
};


exports.getEmployeeSessionDetails = async (req, res) => {
  try {
    let options = {};
    let query = {};
    query.isDeleted = false;
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(session, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body.search) {
    }

    if (
      req.body &&
      typeof req.body.options === 'object' &&
      req.body.options !== null
    ) {
      options = { ...req.body.options };
    }
    query.isActive = true;
    // Configure populate
    if (!options.populate) {
      options.populate = [];
    }
    options.populate.push({
      path: 'userId',
      select: 'firstName',
    });

    options.projection = {
      _id: 1,
      userId: 1,
      deviceDetails: 1,
      deviceType: 1,
      createdAt: 1,
      loginIPs: 1,
    };

    let foundUserDepartment = await dbService.paginate(
      session,
      query,
      options
    );
    if (
      !foundUserDepartment ||
      !foundUserDepartment.data ||
      !foundUserDepartment.data.length
    ) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUserDepartment });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.terminateSession = async (req, res, next) => {
  try {
    const {
      type, userIds 
    } = req.body;
    
    // Check if all required fields are provided
    if (!type) {
      return res.badRequest({ message: 'type is a required field.' });
    }  
    if (!userIds || userIds.length === 0) {
      return res.badRequest({ message: 'userIds is a required field.' });
    }

    // Build the where condition based on type
    let where = { userId: userIds };
    if (type == 2) {
      where = { _id: userIds };
    }

    // Perform the update operation
    const updateData = await session.updateMany(where, { isActive: false });

    // Check if update was successful
    if (updateData[0] === 0) {
      return res.failure({ message: 'Failed to update data' });
    }

    return res.success({ message: 'User sessions have been deactivated successfully.' });
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};
