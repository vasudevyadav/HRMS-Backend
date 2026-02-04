const Sprint = require('../../model/sprint');
const user = require('../../model/user');
const dbService = require('../../utils/dbService');

// Helper function to validate sprint fields
const validateSprint = ({
  sprintName, startDate, sprintDuration, projectId 
}) => {
  if (!sprintName || !startDate || !sprintDuration || !projectId) {
    return 'sprintName, startDate, projected and sprintDuration are required.';
  }
  /*
   *   const validStartDate = new Date(startDate);
   *   const validCompletionDate = new Date(completionDate);
   *   if (isNaN(validStartDate.getTime()) || isNaN(validCompletionDate.getTime())) {
   *     return 'Invalid date format';
   *   }
   */
  
  return null;
};

// Helper function to check sprint name existence
const checkSprintNameExists = async (sprintName, excludeId) => {
  let where = {
    sprintName,
    isDeleted: false 
  };
  if (excludeId) { where._id = { $ne: excludeId }; };
  const sprint = await Sprint.findOne(where);
  return !!sprint;
};

// Helper function to populate sprint details
const populateSprint = async (sprint) => {
  if (!sprint) return null;
  return await Sprint.findOne({
    _id: sprint._id,
    isDeleted: false 
  }).populate({
    path: 'projectId',
    select: 'projectName'
  });
};

const checkProjectExists = async (projectId, excludeId) => {
  const sprint = await Sprint.findOne({
    projectId,
    _id: { $ne: excludeId },
    isDeleted: false 
  });
  return sprint;
};
const isNonWorkingDay = (date, nonWorkingDays) => {
  if (!Array.isArray(nonWorkingDays) || nonWorkingDays.length === 0) {
    // If no non-working days specified, consider every day as working
    return false;
  }
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return nonWorkingDays.includes(dayOfWeek);
};

const addDaysSkippingNonWorkingDays = (startDate, numDays, nonWorkingDays) => {
  const start = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < numDays) {
    if (!isNonWorkingDay(start, nonWorkingDays)) {
      daysAdded++;
    }
    // Move to the next day only after checking the current day
    if (daysAdded < numDays) {
      start.setDate(start.getDate() + 1);
    }
  }

  return start;
};

const extractDaysFromDuration = (duration) => {
  const match = duration.match(/^(\d+)\s*days?$/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  throw new Error('Invalid duration format. Expected format is "X days".');
};

const calculateCompletionDate = (startDate, duration, nonWorkingDays) => {  
  const durationInDays = extractDaysFromDuration(duration);
  const start = new Date(startDate);
  
  const endDate = addDaysSkippingNonWorkingDays(start, durationInDays, nonWorkingDays);
  
  return endDate.toISOString();
};

const checkSprintOverlap = async (projectId, startDate, completionDate, excludeId = null) => {
  const sprints = await Sprint.find({
    projectId,
    isDeleted: false,
    _id: { $ne: excludeId },
    startDate: { $lte: new Date(completionDate) },
    completionDate: { $gte: new Date(startDate) }
  });
  return sprints.length > 0;
};
  
exports.addSprint = async (req, res) => {
  try {
    const userData = req['user-data'];
    let {
      sprintName,
      sprintUrl,
      sprintDuration,
      nonWorkingDays,
      startDate,
      description,
      projectId,
    } = req.body;
  
    const validationError = validateSprint({
      sprintName,
      startDate,
      sprintDuration,
      projectId
    });
    if (validationError) return res.badRequest({ message: validationError });
  
    if (await checkSprintNameExists(sprintName)) {
      return res.failure({ message: 'Sprint name already exists' });
    }
  
    let completionDate = req.body.completionDate;
  
    /*
     * const projectSprint = await checkProjectExists(projectId);
     * console.log('projectSprint',projectSprint);
     */
    
    /*
     * if (projectSprint) {
     *   startDate = projectSprint.completionDate;
     * }
     * console.log('startDate',startDate);
     */
    
    if (sprintDuration && sprintDuration.value) {
      const chnageNonWorkingDays = nonWorkingDays.toString().toLowerCase().split(',');
      completionDate = calculateCompletionDate(startDate, sprintDuration.value, chnageNonWorkingDays);
    }
    // Check for overlapping sprints
    if (await checkSprintOverlap(projectId, startDate, completionDate)) {
      return res.badRequest({ message: 'Sprint already existing' });
    }
  
    const dataToCreate = {
      sprintName,
      sprintUrl,
      sprintDuration: sprintDuration.value,
      nonWorkingDays: nonWorkingDays || [],
      startDate: new Date(startDate),
      completionDate: new Date(completionDate),
      description,
      projectId,
      addedBy: userData._id
    };
  
    const createSprint = await dbService.create(Sprint, dataToCreate);
    const lastInsertData = await populateSprint(createSprint);
  
    return res.success({
      message: 'Sprint created successfully',
      data: lastInsertData 
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateSprint = async (req, res) => {
  try {
    const userData = req['user-data'];
    let {
      sprintName,
      sprintUrl,
      sprintDuration,
      nonWorkingDays,
      startDate,
      description,
      projectId,
      id
    } = req.body;
  
    if (!id) return res.badRequest({ message: 'Sprint ID is required' });
  
    const validationError = validateSprint({
      sprintName,
      startDate,
      sprintDuration,
      projectId
    });
    if (validationError) return res.badRequest({ message: validationError });
    
    if (await checkSprintNameExists(sprintName, id)) {
      return res.badRequest({ message: 'Sprint name already exists' });
    }
    let completionDate = req.body.completionDate;
    
    if (sprintDuration && sprintDuration.value) {
      const chnageNonWorkingDays = nonWorkingDays.toString().toLowerCase().split(',');
      completionDate = calculateCompletionDate(startDate, sprintDuration.value, chnageNonWorkingDays);
    }
    // Check for overlapping sprints
    if (await checkSprintOverlap(projectId, startDate, completionDate, id)) {
      return res.badRequest({ message: 'Sprint dates overlap with an existing sprint' });
    }
  
    const dataToUpdate = {
      sprintName,
      sprintUrl,
      sprintDuration: sprintDuration.value,
      nonWorkingDays: nonWorkingDays || [],
      startDate: new Date(startDate),
      completionDate: new Date(completionDate),
      description,
      projectId,
    };
  
    const sprint = await Sprint.findOne({
      _id: id,
      isDeleted: false 
    });
    if (!sprint) return res.recordNotFound({ message: 'Sprint not found' });
  
    await dbService.updateOne(Sprint, { _id: id }, dataToUpdate);
    const lastInsertData = await populateSprint(sprint);
  
    return res.success({
      message: 'Sprint updated successfully',
      data: lastInsertData 
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateSprintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Sprint ID is required' });

    const sprint = await Sprint.findOne({
      _id: id,
      isDeleted: false 
    });
    if (!sprint) return res.recordNotFound({ message: 'Sprint not found' });

    const updatedSprint = await dbService.updateOne(Sprint, { _id: id }, { isActive: !sprint.isActive });
    const lastInsertData = await populateSprint(updatedSprint);

    return res.success({ data: lastInsertData });
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

    if (query.projectId){
      query.projectId = query.projectId;
    } else {
      query.projectId = null;
    }
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

exports.deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.badRequest({ message: 'Sprint ID is required' });

    const sprint = await  Sprint.findOne({
      _id: id,
      isDeleted: false 
    }).populate({
      path: 'projectId',
      select: 'projectName'
    });
    if (!sprint) return res.recordNotFound({ message: 'Sprint not found' });

    await dbService.updateOne(Sprint, { _id: id }, { isDeleted: true });
    return res.success({
      data: sprint,
      message: 'Sprint marked as deleted successfully'
    });
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};

exports.getSprintData = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.badRequest({ message: 'Sprint ID is required' });

    const sprint = await Sprint.findOne({
      projectId,
      isDeleted: false 
    }).populate({
      path: 'projectId',
      select: 'projectName'
    }).sort({ createdAt: -1 });

    if (!sprint) return res.recordNotFound({ message: 'Sprint not found' });

    return res.success({
      data: sprint,
      message: 'Get sprint data'
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};