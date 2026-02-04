//Require Package
const AWS = require('aws-sdk');

//S3 Configurationgist
const s3 = new AWS.S3({
  accessKeyId: '< access key ID >',
  secretAccessKey: '< secret access key >',
  region: '< region >', //Optional
});

//Set Parameters for s3
let params = {
  Bucket: '< bucket Name >',
  Body: fs.createReadStream('< filePath >'),
  Key: 'example.jpeg', //The object key (or key name) uniquely identifies the object in an Amazon S3
};

//Upload File On S3
s3.putObject(params, function (err, data) {
  if (err) {
    console.error('Error', err.message);
    throw err;
  } else {
    //let fileUrl = "https://" + < bucket > + ".s3." + < region > + ".amazonaws.com/" + newPath
    console.log('Success', data);
  }
});