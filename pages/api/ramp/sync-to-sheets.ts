import { NextApiRequest, NextApiResponse } from 'next';
import {
  extractSheetIdFromUrl,
  writeExpensesToSheet,
  ExpenseRow,
} from '../../../utils/googleSheets';
import { query } from '../../../lib/db';
import { validateUserToken } from '../validate-user-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  let syncLogId: number | null = null;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { expenses, sheet_url, sheet_name, client_mappings, expense_category_mappings } = req.body;

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

    // Validate user token and get user info
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let syncUser = null;
    if (token) {
      // Temporarily add token to headers in expected format for validateUserToken
      req.headers['x-auth-token'] = token;
      const validation = await validateUserToken(req);
      if (validation.isValid) {
        syncUser = {
          id: validation.user_id,
          name: validation.username,
        };
      }
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

    // Calculate metrics
    const totalAmount = validatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const uniqueClients = client_mappings ? new Set(Object.values(client_mappings)).size : 0;
    const targetUserId = validatedExpenses[0]?.user_id || 'unknown';
    const targetUserName = validatedExpenses[0]?.user_name || 'unknown';

    // Extract month from sheet_name (assumes format "Expenses - Month YYYY")
    const monthMatch = sheet_name.match(/Expenses - (\w+ \d{4})/);
    const syncMonth = monthMatch ? new Date(monthMatch[1]).toISOString().slice(0, 7) : null;

    // Create initial sync log entry
    const [logResult] = (await query(
      `INSERT INTO ramp_sync_logs (
        sync_user_id, target_user_id, target_user_name, sync_month, 
        google_sheet_url, sheet_tab_name, expense_count, total_amount,
        unique_clients_count, sync_type, status, client_mappings, 
        expense_category_mappings, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        syncUser?.id || 'anonymous',
        targetUserId,
        targetUserName,
        syncMonth,
        sheet_url,
        sheet_name,
        validatedExpenses.length,
        totalAmount,
        uniqueClients,
        client_mappings && expense_category_mappings ? 'matrix' : 'tabular',
        'started',
        JSON.stringify(client_mappings || {}),
        JSON.stringify(expense_category_mappings || {}),
      ]
    )) as any;

    syncLogId = logResult.insertId;

    // Write to Google Sheets
    const result = await writeExpensesToSheet(
      spreadsheetId,
      sheet_name,
      validatedExpenses,
      client_mappings,
      expense_category_mappings
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Update sync log with success
    if (syncLogId) {
      await query(
        `UPDATE ramp_sync_logs SET 
         status = 'success', completed_at = NOW(), sync_duration_ms = ?
         WHERE id = ?`,
        [duration, syncLogId]
      );
    }

    res.status(200).json({
      success: true,
      recordsProcessed: result.recordsProcessed,
      message: `Successfully synced ${result.recordsProcessed} expenses to Google Sheets`,
    });
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error('Error syncing to Google Sheets:', error);

    // Update sync log with failure
    if (syncLogId) {
      await query(
        `UPDATE ramp_sync_logs SET 
         status = 'failed', error_message = ?, completed_at = NOW(), sync_duration_ms = ?
         WHERE id = ?`,
        [error instanceof Error ? error.message : 'Unknown error', duration, syncLogId]
      );
    }

    res.status(500).json({
      error: 'Failed to sync expenses to Google Sheets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
