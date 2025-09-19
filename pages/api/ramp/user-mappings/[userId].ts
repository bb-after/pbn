import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';

interface UserMapping {
  id: number;
  ramp_user_id: string;
  ramp_user_name: string;
  ramp_user_email: string;
  google_sheet_url: string;
  created_at: string;
  updated_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [rows] = (await query('SELECT * FROM ramp_user_sheet_mappings WHERE ramp_user_id = ?', [
      userId,
    ])) as unknown as [UserMapping[], any];

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User mapping not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
