import { NextApiRequest, NextApiResponse } from 'next';
import {
  extractSheetIdFromUrl,
  writeExpensesToSheet,
  ExpenseRow,
} from '../../../utils/googleSheets';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { expenses, sheet_url, sheet_name } = req.body;

  if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
    return res.status(400).json({ error: 'No expenses provided' });
  }

  if (!sheet_url || !sheet_name) {
    return res.status(400).json({ error: 'Missing required parameters: sheet_url, sheet_name' });
  }

  try {
    // Validate Google credentials
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Google Sheets credentials not configured' });
    }

    // Extract spreadsheet ID from URL
    const spreadsheetId = extractSheetIdFromUrl(sheet_url);

    // Validate expense data structure
    const validatedExpenses: ExpenseRow[] = expenses.map((expense: any) => {
      if (!expense.id || !expense.user_name || typeof expense.amount !== 'number') {
        throw new Error('Invalid expense data structure');
      }
      return {
        id: expense.id,
        user_id: expense.user_id,
        user_name: expense.user_name,
        amount: expense.amount,
        currency: expense.currency || 'USD',
        description: expense.description || '',
        category: expense.category || 'Uncategorized',
        date: expense.date,
        merchant: expense.merchant || '',
        receipt_url: expense.receipt_url,
      };
    });

    // Write to Google Sheets
    const result = await writeExpensesToSheet(spreadsheetId, sheet_name, validatedExpenses);

    res.status(200).json({
      success: true,
      recordsProcessed: result.recordsProcessed,
      message: `Successfully synced ${result.recordsProcessed} expenses to Google Sheets`,
    });
  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    res.status(500).json({
      error: 'Failed to sync expenses to Google Sheets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
