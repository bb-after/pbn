import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { google } from 'googleapis';

interface BLPCSVRowData {
  companyName: string;
  website?: string;
  industry?: string;
  location?: string;
  employeeCount?: string;
  revenue?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  OwnerUserId: number;
}

interface RequestBody {
  data: BLPCSVRowData[];
  userToken: string;
  fieldMapping?: { [key: string]: string }; // Original CSV header -> Our field name
  csvHeaders?: string[]; // Original CSV headers in order
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
};

// Google Sheets configuration for BLP lists
const CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID =
  process.env.CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID;
const RANGE = 'A:L'; // Use columns A-L for all BLP fields including user name and timestamp

// Initialize Google Sheets client
const getGoogleSheetsClient = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

// Get user ID and name from token
const getUserFromToken = async (
  userToken: string
): Promise<{ id: number; name: string } | null> => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute('SELECT id, name FROM users WHERE user_token = ?', [
      userToken,
    ]);

    const users = rows as any[];
    return users.length > 0 ? { id: users[0].id, name: users[0].name } : null;
  } finally {
    await connection.end();
  }
};

// Get user name from user ID
const getUserNameFromId = async (userId: number): Promise<string | null> => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute('SELECT name FROM users WHERE id = ?', [userId]);

    const users = rows as any[];
    return users.length > 0 ? users[0].name : null;
  } finally {
    await connection.end();
  }
};

// Save submission to database with list_type
const saveSubmissionToDatabase = async (userId: number, rowCount: number) => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [result] = await connection.execute(
      'INSERT INTO user_partial_list_submissions (user_id, rows_submitted, list_type, created_at) VALUES (?, ?, ?, NOW())',
      [userId, rowCount, 'blp']
    );

    return result;
  } finally {
    await connection.end();
  }
};

// Add data to Google Sheets
const addDataToGoogleSheets = async (data: BLPCSVRowData[]) => {
  const sheets = await getGoogleSheetsClient();

  // First, read the existing headers to understand the sheet structure
  let existingHeaders: string[] = [];
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID,
      range: 'A1:Z1', // Get first row to check headers
    });

    if (headerResponse.data.values && headerResponse.data.values[0]) {
      existingHeaders = headerResponse.data.values[0] as string[];
      console.log('Existing BLP Google Sheet headers:', existingHeaders);
    }
  } catch (headerError) {
    console.log('Could not read existing headers, assuming new sheet');
  }

  // If no headers exist, create the default structure
  if (existingHeaders.length === 0) {
    // Default column order for BLP data
    existingHeaders = [
      'Company Name',
      'Website',
      'Industry',
      'Location',
      'Employee Count',
      'Revenue',
      'Contact Name',
      'Contact Title',
      'Contact Email',
      'Owner',
      'Upload Date',
    ];
    console.log('Adding headers to BLP Google Sheet:', existingHeaders);
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID,
        range: 'A1:K1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [existingHeaders],
        },
      });
    } catch (headerError) {
      console.log('Could not add headers, proceeding with data only');
    }
  }

  // Create a mapping from our data fields to Google Sheet columns
  const fieldToColumnMap: { [key: string]: number } = {};

  // Map our internal field names to the Google Sheet column positions
  existingHeaders.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');

    switch (normalizedHeader) {
      case 'companyname':
      case 'company':
        fieldToColumnMap['companyName'] = index;
        break;
      case 'website':
      case 'url':
        fieldToColumnMap['website'] = index;
        break;
      case 'industry':
        fieldToColumnMap['industry'] = index;
        break;
      case 'location':
        fieldToColumnMap['location'] = index;
        break;
      case 'employeecount':
      case 'employees':
        fieldToColumnMap['employeeCount'] = index;
        break;
      case 'revenue':
        fieldToColumnMap['revenue'] = index;
        break;
      case 'contactname':
      case 'contact':
        fieldToColumnMap['contactName'] = index;
        break;
      case 'contacttitle':
      case 'title':
        fieldToColumnMap['contactTitle'] = index;
        break;
      case 'contactemail':
      case 'email':
        fieldToColumnMap['contactEmail'] = index;
        break;
      case 'owner':
      case 'username':
        fieldToColumnMap['userName'] = index;
        break;
      case 'uploaddate':
      case 'timestamp':
      case 'date':
        fieldToColumnMap['timestamp'] = index;
        break;
    }
  });

  console.log('Field to column mapping:', fieldToColumnMap);
  console.log('userName column index:', fieldToColumnMap['userName']);

  // Prepare data for Google Sheets - map each field to the correct column position
  const values = await Promise.all(
    data.map(async (row, index) => {
      // Create an array with the same length as headers, filled with empty strings
      const rowData = new Array(existingHeaders.length).fill('');

      // Debug logging for the first row
      if (index === 0) {
        console.log('Processing first row for BLP submission:');
        console.log('OwnerUserId:', row.OwnerUserId);
        console.log('Row data:', row);
      }

      // Get the owner's name from their user ID
      const ownerName = await getUserNameFromId(row.OwnerUserId);

      // Debug logging for the first row
      if (index === 0) {
        console.log('Owner name retrieved:', ownerName);
        console.log('userName field mapping position:', fieldToColumnMap['userName']);
      }

      // Map each of our fields to the correct column position
      if (fieldToColumnMap['companyName'] !== undefined)
        rowData[fieldToColumnMap['companyName']] = row.companyName;
      if (fieldToColumnMap['website'] !== undefined)
        rowData[fieldToColumnMap['website']] = row.website || '';
      if (fieldToColumnMap['industry'] !== undefined)
        rowData[fieldToColumnMap['industry']] = row.industry || '';
      if (fieldToColumnMap['location'] !== undefined)
        rowData[fieldToColumnMap['location']] = row.location || '';
      if (fieldToColumnMap['employeeCount'] !== undefined)
        rowData[fieldToColumnMap['employeeCount']] = row.employeeCount || '';
      if (fieldToColumnMap['revenue'] !== undefined)
        rowData[fieldToColumnMap['revenue']] = row.revenue || '';
      if (fieldToColumnMap['contactName'] !== undefined)
        rowData[fieldToColumnMap['contactName']] = row.contactName || '';
      if (fieldToColumnMap['contactTitle'] !== undefined)
        rowData[fieldToColumnMap['contactTitle']] = row.contactTitle || '';
      if (fieldToColumnMap['contactEmail'] !== undefined)
        rowData[fieldToColumnMap['contactEmail']] = row.contactEmail || '';
      if (fieldToColumnMap['userName'] !== undefined) {
        const ownerValue = ownerName || `Unknown User (ID: ${row.OwnerUserId})`;
        rowData[fieldToColumnMap['userName']] = ownerValue;

        // Debug logging for the first row
        if (index === 0) {
          console.log('Setting owner value:', ownerValue);
          console.log('At position:', fieldToColumnMap['userName']);
          console.log('Row data after setting owner:', rowData);
        }
      }
      if (fieldToColumnMap['timestamp'] !== undefined)
        rowData[fieldToColumnMap['timestamp']] = new Date().toISOString();

      return rowData;
    })
  );

  console.log('Sample BLP mapped row data:', values[0]);

  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID,
        range: RANGE,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: values,
        },
      });

      return response;
    } catch (error: any) {
      console.error(`Google Sheets API Error (attempt ${i + 1}/${maxRetries}):`, error);

      // If range fails, try with a more specific range
      if (error.message?.includes('range')) {
        console.log('Retrying with Sheet1 range...');
        try {
          const response = await sheets.spreadsheets.values.append({
            spreadsheetId: CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID,
            range: 'Sheet1!A:K',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: values,
            },
          });
          return response;
        } catch (retryError) {
          console.error(`Retry failed:`, retryError);
          if (i === maxRetries - 1) throw retryError;
        }
      } else {
        if (i === maxRetries - 1) throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { data, userToken, fieldMapping, csvHeaders }: RequestBody = req.body;

    // Validate required fields
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: 'No data provided' });
    }

    if (!userToken) {
      return res.status(400).json({ message: 'User token is required' });
    }

    // Validate data structure - only companyName is required for BLP
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const missingFields = [];

      if (!row.companyName || String(row.companyName).trim() === '') {
        missingFields.push('companyName');
      }

      if (!row.OwnerUserId) {
        missingFields.push('OwnerUserId');
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Row ${i + 1} is missing required fields: ${missingFields.join(', ')}`,
        });
      }
    }

    // Validate user token and get user info
    const user = await getUserFromToken(userToken);
    if (!user) {
      return res.status(401).json({ message: 'Invalid user token' });
    }

    console.log(
      `Processing BLP submission for user ${user.name} (${user.id}): ${data.length} rows`
    );

    // Save submission to database
    await saveSubmissionToDatabase(user.id, data.length);

    // Add data to Google Sheets (only if configured)
    let sheetsResponse = null;
    if (CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID) {
      try {
        sheetsResponse = await addDataToGoogleSheets(data);
        console.log('BLP data successfully added to Google Sheets');
      } catch (sheetsError) {
        console.error('Google Sheets error (continuing without it):', sheetsError);
      }
    } else {
      console.log('Google Sheets ID not configured, skipping sheets integration');
    }

    res.status(200).json({
      message: 'BLP data submitted successfully',
      rowsProcessed: data.length,
      sheetsResponse: sheetsResponse?.data || null,
      note: sheetsResponse
        ? 'Data saved to database and Google Sheets'
        : 'Data saved to database only (Google Sheets not configured)',
    });
  } catch (error: any) {
    console.error('Error in BLP submit handler:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
}
