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
    const res = await docs.documents.create({
      requestBody: {
        title: title,
      },
    });

    const documentId = res.data.documentId;

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1,
              },
              text: content,
            },
          },
        ],
      },
    });

    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    throw error;
  }
}
