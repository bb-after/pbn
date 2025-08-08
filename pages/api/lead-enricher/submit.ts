import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { google } from 'googleapis';

interface CSVRowData {
  Company: string;
  Keyword: string;
  URL: string;
  OwnerUserId: number;
}

interface RequestBody {
  data: CSVRowData[];
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

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Google Sheets configuration
const SPREADSHEET_ID = process.env.CLAY_COMPANY_ENRICHER_GOOGLE_SHEET_ID;
const RANGE = 'A:E'; // Use columns A-E including user name

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
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute('SELECT id, name FROM users WHERE user_token = ?', [
      userToken,
    ]);

    const users = rows as any[];
    return users.length > 0 ? { id: users[0].id, name: users[0].name } : null;
  } finally {
    connection.release();
  }
};

// Get user names for multiple user IDs in a single query
const getUserNamesByIds = async (userIds: number[]): Promise<{ [userId: number]: string }> => {
  if (userIds.length === 0) return {};

  const connection = await pool.getConnection();

  try {
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT id, name FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    const users = rows as any[];
    const userMap: { [userId: number]: string } = {};

    users.forEach(user => {
      userMap[user.id] = user.name;
    });

    return userMap;
  } finally {
    connection.release();
  }
};

// Save submission to database
const saveSubmissionToDatabase = async (userId: number, rowCount: number) => {
  const connection = await pool.getConnection();

  try {
    const [result] = await connection.execute(
      'INSERT INTO user_partial_list_submissions (user_id, rows_submitted, list_type, created_at) VALUES (?, ?, ?, NOW())',
      [userId, rowCount, 'company']
    );

    return result;
  } finally {
    connection.release();
  }
};

// Add data to Google Sheets
const addDataToGoogleSheets = async (data: CSVRowData[]) => {
  const sheets = await getGoogleSheetsClient();

  // Get all unique user IDs from the data
  const uniqueUserIds = [...new Set(data.map(row => row.OwnerUserId))];

  // Batch lookup all user names
  const userNamesMap = await getUserNamesByIds(uniqueUserIds);

  // First, read the existing headers to understand the sheet structure
  let existingHeaders: string[] = [];
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1:Z1', // Get first row to check headers
    });

    if (headerResponse.data.values && headerResponse.data.values[0]) {
      existingHeaders = headerResponse.data.values[0] as string[];
      console.log('Existing Google Sheet headers:', existingHeaders);
    }
  } catch (headerError) {
    console.log('Could not read existing headers, assuming new sheet');
  }

  // If no headers exist, create the default structure
  if (existingHeaders.length === 0) {
    // Default column order for company data
    existingHeaders = ['Company', 'Keyword', 'URL', 'Owner', 'Upload Date'];
    console.log('Adding headers to Google Sheet:', existingHeaders);
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A1:E1',
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
      case 'company':
      case 'companyname':
        fieldToColumnMap['Company'] = index;
        break;
      case 'keyword':
        fieldToColumnMap['Keyword'] = index;
        break;
      case 'url':
      case 'website':
        fieldToColumnMap['URL'] = index;
        break;
      case 'timestamp':
      case 'uploaddate':
      case 'date':
        fieldToColumnMap['timestamp'] = index;
        break;
      case 'username':
      case 'owner':
        fieldToColumnMap['userName'] = index;
        break;
    }
  });

  console.log('Field to column mapping:', fieldToColumnMap);

  // Prepare data for Google Sheets - map each field to the correct column position
  const values = data.map(row => {
    // Create an array with the same length as headers, filled with empty strings
    const rowData = new Array(existingHeaders.length).fill('');

    // Get the owner's name from the cached map
    const ownerName = userNamesMap[row.OwnerUserId] || `Unknown User (ID: ${row.OwnerUserId})`;

    // Map each of our fields to the correct column position
    if (fieldToColumnMap['Company'] !== undefined)
      rowData[fieldToColumnMap['Company']] = row.Company;
    if (fieldToColumnMap['Keyword'] !== undefined)
      rowData[fieldToColumnMap['Keyword']] = row.Keyword;
    if (fieldToColumnMap['URL'] !== undefined) rowData[fieldToColumnMap['URL']] = row.URL;
    if (fieldToColumnMap['timestamp'] !== undefined)
      rowData[fieldToColumnMap['timestamp']] = new Date().toISOString();
    if (fieldToColumnMap['userName'] !== undefined)
      rowData[fieldToColumnMap['userName']] = ownerName;

    return rowData;
  });

  console.log('Sample mapped row data:', values[0]);

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
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
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:E',
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

      if (!row.Company || String(row.Company).trim() === '') missingFields.push('Company');
      if (!row.Keyword || String(row.Keyword).trim() === '') missingFields.push('Keyword');
      if (!row.URL || String(row.URL).trim() === '') missingFields.push('URL');
      if (!row.OwnerUserId || !Number.isInteger(row.OwnerUserId)) missingFields.push('OwnerUserId');

      if (missingFields.length > 0) {
        console.log(`Row ${i + 2} validation failed:`, {
          rowData: row,
          missingFields,
          Company: row.Company,
          Keyword: row.Keyword,
          URL: row.URL,
          OwnerUserId: row.OwnerUserId,
        });

        return res.status(400).json({
          message: `Invalid data at row ${i + 2}. Missing fields: ${missingFields.join(', ')}. Company: "${row.Company}", Keyword: "${row.Keyword}", URL: "${row.URL}", OwnerUserId: "${row.OwnerUserId}"`,
        });
      }
    }

    // Get user ID and name from token (submitter info)
    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ message: 'Invalid user token' });
    }

    // Save submission to database
    console.log(`Saving submission for user ${userInfo.id} with ${data.length} rows`);
    await saveSubmissionToDatabase(userInfo.id, data.length);

    // Add data to Google Sheets (now uses per-row owners)
    console.log(`Adding ${data.length} rows to Google Sheets with individual owners`);
    await addDataToGoogleSheets(data);

    console.log('Lead enricher submission completed successfully');

    res.status(200).json({
      message: 'Data submitted successfully',
      rowsProcessed: data.length,
    });
  } catch (error: any) {
    console.error('Error in lead enricher submit:', error);

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
