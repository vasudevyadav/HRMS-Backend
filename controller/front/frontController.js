const { contactUs, career, blog } = require('../../model');
const { validateDates } = require('../../helpers/function');
const dbService = require('../../utils/dbService');
const { sendEmail } = require('../../helpers/emailService');
const { sendEmailWithAttachment } = require('../../helpers/mailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const Job = require('../../model/job'); // Adjust path according to your project structure

exports.submitContactUs = async (req, res, next) => {
  try {
    const { fullName, emailAddress, subject, phoneNumber, message } = req.body;

    if (!fullName || !emailAddress || !subject || !phoneNumber || !message) {
      return res.badRequest({
        message:
          'fullName, emailAddress, subject, phoneNumber, message are required fields.',
      });
    }

    const dataToCreate = {
      fullName,
      emailAddress,
      subject,
      phoneNumber,
      message,
    };
    const createContactUs = await dbService.create(contactUs, dataToCreate);

    if (!createContactUs) {
      return res.failure({ message: 'Failed to submit contact us request.' });
    }

    // Load and render the EJS template
    const templatePath = path.join(
      __dirname,
      '../../views/email/contactUsEmail.ejs'
    );
    const htmlTemplate = await ejs.render(
      fs.readFileSync(templatePath, 'utf8'),
      {
        fullName,
        emailAddress,
        phoneNumber,
        subject,
        message,
      }
    );

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_HOST_USER, // sender address from environment variable
      to: 'hr@gohashinclude.com ', // admin's email address
      subject: `New Inquiry from ${fullName}`,
      html: htmlTemplate, // Use the rendered HTML template
    };

    // Send email
    await sendEmail(mailOptions);

    return res.success({
      message:
        'Contact Us submitted successfully. An admin will connect with you as soon as possible.',
    });
  } catch (error) {
    return res.internalServerError({
      message: `An error occurred: ${error.message}`,
    });
  }
};
exports.submitCarrerForm = async (req, res, next) => {
  try {
    /* const { resumeFileName, fullName, emailAddress, totalExperience, phoneNumber } = req.body; */

    const { fullName, emailAddress, phoneNumber, jobId } = req.body;
    if (jobId) {
      const jobDetails = await dbService.findOne(Job, {
        _id: jobId,
        isDeleted: false,
        isActive: true,
      });
      if (!jobDetails) {
        return res.recordNotFound({ message: 'Job not found.' });
      }
    }
    const resumeFileName = req.body.fileData;
    const totalExperience = req.body.experience;

    if (
      !resumeFileName ||
      !fullName ||
      !emailAddress ||
      !totalExperience ||
      !phoneNumber
    ) {
      return res.badRequest({
        message:
          'resumeFileName, fullName, emailAddress, totalExperience, phoneNumber are required fields.',
      });
    }

    const dataToCreate = {
      jobId,
      resumeFileName,
      fullName,
      emailAddress,
      totalExperience,
      phoneNumber,
    };
    const createCarrer = await dbService.create(career, dataToCreate);

    if (!createCarrer) {
      return res.failure({ message: 'Failed to submit career request.' });
    }

    // Load and render the EJS template
    const templatePath = path.join(
      __dirname,
      '../../views/email/careerSubmissionEmail.ejs'
    );
    const htmlTemplate = await ejs.render(
      fs.readFileSync(templatePath, 'utf8'),
      {
        fullName,
        emailAddress,
        phoneNumber,
        totalExperience,
      }
    );

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_HOST_USER, // sender address from environment variable
      to: 'hr@gohashinclude.com ', // admin's email address
      subject: `New Career Submission from ${fullName}`,
      html: htmlTemplate, // Use the rendered HTML template
      attachments: [
        {
          filename: resumeFileName, // The name of the file
          path: path.join(__dirname, '../../uploads/career/', resumeFileName), // Adjust the path to where the file is stored
        },
      ],
    };

    try {
      let to = process.env.AWS_SES_EMAIL_FROM;
      let subject = `New Career Submission from ${fullName}`;
      let fileUrl = `${process.env.S3_IMAGE_URL}career/${resumeFileName}`;

      await sendEmailWithAttachment(to, subject, htmlTemplate, fileUrl);
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.internalServerError({
        message: 'Email sending failed. Please try again later.',
      });
    }

    return res.success({
      message:
        'Application submitted successfully. HR will connect with you as soon as possible.',
    });
  } catch (error) {
    return res.internalServerError({
      message: `An error occurred: ${error.message}`,
    });
  }
};

exports.getBlogDetails = async (req, res) => {
  try {
    const { blog_slug } = req.params;
    if (!blog_slug) {
      return res.badRequest({
        message: 'Insufficient request parameters! blog_slug is required.',
      });
    }
    let where = {
      blogUrl: blog_slug,
      isDeleted: false,
    };
    const getData = await blog.findOne(where, {
      updatedAt: 0,
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
    });
    if (getData) {
      const _obj = getData.toJSON();
      _obj.bannerUrl = `${process.env.BASE_URL}uploads/blog/${getData.bannerImage}`;
      return res.success({
        data: _obj,
        message: 'Blog details fetched successfully',
      });
    } else {
      return res.recordNotFound({ message: 'Blog data not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getBlogList = async (req, res) => {
  try {
    const { category } = req.query;
    let where = { isDeleted: false };
    if (category) {
      where.category = category;
    }
    const getData = await blog.find(where, {
      updatedAt: 0,
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
    });
    if (getData) {
      return res.success({
        data: {
          blogData: getData,
          imageUrl: `${process.env.BASE_URL}uploads/blog`,
        },
        message: 'Blog list fetched successfully',
      });
    } else {
      return res.recordNotFound({ message: 'Blog data not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
