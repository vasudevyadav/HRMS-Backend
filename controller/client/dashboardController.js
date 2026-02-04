const user = require('../../model/user');
const project = require('../../model/project');
const dbService = require('../../utils/dbService');
const attendance = require('../../model/attendance');
const {
  client, department
} = require('../../model');

const { USER_TYPES } = require('../../constants/authConstant');
const Project = require('../../model/project');
const Invoice = require('../../model/invoice');

exports.dashboardData = async (req, res) => {
  try {
    const userData = req['user-data'];
    let totalProjects = await dbService.count(Project, {
      clientId: userData.clientId,
      isDeleted: false, 
    });
    let totalInvoice = await dbService.count(Invoice, {
      clientId: userData.clientId,
      isDeleted: false, 
    });

    return res.success({
      message: 'Dashboard data successfully fetched.',
      data: {
        totalProjects,
        totalInvoice,
      },
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};