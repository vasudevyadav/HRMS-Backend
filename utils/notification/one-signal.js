let notification = function (data, setup) {
  let headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: `Basic ${setup.apiKey}`,
  };
  
  let options = {
    host: 'onesignal.com',
    port: 443,
    path: '/api/v1/notifications',
    method: 'POST',
    headers: headers,
  };
  
  let https = require('https');
  let req = https.request(options, async function (res) {
    res.on('data', async function (data) {
      let res = JSON.parse(data);
      // add response in model
    });
  });
  
  req.on('error', function (e) {
    console.log('ERROR:');
    console.log(e);
  });
  
  req.write(JSON.stringify(data));
  req.end();
};
module.exports = {
  async sendNotification (data) {
    const setup = { apiKey: process.env.ONESIGNAL_API_KEY, };
    let message = {
      app_id: process.env.ONESIGNAL_APP_ID,
      contents: { en: data.message },
      include_player_ids: data.playerId,
    };
    notification(message, setup);
  },
};