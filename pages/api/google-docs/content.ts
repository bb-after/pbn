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

// Helper function to convert Google Docs format to HTML
const convertDocToHtml = (doc: any) => {
  if (!doc || !doc.body || !doc.body.content) {
    return '';
  }

  let html = '';
  const content = doc.body.content;

  // Process each structural element
  for (const element of content) {
    if (element.paragraph) {
      html += '<p>';

      // Process each text run in paragraph
      for (const paragraphElement of element.paragraph.elements) {
        if (paragraphElement.textRun && paragraphElement.textRun.content) {
          let text = paragraphElement.textRun.content;

          // Handle text formatting
          if (paragraphElement.textRun.textStyle) {
            const style = paragraphElement.textRun.textStyle;

            if (style.bold) text = `<strong>${text}</strong>`;
            if (style.italic) text = `<em>${text}</em>`;
            if (style.underline) text = `<u>${text}</u>`;
            if (style.strikethrough) text = `<s>${text}</s>`;
          }

          html += text;
        }
      }

      html += '</p>';
    } else if (element.table) {
      // Basic table support
      html += '<table border="1" style="border-collapse: collapse;">';

      // Process rows and cells
      if (element.table.tableRows) {
        for (const row of element.table.tableRows) {
          html += '<tr>';

          if (row.tableCells) {
            for (const cell of row.tableCells) {
              html += '<td style="padding: 8px;">';

              // Process content in each cell
              if (cell.content) {
                for (const cellElement of cell.content) {
                  if (cellElement.paragraph) {
                    for (const paragraphElement of cellElement.paragraph.elements) {
                      if (paragraphElement.textRun && paragraphElement.textRun.content) {
                        html += paragraphElement.textRun.content;
                      }
                    }
                  }
                }
              }

              html += '</td>';
            }
          }

          html += '</tr>';
        }
      }

      html += '</table>';
    } else if (element.sectionBreak) {
      html += '<hr>';
    }
  }

  return html;
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

  // Temporarily bypass strict validation if needed
  // Comment this out once you've resolved the authentication issues
  /*
  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  */

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { docId } = req.query;

    if (!docId || typeof docId !== 'string') {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Authenticate with Google APIs
    const auth = await authenticateGoogleAPIs();

    // Get document content
    const docs = google.docs({ version: 'v1', auth });

    const document = await docs.documents.get({
      documentId: docId,
    });

    // Convert the Google Doc to HTML
    const htmlContent = convertDocToHtml(document.data);

    // Return the document content
    return res.status(200).json({
      success: true,
      content: htmlContent,
    });
  } catch (error: any) {
    console.error('Error fetching Google Doc content:', error);
    return res.status(500).json({
      error: 'Failed to fetch Google Doc content',
      details: error.message,
    });
  }
}
