/*
 * AWS_SNS_REGION = XXXXX
 * AWS_ACCESS_KEY_ID = XXXXX
 * AWS_SECRET_ACCESS_KEY = XXXXX 
 */
// Configure env file so that we can use credentials
require('dotenv').config();

// Import aws-sdk for SNS
const aws = require('@aws-sdk/client-sns');

// To publish a message on mobile
const PublishCommand = aws.PublishCommand;

// Client object of SNS
const SNSClient = aws.SNSClient;

// Configure SNS Client for your selected region from AWS Console
const snsClient = new SNSClient({ region: process.env.AWS_SNS_REGION });

// Sample Object
const obj = {
  to: '911234567890',
  text: 'Hello from AWS SNS',
};

const sendSms = async (obj) => {
  let recipients = [];
  if (Array.isArray(obj.to)) {
    recipients = recipients.concat(obj.to);
  } else if (typeof obj.to === 'string') {
    const mobileArray = obj.to.split(',');
    recipients = recipients.concat(mobileArray);
  }
  for (let i = 0; i < recipients.length; i++) {
    const params = {
      Message: obj.text /* required */,
      PhoneNumber: recipients[i], //PHONE_NUMBER, in the E.164 phone number structure
    };
    // send message using SNS Client
    await snsClient.send(new PublishCommand(params));
  }
};

module.exports = sendSms;