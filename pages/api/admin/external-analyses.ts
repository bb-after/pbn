import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [analyses] = await query<any[]>(
      `SELECT 
        gar.id,
        gar.client_name,
        gar.keyword,
        gar.analysis_type,
        gar.intent_category,
        gar.timestamp,
        eau.external_user_id,
        eau.external_user_name,
        eau.application_name
       FROM geo_analysis_results gar
       JOIN external_api_users eau ON eau.id = gar.external_api_user_id
       WHERE gar.external_api_user_id IS NOT NULL
       ORDER BY gar.timestamp DESC
       LIMIT 50`
    );

    res.status(200).json({ analyses });
  } catch (error: any) {
    console.error('Error fetching external analyses:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch external analyses' });
  }
}
