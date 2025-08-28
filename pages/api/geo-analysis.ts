import { NextApiRequest, NextApiResponse } from 'next';
import { analyzeKeywordWithEngines } from '../../utils/ai-engines';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, clientName, selectedEngineIds } = req.body;

    if (!keyword || !clientName || !selectedEngineIds || !Array.isArray(selectedEngineIds)) {
      return res.status(400).json({
        error: 'Missing required fields: keyword, clientName, selectedEngineIds',
      });
    }

    console.log('=== GEO ANALYSIS API ===');
    console.log('Keyword:', keyword);
    console.log('Client:', clientName);
    console.log('Engine IDs:', selectedEngineIds);
    console.log('=== STARTING ANALYSIS ===');

    const result = await analyzeKeywordWithEngines(keyword, clientName, selectedEngineIds);

    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Results:', result.results.length, 'engines processed');

    res.status(200).json(result);
  } catch (error) {
    console.error('GEO Analysis API Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
