import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Debug environment variables
console.log('Google Sheets Auth Debug:', {
  hasClientId: !!process.env.GOOGLE_SHEETS_CLIENT_ID,
  hasServiceAccount: !!process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT,
  clientIdLength: process.env.GOOGLE_SHEETS_CLIENT_ID?.length || 0,
  serviceAccountLength: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT?.length || 0,
});

const auth = new JWT({
  email: process.env.GOOGLE_SHEETS_CLIENT_ID,
  key: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

export function extractSheetIdFromUrl(sheetUrl: string): string {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = sheetUrl.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    throw new Error('Failed to extract spreadsheet ID from URL');
  }
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  merchant: string;
  receipt_url?: string;
}

export async function findMatchingSheetTab(
  sheetId: string,
  expectedTabName: string
): Promise<{ exists: boolean; tabName?: string; allTabs: string[] }> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const allTabs = response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];

    // Look for exact match first
    const exactMatch = allTabs.find(tabName => tabName === expectedTabName);
    if (exactMatch) {
      return { exists: true, tabName: exactMatch, allTabs };
    }

    // Look for similar match (case-insensitive)
    const similarMatch = allTabs.find(
      tabName => tabName.toLowerCase() === expectedTabName.toLowerCase()
    );
    if (similarMatch) {
      return { exists: true, tabName: similarMatch, allTabs };
    }

    return { exists: false, allTabs };
  } catch (error) {
    console.error('Error finding matching sheet tab:', error);
    throw new Error(
      `Failed to check sheet tabs: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getClientOptionsFromSheet(
  sheetId: string,
  tabName: string
): Promise<string[]> {
  try {
    // Read Column A starting from row 2 until empty
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A2:A1000`, // Read a large range, will stop at empty cells
    });

    const values = response.data.values || [];
    // Filter out empty values and return unique options
    const clientOptions = values
      .flat()
      .filter((value: string) => value && value.trim() !== '')
      .map((value: string) => value.trim());

    // Remove duplicates and return
    return [...new Set(clientOptions)];
  } catch (error) {
    console.error('Error reading client options from sheet:', error);
    // Return empty array if sheet doesn't exist or can't be read
    return [];
  }
}

export async function writeExpensesToSheet(
  sheetId: string,
  sheetName: string,
  expenses: ExpenseRow[]
): Promise<{ recordsProcessed: number }> {
  try {
    // Check if sheet exists, create if not
    await ensureSheetExists(sheetId, sheetName);

    // Clear existing content (except headers)
    await clearSheetContent(sheetId, sheetName);

    // Add headers
    const headers = [
      'Date',
      'Employee',
      'Amount',
      'Currency',
      'Description',
      'Category',
      'Merchant',
      'Receipt URL',
      'Expense ID',
    ];

    // Prepare data rows
    const rows = expenses.map(expense => [
      new Date(expense.date).toLocaleDateString(),
      expense.user_name,
      expense.amount,
      expense.currency,
      expense.description,
      expense.category,
      expense.merchant,
      expense.receipt_url || '',
      expense.id,
    ]);

    const values = [headers, ...rows];

    // Write to sheet
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    // Format headers
    await formatHeaders(sheetId, sheetName, headers.length);

    return { recordsProcessed: rows.length };
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw new Error(
      `Failed to write to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function ensureSheetExists(spreadsheetId: string, sheetName: string): Promise<void> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetExists = response.data.sheets?.some(sheet => sheet.properties?.title === sheetName);

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
    }
  } catch (error) {
    throw new Error(
      `Failed to ensure sheet exists: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function clearSheetContent(spreadsheetId: string, sheetName: string): Promise<void> {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:Z1000`, // Clear content but leave row 1 for headers
    });
  } catch (error) {
    console.error('Error clearing sheet content:', error);
    // Don't throw here, as this is not critical
  }
}

async function formatHeaders(
  spreadsheetId: string,
  sheetName: string,
  headerCount: number
): Promise<void> {
  try {
    // Get sheet ID first
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = response.data.sheets?.find(sheet => sheet.properties?.title === sheetName);

    if (!sheet?.properties?.sheetId) {
      return; // Skip formatting if we can't find the sheet ID
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheet.properties.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headerCount,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9,
                  },
                  textFormat: {
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheet.properties.sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headerCount,
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error formatting headers:', error);
    // Don't throw here, as formatting is not critical for functionality
  }
}
