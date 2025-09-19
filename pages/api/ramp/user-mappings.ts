import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

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
  try {
    if (req.method === 'GET') {
      // Get all user mappings
      const rows = (await query(
        'SELECT * FROM ramp_user_sheet_mappings ORDER BY ramp_user_name ASC'
      )) as unknown as UserMapping[];

      res.status(200).json(rows);
    } else if (req.method === 'POST') {
      // Create or update a user mapping
      const { ramp_user_id, ramp_user_name, ramp_user_email, google_sheet_url } = req.body;

      if (!ramp_user_id || !ramp_user_name || !ramp_user_email || !google_sheet_url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Upsert (insert or update if exists)
      await query(
        `INSERT INTO ramp_user_sheet_mappings 
         (ramp_user_id, ramp_user_name, ramp_user_email, google_sheet_url) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         ramp_user_name = VALUES(ramp_user_name),
         ramp_user_email = VALUES(ramp_user_email),
         google_sheet_url = VALUES(google_sheet_url),
         updated_at = CURRENT_TIMESTAMP`,
        [ramp_user_id, ramp_user_name, ramp_user_email, google_sheet_url]
      );

      res.status(200).json({ message: 'Mapping saved successfully' });
    } else if (req.method === 'DELETE') {
      // Delete a user mapping
      const { ramp_user_id } = req.query;

      if (!ramp_user_id) {
        return res.status(400).json({ error: 'Missing ramp_user_id' });
      }

      await query('DELETE FROM ramp_user_sheet_mappings WHERE ramp_user_id = ?', [ramp_user_id]);

      res.status(200).json({ message: 'Mapping deleted successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
