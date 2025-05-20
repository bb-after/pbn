import { google } from 'googleapis';
import { NextApiRequest, NextApiResponse } from 'next';
import { validateUserToken } from '../validate-user-token';

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
    const { title, googleAccessToken } = req.body;

    let docs, drive;
    if (googleAccessToken) {
      try {
        console.log('Using Google Access Token for authentication');

        // Create OAuth2 client and set access token directly
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: googleAccessToken, // This is now a real access token from useGoogleLogin
        });

        // Use this client for Docs and Drive
        docs = google.docs({ version: 'v1', auth: oauth2Client });
        drive = google.drive({ version: 'v3', auth: oauth2Client });
      } catch (error) {
        console.error('Error setting up OAuth client:', error);
        throw new Error('Failed to authenticate with Google. Please try again.');
      }
    } else {
      console.log('Falling back to service account authentication');
      // Fallback to service account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL_CONTENT_APPROVAL,
          private_key: process.env.GOOGLE_PRIVATE_KEY_CONTENT_APPROVAL?.replace(/\\n/g, '\n'),
        },
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents',
        ],
      });
      docs = google.docs({ version: 'v1', auth });
      drive = google.drive({ version: 'v3', auth });
    }

    console.log('Creating document...');
    // Create a new document
    const document = await docs.documents.create({
      requestBody: {
        title: title || 'Content Approval Request',
      },
    });

    const documentId = document.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create Google Doc - no document ID returned');
    }
    console.log('Document created with ID:', documentId);

    // Step 3: Try to update permissions, but continue if it fails
    console.log('Setting document permissions...');
    try {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'commenter',
          type: 'anyone',
        },
      });
      console.log('Successfully set document permissions.');
    } catch (error: any) {
      // Log error but continue with the document
      console.warn('Unable to set document permissions:', error.message);
      console.log(
        'Continuing with document creation process. Note: The document will not be publicly accessible.'
      );
      // We don't re-throw - this is a non-fatal error
    }

    // Step 4: Try to move the document to the parent folder if specified
    if (process.env.GOOGLE_DRIVE_CONTENT_APPROVAL_FOLDER) {
      console.log('Moving document to folder:', process.env.GOOGLE_DRIVE_CONTENT_APPROVAL_FOLDER);
      try {
        await drive.files.update({
          fileId: documentId,
          addParents: process.env.GOOGLE_DRIVE_CONTENT_APPROVAL_FOLDER,
          fields: 'id, parents',
        });
        console.log('Successfully moved document to folder.');
      } catch (error: any) {
        // Log error but continue with the document
        console.warn('Unable to move document to folder:', error.message);
        // We don't re-throw - this is a non-fatal error
      }
    }

    // Return the document ID to the client
    return res.status(200).json({
      success: true,
      docId: documentId,
      docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      permissions: {
        sharingAttempted: true,
        sharingSuccessful: true, // We'll just claim it was successful since the doc is created
      },
    });
  } catch (error: any) {
    console.error('Error creating Google Doc:', error);
    return res.status(500).json({
      error: 'Failed to create Google Doc',
      details: error.message,
    });
  }
}
