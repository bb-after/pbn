import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

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

// Authenticate user from JWT token
const authenticateUser = async (req: NextApiRequest): Promise<{ id: number; name: string; email: string } | null> => {
  try {
    const token = req.cookies.auth_token;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
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

// Save submission to database with list_type
const saveSubmissionToDatabase = async (userId: number, rowCount: number) => {
  const connection = await pool.getConnection();

  try {
    const [result] = await connection.execute(
      'INSERT INTO user_partial_list_submissions (user_id, rows_submitted, list_type, created_at) VALUES (?, ?, ?, NOW())',
      [userId, rowCount, 'blp']
    );

    return result;
  } finally {
    connection.release();
  }
};

// Add data to Google Sheets
const addDataToGoogleSheets = async (data: BLPCSVRowData[]) => {
  const sheets = await getGoogleSheetsClient();

  // Get all unique user IDs from the data
  const uniqueUserIds = [...new Set(data.map(row => row.OwnerUserId))];

  // Batch lookup all user names
  const userNamesMap = await getUserNamesByIds(uniqueUserIds);

  // Get existing headers from the sheet
  const existingHeadersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: CLAY_COMPANY_ENRICHER_BLP_GOOGLE_SHEET_ID,
    range: 'A1:L1',
  });

  const existingHeaders = existingHeadersResponse.data.values?.[0] || [];

  // Map our fields to the correct column positions
  const fieldToColumnMap: { [key: string]: number } = {};
  existingHeaders.forEach((header: string, index: number) => {
    const lowerHeader = header.toLowerCase().trim();
    switch (lowerHeader) {
      case 'company name':
      case 'companyname':
      case 'company':
        fieldToColumnMap['companyName'] = index;
        break;
      case 'website':
      case 'url':
      case 'domain':
        fieldToColumnMap['website'] = index;
        break;
      case 'industry':
      case 'sector':
        fieldToColumnMap['industry'] = index;
        break;
      case 'location':
      case 'address':
      case 'city':
        fieldToColumnMap['location'] = index;
        break;
      case 'employee count':
      case 'employeecount':
      case 'employees':
        fieldToColumnMap['employeeCount'] = index;
        break;
      case 'revenue':
      case 'income':
        fieldToColumnMap['revenue'] = index;
        break;
      case 'contact name':
      case 'contactname':
      case 'contact':
        fieldToColumnMap['contactName'] = index;
        break;
      case 'contact title':
      case 'contacttitle':
      case 'title':
        fieldToColumnMap['contactTitle'] = index;
        break;
      case 'contact email':
      case 'contactemail':
      case 'email':
        fieldToColumnMap['contactEmail'] = index;
        break;
      case 'user name':
      case 'username':
      case 'user':
      case 'owner':
        fieldToColumnMap['userName'] = index;
        break;
      case 'timestamp':
      case 'date':
        fieldToColumnMap['timestamp'] = index;
        break;
    }
  });

  console.log('Field to column mapping:', fieldToColumnMap);
  console.log('userName column index:', fieldToColumnMap['userName']);

  // Prepare data for Google Sheets - map each field to the correct column position
  const values = data.map((row, index) => {
    // Create an array with the same length as headers, filled with empty strings
    const rowData = new Array(existingHeaders.length).fill('');

    // Debug logging for the first row
    if (index === 0) {
      console.log('Processing first row for BLP submission:');
      console.log('OwnerUserId:', row.OwnerUserId);
      console.log('Row data:', row);
    }

    // Get the owner's name from the cached map
    const ownerName = userNamesMap[row.OwnerUserId] || `Unknown User (ID: ${row.OwnerUserId})`;

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
      rowData[fieldToColumnMap['userName']] = ownerName;

      // Debug logging for the first row
      if (index === 0) {
        console.log('Setting owner value:', ownerName);
        console.log('At position:', fieldToColumnMap['userName']);
        console.log('Row data after setting owner:', rowData);
      }
    }
    if (fieldToColumnMap['timestamp'] !== undefined)
      rowData[fieldToColumnMap['timestamp']] = new Date().toISOString();

    return rowData;
  });

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
    const { data, fieldMapping, csvHeaders }: RequestBody = req.body;

    // Validate required fields
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: 'No data provided' });
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

    // Authenticate user from JWT token
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
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
