import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '../../../../lib/db';

// Demo engines list
const ENGINES = [
  { engine_id: 1, name: 'OpenAI' },
  { engine_id: 2, name: 'Claude' },
  { engine_id: 3, name: 'Perplexity' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const processed = await transaction<number>(async conn => {
      // Find runs for today without results
      const [runs] = await conn.query<any[]>(
        `SELECT r.run_id
         FROM geo_prompt_runs r
         LEFT JOIN geo_prompt_run_results rr ON rr.run_id = r.run_id
         WHERE r.run_date = CURRENT_DATE()
         GROUP BY r.run_id
         HAVING COUNT(rr.result_id) = 0
         LIMIT 50`
      );

      let count = 0;
      for (const row of runs as any[]) {
        for (const e of ENGINES) {
          await conn.query(
            `INSERT INTO geo_prompt_run_results
             (run_id, engine_id, visibility_rank, visibility_score, average_position, citation_share, citation_rank, executions, mentions, found_urls, raw_summary)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [
              row.run_id,
              e.engine_id,
              Math.floor(Math.random() * 100) + 1,
              (Math.random() * 100).toFixed(2),
              (Math.random() * 10).toFixed(2),
              (Math.random() * 100).toFixed(2),
              Math.floor(Math.random() * 100) + 1,
              Math.floor(Math.random() * 5) + 1,
              Math.floor(Math.random() * 3),
              JSON.stringify(['https://example.com/a', 'https://example.com/b']),
              `Stub summary from ${e.name}`,
            ]
          );
        }
        count += 1;
      }

      return count;
    });

    return res.status(200).json({ processed });
  } catch (error: any) {
    console.error('Error processing runs:', error);
    return res.status(500).json({ error: error.message || 'Failed to process runs' });
  }
}
