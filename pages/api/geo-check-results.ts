import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Get user ID from token
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userToken,
      limit = '25',
      offset = '0',
      keyword,
      analysisType,
      intentCategory,
    } = req.query;

    if (!userToken || typeof userToken !== 'string') {
      return res.status(401).json({ error: 'User token is required' });
    }

    // Get user ID from token
    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const limitNum = Math.min(parseInt(String(limit), 10) || 25, 100);
    const offsetNum = parseInt(String(offset), 10) || 0;

    // Build WHERE clause
    const whereConditions = ['user_id = ?'];
    const queryParams: any[] = [userInfo.id];

    if (keyword && typeof keyword === 'string') {
      whereConditions.push('keyword LIKE ?');
      queryParams.push(`%${keyword}%`);
    }

    if (analysisType && typeof analysisType === 'string') {
      whereConditions.push('analysis_type = ?');
      queryParams.push(analysisType);
    }

    if (intentCategory && typeof intentCategory === 'string') {
      whereConditions.push('intent_category = ?');
      queryParams.push(intentCategory);
    }

    queryParams.push(limitNum, offsetNum);

    const [results] = await query<any[]>(
      `SELECT 
        id,
        keyword,
        analysis_type,
        intent_category,
        custom_prompt,
        selected_engine_ids,
        results,
        aggregated_insights,
        timestamp,
        created_at
      FROM geo_check_results 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY timestamp DESC, created_at DESC
      LIMIT ? OFFSET ?`,
      queryParams
    );

    // Get total count for pagination
    const [countResult] = await query<any[]>(
      `SELECT COUNT(*) as total 
       FROM geo_check_results 
       WHERE ${whereConditions.join(' AND ')}`,
      queryParams.slice(0, -2) // Remove limit and offset from count query
    );

    const total = countResult[0]?.total || 0;

    // Parse JSON fields
    const parsedResults = results.map(row => ({
      ...row,
      selected_engine_ids: JSON.parse(row.selected_engine_ids),
      results: JSON.parse(row.results),
      aggregated_insights: JSON.parse(row.aggregated_insights),
    }));

    res.status(200).json({
      success: true,
      results: parsedResults,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching geo check results:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch geo check results',
    });
  }
}
