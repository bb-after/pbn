import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      limit = '25',
      offset = '0',
      keyword,
      analysisType,
      intentCategory,
    } = req.query;

    // Authenticate user from JWT token
    const userInfo = await authenticateUser(req);
    if (!userInfo) {
      return res.status(401).json({ error: 'Authentication required' });
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
