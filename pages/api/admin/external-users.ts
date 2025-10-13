import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [users] = await query<any[]>(
      `SELECT 
        id,
        external_user_id,
        external_user_name,
        application_name,
        total_requests,
        first_seen,
        last_seen
       FROM external_api_users
       ORDER BY last_seen DESC
       LIMIT 100`
    );

    res.status(200).json({ users });
  } catch (error: any) {
    console.error('Error fetching external users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch external users' });
  }
}
