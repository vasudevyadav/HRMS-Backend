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

    if (!id || !clientId) return res.badRequest({ message: 'Project ID and clientId are required' });

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
          from: 'users', // Target collection (user model)
          localField: 'clientId', // Field in 'client' collection
          foreignField: '_id', // Field in 'user' collection
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

    query.projectOwner = userData._id;
    query.isDeleted = false;

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
      userType: { $nin: [1, 5] },
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
