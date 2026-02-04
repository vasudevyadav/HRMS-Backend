const { cryptoFUN } = require('../../helpers/function');
const { client } = require('../../model');
const User = require('../../model/user');
const mongoose = require('mongoose');

const dbService = require('../../utils/dbService');
const crypto = require('crypto');

async function generateUniqueClientId() {
  const clientId = crypto.randomBytes(4).toString('hex').toUpperCase();
  const existingClient = await client.findOne({ clientId });
  return existingClient ? generateUniqueClientId() : clientId;
}
exports.addClient = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password, contactNumber, address
    } = req.body;

    if (!firstName || !contactNumber || !email || !password) {
      return res.badRequest({ message: 'firstName, contactNumber, email, and password are required.', });
    }
    const primaryEmail = cryptoFUN(email.toLowerCase(), 'encrypt');
    const primaryNumber = cryptoFUN(JSON.stringify(contactNumber), 'encrypt');

    const isEmailExist = await User.findOne({
      primaryEmail,
      isDeleted: false
    });
    if (isEmailExist) {
      return res.failure({ message: 'Client with this email already exists' });
    }

    const isContactNumberExist = await User.findOne({
      primaryNumber,
      isDeleted: false
    });
    if (isContactNumberExist) {
      return res.failure({ message: 'Client with this contact number already exists' });
    }
    const clientId = await generateUniqueClientId();

    const dataToCreate = {
      clientId,
      address
    };

    // dataToCreate.password = cryptoFUN(password, 'encrypt');

    const newClient = await dbService.create(client, dataToCreate);
    const userData = {
      clientId: newClient._id,
      firstName,
      lastName,
      primaryEmail: cryptoFUN(email.toLowerCase(), 'encrypt'),
      primaryNumber: cryptoFUN(JSON.stringify(contactNumber), 'encrypt'),
      password: cryptoFUN(password, 'encrypt'),
      userType: 5,
      designation: 'client'
    };
    if (newClient) {
      await dbService.create(User, userData);
    }

    return res.success({ message: 'Client added successfully', });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const {
      id, firstName, lastName, email, password, contactNumber, address
    } = req.body;

    if (!id || !firstName || !contactNumber || !email || !password) {
      return res.badRequest({ message: 'id, firstName, contactNumber, email, and password are required.', });
    }
    const primaryEmail = cryptoFUN(email.toLowerCase(), 'encrypt');
    const primaryNumber = cryptoFUN(JSON.stringify(contactNumber), 'encrypt');

    const where = {
      _id: id,
      isDeleted: false
    };
    const existingClient = await client.findOne(where);
    if (!existingClient) {
      return res.recordNotFound({ message: 'Client not found' });
    }

    const isEmailExist = await User.findOne({
      primaryEmail,
      clientId: { $ne: id },
      isDeleted: false
    });
    if (isEmailExist) {
      return res.failure({ message: 'Client with this email already exists' });
    }

    const isContactNumberExist = await User.findOne({
      primaryNumber,
      clientId: { $ne: id },
      isDeleted: false
    });
    if (isContactNumberExist) {
      return res.failure({ message: 'Client with this contact number already exists' });
    }

    const dataToUpdate = { address, };
    dataToUpdate.password = cryptoFUN(password, 'encrypt');

    const updatedClient = await dbService.updateOne(client, { _id: id }, dataToUpdate);
    const userData = {
      firstName,
      lastName,
      primaryEmail: cryptoFUN(email.toLowerCase(), 'encrypt'),
      primaryNumber: cryptoFUN(JSON.stringify(contactNumber), 'encrypt'),
      password: dataToUpdate.password,
    };
    if (updatedClient) {
      await dbService.updateOne(
        User,
        { clientId: id },
        userData,
        { new: true }
      );
    }

    return res.success({
      message: 'Client updated successfully',
      data: updatedClient
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const where = {
      _id: id,
      isDeleted: false
    };
    let clientData = await client.findOne(where);

    if (!clientData) {
      return res.recordNotFound({ message: 'Client not found' });
    }

    const newStatus = !clientData.isActive;
    await dbService.updateOne(client, { _id: id }, { isActive: newStatus });
    await dbService.updateOne(User, { clientId: id }, { isActive: newStatus });
    clientData = await client.findOne(where);
    return res.success({
      data: clientData,
      message: `Client has been ${newStatus ? 'activated' : 'deactivated'} successfully.`
    });

  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getClientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const clientData = await client.findOne({
      _id: id,
      isDeleted: false
    }, {
      updatedAt: 0,
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0
    });

    if (clientData) {
      const _obj = clientData.toJSON();
      const userWithProjects = await User.aggregate([
        { $match: { clientId: new mongoose.Types.ObjectId(id) } },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            primaryEmail: 1,
            primaryNumber: 1,
            password: 1,
            userType: 1
          }
        },
        {
          $lookup: {
            from: 'projects',
            let: { userId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$clientId', '$$userId'] } } },
              {
                $lookup: {
                  from: 'sprints',
                  localField: '_id',
                  foreignField: 'projectId',
                  as: 'sprints'
                }
              },
              {
                $lookup: {
                  from: 'tasks',
                  localField: '_id',
                  foreignField: 'projectId',
                  as: 'tasks'
                }
              },
              {
                $lookup: {
                  from: 'users',
                  let: { memberIds: '$projectMembers' },
                  pipeline: [
                    { $match: { $expr: { $in: ['$_id', '$$memberIds'] } } },
                    {
                      $project: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        employeeCode: 1,
                      }
                    }
                  ],
                  as: 'projectMembers'
                }
              },
              {
                $lookup: {
                  from: 'users',
                  let: { ownerId: '$projectOwner' },
                  pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$ownerId'] } } },
                    {
                      $project: {
                        _id: 1,
                        firstName: 1,
                        lastName: 1,
                        employeeCode: 1,
                      }
                    }
                  ],
                  as: 'projectOwner'
                }
              },
              {
                $addFields: {
                  projectOwner: { $arrayElemAt: ['$projectOwner', 0] },
                  sprintCount: { $size: '$sprints' },
                  totalTaskCount: { $size: '$tasks' },
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
                  }
                }
              }
            ],
            as: 'projectsData'
          }
        }
      ]);
      if (userWithProjects && userWithProjects.length > 0) {
        const userData = userWithProjects[0];

        _obj.password = userData.password ? cryptoFUN(userData.password, 'decrypt') : '';
        _obj.email = userData.primaryEmail ? cryptoFUN(userData.primaryEmail, 'decrypt') : '';
        _obj.contactNumber = userData.primaryNumber ? JSON.parse(cryptoFUN(userData.primaryNumber, 'decrypt')) : '';
        _obj.firstName = userData.firstName || '';
        _obj.lastName = userData.lastName || '';
        _obj.userRole = userData.userType || '';
        _obj.projectsData = Array.isArray(userData.projectsData) ? userData.projectsData : [];
      } else {
        console.warn('No user found for clientId:', id);
        _obj.password = '';
        _obj.email = '';
        _obj.contactNumber = '';
        _obj.firstName = '';
        _obj.lastName = '';
        _obj.userRole = '';
        _obj.projectsData = [];
      }

      return res.success({
        data: _obj,
        message: 'Client details fetched successfully'
      });
    } else {
      return res.recordNotFound({ message: 'Client not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.getClientList = async (req, res) => {
  try {
    let query = req.body.query || {};
    let options = req.body.options || {};

    if (req.body.search?.trim()) {
      const searchTerm = req.body.search.trim();
      query.$text = { $search: searchTerm };
    }

    query.isDeleted = false;

    if (!options.populate) {
      options.populate = [];
    }

    options.populate.push({
      path: 'clientDetails',
      select: '_id firstName lastName primaryEmail primaryNumber',
    });

    options.lean = { virtuals: true };

    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };

    if (req.body.isCountOnly) {
      const totalRecords = await dbService.count(client, query);
      return res.success({ data: { totalRecords } });
    }

    options.sort = { createdAt: -1 };
    const clients = await dbService.paginate(client, query, options);

    if (!clients || !clients.data || !clients.data.length) {
      return res.recordNotFound();
    }

    // Decrypt sensitive fields for each client
    for (let clientItem of clients.data) {
      if (clientItem.clientDetails) {
        if (clientItem.clientDetails.primaryEmail) {
          clientItem.clientDetails.primaryEmail = cryptoFUN(clientItem.clientDetails.primaryEmail, 'decrypt');
        }
        if (clientItem.clientDetails.primaryNumber) {
          const contactNumberObj = cryptoFUN(clientItem.clientDetails.primaryNumber, 'decrypt');
          clientItem.clientDetails.primaryNumber = JSON.parse(contactNumberObj);
        }
      }
    }

    return res.success({ data: clients });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({ message: 'id is required.' });
    }

    const clientData = await client.findOne({ _id: id });
    if (clientData) {
      if (clientData.isDeleted) {
        return res.failure({ message: 'Client is already deleted.' });
      }
      await dbService.updateOne(client, { _id: id }, { isDeleted: true });
      await dbService.updateOne(User, { clientId: id }, { isDeleted: true });
      return res.success({
        data: clientData,
        message: 'Client successfully marked as deleted.'
      });
    } else {
      return res.recordNotFound({ message: 'Client not found.' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
