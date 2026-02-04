const user = require('../../model/user');
const project = require('../../model/project');
const dbService = require('../../utils/dbService');
const attendance = require('../../model/attendance');
const {
  client,department 
} = require('../../model');

const { USER_TYPES } = require('../../constants/authConstant');

exports.dashboardData = async (req, res) => {
  try {
    const date = new Date();
    let startDate = new Date().setUTCHours(0, 0, 0, 0);
    let endDate = new Date().setUTCHours(23, 59, 59, 999);
    let userAttenQuery = {
      $gte: startDate,
      $lte: endDate,
    };
    const filterQuery = {
      isDeleted: false,
      isActive: true 
    };
    let totalEmployees = await dbService.count(user,{ userType:{ $ne: USER_TYPES.SUPER_ADMIN } });
    let totalPresent = await dbService.count(attendance,userAttenQuery);
    let totalProjects = await dbService.count(project,filterQuery);
    let totalClient = await dbService.count(client,filterQuery);
    let totalDepartment = await dbService.count(department,filterQuery);
    
    return res.success({
      message: 'Dashboard data successfully fetched.',
      data: {
        totalEmployees,
        totalPresent,
        totalProjects,
        totalClient,
        totalDepartment 
      },
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};