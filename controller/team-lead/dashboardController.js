/* eslint-disable linebreak-style */
const mongoose = require('mongoose');
const dbService = require('../../utils/dbService');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
const Project = require('../../model/project');
const Attendance = require('../../model/attendance');
const leaves = require('../../model/leave');
const Tasks = require('../../model/task');

exports.getDashboardData = async (req, res, next) => {
  try {
    const userData = req['user-data'];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const totalProjects = await dbService.count(Project,{
      projectMembers: userData._id,
      isDeleted: false,  
    });
    const totalTeamProjects = await dbService.count(Project,{
      projectOwner: userData._id,
      isDeleted: false,  
    });
    const totalLeaves = await dbService.count(leaves,{
      employeeId: userData._id,
      leaveStatus: 1 
    });
    const totalThisMonthAttendance = await dbService.count(Attendance,{
      userId: userData._id,
      checkInTime: {
        $gte: startOfMonth,
        $lte: endOfMonth 
      },
    });
    const totalTasks = await dbService.count(Tasks,{ taskAssigneeId: userData._id });

    return res.success({
      data: {
        totalProjects,
        totalTeamProjects,
        totalLeaves,
        totalThisMonthAttendance,
        totalTasks,
      }, 
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }

};
