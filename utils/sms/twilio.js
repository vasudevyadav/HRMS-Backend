const accountSid = 'XXXXX'; // Paste your AccountSid
const authToken = 'XXXXX'; // Paste your Auth Token
//create instance of twilio
const client = require('twilio')(accountSid, authToken);

// Sample Object for Inpyut
const obj = {
  from: 'Twilio',
  to: '91**********',
  text: 'Testing - My first Message',
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
    // send message using twilio
    client.messages
      .create({
        body: obj.text,
        messagingServiceSid: 'XXXXX',
        to: recipients[i],
      })
      .then((message) => console.log(message.sid))
      .done();
  }
};

module.exports = sendSms;