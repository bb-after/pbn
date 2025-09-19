import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { runId } = req.query as { runId?: string };
  if (!runId) return res.status(400).json({ error: 'runId is required' });

  try {
    const [headerRows] = await query<any[]>(
      `SELECT r.run_id, r.run_date, r.triggered_by,
              si.selection_item_id, s.selection_id, s.client_name, s.keyword,
              p.prompt_id, p.base_text
       FROM geo_prompt_runs r
       JOIN geo_prompt_selection_items si ON si.selection_item_id = r.selection_item_id
       JOIN geo_prompt_selections s ON s.selection_id = si.selection_id
       JOIN geo_prompts p ON p.prompt_id = si.prompt_id
       WHERE r.run_id = ?
       LIMIT 1`,
      [runId]
    );

    if ((headerRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const header = (headerRows as any[])[0];

    const [resultRows] = await query<any[]>(
      `SELECT result_id, engine_id, visibility_rank, visibility_score, average_position, citation_share, citation_rank, executions, mentions, found_urls, raw_summary
       FROM geo_prompt_run_results
       WHERE run_id = ?
       ORDER BY result_id ASC`,
      [runId]
    );

    // Parse found_urls JSON if present
    const results = (resultRows as any[]).map(r => ({
      ...r,
      found_urls: safeParseJson(r.found_urls),
    }));

    return res.status(200).json({ run: header, results });
  } catch (error: any) {
    console.error('Error fetching run details:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch run details' });
  }
}

function safeParseJson(s: any) {
  try {
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
