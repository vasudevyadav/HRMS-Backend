let SNS = require('sns-mobile');

module.exports = {
  async sendNotification (data) {
    let SNS_KEY_ID = process.env.SNS_SECRETACCESSKEY,
      SNS_ACCESS_KEY = process.env.SNS_ACCESSKEYID;

    var ARN = process.env.SNS_ARN;

    let myApp = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
      /*
       * If using iOS change uncomment the line below
       * and comment out SUPPORTED_PLATFORMS.ANDROID the one above
       * platform: SUPPORTED_PLATFORMS.IOS,
       */
      region: process.env.SNS_REGION,
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_KEY_ID,
      platformApplicationArn: ARN,
    });

    myApp.on('userAdded', function (endpointArn, deviceId) {
      console.log(
        '\nSuccessfully added device with deviceId: ' +
          deviceId +
          '.\nEndpointArn for user is: ' +
          endpointArn
      );
    });

    exports.register = function (req, res) {
      let deviceId = data['deviceId'];

      console.log('\nRegistering user with deviceId: ' + deviceId);

      myApp.addUser(deviceId, null, function (err, endpointArn) {
        if (err) {
          console.log(err);
          return res.status(500).json({ status: 'not ok', });
        }

        res.status(200).json({ status: 'ok', });
      });
    };
  },
};