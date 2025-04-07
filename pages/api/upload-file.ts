import { NextApiRequest, NextApiResponse } from 'next';
import { validateUserToken } from './validate-user-token';
import { IncomingForm } from 'formidable';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'client-portal-files';

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Temporarily disable auth check for testing
  // const userInfo = await validateUserToken(req);
  // if (!userInfo.isValid) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    // Parse the incoming form data
    const { fields, files } = await parseForm(req);

    // Get the uploaded file
    const file = files.file[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate a unique filename
    const filename = `${uuidv4()}-${file.originalFilename}`;

    // Define the folder structure based on the client ID
    const clientId = fields.clientId ? fields.clientId[0] : 'unassigned';
    const folderPath = `client-files/${clientId}/${new Date().toISOString().split('T')[0]}`;

    // Upload the file to S3
    const fileStream = fs.createReadStream(file.filepath);
    const contentType = file.mimetype || 'application/octet-stream';

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `${folderPath}/${filename}`,
      Body: fileStream,
      ContentType: contentType,
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // Return the file URL
    return res.status(200).json({
      url: uploadResult.Location,
      key: uploadResult.Key,
      filename: file.originalFilename,
      contentType: contentType,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}

// Helper function to parse the form data
function parseForm(req: NextApiRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      multiples: true,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}
