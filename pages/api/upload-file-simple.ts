import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

    // Create a local temporary file path for testing
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFilePath = path.join(uploadsDir, filename);

    // Copy file to local path
    fs.copyFileSync(file.filepath, localFilePath);

    // Return the file URL (relative URL for local testing)
    const fileUrl = `/uploads/${filename}`;

    return res.status(200).json({
      url: fileUrl,
      filename: file.originalFilename,
      contentType: file.mimetype || 'application/octet-stream',
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
