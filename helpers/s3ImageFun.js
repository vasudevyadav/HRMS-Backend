const {
  S3Client, DeleteObjectCommand 
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const path = require('path');

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function generateRandomString (length) {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset[randomIndex];
  }
  return randomString;
}
// Custom Multer storage engine
const s3Storage = (folderName) => {
  return {
    _handleFile: async (req, file, cb) => {
      try {
        const randomString = generateRandomString(5);
        // Use Multer's stream directly
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `${folderName}/${Date.now() + randomString}${path.extname(file.originalname)}`,
          Body: file.stream, // Multer provides a readable stream
          ContentType: file.mimetype, // Explicitly set the content type
        };

        // Use the Upload utility to handle the upload process
        const upload = new Upload({
          client: s3Client,
          params: uploadParams,
        });

        // Wait for the upload to complete
        const result = await upload.done();
        cb(null, {
          filename: result.Key.split('/').pop(),
          path: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${result.Key}`,
        });
      } catch (error) {
        console.error('Error uploading to S3:', error.message);
        cb(error);
      }
    },
    _removeFile: (req, file, cb) => {
      // No need to remove files manually from S3
      cb(null);
    },
  };
};

// Middleware to handle file uploads to S3
const imageUpload = (folderName) =>
  multer({
    storage: s3Storage(folderName),
    fileFilter: (req, file, cb) => {
      const allowedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.pdf',
        '.webp',
        '.mp4',
        '.avi',
        '.mkv',
      ];
      const ext = path.extname(file.originalname).toLowerCase();

      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            'Invalid file type. Only webp, JPG, JPEG, PNG, PDF, MP4, AVI, and MKV are allowed.'
          )
        );
      }
    },
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit the file size to 2 MB
  }).array('files'); // Handle multiple file uploads

// Function to delete an image from S3
const deleteImageFromS3 = async (fileKey) => {
  try {
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey, // The key (path) of the file to delete
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    console.log(`File deleted successfully: ${fileKey}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error.message);
    throw error;
  }
};
module.exports = {
  imageUpload,
  deleteImageFromS3 
};
