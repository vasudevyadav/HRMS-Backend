const mongoose = require('mongoose');
const Project = require('../../model/project');
const Sprint = require('../../model/sprint');
const Task = require('../../model/task');
const dbService = require('../../utils/dbService');
const { cryptoFUN } = require('../../helpers/function');
exports.getProjectDetails = async (req, res) => {
  try {
    const userData = req['user-data'];

    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Project ID is required' });

    const project = await Project.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false,
          clientId: userData._id
        }
      },
      // After previous $lookup and $unwind stages, before $project
      {
        $lookup: {
          from: 'sprints',
          localField: '_id',
          foreignField: 'projectId',
          as: 'sprints'
        }
      },
      { $addFields: { sprintCount: { $size: '$sprints' } } },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'projectId',
          as: 'tasks'
        }
      },
      {
        $addFields: {
          pendingTaskCount: {
            $size: {
              $filter: {
                input: '$tasks',
                as: 'task',
                cond: { $in: ['$$task.status', ['Not Started', 'In Progress']] }
              }
            }
          },
          completedTaskCount: {
            $size: {
              $filter: {
                input: '$tasks',
                as: 'task',
                cond: { $eq: ['$$task.status', 'Completed'] }
              }
            }
          },
          totalTaskCount: { $size: '$tasks' }
        }
      },

      {
        $lookup: {
          from: 'users',
          localField: 'projectMembers',
          foreignField: '_id',
          as: 'projectMembers'
        }
      },
      // Populate projectOwner
      {
        $lookup: {
          from: 'users',
          localField: 'projectOwner',
          foreignField: '_id',
          as: 'projectOwner'
        }
      },
      {
        $unwind: {
          path: '$projectOwner',
          preserveNullAndEmptyArrays: true
        }
      },
      // Populate clientId
      {
        $lookup: {
          from: 'users', // Target collection (user model)
          localField: 'clientId', // Field in 'client' collection
          foreignField: 'clientId', // Field in 'user' collection
          as: 'clientId'
        }
      },
      {
        $unwind: {
          path: '$clientId',
          preserveNullAndEmptyArrays: true
        }
      },
      // Final shape
      {
        $project: {
          sprintCount: 1,
          totalTaskCount: 1,
          pendingTaskCount: 1,
          completedTaskCount: 1,
          projectName: 1,
          projectStatus: 1,
          startDate: 1,
          endDate: 1,
          priority: 1,
          privacy: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          projectMembers: {
            $map: {
              input: '$projectMembers',
              as: 'member',
              in: {
                _id: '$$member._id',
                firstName: '$$member.firstName',
                lastName: '$$member.lastName',
                employeeCode: '$$member.employeeCode',
                primaryEmail: '$$member.primaryEmail'
              }
            }
          },
          projectOwner: {
            _id: '$projectOwner._id',
            firstName: '$projectOwner.firstName',
            lastName: '$projectOwner.lastName',
            employeeCode: '$projectOwner.employeeCode'
          },
          clientId: {
            _id: '$clientId._id',
            firstName: '$clientId.firstName',
            lastName: '$clientId.lastName'
          }
        }
      }
    ]);

    if (project.length === 0) {
      return res.recordNotFound({ message: 'Project not found' });
    }

    project[0].projectMembers = project[0].projectMembers.map(member => {
      member.primaryEmail = cryptoFUN(member.primaryEmail, 'decrypt');
      return member;
    });

    return res.success({
      data: project[0],
      message: 'Project details fetched successfully'
    });
  } catch (error) {
    console.error('Error in getProjectDetails:', error);
    return res.internalServerError({ message: error.message });
  }
};

exports.getProjectList = async (req, res) => {
  try {
    const userData = req['user-data'];
    const {
      query = {}, search, isCountOnly, options = {}
    } = req.body;

    if (search) {
      query.$or = [
        {
          projectName: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          description: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    // query.addedBy = userData._id;
    query.isDeleted = false;
    query.clientId = userData._id;

    if (isCountOnly) {
      const totalRecords = await dbService.count(Project, query);
      return res.success({ data: { totalRecords } });
    }
    if (!options.populate) {
      options.populate = [];
    }

    options.populate.push(
      {
        path: 'projectOwner',
        select: 'firstName lastName employeeCode',
      },
      {
        path: 'projectMembers',
        select: 'firstName lastName employeeCode',
      },
      {
        path: 'clientId',
        select: '_id firstName lastName clientId',
      },
      {
        path: 'clientDetails',
        select: '_id firstName lastName'
      },
      {
        path: 'sprints',
        select: 'sprintName',
        match: { isDeleted: false },
      }
    );
    options.projection = { isDeleted: 0 };
    options.sort = { createdAt: -1 };
    const foundProjects = await dbService.paginate(Project, query, options);
    if (!foundProjects || !foundProjects.data || !foundProjects.data.length) {
      return res.recordNotFound();
    }

    return res.success({ data: foundProjects });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getSprintDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Sprint ID is required' });

    const sprint = await Sprint.findOne({
      _id: id,
      isDeleted: false
    }).populate({
      path: 'projectId',
      select: 'projectName'
    });

    if (!sprint) return res.recordNotFound({ message: 'Sprint not found' });

    return res.success({
      data: sprint,
      message: 'Sprint details fetched successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getSprintList = async (req, res) => {
  try {
    const {
      query = {}, search, isCountOnly, options = {}
    } = req.body;

    if (search) {
      query.$or = [
        {
          sprintName: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          description: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    if (query.projectId) {
      query.projectId = query.projectId;
    } else {
      query.projectId = null;
    }
    // query.addedBy = userData._id;
    query.isDeleted = false;

    if (isCountOnly) {
      const totalRecords = await dbService.count(Sprint, query);
      return res.success({ data: { totalRecords } });
    }

    options.projection = { isDeleted: 0 };
    const foundSprints = await dbService.paginate(Sprint, query, options);
    if (!foundSprints || !foundSprints.data || !foundSprints.data.length) {
      return res.recordNotFound();
    }

    return res.success({ data: foundSprints });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Task ID is required' });

    const task = await Task.findOne({
      _id: id,
      isDeleted: false
    });
    if (!task) return res.recordNotFound({ message: 'Task not found' });

    const taskDetails = await populateTask(task);

    return res.success({
      data: taskDetails,
      message: 'Task details fetched successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getTaskList = async (req, res) => {
  try {
    const {
      query = {}, search, isCountOnly, options = {}
    } = req.body;

    if (search) {
      query.$or = [
        {
          taskName: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          taskDescription: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    query.isDeleted = false;
    if (query.projectId) {
      query.projectId = query.projectId;
    }
    if (query.sprintId) {
      query.sprintId = query.sprintId;
    }

    if (isCountOnly) {
      const totalRecords = await dbService.count(Task, query);
      return res.success({ data: { totalRecords } });
    }
    if (!options.populate) {
      options.populate = [];
    }

    options.populate.push(
      {
        path: 'projectId',
        select: 'projectName',
      },
      {
        path: 'sprintId',
        select: 'sprintName',
      },
      {
        path: 'taskAssigneeId',
        select: 'firstName lastName',
      }
    );

    options.projection = { isDeleted: 0 };
    options.sort = { createdAt: -1 };
    const foundTask = await dbService.paginate(Task, query, options);
    if (!foundTask || !foundTask.data || !foundTask.data.length) {
      return res.recordNotFound();
    }

    return res.success({ data: foundTask });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};