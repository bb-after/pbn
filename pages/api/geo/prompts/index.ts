import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { analysisType } = req.query;
      const type = analysisType === 'individual' ? 'individual' : 'brand';

      const [topics] = await query<any[]>(
        `SELECT t.topic_id, t.name,
                p.prompt_id, p.base_text
         FROM geo_topics t
         JOIN geo_prompts p ON p.topic_id = t.topic_id
         WHERE p.analysis_type = ?
         ORDER BY t.name, p.prompt_id`,
        [type]
      );

      const grouped: Record<
        string,
        { topic_id: number; prompts: { prompt_id: number; base_text: string }[] }
      > = {};
      (topics as any[]).forEach(r => {
        if (!grouped[r.name]) grouped[r.name] = { topic_id: r.topic_id, prompts: [] };
        grouped[r.name].prompts.push({ prompt_id: r.prompt_id, base_text: r.base_text });
      });

      return res.status(200).json({ topics: grouped });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error listing prompts:', error);
    return res.status(500).json({ error: error.message || 'Failed to list prompts' });
  }
}
