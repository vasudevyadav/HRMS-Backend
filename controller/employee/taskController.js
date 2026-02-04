const Project = require('../../model/project');
const Sprint = require('../../model/sprint');
const Task = require('../../model/task');
const taskHistory = require('../../model/taskHistory');
const dbService = require('../../utils/dbService');

// Helper function to validate sprint fields
const validateTask = ({
  taskAssigneeId, taskName, startDate, endDate, taskPriority, taskType, taskDescription
}) => {
  if (!taskAssigneeId || !taskName || !startDate || !endDate || !taskPriority || !taskType || !taskDescription) {
    return 'assignee, taskName, startDate, endDate, taskPriority, taskType and taskDescription  are required.';
  }

  const validStartDate = new Date(startDate);
  const validEndDate = new Date(endDate);
  if (isNaN(validStartDate.getTime()) || isNaN(validEndDate.getTime())) {
    return 'Invalid date format';
  }
  return null;
};

// Helper function to populate sprint details
const populateTask = async (task) => {
  if (!task) return null;
  return await Task.findOne({
    _id: task._id,
    isDeleted: false
  }).populate({
    path: 'projectId',
    select: 'projectName'
  }).populate({
    path: 'sprintId',
    select: 'sprintName'
  }).populate({
    path: 'taskAssigneeId',
    select: 'firstName lastName'
  });
};

exports.addTask = async (req, res) => {
  try {
    const userData = req['user-data'];
    /*
     * let {
     * projectId,
     * sprintId,
     * taskAssigneeId,
     * taskName,
     * taskUrl,
     * taskPriority,
     * taskType,
     * startDate,
     * endDate,
     * taskDescription,
     * } = req.body; 
     */

    const validationError = validateTask({ ...req.body });
    if (validationError) return res.badRequest({ message: validationError });

    const dataToCreate = {
      ...req.body,
      addedBy: userData._id
    };
    if (!dataToCreate.projectId) delete dataToCreate.projectId;
    if (!dataToCreate.sprintId) delete dataToCreate.sprintId;
    const createTask = await dbService.create(Task, dataToCreate);
    const lastInsertData = await populateTask(createTask);

    return res.success({
      message: 'Task created successfully',
      data: lastInsertData
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const userData = req['user-data'];
    /*
     * let {
     * sprintName,
     * sprintUrl,
     * sprintDuration,
     * nonWorkingDays,
     * startDate,
     * description,
     * projectId,
     * id
     * } = req.body; 
     */

    if (!req.body.id) return res.badRequest({ message: 'Task ID is required' });
    const validationError = validateTask({ ...req.body });
    if (validationError) return res.badRequest({ message: validationError });

    const task = await Task.findOne({
      _id: req.body.id,
      isDeleted: false
    });
    if (!task) return res.recordNotFound({ message: 'Task not found' });

    const dataToUpdate = {
      ...req.body,
      updatedBy: userData._id
    };
    await dbService.updateOne(Task, { _id: req.body.id }, dataToUpdate);
    const lastInsertData = await populateTask(task);

    return res.success({
      message: 'Task updated successfully',
      data: lastInsertData
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) return res.badRequest({ message: 'Task ID is required' });
    if (!status) return res.badRequest({ message: 'Status is required' });

    const task = await Task.findOne({
      _id: id,
      isDeleted: false
    });
    if (!task) return res.recordNotFound({ message: 'Task not found' });

    // If already completed, and trying to complete again
    if (task.status === 'Completed' && status === 'Completed') {
      return res.failure({ message: 'Task is already completed' });
    }
    const userData = req['user-data'];

    const updatedTask = await dbService.updateOne(Task, { _id: id }, {
      status,
      updatedBy: userData._id  // ✅ pass the user ID here
    });
    const lastInsertData = await populateTask(updatedTask);

    return res.success({ data: lastInsertData });
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
    const userData = req['user-data'];
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

    query.taskAssigneeId = userData._id;
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

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Task ID is required' });

    const task = await Task.findOne({
      _id: id,
      isDeleted: false
    });
    if (!task) return res.recordNotFound({ message: 'Task not found' });

    await dbService.updateOne(Task, { _id: id }, { isDeleted: true });
    const taskDetails = await populateTask(task);
    return res.success({
      data: taskDetails,
      message: 'Task marked as deleted successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};

exports.getTaskHistory = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.badRequest({ message: 'Task ID is required' });

    const history = await taskHistory.find({ taskId })
      .populate('changedBy', 'firstName lastName') // get user info
      .sort({ createdAt: -1 });

    if (!history) return res.recordNotFound({ message: 'Task history not found' });
    return res.success({
      data: history,
      message: 'Task history fetched successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.projectList = async (req, res) => {
  try {
    const projects = await Project.find({
      isActive: true,
      isDeleted: false
    }).sort({ createdAt: -1 });

    if (projects.length == 0) return res.recordNotFound({ message: 'Projects not found' });

    return res.success({
      data: projects,
      message: 'Get projects list'
    });
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};

exports.getSprintList = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.badRequest({ message: 'Sprint ID is required' });

    const sprint = await Sprint.find({
      projectId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    if (!sprint) return res.recordNotFound({ message: 'Sprints not found' });

    return res.success({
      data: sprint,
      message: 'Get sprint list'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};