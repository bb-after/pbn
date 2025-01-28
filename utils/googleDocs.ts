import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/documents'];

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: SCOPES,
});

const docs = google.docs({ version: 'v1', auth });

export async function createGoogleDoc(title: string, content: string) {
  try {
    // Create a new Google Doc
    const res = await docs.documents.create({
      requestBody: {
        title: title,
      },
    });

    // Log the response to check the structure
    console.log('Document creation response:', res.data);

    // Ensure documentId exists in the response
    const documentId = res.data.documentId;
    if (!documentId) {
      throw new Error('Failed to retrieve documentId from Google Docs API response');
    }

    // Insert content into the document
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1, // Insert at the beginning of the document
              },
              text: content,
            },
          },
        ],
      },
    });

    // Return the document URL for easy access
    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    throw new Error('Failed to create Google Doc');
  }
}
