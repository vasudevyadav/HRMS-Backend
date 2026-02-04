const { team, userTokens, user } = require('../../model');
const dbService = require('../../utils/dbService');
const { cryptoFUN } = require('../../helpers/function');
exports.addTeam = async (req, res) => {
  try {
    const userData = req['user-data'];
    const { teamName, reportingManager, teamMemberList, type } = req.body;

    if (!teamName || !reportingManager || !teamMemberList || !type) {
      return res.badRequest({
        message:
          'Insufficient request parameters! teamName, reportingManager, teamMemberList, type are required.',
      });
    }
    const teamData = {
      teamName,
      reportingManager: reportingManager?._id || null,
      teamMemberList: teamMemberList,
      type,
      addedBy: userData._id,
    };

    const newTeam = await dbService.create(team, teamData);

    if (!newTeam) {
      return res.failure({ message: 'Failed to add team.' });
    }

    const newTeamData = await team
      .findOne({ _id: newTeam._id })
      .populate({
        path: 'reportingManager',
        select:
          'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
      })
      .populate({
        path: 'teamMemberList',
        select:
          'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
      });

    return res.success({
      message: 'Team added successfully.',
      data: newTeamData,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.addTeamMember = async (req, res) => {
  const params = req.body;
  try {
    if (!params.email) {
      return res.badRequest({
        message: 'Insufficient request parameters! email is required.',
      });
    }
    let email = params.email.toString().toLowerCase();
    email = cryptoFUN(email, 'encrypt');
    let where = { primaryEmail: email };
    where.isDeleted = false;
    let found = await dbService.findOne(user, where, {
      _id: 1,
      firstName: 1,
      primaryEmail: 1,
    });
    if (!found) {
      return res.recordNotFound();
    }
    found.primaryEmail = cryptoFUN(found.primaryEmail, 'decrypt');
    return res.success({
      message: 'User found successfully.',
      data: found,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getTeamMemberList = async (req, res) => {
  try {
    let where = { userType: { $ne: 1 } };
    where.isDeleted = false;
    where.isActive = true;
    let userList = await dbService.findMany(user, where, {
      _id: 1,
      firstName: 1,
      email: 1,
    });
    if (!userList) {
      return res.recordNotFound();
    }
    return res.success({
      message: 'User list fetched successfully.',
      data: userList,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.editTeam = async (req, res) => {
  try {
    const userData = req['user-data'];
    const { _id, teamName, reportingManager, teamMemberList, type } = req.body;

    if (!_id || !teamName || !reportingManager || !teamMemberList || !type) {
      return res.badRequest({
        message:
          'Insufficient request parameters! _id, teamName, reportingManager, teamMemberList, type are required.',
      });
    }

    const teamData = {
      teamName,
      reportingManager: reportingManager?._id || null,
      teamMemberList: teamMemberList,
      type,
      updatedBy: userData._id,
    };

    const newTeam = await dbService.updateOne(team, { _id }, teamData);

    if (!newTeam) {
      return res.failure({ message: 'Failed to update team.' });
    }

    const updatedTeamData = await team
      .findOne({ _id: newTeam._id, isDeleted: false })
      .populate({
        path: 'reportingManager',
        select:
          'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
      })
      .populate({
        path: 'teamMemberList',
        select:
          'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
      });

    return res.success({
      message: 'Team updated successfully.',
      data: updatedTeamData,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getTeamDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Team ID is required.' });
    }

    const teamDetails = await team
      .findOne(
        { _id: id, isDeleted: false },
        {
          isActive: 1,
          isDeleted: 1,
          teamName: 1,
          reportingManager: 1,
          teamMemberList: 1,
          type: 1,
          createdAt: 1,
          updatedAt: 1,
        }
      )
      .populate({
        path: 'reportingManager',
        select:
          'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
      })
      .populate({
        path: 'teamMemberList',
        select:
          'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
      });

    if (!teamDetails) {
      return res.recordNotFound({ message: 'Team not found.' });
    }

    return res.success({ data: teamDetails });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getTeamList = async (req, res) => {
  try {
    let options = {};
    let query = {};
    query.isDeleted = false;
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(team, query);
      return res.success({ data: { totalRecords } });
    }
    if (req.body.search) {
      // Using regex to search across multiple fields
      const searchTerm = req.body.search;
      query.$or = [
        {
          teamName: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
        {
          type: {
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
    if (!options.populate) {
      options.populate = [];
    }

    options.populate.push({
      path: 'teamMemberList',
      select:
        'firstName lastName  username employeeCode departmentName primaryEmail primaryNumber',
    });

    options.populate.push({
      path: 'reportingManager',
      select:
        'firstName lastName username employeeCode departmentName primaryEmail primaryNumber',
    });
    options.projection = {
      isActive: 0,
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };

    let foundUserTeam = await dbService.paginate(team, query, options);
    if (!foundUserTeam || !foundUserTeam.data || !foundUserTeam.data.length) {
      return res.recordNotFound();
    }
    return res.success({ data: foundUserTeam });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.badRequest({ message: 'Request parameter "id" is required.' });
    }

    const teamData = await team.findOne({ _id: id });

    if (teamData) {
      await dbService.updateOne(
        team,
        { _id: id },
        { isDeleted: true }
      );

      return res.success({ 
        data: teamData, 
        message: 'Team deleted.' 
      });
    } else {
      return res.recordNotFound({ message: 'team not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: `An error occurred: ${error.message}` });
  }
};
