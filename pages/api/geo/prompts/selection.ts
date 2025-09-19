import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    clientName,
    keyword,
    analysisType = 'brand',
    items,
  } = req.body as {
    clientName: string;
    keyword: string;
    analysisType: 'brand' | 'individual';
    items: { prompt_id: number; variant_id?: number }[];
  };

  if (!clientName || !keyword || !Array.isArray(items) || items.length === 0 || items.length > 10) {
    return res.status(400).json({ error: 'clientName, keyword and 1-10 items are required' });
  }

  const runNow = String(req.query.runNow || '').toLowerCase() === 'true';

  try {
    const selectionId = await transaction<number>(async conn => {
      const [result] = await conn.query<any>(
        'INSERT INTO geo_prompt_selections (client_name, keyword, analysis_type) VALUES (?,?,?)',
        [clientName, keyword, analysisType]
      );
      const selId = (result as any).insertId as number;

      const selectionItemIds: number[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const [ins]: any = await conn.query(
          'INSERT INTO geo_prompt_selection_items (selection_id, prompt_id, variant_id, position) VALUES (?,?,?,?)',
          [selId, it.prompt_id, it.variant_id || null, i]
        );
        selectionItemIds.push(ins.insertId as number);
      }

      if (runNow) {
        const [dateRow] = await conn.query<any>('SELECT CURRENT_DATE() as today');
        const today = (dateRow as any)[0]?.today;
        for (const selectionItemId of selectionItemIds) {
          await conn.query(
            'INSERT IGNORE INTO geo_prompt_runs (selection_item_id, run_date, triggered_by) VALUES (?,?,?)',
            [selectionItemId, today, 'manual']
          );
        }
      }

      return selId;
    });

    return res.status(200).json({ selectionId, runSeeded: runNow });
  } catch (error: any) {
    console.error('Error saving selection:', error);
    return res.status(500).json({ error: error.message || 'Failed to save selection' });
  }
}
