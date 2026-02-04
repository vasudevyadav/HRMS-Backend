// stringUtils.js
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const models = require('../model');

/**
 * toUpperCase: Converts a given string to uppercase.
 * @param {String} str - The input string to convert.
 * @returns {String} - The input string converted to uppercase.
 */
function toUpperCase (str) {
  return str.toUpperCase();
}

/**
 * toLowerCase: Converts a given string to lowercase.
 * @param {String} str - The input string to convert.
 * @returns {String} - The input string converted to lowercase.
 */
function toLowerCase (str) {
  return str.toLowerCase();
}

/**
 * capitalize: Capitalizes the first letter of each word in a given string.
 * @param {String} str - The input string to capitalize.
 * @returns {String} - The input string with the first letter of each word capitalized.
 */
function capitalize (str) {
  const words = str.split(' ');
  const capitalizedWords = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1)
  );
  return capitalizedWords.join(' ');
}

/**
 * generateStrongPassword: Generates a strong password with a given length.
 * @param {Number} length - The length of the password to generate.
 * @returns {String} - The generated strong password.
 */
function generateStrongPassword (length) {
  // Define character sets
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_+=<>?';

  // Combine all character sets
  const allChars = uppercaseChars + lowercaseChars + numbers + symbols;

  let password = '';

  // Generate random characters from combined character set
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    password += allChars[randomIndex];
  }

  return password;
}
function cryptoFUN ( text, type) {
  try {
    var algorithm = 'aes-192-cbc';
    var password = 'DarkWorldEncryption';
    var key = crypto.scryptSync(password, 'salt', 24, { N: 1024 }); //create key
    var iv = crypto.scryptSync(password, 'salt', 16, { N: 1024 }); //create initVector

    if (type.toString() === 'encrypt') {
      var cipher = crypto.createCipheriv(algorithm, key, iv);
      var encrypted =
        cipher.update(text.toString(), 'utf8', 'hex') + cipher.final('hex'); // encrypted text
      return encrypted.toString();
    } else {
      var decipher = crypto.createDecipheriv(algorithm, key, iv);
      var decrypted =
        decipher.update(text.toString(), 'hex', 'utf8') +
        decipher.final('utf8'); //decrypted text
      return decrypted.toString();
    }
  } catch (error) {
    console.log('Error occurred: ', error);
    return text.toString();
  }
}

async function sendEmail (recipientEmail, subject, body) {
  try {
    // Create a transporter
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g., 'smtp.gohashinclude.com'
      port: process.env.SMTP_PORT, // e.g., 587
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // your company email
        pass: process.env.EMAIL_PASS, // your company email password
      },
      tls: { rejectUnauthorized: false },
    });

    // Define the mail options
    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: subject,
      text: body,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    return true; // Return true if the email is sent successfully
  } catch (error) {
    console.log('Error occurred: ', error);
    return false; // Return false if there's an error
  }
}

async function validateNumbers (esiNumber, pfNumber) {
  // ESI Number pattern (10-digit numeric)
  const esiNumberPattern = /^[0-9]{10}$/;

  /*
   * PF Number patterns
   * Traditional: XX/XXX/YYYYYYYYY
   * Modern UAN Based: XX/XXX/YYYY/YYYYY
   * Newer EPFO Format: XX/XXX/YYYYYYYYY/YY
   */
  const pfNumberPattern =
    /^[A-Z]{2}\/[0-9]{3}\/[0-9]{7,12}(\/[0-9]{2,3})?(\/[0-9]{3})?$/;

  // Check if esiNumber exists and is valid
  const isESIValid = esiNumber ? esiNumberPattern.test(esiNumber) : true;

  // Validate pfNumber regardless of esiNumber existence
  const isPFValid = pfNumberPattern.test(pfNumber);

  return {
    isESIValid,
    isPFValid,
  };
}

async function checkUser (modelName, id) {
  const foundUser = await dbService.findOne(models[modelName], { _id: id });
  if (!foundUser) {
    return false;
  }
  return foundUser;
}

async function validateDates (startDate, endDate) {
  // Convert dates from string to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Normalize the dates to only compare the date part (ignoring the time)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  // Check if both dates are valid
  if (isNaN(startDateOnly.getTime()) || isNaN(endDateOnly.getTime())) {
    return {
      valid: false,
      message: 'Invalid date format',
    };
  }

  // Check if startDate or endDate are before today
  if (startDateOnly < startOfToday || endDateOnly < startOfToday) {
    return {
      valid: false,
      message: 'Dates cannot be in the past',
    };
  }

  // Check if endDate is before startDate
  if (endDateOnly < startDateOnly) {
    return {
      valid: false,
      message: 'End date cannot be before start date',
    };
  }

  return { valid: true };
}

/**
 * Truncate a string to a specified length, adding '...' at the end if truncated.
 * @param {string} text - The text to be truncated.
 * @param {number} maxLength - The maximum length of the truncated text.
 * @returns {string} - The truncated text.
 */
const truncateText = (text, limit) => {
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

module.exports = {
  toUpperCase,
  toLowerCase,
  capitalize,
  generateStrongPassword,
  cryptoFUN,
  sendEmail,
  validateNumbers,
  checkUser,
  validateDates,
  truncateText
};
