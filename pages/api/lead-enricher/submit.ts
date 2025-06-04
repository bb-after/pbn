import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { google } from 'googleapis';

interface CSVRowData {
  Company: string;
  Keyword: string;
  URL: string;
}

interface RequestBody {
  data: CSVRowData[];
  userToken: string;
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
};

// Google Sheets configuration
const SPREADSHEET_ID = '1O15b50dX2qF9vSRdhLj1tOMXnRdLuNfYWnJtVUhrqK8';
const RANGE = 'A:E'; // Use columns A-E including user name

// Initialize Google Sheets client
const getGoogleSheetsClient = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: '170711728338', // Use the project ID from the error
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

// Save submission to database
const saveSubmissionToDatabase = async (userId: number, rowCount: number) => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [result] = await connection.execute(
      'INSERT INTO user_partial_list_submissions (user_id, rows_submitted, created_at) VALUES (?, ?, NOW())',
      [userId, rowCount]
    );

    return result;
  } finally {
    await connection.end();
  }
};

// Add data to Google Sheets
const addDataToGoogleSheets = async (data: CSVRowData[], userName: string) => {
  const sheets = await getGoogleSheetsClient();

  // Prepare data for Google Sheets (convert to 2D array)
  const values = data.map(row => [
    row.Company,
    row.Keyword,
    row.URL,
    new Date().toISOString(),
    userName,
  ]);

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
    const { data, userToken }: RequestBody = req.body;

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
      if (!row.Company || !row.Keyword || !row.URL) {
        return res.status(400).json({
          message: `Invalid data at row ${i + 1}. Company, Keyword, and URL are required.`,
        });
      }
    }

    // Get user ID and name from token
    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ message: 'Invalid user token' });
    }

    // Save submission to database
    console.log(`Saving submission for user ${userInfo.id} with ${data.length} rows`);
    await saveSubmissionToDatabase(userInfo.id, data.length);

    // Add data to Google Sheets
    console.log(`Adding ${data.length} rows to Google Sheets`);
    await addDataToGoogleSheets(data, userInfo.name);

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
