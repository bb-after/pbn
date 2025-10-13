import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total users
    const [totalUsersResult] = await query<any[]>(
      'SELECT COUNT(*) as count FROM external_api_users'
    );
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get total analyses in last 30 days
    const [totalAnalysesResult] = await query<any[]>(
      `SELECT COUNT(*) as count 
       FROM geo_analysis_results gar
       JOIN external_api_users eau ON eau.id = gar.external_api_user_id
       WHERE gar.external_api_user_id IS NOT NULL
       AND gar.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const totalAnalyses = totalAnalysesResult[0]?.count || 0;

    // Get unique applications
    const [uniqueAppsResult] = await query<any[]>(
      'SELECT COUNT(DISTINCT application_name) as count FROM external_api_users'
    );
    const uniqueApplications = uniqueAppsResult[0]?.count || 0;

    // Calculate average analyses per day
    const avgAnalysesPerDay = totalAnalyses > 0 ? Math.round((totalAnalyses / 30) * 10) / 10 : 0;

    // Get daily breakdown for last 7 days
    const [dailyBreakdown] = await query<any[]>(
      `SELECT 
        DATE(gar.timestamp) as date,
        COUNT(*) as count
       FROM geo_analysis_results gar
       JOIN external_api_users eau ON eau.id = gar.external_api_user_id
       WHERE gar.external_api_user_id IS NOT NULL
       AND gar.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(gar.timestamp)
       ORDER BY date DESC`
    );

    // Get application breakdown
    const [appBreakdown] = await query<any[]>(
      `SELECT 
        eau.application_name,
        COUNT(DISTINCT eau.external_user_id) as users,
        SUM(eau.total_requests) as requests,
        COUNT(gar.id) as analyses_30d
       FROM external_api_users eau
       LEFT JOIN geo_analysis_results gar ON gar.external_api_user_id = eau.id 
         AND gar.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY eau.application_name
       ORDER BY analyses_30d DESC`
    );

    const stats = {
      totalUsers,
      totalAnalyses,
      uniqueApplications,
      avgAnalysesPerDay,
      dailyBreakdown,
      applicationBreakdown: appBreakdown,
    };

    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error fetching external stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch external stats' });
  }
}
