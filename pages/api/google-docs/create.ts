import { google } from 'googleapis';
import { NextApiRequest, NextApiResponse } from 'next';
import { validateUserToken } from '../validate-user-token';

// Google API credentials setup
const authenticateGoogleAPIs = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'],
  });

  return auth;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user is logged in
  const userInfo = await validateUserToken(req);

  // Add debugging information
  console.log('Authentication check result:', {
    isValid: userInfo.isValid,
    userId: userInfo.user_id,
    token: req.headers['x-auth-token'] ? 'Present' : 'Missing',
    cookies: req.cookies?.auth_token ? 'Present' : 'Missing',
  });

  // Require staff authentication
  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { title } = req.body;

    // Authenticate with Google APIs
    const auth = await authenticateGoogleAPIs();

    // Create a new document
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Step 1: Create a new Google Doc
    const document = await docs.documents.create({
      requestBody: {
        title: title || 'Content Approval Request',
      },
    });

    // Get the document ID
    const documentId = document.data.documentId;

    if (!documentId) {
      throw new Error('Failed to create Google Doc - no document ID returned');
    }

    // Step 2: Get the user's email if available
    let userEmail = null;
    if (userInfo.user_id) {
      try {
        // This is a placeholder - you would need to implement a way to get the user's email
        // from your database based on user_id, which depends on your auth system
        // const userRecord = await db.collection('users').findOne({ _id: userInfo.user_id });
        // userEmail = userRecord.email;

        // For now, if you can't get the user's email, the service account will remain the owner
        console.log(`User ID for potential permissions: ${userInfo.user_id}`);
      } catch (err) {
        console.error('Error getting user email:', err);
      }
    }

    // Step 3: Update permissions
    // First set "anyone with the link" to be a commenter (this is for clients)
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'commenter',
        type: 'anyone',
      },
    });

    // If we have the user's email, add them as an owner as well
    if (userEmail) {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'owner',
          type: 'user',
          emailAddress: userEmail,
        },
      });
    }

    // Step 4: Move the document to the parent folder if specified
    if (process.env.GOOGLE_DRIVE_PARENT_FOLDER) {
      await drive.files.update({
        fileId: documentId,
        addParents: process.env.GOOGLE_DRIVE_PARENT_FOLDER,
        fields: 'id, parents',
      });
    }

    // Return the document ID to the client
    return res.status(200).json({
      success: true,
      docId: documentId,
      docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    });
  } catch (error: any) {
    console.error('Error creating Google Doc:', error);
    return res.status(500).json({
      error: 'Failed to create Google Doc',
      details: error.message,
    });
  }
}
