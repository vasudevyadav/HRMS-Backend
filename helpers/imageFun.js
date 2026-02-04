// helpers/imageFun.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Function to ensure directory exists
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Set up multer storage with dynamic destination
const createStorage = (folderName) => {
  ensureDirectoryExists(`uploads/${folderName}`);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, `uploads/${folderName}`);
    },
    filename: (req, file, cb) => {
      // Extract the file extension
      const ext = path.extname(file.originalname);
      // Use timestamp to rename file
      const timestamp = Date.now();
      const filename = `${timestamp}${ext}`;
      cb(null, filename);
    },
  });
};

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF are allowed.')
    );
  }
};

// Middleware to handle file uploads
const imageUpload = (folderName) =>
  multer({
    storage: createStorage(folderName),
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
  }).array('files');

module.exports = { imageUpload };
