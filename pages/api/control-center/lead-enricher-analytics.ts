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
        COUNT(CASE WHEN DATE(pls.created_at) = CURDATE() THEN 1 END) as daily_submissions,
        COUNT(CASE WHEN pls.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as weekly_submissions,
        COUNT(CASE WHEN pls.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as monthly_submissions,
        COUNT(pls.id) as total_submissions,
        MAX(pls.created_at) as last_submission,
        ROUND(COUNT(pls.id) / GREATEST(DATEDIFF(NOW(), MIN(pls.created_at)), 1), 2) as avg_daily
      FROM users u
      LEFT JOIN user_partial_list_submissions pls ON u.id = pls.user_id
      WHERE u.is_active = 1
      GROUP BY u.id, u.name, u.email
      HAVING total_submissions > 0
      ORDER BY total_submissions DESC
    `);

    return res.status(200).json({
      data: rows,
      productName: 'Lead Enricher',
      totalUsers: (rows as any[]).length
    });
  } catch (error) {
    console.error('Error fetching Lead Enricher analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch Lead Enricher analytics' });
  }
}