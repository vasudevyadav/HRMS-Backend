const {
  department, userTokens 
} = require('../../model');
const dbService = require('../../utils/dbService');

exports.addDepartment = async (req, res) => {
  try {
    const {
      departmentName, addedBy 
    } = req.body;

    if (!departmentName) {
      return res.badRequest({ message: 'Department name is required.' });
    }
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (!token) {
      return res.badRequest({ message: 'Insufficient request parameters! token is required.', });
    }

    const userAuth = await dbService.findOne(userTokens, { token });
    if (!userAuth) {
      return res.unAuthorized({ message: 'Invalid token' });
    }
    const departmentData = {
      departmentName,
      addedBy: userAuth.userId,
    };

    const newDepartment = await dbService.create(department, departmentData);

    if (!newDepartment) {
      return res.failure({ message: 'Failed to add department.' });
    }

    return res.success({
      message: 'Department added successfully.',
      data: newDepartment,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.editDepartment = async (req, res) => {
  try {
    const {
      id, departmentName, updatedBy 
    } = req.body;

    if (!id) {
      return res.badRequest({ message: 'Department ID is required.' });
    }

    const updateData = {
      departmentName,
      updatedBy,
      updatedAt: Date.now(),
    };

    const updatedDepartment = await dbService.updateOne(
      department,
      {
        _id: id,
        isDeleted:false 
      },
      updateData,
      { new: true }
    );

    if (!updatedDepartment) {
      return res.recordNotFound({ message: 'Department not found.' });
    }

    return res.success({
      message: 'Department updated successfully.',
      data: updatedDepartment,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getDepartmentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Department ID is required.' });
    }

    const departmentDetails = await dbService.findOne(
      department,
      {
        _id: id,
        isDeleted:false 
      },
      {
        isActive: 1,
        isDeleted: 1,
        departmentName: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );

    if (!departmentDetails) {
      return res.recordNotFound({ message: 'Department not found.' });
    }

    return res.success({ data: departmentDetails, });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getDepartmentList = async (req, res) => {
  try {
    let options = {};
    let query = {};
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    query.isDeleted = false;
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(department, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body.search) {
      // Using regex to search across multiple fields
      const searchTerm = req.body.search;
      query.$or = [
        {
          departmentName: {
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
    // Configure populate
    if (!options.populate) {
      options.populate = [];
    }

    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };

    let foundUserDepartment = await dbService.paginate(
      department,
      query,
      options
    );
    if (
      !foundUserDepartment ||
      !foundUserDepartment.data ||
      !foundUserDepartment.data.length
    ) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUserDepartment });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Request parameter "id" is required.' });
    }

    const departmentData = await department.findOne({ _id: id });

    if (departmentData) {
      await dbService.updateOne(
        department,
        { _id: id },
        { isDeleted: true }
      );

      return res.success({ 
        data: departmentData, 
        message: 'Department deleted.' 
      });
    } else {
      return res.recordNotFound({ message: 'department not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};
