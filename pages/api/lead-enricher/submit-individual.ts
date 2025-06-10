import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { google } from 'googleapis';

interface IndividualCSVRowData {
  URL: string;
  keyword: string;
  negativeURLTitle: string;
  firstName: string;
  lastName: string;
  email?: string;
  linkedinURL?: string;
}

interface RequestBody {
  data: IndividualCSVRowData[];
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

// Google Sheets configuration for individual lists
const INDIVIDUAL_SPREADSHEET_ID = '1wL2UKP7DlEqSeX3mztL4W3SodGbP55-CH_Pbgg4kRmM';
const RANGE = 'A:I'; // Use columns A-I for all fields including user name

// Initialize Google Sheets client
const getGoogleSheetsClient = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: '170711728338',
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

// Save submission to database with list_type
const saveSubmissionToDatabase = async (userId: number, rowCount: number) => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [result] = await connection.execute(
      'INSERT INTO user_partial_list_submissions (user_id, rows_submitted, list_type, created_at) VALUES (?, ?, ?, NOW())',
      [userId, rowCount, 'individual']
    );

    return result;
  } finally {
    await connection.end();
  }
};

// Add data to Google Sheets
const addDataToGoogleSheets = async (data: IndividualCSVRowData[], userName: string) => {
  const sheets = await getGoogleSheetsClient();

  // First, read the existing headers to understand the sheet structure
  let existingHeaders: string[] = [];
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: INDIVIDUAL_SPREADSHEET_ID,
      range: 'A1:Z1', // Get first row to check headers
    });

    if (headerResponse.data.values && headerResponse.data.values[0]) {
      existingHeaders = headerResponse.data.values[0] as string[];
      console.log('Existing Individual Google Sheet headers:', existingHeaders);
    }
  } catch (headerError) {
    console.log('Could not read existing headers, assuming new sheet');
  }

  // If no headers exist, create the default structure
  if (existingHeaders.length === 0) {
    // Use the user's preferred column order
    existingHeaders = [
      'First Name',
      'Last Name',
      'Keyword',
      'URL',
      'Negative URL Title',
      'Owner',
      'Email',
      'LinkedIn URL',
      'Upload Date',
    ];
    console.log('Adding headers to Individual Google Sheet:', existingHeaders);
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: INDIVIDUAL_SPREADSHEET_ID,
        range: 'A1:I1',
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
      case 'firstname':
        fieldToColumnMap['firstName'] = index;
        break;
      case 'lastname':
        fieldToColumnMap['lastName'] = index;
        break;
      case 'keyword':
        fieldToColumnMap['keyword'] = index;
        break;
      case 'url':
        fieldToColumnMap['URL'] = index;
        break;
      case 'negativeurltitle':
        fieldToColumnMap['negativeURLTitle'] = index;
        break;
      case 'owner':
      case 'username':
        fieldToColumnMap['userName'] = index;
        break;
      case 'email':
        fieldToColumnMap['email'] = index;
        break;
      case 'linkedinurl':
      case 'linkedin':
        fieldToColumnMap['linkedinURL'] = index;
        break;
      case 'uploaddate':
      case 'timestamp':
      case 'date':
        fieldToColumnMap['timestamp'] = index;
        break;
    }
  });

  console.log('Field to column mapping:', fieldToColumnMap);

  // Prepare data for Google Sheets - map each field to the correct column position
  const values = data.map(row => {
    // Create an array with the same length as headers, filled with empty strings
    const rowData = new Array(existingHeaders.length).fill('');

    // Map each of our fields to the correct column position
    if (fieldToColumnMap['firstName'] !== undefined)
      rowData[fieldToColumnMap['firstName']] = row.firstName;
    if (fieldToColumnMap['lastName'] !== undefined)
      rowData[fieldToColumnMap['lastName']] = row.lastName;
    if (fieldToColumnMap['keyword'] !== undefined)
      rowData[fieldToColumnMap['keyword']] = row.keyword;
    if (fieldToColumnMap['URL'] !== undefined) rowData[fieldToColumnMap['URL']] = row.URL;
    if (fieldToColumnMap['negativeURLTitle'] !== undefined)
      rowData[fieldToColumnMap['negativeURLTitle']] = row.negativeURLTitle;
    if (fieldToColumnMap['email'] !== undefined)
      rowData[fieldToColumnMap['email']] = row.email || '';
    if (fieldToColumnMap['linkedinURL'] !== undefined)
      rowData[fieldToColumnMap['linkedinURL']] = row.linkedinURL || '';
    if (fieldToColumnMap['userName'] !== undefined)
      rowData[fieldToColumnMap['userName']] = userName;
    if (fieldToColumnMap['timestamp'] !== undefined)
      rowData[fieldToColumnMap['timestamp']] = new Date().toISOString();

    return rowData;
  });

  console.log('Sample mapped row data:', values[0]);

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: INDIVIDUAL_SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: values,
      },
    });

    return response;
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    // If range fails, try with a more specific range
    if (error.message?.includes('range')) {
      console.log('Retrying with Sheet1 range...');
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: INDIVIDUAL_SPREADSHEET_ID,
        range: 'Sheet1!A:I',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: values,
        },
      });
      return response;
    }
    throw error;
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

    // Validate data structure
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const missingFields = [];

      // Required fields
      if (!row.URL || String(row.URL).trim() === '') missingFields.push('URL');
      if (!row.keyword || String(row.keyword).trim() === '') missingFields.push('keyword');
      if (!row.negativeURLTitle || String(row.negativeURLTitle).trim() === '')
        missingFields.push('negativeURLTitle');
      if (!row.firstName || String(row.firstName).trim() === '') missingFields.push('firstName');
      if (!row.lastName || String(row.lastName).trim() === '') missingFields.push('lastName');

      if (missingFields.length > 0) {
        console.log(`Row ${i + 2} validation failed:`, {
          rowData: row,
          missingFields,
        });

        return res.status(400).json({
          message: `Invalid data at row ${i + 2}. Missing required fields: ${missingFields.join(', ')}`,
        });
      }
    }

    // Get user ID and name from token
    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ message: 'Invalid user token' });
    }

    // Save submission to database
    console.log(
      `Saving individual partial list submission for user ${userInfo.id} with ${data.length} rows`
    );
    await saveSubmissionToDatabase(userInfo.id, data.length);

    // Add data to Google Sheets
    console.log(`Adding ${data.length} rows to individual partial list Google Sheets`);
    await addDataToGoogleSheets(data, userInfo.name);

    console.log('Individual partial list submission completed successfully');

    res.status(200).json({
      message: 'Individual partial list data submitted successfully',
      rowsProcessed: data.length,
    });
  } catch (error: any) {
    console.error('Error in individual partial list submit:', error);

    // Return more specific error messages
    if (error.message?.includes('Google Sheets')) {
      return res.status(500).json({
        message: 'Failed to save data to Google Sheets. Please try again.',
      });
    }

    if (error.message?.includes('database') || error.code?.includes('ER_')) {
      return res.status(500).json({
        message: 'Database error. Please try again.',
      });
    }

    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
}
