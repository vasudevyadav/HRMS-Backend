const countries = require('../model/country');
const state = require('../model/state');
const {
  department, user, client
} = require('../model');
const dbService = require('../utils/dbService');
/* const { imageUpload } = require('../helpers/imageFun'); */
const { imageUpload } = require('../helpers/s3ImageFun');
const { USER_TYPES } = require('../constants/authConstant');

const getCountryList = async (req, res) => {
  try {
    const getData = await countries
      .find(
        {
          isDeleted: false,
          isActive: true,
        },
        {
          _id: 1,
          countryName: 1,
        }
      )
      .sort({ displayOrder: 1 });
    return res.success({
      data: getData,
      message: 'Country List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getFilterCountryList = async (req, res) => {
  try {
    const getData = await countries
      .find(
        {},
        {
          _id: 1,
          countryName: 1,
        }
      )
      .sort({ displayOrder: 1 });
    return res.success({
      data: getData,
      message: 'Country Filter List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getStateList = async (req, res) => {
  try {
    const { countryId } = req.body;
    if (!countryId) {
      return res.badRequest({ message: 'Insufficient request parameters! countryId is required.', });
    }

    const getData = await state
      .find(
        {
          isDeleted: false,
          isActive: true,
          countryId,
        },
        {
          _id: 1,
          stateName: 1,
        }
      )
      .sort({ stateName: 1 });
    return res.success({
      data: getData,
      message: 'State List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getFilterStateList = async (req, res) => {
  try {
    const { countryId } = req.body;
    if (!countryId) {
      return res.badRequest({ message: 'Insufficient request parameters! countryId is required.', });
    }

    const getData = await state
      .find(
        { countryId },
        {
          _id: 1,
          stateName: 1,
        }
      )
      .sort({ stateName: 1 });
    return res.success({
      data: getData,
      message: 'State Filter List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const uploadFile = (req, res, next) => {
  try {
    const { type } = req.params;
    if (!type) {
      return res.badRequest({ message: 'Insufficient request parameters! type is required.', });
    }
    let folderName = '';
    if (type === '1') {
      folderName = 'employee-document';
    } else if (type === '2') {
      folderName = 'blog';
    } else if (type === '3') {
      folderName = 'career';
    } else if (type === '4'){
      folderName = 'leave';
    } else if (type === '5'){ 
      folderName = 'employee';
    } else {
      folderName = 'other';
    }

    const upload = imageUpload(folderName);
    upload(req, res, (err) => {
      if (err) {
        return res.failure({ message: err.message });
      }
      if (req.files && req.files.length > 0) {
        const filesData = req.files.map((file) => ({
          filename: file.filename,
          imageUrl: `${process.env.S3_IMAGE_URL}${folderName}/${file.filename}`,
        }));
        /*
         * const filesData = req.files.map((file) => ({
         * filename: file.filename,
         * imageUrl: `${process.env.BASE_URL}uploads/${folderName}/${file.filename}`,
         * })); 
         */
        return res.success({
          message: 'Files uploaded successfully.',
          data: { filesData },
        });
      } else {
        return res.failure({ message: 'No files were uploaded.' });
      }
    });
  } catch (error) {
    return res.failure({ message: error.message });
  }
};
const getDepartmentList = async (req, res) => {
  try {
    const getData = await department
      .find(
        {
          isDeleted: false,
          isActive: true,
        },
        {
          _id: 1,
          departmentName: 1,
        }
      )
      .sort({ createdAt: 1 });
    return res.success({
      data: getData,
      message: 'Department List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getFilterDepartmentList = async (req, res) => {
  try {
    const getData = await department
      .find(
        {
          isDeleted: false,
        },
        {
          _id: 1,
          departmentName: 1,
        }
      )
      .sort({ departmentName: 1 });
    return res.success({
      data: getData,
      message: 'Department List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const getEmployeeList = async (req, res) => {
  try {
    const getData = await user
      .find(
        {
          userType: { $nin: [USER_TYPES.SUPER_ADMIN, USER_TYPES.CLIENT] },
          isDeleted: false,
          isActive: true,
        },
        {
          _id: 1,
          firstName: 1,
          lastName: 1,
          employeeCode: 1,
          currentBasicSalary: 1,
        }
      )
      .sort({ createdAt: 1 });

    return res.success({
      data: getData,
      message: 'Employee List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

const getClientList = async (req, res) => {
  try {
    const getData = await client.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true 
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id', 
          foreignField: 'clientId',
          as: 'clientDetails'
        }
      },
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true 
        }
      },
      {
        $project: {
          _id: '$clientDetails._id',
          firstName: '$clientDetails.firstName',
          lastName: '$clientDetails.lastName'
        }
      },
      { $sort: { createdAt: 1 } }
    ]); 
    return res.success({
      data: getData,
      message: 'Get Client List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getFilterClientList = async (req, res) => {
  try {
    const getData = await client.aggregate([
      { $match: { isDeleted: false, } },
      {
        $lookup: {
          from: 'users',
          localField: '_id', 
          foreignField: 'clientId',
          as: 'clientDetails'
        }
      },
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true 
        }
      },
      {
        $project: {
          _id: '$clientDetails._id',
          firstName: '$clientDetails.firstName',
          lastName: '$clientDetails.lastName'
        }
      },
      { $sort: { createdAt: 1 } }
    ]);     
    return res.success({
      data: getData,
      message: 'Get Filter Client List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getTeamLeadList = async (req, res) => {
  try {
    const getData = await user
      .find(
        {
          isDeleted: false,
          isActive: true,
          userType: 3,
        },
        {
          _id: 1,
          firstName: 1,
          lastName: 1,
          employeeCode: 1,
        }
      )
      .sort({ firstName: 1 });
    return res.success({
      data: getData,
      message: 'Get Team Lead List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
const getFilterTeamLeadList = async (req, res) => {
  try {
    const getData = await user
      .find(
        { userType: 3 },
        {
          _id: 1,
          firstName: 1,
          lastName: 1,
          employeeCode: 1,
        }
      )
      .sort({ firstName: 1 });
    return res.success({
      data: getData,
      message: 'Get Team Lead Filter List',
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
module.exports = {
  getCountryList,
  getFilterCountryList,
  getStateList,
  getFilterStateList,
  uploadFile,
  getDepartmentList,
  getEmployeeList,
  getClientList,
  getFilterClientList,
  getTeamLeadList,
  getFilterTeamLeadList,
  getFilterDepartmentList

};