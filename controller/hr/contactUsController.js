const {
  career, contactUs 
} = require('../../model');
const { validateDates } = require('../../helpers/function');
const dbService = require('../../utils/dbService');

exports.submitContactUs = async (req, res, next) => {
  try {
    const {
      fullName, emailAddress, subject, phoneNumber, message 
    } = req.body;
  
    // Check if all required fields are provided
    if (!fullName || !emailAddress || !subject || !phoneNumber || !message) {
      return res.badRequest({ message: 'fullName, emailAddress, subject, phoneNumber, message are required fields.', });
    }
  
    // Data to be created
    const dataToCreate = {
      fullName,
      emailAddress,
      subject,
      phoneNumber,
      message,
    };
  
    // Attempt to create the contact us entry
    const createContactUs = await dbService.create(contactUs, dataToCreate);
  
    if (!createContactUs) {
      return res.failure({ message: 'Failed to submit contact us request.' });
    }
  
    return res.success({ message: 'Contact Us submitted successfully. An admin will connect with you as soon as possible.' });
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};
  
exports.getContactUsList = async (req, res) => {
  try {
    const userData = req['user-data'];
    let options = {};
    let query = {};
    query.isDeleted = false;
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(contactUs, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body.search) {
      // Using regex to search across multiple fields
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
          subject: {
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
        {
          message: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
      ];
    }

    if (
      req.body &&
      typeof req.body.options === 'object' &&
      req.body.options !== null
    ) {
      options = { ...req.body.options };
    }
    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };
    let foundBlogData = await dbService.paginate(contactUs, query, options);
    if (!foundBlogData || !foundBlogData.data || !foundBlogData.data.length) {
      return res.recordNotFound();
    }
    return res.success({ data: foundBlogData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getCarrerList = async (req, res) => {
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
      // Using regex to search across multiple fields
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

    if (typeof options === 'object' && options !== null) {
      options = { ...options };
    }

    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };

    let foundBlogData = await dbService.paginate(career, query, options);
    if (!foundBlogData || !foundBlogData.data || !foundBlogData.data.length) {
      return res.recordNotFound();
    }
    foundBlogData.imageUrl = `${process.env.BASE_URL}/career`;
    return res.success({ data: foundBlogData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
