import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Define SCOPES for both Drive and Docs APIs
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
];

// Create the JWT auth object
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Replace escaped newlines
  scopes: SCOPES,
});

const GOOGLE_DRIVE_PARENT_FOLDER = process.env.GOOGLE_DRIVE_PARENT_FOLDER;

// Initialize both Drive and Docs APIs with the same auth object
const drive = google.drive({ version: 'v3', auth });
const docs = google.docs({ version: 'v1', auth });

export function extractDocIdFromUrl(docUrl: string): string {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/; // This regex extracts the docId from a typical Google Doc URL
  const match = docUrl.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    throw new Error('Failed to extract document ID from URL');
  }
}
export async function createOrGetFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  // Basic sanitization: remove extra spaces and non-alphanumeric characters
  const sanitizedFolderName = folderName.replace(/[^\w\s]/gi, '').trim();
  console.log('!!!!we have a legit folder name', sanitizedFolderName);
  const query = `mimeType='application/vnd.google-apps.folder' and name='${sanitizedFolderName}' and trashed=false`;
  const res = await drive.files.list({ q: query, fields: 'files(id)' });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  } else {
    const folderMetadata = {
      name: sanitizedFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };
    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });
    return folder.data.id!;
  }
}

export async function moveFileToFolder(fileId: string, clientName?: string) {
  try {
    // Use client name or default to "Uncategorized"
    let folderName = clientName ? clientName : 'Uncategorized';

    // Get or create the folder inside the fixed parent folder (this should be done only once)
    const targetFolderId = await createOrGetFolder(folderName, GOOGLE_DRIVE_PARENT_FOLDER);

    // Move the file to the correct folder using the target folder ID
    await drive.files.update({
      fileId: fileId,
      addParents: targetFolderId,
      fields: 'id, parents',
    });

    console.log(`Moved document to folder: ${folderName} (ID: ${targetFolderId})`);
  } catch (error) {
    console.error('Error moving file:', error);
    throw new Error('Failed to move file to appropriate folder');
  }
}

export async function createGoogleDoc(title: string, content: string) {
  try {
    const timestamp = new Date().toISOString();
    const titleWithTimestamp = `${title} - ${timestamp}`;
    // Create a new Google Doc
    const res = await docs.documents.create({
      requestBody: {
        title: titleWithTimestamp,
      },
    });

    // Log the response to check the structure
    // console.log('Document creation response:', res.data);

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

    // Set permissions to comment-only mode for anyone with the link
    // This ensures users can only suggest/comment and not directly edit the document
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'commenter',
        type: 'anyone',
      },
    });

    // Return the document URL for easy access
    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    throw new Error('Failed to create Google Doc');
  }
}
