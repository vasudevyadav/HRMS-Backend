const mongoose = require('mongoose');

// Import all models
const employee = require('./employee');
const countries = require('./country');
const user = require('./user');
const userTokens = require('./userTokens');
const leave = require('./leave');
const attendance = require('./attendance');
const session = require('./session');
const blog = require('./blog');
const workSession = require('./workSession');
const employeeRequest = require('./employeeRequest');
const department = require('./department');
const team = require('./team');
const contactUs = require('./contactUs');
const career = require('./career');
const holiday = require('./holiday');
const project = require('./project');
const sprint = require('./sprint');
const applyJob = require('./applyJob');
const client = require('./client');
const invoice = require('./invoice');
const receiver = require('./receiver');
const tasks = require('./task');

// Export all models
module.exports = {
  receiver,
  invoice,
  client,
  employee,
  countries,
  user,
  userTokens,
  leave,
  blog,
  attendance,
  session,
  workSession,
  department,
  team,
  contactUs,
  career,
  holiday,
  employeeRequest,
  project,
  sprint,
  applyJob
};
