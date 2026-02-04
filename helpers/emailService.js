const nodemailer = require('nodemailer');
require('dotenv').config();

if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_HOST_USER || !process.env.EMAIL_HOST_PASSWORD) {
  throw new Error('Email environment variables are missing.');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT == 465, // true for 465
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${mailOptions.to}: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = { sendEmail };
