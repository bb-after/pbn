import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Simple API key validation - you should store these in environment variables or database
const VALID_API_KEYS = process.env.EXTERNAL_API_KEYS?.split(',') || [];

// Validate API key
const validateApiKey = (apiKey: string): boolean => {
  return VALID_API_KEYS.includes(apiKey);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey } = req.query;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!validateApiKey(apiKey)) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    const connection = await mysql.createConnection(dbConfig);

    try {
      // Get overall stats for this API key
      const [apiKeyStats] = (await connection.execute(
        `SELECT 
          application_name,
          COUNT(*) as total_users,
          SUM(total_requests) as total_requests,
          MIN(first_seen) as first_user_date,
          MAX(last_seen) as last_request_date
         FROM external_api_users 
         WHERE api_key_used = ?
         GROUP BY application_name`,
        [apiKey]
      )) as any;

      // Get analysis results count for this API key
      const [analysisStats] = (await connection.execute(
        `SELECT 
          COUNT(*) as total_analyses,
          COUNT(DISTINCT eau.external_user_id) as unique_users,
          DATE(gar.timestamp) as analysis_date,
          COUNT(*) as daily_count
         FROM geo_analysis_results gar
         JOIN external_api_users eau ON eau.id = gar.external_api_user_id
         WHERE eau.api_key_used = ?
         AND gar.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(gar.timestamp)
         ORDER BY analysis_date DESC
         LIMIT 30`,
        [apiKey]
      )) as any;

      // Get recent users for this API key
      const [recentUsers] = (await connection.execute(
        `SELECT 
          external_user_id,
          external_user_name,
          application_name,
          total_requests,
          first_seen,
          last_seen
         FROM external_api_users
         WHERE api_key_used = ?
         ORDER BY last_seen DESC
         LIMIT 10`,
        [apiKey]
      )) as any;

      // Get analysis type breakdown
      const [analysisTypeStats] = (await connection.execute(
        `SELECT 
          gar.analysis_type,
          gar.intent_category,
          COUNT(*) as count,
          COUNT(DISTINCT eau.external_user_id) as unique_users
         FROM geo_analysis_results gar
         JOIN external_api_users eau ON eau.id = gar.external_api_user_id
         WHERE eau.api_key_used = ?
         AND gar.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY gar.analysis_type, gar.intent_category
         ORDER BY count DESC`,
        [apiKey]
      )) as any;

      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        apiKey: apiKey.substring(0, 8) + '...' + apiKey.slice(-4), // Masked API key
        overview: apiKeyStats[0] || {
          application_name: 'Unknown',
          total_users: 0,
          total_requests: 0,
          first_user_date: null,
          last_request_date: null,
        },
        dailyAnalyses: analysisStats || [],
        recentUsers: recentUsers || [],
        analysisBreakdown: analysisTypeStats || [],
        usage: {
          last30Days: {
            totalAnalyses: analysisStats.reduce(
              (sum: number, day: any) => sum + day.daily_count,
              0
            ),
            avgPerDay:
              analysisStats.length > 0
                ? (
                    analysisStats.reduce((sum: number, day: any) => sum + day.daily_count, 0) /
                    analysisStats.length
                  ).toFixed(1)
                : 0,
            peakDay:
              analysisStats.length > 0
                ? analysisStats.reduce((max: any, day: any) =>
                    day.daily_count > max.daily_count ? day : max
                  )
                : null,
          },
        },
      };

      res.status(200).json(response);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('External API Stats Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
