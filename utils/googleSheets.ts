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

export async function checkTabProtectionStatus(
  sheetId: string,
  tabName: string
): Promise<{ isProtected: boolean; protectionDetails?: any }> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      includeGridData: false,
    });

    const sheet = response.data.sheets?.find(sheet => sheet.properties?.title === tabName);

    if (!sheet || !sheet.properties?.sheetId) {
      return { isProtected: false };
    }

    // Check if the sheet has any protection ranges
    const protectedRanges = sheet.protectedRanges || [];

    // Check if the entire sheet is protected
    const isSheetProtected = protectedRanges.some(range => {
      // A protected range that covers the entire sheet typically has no range specified
      // or has a range that covers all cells
      return (
        !range.range ||
        (range.range.startRowIndex === undefined &&
          range.range.endRowIndex === undefined &&
          range.range.startColumnIndex === undefined &&
          range.range.endColumnIndex === undefined)
      );
    });

    return {
      isProtected: isSheetProtected,
      protectionDetails: isSheetProtected ? protectedRanges[0] : null,
    };
  } catch (error) {
    console.error('Error checking tab protection status:', error);
    // If we can't check, assume it's not protected to avoid blocking legitimate use
    return { isProtected: false };
  }
}

export async function findMatchingSheetTab(
  sheetId: string,
  expectedTabName: string
): Promise<{ exists: boolean; tabName?: string; allTabs: string[]; isProtected?: boolean }> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const allTabs = response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];

    // Look for exact match first
    const exactMatch = allTabs.find(tabName => tabName === expectedTabName);
    if (exactMatch) {
      const protectionStatus = await checkTabProtectionStatus(sheetId, exactMatch);
      return {
        exists: true,
        tabName: exactMatch,
        allTabs,
        isProtected: protectionStatus.isProtected,
      };
    }

    // Look for similar match (case-insensitive)
    const similarMatch = allTabs.find(
      tabName => tabName.toLowerCase() === expectedTabName.toLowerCase()
    );
    if (similarMatch) {
      const protectionStatus = await checkTabProtectionStatus(sheetId, similarMatch);
      return {
        exists: true,
        tabName: similarMatch,
        allTabs,
        isProtected: protectionStatus.isProtected,
      };
    }

    return { exists: false, allTabs, isProtected: false };
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
  expenses: ExpenseRow[],
  clientMappings?: Record<string, string>,
  expenseCategoryMappings?: Record<string, string>
): Promise<{ recordsProcessed: number }> {
  try {
    // Check if sheet exists, throw error if not
    await ensureSheetExists(sheetId, sheetName);

    // If no mappings provided, fall back to simple tabular format
    if (!clientMappings || !expenseCategoryMappings) {
      return await writeExpensesInTabularFormat(sheetId, sheetName, expenses);
    }

    // Use matrix format with client and expense category mappings
    return await writeExpensesInMatrixFormat(
      sheetId,
      sheetName,
      expenses,
      clientMappings,
      expenseCategoryMappings
    );
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw new Error(
      `Failed to write to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function writeExpensesInTabularFormat(
  sheetId: string,
  sheetName: string,
  expenses: ExpenseRow[]
): Promise<{ recordsProcessed: number }> {
  // Check if sheet exists first
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
  await sheets.spreadsheets.values.update({
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
}

async function writeExpensesInMatrixFormat(
  sheetId: string,
  sheetName: string,
  expenses: ExpenseRow[],
  clientMappings: Record<string, string>,
  expenseCategoryMappings: Record<string, string>
): Promise<{ recordsProcessed: number }> {
  // First, read the existing sheet to understand the structure
  const existingData = await readExistingSheetStructure(sheetId, sheetName);

  // Get unique clients and expense categories from mappings
  const uniqueClients = Array.from(new Set(Object.values(clientMappings)));
  const uniqueExpenseCategories = Array.from(new Set(Object.values(expenseCategoryMappings)));

  // Create a map to aggregate expenses by client and category
  const expenseMatrix: Record<string, Record<string, number>> = {};

  // Initialize matrix
  uniqueClients.forEach(client => {
    expenseMatrix[client] = {};
    uniqueExpenseCategories.forEach(category => {
      expenseMatrix[client][category] = 0;
    });
  });

  // Aggregate expenses
  expenses.forEach(expense => {
    const client = clientMappings[expense.id];
    const category = expenseCategoryMappings[expense.id];

    if (client && category) {
      expenseMatrix[client][category] += expense.amount;
    }
  });

  // Update the sheet with the aggregated data
  await updateMatrixInSheet(sheetId, sheetName, expenseMatrix, existingData);

  return { recordsProcessed: expenses.length };
}

async function readExistingSheetStructure(
  sheetId: string,
  sheetName: string
): Promise<{
  clients: string[];
  expenseCategories: string[];
  clientRowMap: Record<string, number>;
  categoryColumnMap: Record<string, string>;
}> {
  try {
    // Read column headers (row 1) from J to Z to get expense categories
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!J1:Z1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    const expenseCategories = headers.filter(header => header && header.trim() !== '');

    // Create column mapping (J=0, K=1, etc.)
    const categoryColumnMap: Record<string, string> = {};
    expenseCategories.forEach((category, index) => {
      const columnLetter = String.fromCharCode(74 + index); // J=74
      categoryColumnMap[category] = columnLetter;
    });

    // Read client names from column A (starting from row 2)
    const clientResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:A1000`,
    });

    const clientValues = clientResponse.data.values || [];
    const clients = clientValues.flat().filter(client => client && client.trim() !== '');

    // Create client row mapping (row 2=0, row 3=1, etc.)
    const clientRowMap: Record<string, number> = {};
    clients.forEach((client, index) => {
      clientRowMap[client] = index + 2; // +2 because we start from row 2
    });

    return {
      clients,
      expenseCategories,
      clientRowMap,
      categoryColumnMap,
    };
  } catch (error) {
    console.error('Error reading existing sheet structure:', error);
    // Return empty structure if sheet doesn't exist or can't be read
    return {
      clients: [],
      expenseCategories: [],
      clientRowMap: {},
      categoryColumnMap: {},
    };
  }
}

async function updateMatrixInSheet(
  sheetId: string,
  sheetName: string,
  expenseMatrix: Record<string, Record<string, number>>,
  existingData: {
    clients: string[];
    expenseCategories: string[];
    clientRowMap: Record<string, number>;
    categoryColumnMap: Record<string, string>;
  }
): Promise<void> {
  const updates: any[] = [];

  // For each client-category combination, update the corresponding cell
  Object.entries(expenseMatrix).forEach(([client, categoryAmounts]) => {
    const rowNumber = existingData.clientRowMap[client];

    if (rowNumber) {
      Object.entries(categoryAmounts).forEach(([category, amount]) => {
        const columnLetter = existingData.categoryColumnMap[category];

        if (columnLetter && amount > 0) {
          updates.push({
            range: `${sheetName}!${columnLetter}${rowNumber}`,
            values: [[amount]],
          });
        }
      });
    }
  });

  // Batch update all the cells
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates,
      },
    });
  }
}

async function ensureSheetExists(spreadsheetId: string, sheetName: string): Promise<void> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetExists = response.data.sheets?.some(sheet => sheet.properties?.title === sheetName);

    if (!sheetExists) {
      throw new Error(
        `Sheet tab "${sheetName}" does not exist. Please create this tab in your Google Sheet before syncing.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      throw error; // Re-throw our custom error
    }
    throw new Error(
      `Failed to check if sheet exists: ${error instanceof Error ? error.message : 'Unknown error'}`
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
