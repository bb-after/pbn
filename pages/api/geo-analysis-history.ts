import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Get user ID and role from token
const getUserFromToken = async (
  userToken: string
): Promise<{ id: number; name: string; role: string } | null> => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute(
      'SELECT id, name, role FROM users WHERE user_token = ?',
      [userToken]
    );
    const users = rows as any[];
    return users.length > 0
      ? { id: users[0].id, name: users[0].name, role: users[0].role || 'staff' }
      : null;
  } finally {
    await connection.end();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      client_name,
      keyword,
      analysis_type,
      intent_category,
      start_date,
      end_date,
      limit = '50',
      offset = '0',
      userToken,
    } = req.query;

    // Validate user token and get user info
    if (!userToken || typeof userToken !== 'string') {
      return res.status(401).json({ error: 'User token is required' });
    }

    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    // Build dynamic query - admins see all, regular users see only their own
    let query = `
      SELECT 
        id, client_name, keyword, analysis_type, intent_category, 
        custom_prompt, results, aggregated_insights, selected_engine_ids, 
        timestamp, created_at, user_id
      FROM geo_analysis_results
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Non-admin users can only see their own analyses
    if (userInfo.role !== 'admin') {
      query += ` WHERE user_id = ?`;
      params.push(userInfo.id);
      paramCount = 1;
    } else {
      // Admin sees all analyses - no user filter
      query += ` WHERE 1=1`;
    }

    // Add filters
    if (client_name) {
      paramCount++;
      query += ` AND client_name LIKE ?`;
      params.push(`%${client_name}%`);
    }

    if (keyword) {
      paramCount++;
      query += ` AND keyword LIKE ?`;
      params.push(`%${keyword}%`);
    }

    if (analysis_type) {
      paramCount++;
      query += ` AND analysis_type = ?`;
      params.push(analysis_type);
    }

    if (intent_category) {
      paramCount++;
      query += ` AND intent_category = ?`;
      params.push(intent_category);
    }

    if (start_date) {
      paramCount++;
      query += ` AND timestamp >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND timestamp <= ?`;
      params.push(end_date);
    }

    // Add ordering and pagination (using literal values instead of placeholders for MySQL compatibility)
    const limitValue = parseInt(limit as string);
    const offsetValue = parseInt(offset as string);
    query += ` ORDER BY timestamp DESC LIMIT ${limitValue} OFFSET ${offsetValue}`;

    console.log('=== GEO ANALYSIS HISTORY API ===');
    console.log('Query:', query);
    console.log('Params:', params);

    const connection = await mysql.createConnection(dbConfig);

    const [result] = await connection.execute(query, params);
    console.log('Raw database result count:', (result as any[]).length);

    // Get total count for pagination - admins see all, regular users see only their own
    let countQuery = `SELECT COUNT(*) as count FROM geo_analysis_results`;
    const countParams: any[] = [];
    let countParamCount = 0;

    // Non-admin users can only see their own analyses
    if (userInfo.role !== 'admin') {
      countQuery += ` WHERE user_id = ?`;
      countParams.push(userInfo.id);
      countParamCount = 1;
    } else {
      // Admin sees all analyses - no user filter
      countQuery += ` WHERE 1=1`;
    }

    // Apply same filters to count query
    if (client_name) {
      countParamCount++;
      countQuery += ` AND client_name LIKE ?`;
      countParams.push(`%${client_name}%`);
    }

    if (keyword) {
      countParamCount++;
      countQuery += ` AND keyword LIKE ?`;
      countParams.push(`%${keyword}%`);
    }

    if (analysis_type) {
      countParamCount++;
      countQuery += ` AND analysis_type = ?`;
      countParams.push(analysis_type);
    }

    if (intent_category) {
      countParamCount++;
      countQuery += ` AND intent_category = ?`;
      countParams.push(intent_category);
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND timestamp >= ?`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND timestamp <= ?`;
      countParams.push(end_date);
    }

    const [countResult] = await connection.execute(countQuery, countParams);
    await connection.end();

    const total = (countResult as any[])[0].count;

    // Parse JSON fields with error handling
    const analyses = (result as any[]).map(row => {
      let results, aggregated_insights, selected_engine_ids;

      try {
        results = typeof row.results === 'string' ? JSON.parse(row.results) : row.results;
      } catch (e) {
        console.error(
          'Failed to parse results JSON for row',
          row.id,
          ':',
          typeof row.results,
          row.results?.substring?.(0, 100)
        );
        results = [];
      }

      try {
        aggregated_insights =
          typeof row.aggregated_insights === 'string'
            ? JSON.parse(row.aggregated_insights)
            : row.aggregated_insights;
      } catch (e) {
        console.error(
          'Failed to parse aggregated_insights JSON for row',
          row.id,
          ':',
          typeof row.aggregated_insights,
          row.aggregated_insights?.substring?.(0, 100)
        );
        aggregated_insights = {};
      }

      try {
        selected_engine_ids =
          typeof row.selected_engine_ids === 'string'
            ? JSON.parse(row.selected_engine_ids)
            : row.selected_engine_ids;
      } catch (e) {
        console.error(
          'Failed to parse selected_engine_ids JSON for row',
          row.id,
          ':',
          typeof row.selected_engine_ids,
          row.selected_engine_ids?.substring?.(0, 100)
        );
        selected_engine_ids = [];
      }

      return {
        ...row,
        results,
        aggregated_insights,
        selected_engine_ids,
      };
    });

    res.status(200).json({
      analyses,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string),
      },
    });
  } catch (error) {
    console.error('GEO Analysis History API Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
