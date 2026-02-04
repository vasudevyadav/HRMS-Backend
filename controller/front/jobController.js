const Job = require('../../model/job'); // Adjust path according to your project structure
const dbService = require('../../utils/dbService');
const { truncateText } = require('../../helpers/function');
const { applyJob } = require('../../model');
exports.getJobList = async (req, res) => {
  try {
    let options = {};
    let query = {};

    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    query.isActive = true;
    query.isDeleted = false;
    query.publishStatus = true;
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

    let foundJobList = await dbService.paginate(Job, query, options);
    if (!foundJobList || !foundJobList.data || !foundJobList.data.length) {
      return res.recordNotFound();
    }

    return res.success({ data: foundJobList });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

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
        isActive:true
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

exports.submitJobApplication = async (req, res) => {
  try {
    const {
      fullName, emailAddress, experience, phoneNumber, fileData, jobId
    } = req.body;

    // Check if all required fields are present
    if (!fullName || !emailAddress || !experience || !phoneNumber || !fileData || !jobId) {
      return res.badRequest({ message: 'Full name, email address, experience, phone number, jobId, and file data are required.' });
    }

    const checkJob = await dbService.findOne(Job, {
      _id:jobId,
      isDeleted: false,
    });
    if (!checkJob){
      return res.failure({ message: 'Invalid Job Id' });
    }
    const existingApplication = await dbService.findOne(applyJob, {
      jobId,
      emailAddress,
      isDeleted: false,
    });

    if (existingApplication) {
      return res.failure({ message: 'Application with this email address already exists.' });
    }

    // Prepare job application data
    const applicationData = {
      jobId,
      fullName,
      emailAddress,
      experience,
      phoneNumber,
      fileData,
    };

    // Create a new job application
    const newApplication = await dbService.create(applyJob, applicationData);

    if (!newApplication) {
      return res.failure({ message: 'Failed to submit job application.' });
    }

    return res.success({
      message: 'Job application submitted successfully.',
      data: newApplication,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};