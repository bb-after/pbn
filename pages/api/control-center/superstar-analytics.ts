import { NextApiRequest, NextApiResponse } from 'next';
import { query } from 'lib/db';
import { validateUserToken } from '../validate-user-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid || !userInfo.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [rows] = await query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        COUNT(CASE WHEN DATE(s.created) = CURDATE() THEN 1 END) as daily_submissions,
        COUNT(CASE WHEN s.created >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as weekly_submissions,
        COUNT(CASE WHEN s.created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as monthly_submissions,
        COUNT(s.id) as total_submissions,
        MAX(s.created) as last_submission,
        ROUND(COUNT(s.id) / GREATEST(DATEDIFF(NOW(), MIN(s.created)), 1), 2) as avg_daily
      FROM users u
      LEFT JOIN superstar_site_submissions s ON u.user_token = s.user_token AND s.deleted_at IS NULL
      WHERE u.is_active = 1 AND u.user_token IS NOT NULL
      GROUP BY u.id, u.name, u.email
      HAVING total_submissions > 0
      ORDER BY total_submissions DESC
    `);

    return res.status(200).json({
      data: rows,
      productName: 'Superstar',
      totalUsers: (rows as any[]).length
    });
  } catch (error) {
    console.error('Error fetching Superstar analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch Superstar analytics' });
  }
}