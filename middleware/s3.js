const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = 'kinabot-audio-storage';

// Upload a file buffer to S3
async function uploadFileToS3(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  return await s3Client.send(command);
}

// Download a file from S3
async function getFileFromS3(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return await s3Client.send(command);
}

// Upload JSON metadata to S3
async function uploadJsonToS3(key, jsonData) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(jsonData),
    ContentType: 'application/json',
  });
  return await s3Client.send(command);
}

// Download JSON metadata from S3
async function getJsonFromS3(key) {
  const data = await getFileFromS3(key);
  return JSON.parse(await data.Body.transformToString('utf-8'));
}

module.exports = {
  uploadFileToS3,
  getFileFromS3,
  uploadJsonToS3,
  getJsonFromS3,
}; 