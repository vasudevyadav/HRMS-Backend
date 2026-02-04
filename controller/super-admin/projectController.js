/* eslint-disable linebreak-style */
const mongoose = require('mongoose');
const Project = require('../../model/project');
const user = require('../../model/user');
const dbService = require('../../utils/dbService');
const { cryptoFUN } = require('../../helpers/function');

// Helper function to validate project fields
const validateProject = ({
  projectName, startDate, endDate, priority, privacy
}) => {
  const validPriorities = ['Low', 'Medium', 'High', 'Urgent', 'No Priority'];
  const validPrivacyOptions = ['Public', 'Private'];

  if (!projectName || !startDate || !endDate) return 'projectName, startDate, and endDate are required.';
  if (priority && !validPriorities.includes(priority)) return `Invalid priority value. Allowed values are ${validPriorities.join(', ')}.`;
  if (privacy && !validPrivacyOptions.includes(privacy)) return `Invalid privacy value. Allowed values are ${validPrivacyOptions.join(', ')}.`;

  const validStartDate = new Date(startDate);
  const validEndDate = new Date(endDate);
  if (isNaN(validStartDate.getTime()) || isNaN(validEndDate.getTime())) return 'Invalid date format';

  return null;
};

// Helper function to check project name existence
const checkProjectNameExists = async (projectName, excludeId) => {
  const project = await Project.findOne({
    projectName,
    _id: { $ne: excludeId },
    isDeleted: false
  });
  return !!project;
};

// Helper function to check for duplicate members
const hasDuplicateMembers = (members) => new Set(members).size !== members.length;

// Helper function to populate and decrypt project members
const populateAndDecryptMembers = async (project) => {
  if (!project) return null;
  const populatedProject = await Project.findOne({
    _id: project._id,
    isDeleted: false
  }).populate({
    path: 'projectMembers',
    select: 'firstName primaryEmail'
  }).populate({
    path: 'projectOwner',
    select: 'firstName'
  });

  populatedProject.projectMembers = populatedProject.projectMembers.map(member => {
    member.primaryEmail = cryptoFUN(member.primaryEmail, 'decrypt');
    return member;
  });
  return populatedProject;
};

exports.addProject = async (req, res) => {
  try {
    const userData = req['user-data'];
    const {
      projectName,
      projectOwner,
      description,
      priority,
      startDate,
      endDate,
      projectMembers,
      privacy,
      projectStatus,
      clientId
    } = req.body;

    const validationError = validateProject({
      projectName,
      startDate,
      endDate,
      priority,
      privacy
    });
    if (validationError) return res.badRequest({ message: validationError });

    if (await checkProjectNameExists(projectName)) {
      return res.badRequest({ message: 'Project name already exists' });
    }
    if (hasDuplicateMembers(projectMembers)) {
      return res.badRequest({ message: 'Duplicate project members are not allowed' });
    }

    const dataToCreate = {
      projectName,
      description,
      projectOwner,
      priority: priority || 'Medium',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      projectMembers: projectMembers || [],
      privacy: privacy || 'Public',
      projectStatus,
      clientId,
      addedBy: userData._id,
      updatedBy: userData._id,
    };

    const createProject = await dbService.create(Project, dataToCreate);
    const lastInsertData = await populateAndDecryptMembers(createProject);

    return res.success({
      message: 'Project created successfully',
      data: lastInsertData
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const {
      id, projectName, description, priority, startDate, endDate, projectMembers, privacy, projectStatus, projectOwner,
      clientId
    } = req.body;

    if (!id) return res.badRequest({ message: 'Project ID is required' });

    const validationError = validateProject({
      projectName,
      startDate,
      endDate,
      priority,
      privacy
    });
    if (validationError) return res.badRequest({ message: validationError });

    if (await checkProjectNameExists(projectName, id)) {
      return res.badRequest({ message: 'Project name already exists' });
    }
    if (hasDuplicateMembers(projectMembers)) {
      return res.badRequest({ message: 'Duplicate project members are not allowed' });
    }

    const project = await Project.findOne({
      _id: id,
      isDeleted: false
    });
    if (!project) return res.recordNotFound({ message: 'Project not found' });
    const dataToUpdate = {
      projectName,
      description,
      priority: priority || 'Medium',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      projectMembers: projectMembers || [],
      privacy: privacy || 'Public',
      projectStatus,
      clientId,
      updatedBy: project._id,
      projectOwner
    };

    await dbService.updateOne(Project, { _id: id }, dataToUpdate);
    const lastInsertData = await populateAndDecryptMembers(project);

    return res.success({
      message: 'Project updated successfully',
      data: lastInsertData
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Project ID is required' });

    const project = await Project.findOne({
      _id: id,
      isDeleted: false
    });
    if (!project) return res.recordNotFound({ message: 'Project not found' });

    const updatedProject = await dbService.updateOne(Project, { _id: id }, { isActive: !project.isActive });
    const lastInsertData = await populateAndDecryptMembers(updatedProject);

    return res.success({ data: lastInsertData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Project ID is required' });

    const project = await Project.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: false
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
          from: 'users',
          localField: 'clientId',
          foreignField: 'clientId',
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
                primaryEmail: '$$member.primaryEmail',
                lastName: '$$member.lastName',
                employeeCode: '$$member.employeeCode',

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
    const page = Math.max(parseInt(req.body.options.page) || 1, 1);
    const limit = Math.max(parseInt(req.body.options.limit) || 5, 1);
    const skip = (page - 1) * limit;

    const matchStage = { isDeleted: false };

    // 1. Pehle total count nikal lo matching documents ka
    const totalCountAgg = await Project.aggregate([
      { $match: matchStage },
      { $count: 'count' }
    ]);
    const totalDocs = totalCountAgg.length > 0 ? totalCountAgg[0].count : 0;

    // 2. Fir aggregate pipeline with skip and limit for pagination
    const aggregateQuery = Project.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },

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

      {
        $lookup: {
          from: 'users',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientId'
        }
      },
      {
        $unwind: {
          path: '$clientId',
          preserveNullAndEmptyArrays: true
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
      {
        $lookup: {
          from: 'sprints',
          localField: '_id',
          foreignField: 'projectId',
          as: 'sprints'
        }
      },

      // Sprint count addFields
      { $addFields: { sprintCount: { $size: '$sprints' } } },

      // Tasks lookup
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'projectId',
          as: 'tasks'
        }
      },

      // Task counts addFields
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
        $project: {
          __v: 1,
          _id: 1,
          id: '$_id',
          projectName: 1,
          description: 1,
          projectOwner: {
            _id: '$projectOwner._id',
            firstName: '$projectOwner.firstName',
            lastName: '$projectOwner.lastName',
            employeeCode: '$projectOwner.employeeCode',
          },
          clientDetails: {
            _id: '$clientId._id',
            clientId: '$clientId.clientId',
            firstName: '$clientId.firstName',
            lastName: '$clientId.lastName'
          },
          projectStatus: 1,
          priority: 1,
          startDate: 1,
          endDate: 1,
          projectMembers: {
            $map: {
              input: '$projectMembers',
              as: 'member',
              in: {
                _id: '$$member._id',
                firstName: '$$member.firstName',
                lastName: '$$member.lastName',
                employeeCode: '$$member.employeeCode'
              }
            }
          },
          sprintCount: 1,
          pendingTaskCount: 1,
          completedTaskCount: 1,
          totalTaskCount: 1,
          privacy: 1,
          isActive: 1,
          addedBy: 1,
          updatedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          key: 1,
          sprints: {
            _id: '$sprints._id',
            sprintName: '$sprints.sprintName',
            projectId: '$sprints.projectId'
          },
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    const docs = await aggregateQuery.exec();

    // Calculate pagination meta
    const totalPages = Math.ceil(totalDocs / limit);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    const foundProjects = {
      data: docs,
      paginator: {
        itemCount: totalDocs,
        perPage: limit,
        pageCount: totalPages,
        currentPage: page,
        slNo: skip + 1,
        hasPrevPage,
        hasNextPage,
        prev: hasPrevPage ? page - 1 : null,
        next: hasNextPage ? page + 1 : null,
      },
    };

    return res.success({ data: foundProjects });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Project ID is required' });

    const project = await Project.findOne({ _id: id }).populate({
      path: 'projectMembers',
      select: 'firstName primaryEmail'
    }).populate({
      path: 'projectOwner',
      select: 'firstName'
    });
    if (!project) return res.recordNotFound({ message: 'Project not found' });

    await dbService.updateOne(Project, { _id: id }, { isDeleted: true });
    return res.success({
      data: project,
      message: 'Project marked as deleted successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};
exports.getUserList = async (req, res) => {
  try {
    const query = {
      isDeleted: false,
      isActive: true,
      userType: { $nin: [1, 4, 3] },
    };
    const users = await user.find(query, '_id firstName lastName');
    if (users && users.length > 0) {
      return res.success({
        data: users,
        message: 'User data',
      });
    } else {
      return res.recordNotFound({ message: 'User not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
