const Job = require('../../model/job'); // Adjust path according to your project structure
const dbService = require('../../utils/dbService');
const { truncateText } = require('../../helpers/function');
const { career } = require('../../model');
const mongoose = require('mongoose');
// Add a new Job
exports.addJob = async (req, res) => {
  try {
    const {
      title, content, employmentTypes, role, skills, workingSchedule, locations, expiredDate, salary, benefits, experience, publishStatus
    } = req.body;

    if (!title || !content || !role || !expiredDate || !salary || !experience) {
      return res.badRequest({ message: 'Title, content, role, expiredDate, salary, and experience are required.' });
    }

    // Check if the job with the same title already exists
    const existingJob = await dbService.findOne(Job, {
      title,
      isDeleted: false,
    });

    if (existingJob) {
      return res.failure({ message: 'Job with this title already exists.' });
    }

    const jobData = {
      title,
      content,
      employmentTypes,
      role,
      skills,
      workingSchedule,
      locations,
      expiredDate,
      salary,
      benefits,
      experience,
      publishStatus
    };

    const newJob = await dbService.create(Job, jobData);

    if (!newJob) {
      return res.failure({ message: 'Failed to add job.' });
    }

    console.log('newJob',newJob);

    return res.success({
      message: 'Job added successfully.',
      data: newJob,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

// Edit an existing Job
exports.editJob = async (req, res) => {
  try {
    const {
      id, title, content, employmentTypes, role, skills, workingSchedule, locations, expiredDate, salary, benefits, experience, publishStatus
    } = req.body;

    if (!id) {
      return res.badRequest({ message: 'Job ID is required.' });
    }

    // Check if a job with the same title exists (excluding the current one being edited)
    const existingJob = await dbService.findOne(Job, {
      title,
      _id: { $ne: id },
      isDeleted: false,
    });
    if (existingJob) {
      return res.badRequest({ message: 'Job with this title already exists.' });
    }

    const updateData = {
      title,
      content,
      employmentTypes,
      role,
      skills,
      workingSchedule,
      locations,
      expiredDate,
      salary,
      benefits,
      experience,
      publishStatus
    };

    const updatedJob = await dbService.updateOne(
      Job,
      {
        _id: id,
        isDeleted: false,
      },
      updateData,
      { new: true }
    );

    if (!updatedJob) {
      return res.recordNotFound({ message: 'Job not found.' });
    }

    return res.success({
      message: 'Job updated successfully.',
      data: updatedJob,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

// Get job details by ID
exports.getJobDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Job ID is required.' });
    }

    const jobDetails = await dbService.findOne(
      Job,
      {
        _id: id,
        isDeleted: false,
      },
    );

    if (!jobDetails) {
      return res.recordNotFound({ message: 'Job not found.' });
    }

    return res.success({ data: jobDetails });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

// Get a list of Jobs
exports.getJobList = async (req, res) => {
  try {
    let options = {};
    let query = {};

    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    query.isDeleted = false;
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(Job, query);
      return res.success({ data: { totalRecords } });
    }

    if (req.body && typeof req.body.options === 'object' && req.body.options !== null) {
      options = { ...req.body.options };
    }

    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };
    options.populate = [
      { path: 'applyJobCount', }
    ];

    let foundJobList = await dbService.paginate(Job, query, options);
    if (!foundJobList || !foundJobList.data || !foundJobList.data.length) {
      return res.recordNotFound();
    }

    return res.success({ data: foundJobList });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

// Soft delete a job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Request parameter "id" is required.' });
    }

    const jobData = await Job.findOne({ _id: id, });

    if (jobData) {
      await dbService.updateOne(Job, { _id: id }, { isDeleted: true });
      const truncatedTitle = truncateText(jobData.title, 20);
      return res.success({
        data: jobData,
        message: `${truncatedTitle} job has been deleted.`,
      });
    } else {
      return res.recordNotFound({ message: 'Job not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};

// Manage Job status (active/inactive)
exports.manageJobStatus = async (req, res) => {
  try {
    const {
      id, status,
    } = req.body;

    if (!id || !status) {
      return res.badRequest({ message: 'Insufficient request parameters! id and status are required.' });
    }

    if (status === '0' || status === '1') {
      const jobData = await dbService.findOne(Job, {
        _id: id,
        isDeleted: false,
      });

      if (jobData) {
        await dbService.updateOne(Job, { _id: id }, { isActive: status === '1' });
        const updatedJob = await dbService.findOne(Job, {
          _id: id,
          isDeleted: false,
        });
        return res.success({
          message: `${status === '0' ? 'Inactive' : 'Active'} successfully`,
          data: updatedJob,
        });
      } else {
        return res.recordNotFound({ message: 'Job not found...' });
      }
    } else {
      return res.failure({ message: 'Invalid status' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getJobApplicationList = async (req, res) => {
  try {
    let { search, query = {}, options = {}, isCountOnly } = req.body;
    query.isDeleted = false;
    if (typeof query === 'object' && query !== null) {
      const formateTime = {
        startDate: query.startDate ? new Date(query.startDate) : new Date(),
        endDate: query.startDate ? new Date(query.startDate) : new Date(),
      };
      
      formateTime.startDate.setUTCHours(0, 0, 0, 0);
      formateTime.endDate.setUTCHours(23, 59, 59, 999);
    
      query.createdAt = {
        $gte: formateTime.startDate,
        $lte: formateTime.endDate
      };
      delete query.startDate;
    }
    if (isCountOnly) {
      let totalRecords = await dbService.count(career, query);
      return res.success({ data: { totalRecords } });
    }

    if (search) {
      const searchTerm = req.body.search;
      query.$or = [
        {
          fullName: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
        {
          emailAddress: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
        {
          phoneNumber: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
      ];
    }

    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };
    options.populate = {
      path: 'jobDetails',
      select: 'title' 
    };
    let foundJobList = await dbService.paginate(career, query, options);
    if (!foundJobList || !foundJobList.data || !foundJobList.data.length) {
      return res.recordNotFound();
    }

    return res.success({ data: { foundJobList, fileUrl:`${process.env.S3_IMAGE_URL}career/`} });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getJobApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Job Application ID is required.' });
    }

    const jobApplication = await career.findById(id).populate({
      path: 'jobDetails',
      select: '_id title',
    });

    if (!jobApplication) {
      return res.recordNotFound({ message: 'Job Application not found.' });
    }

    return res.success({ data: jobApplication });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
