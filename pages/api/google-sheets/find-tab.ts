import { NextApiRequest, NextApiResponse } from 'next';
import { extractSheetIdFromUrl, findMatchingSheetTab } from '../../../utils/googleSheets';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheet_url, expected_tab_name } = req.body;

  if (!sheet_url || !expected_tab_name) {
    return res
      .status(400)
      .json({ error: 'Missing required parameters: sheet_url, expected_tab_name' });
  }

  try {
    console.log('Find tab request:', { sheet_url, expected_tab_name });

    // Extract sheet ID from URL
    const sheetId = extractSheetIdFromUrl(sheet_url);
    console.log('Extracted sheet ID:', sheetId);

    // Find matching tab
    const result = await findMatchingSheetTab(sheetId, expected_tab_name);

    res.status(200).json({
      ...result,
      expectedTabName: expected_tab_name,
      sheetId,
    });
  } catch (error) {
    console.error('Error finding sheet tab:', error);
    console.error('Full error:', error);
    res.status(500).json({
      error: 'Failed to check sheet tabs',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
