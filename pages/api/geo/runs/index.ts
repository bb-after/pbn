import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const limit = Math.min(parseInt(String(req.query.limit || '25'), 10) || 25, 100);

    const [rows] = await query<any[]>(
      `SELECT r.run_id, r.run_date, r.triggered_by,
              si.selection_item_id, s.selection_id, s.client_name, s.keyword,
              p.prompt_id, p.base_text,
              COUNT(rr.result_id) as engines_count,
              AVG(rr.visibility_score) as avg_visibility_score,
              AVG(rr.average_position) as avg_position,
              AVG(rr.citation_share) as avg_citation_share,
              SUM(rr.mentions) as total_mentions
       FROM geo_prompt_runs r
       JOIN geo_prompt_selection_items si ON si.selection_item_id = r.selection_item_id
       JOIN geo_prompt_selections s ON s.selection_id = si.selection_id
       JOIN geo_prompts p ON p.prompt_id = si.prompt_id
       LEFT JOIN geo_prompt_run_results rr ON rr.run_id = r.run_id
       GROUP BY r.run_id
       ORDER BY r.run_date DESC, r.run_id DESC
       LIMIT ?`,
      [limit]
    );

    return res.status(200).json({ runs: rows });
  } catch (error: any) {
    console.error('Error fetching runs:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch runs' });
  }
}
