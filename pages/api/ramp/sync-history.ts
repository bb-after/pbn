import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { validateUserToken } from '../validate-user-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate user token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Temporarily add token to headers in expected format for validateUserToken
    req.headers['x-auth-token'] = token;
    const validation = await validateUserToken(req);

    if (!validation.isValid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Extract query parameters for filtering
    const { limit = '50', offset = '0', target_user_id, sync_month, status } = req.query;

    // Build dynamic WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (target_user_id) {
      whereConditions.push('rsl.target_user_id = ?');
      queryParams.push(target_user_id);
    }

    if (sync_month) {
      whereConditions.push('rsl.sync_month = ?');
      queryParams.push(sync_month);
    }

    if (status && (status === 'success' || status === 'failed' || status === 'started')) {
      whereConditions.push('rsl.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get sync history with pagination - join with users table to get sync user name
    const [syncLogs] = (await query(
      `SELECT 
        rsl.id, rsl.sync_user_id, rsl.target_user_id, rsl.target_user_name, rsl.sync_month,
        rsl.google_sheet_url, rsl.sheet_tab_name, rsl.expense_count, rsl.total_amount,
        rsl.unique_clients_count, rsl.sync_type, rsl.status, rsl.error_message,
        rsl.created_at, rsl.completed_at, rsl.sync_duration_ms,
        u.name as sync_user_name
      FROM ramp_sync_logs rsl
      LEFT JOIN users u ON rsl.sync_user_id = u.id
      ${whereClause}
      ORDER BY rsl.created_at DESC 
      LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit as string), parseInt(offset as string)]
    )) as [any[], any];

    // Get total count for pagination
    const [countResult] = (await query(
      `SELECT COUNT(*) as total FROM ramp_sync_logs rsl ${whereClause}`,
      queryParams
    )) as [any[], any];

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      syncLogs,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + syncLogs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching sync history:', error);
    res.status(500).json({
      error: 'Failed to fetch sync history',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
