/* eslint-disable multiline-comment-style */
// const AWS = require('aws-sdk');
// require('dotenv').config();

// // AWS SES client setup
// const ses = new AWS.SES({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const sendEmail = async (to, subject, htmlContent) => {
//   const params = {
//     Destination: { ToAddresses: [to], },
//     Message: {
//       Body: { Html: { Data: htmlContent }, },
//       Subject: { Data: subject },
//     },
//     Source: process.env.AWS_SES_EMAIL_FROM,
//   };

//   try {
//     await ses.sendEmail(params).promise();
//     console.log('Email sent successfully!');
//     return true;
//   } catch (error) {
//     console.error(`Email could not be sent: ${error.message}`);
//     return false;
//   }
// };

// module.exports = { sendEmail };

const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// AWS S3 & SES Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const transporter = nodemailer.createTransport({
  SES: new AWS.SES({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  }),
});

// Function to download file from S3
const downloadFileFromS3 = async (s3Url) => {
  try {
    // Extract bucket name and key from the S3 URL
    const urlParts = new URL(s3Url);
    const bucketName = urlParts.hostname.split('.')[0]; // Extract bucket name
    const objectKey = decodeURIComponent(urlParts.pathname).substring(1); // Extract key

    console.log('s3Url', s3Url);
    console.log(`Downloading from S3: Bucket - ${bucketName}, Key - ${objectKey}`);

    // Get file from S3
    const params = {
      Bucket: bucketName,
      Key: objectKey
    };
    const data = await s3.getObject(params).promise();

    // Save file to a temporary location
    const filename = path.basename(objectKey);
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, data.Body);

    return filePath;
  } catch (error) {
    console.error(`Error downloading file from S3: ${error.message}`);
    return null;
  }
};

// Send Email with Attachment
const sendEmailWithAttachment = async (to, subject, htmlContent, fileUrl) => {
  try {
    // Download the file from S3
    let downloadedFile = '';
    if (fileUrl) {
      downloadedFile = await downloadFileFromS3(fileUrl);
      if (!downloadedFile) {
        throw new Error('File download failed');
      }
    }

    // Email options
    const mailOptions = {
      from: process.env.AWS_SES_EMAIL_FROM,
      to,
      subject,
      html: htmlContent,
      attachments: [{
        filename: path.basename(downloadedFile),
        path: downloadedFile
      }],
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully with attachment!');

    // Clean up: Delete the temporary file
    fs.unlinkSync(downloadedFile);
    return true;
  } catch (error) {
    console.error(`Email could not be sent: ${error.message}`);
    return false;
  }
};

module.exports = { sendEmailWithAttachment };