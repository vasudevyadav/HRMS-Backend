/* // require nexmo node package
const Vonage = require('@vonage/server-sdk');

// create instance of nexmo
const vonage = new Vonage({
  apiKey: 'XXXXX', //change apiKey with your API Key
  apiSecret: 'XXXXX', //change apiSecret with your API Secret
});

// Sample Input
const obj = {
  from: 'Vonage APIs',
  to: ['91***********'],
  text: 'First Message from Nexmo',
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
    // send message using nexmo
    vonage.message.sendSms(
      obj.from,
      recipients[i],
      obj.text,
      (err, responseData) => {
        // if any error
        if (err) {
          console.log(err);
        } else {
          // SMS is sent successfully
          if (responseData.messages[0]['status'] === '0') {
            console.log('Message sent successfully.');
          } else {
            // if any failure occured
            console.log(
              `Message failed with error: ${responseData.messages[0]['error-text']}`
            );
          }
        }
      }
    );
  }
};

module.exports = sendSms; */