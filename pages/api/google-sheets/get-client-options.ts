import { NextApiRequest, NextApiResponse } from 'next';
import { extractSheetIdFromUrl, getClientOptionsFromSheet } from '../../../utils/googleSheets';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheet_url, tab_name } = req.body;

  if (!sheet_url || !tab_name) {
    return res.status(400).json({ error: 'Missing required parameters: sheet_url, tab_name' });
  }

  try {
    console.log('Getting client options for:', { sheet_url, tab_name });

    // Extract sheet ID from URL
    const sheetId = extractSheetIdFromUrl(sheet_url);
    console.log('Extracted sheet ID:', sheetId);

    // Get client options from Column A
    const clientOptions = await getClientOptionsFromSheet(sheetId, tab_name);
    console.log('Found client options:', clientOptions);

    res.status(200).json({
      clientOptions,
      tabName: tab_name,
      sheetId,
    });
  } catch (error) {
    console.error('Error getting client options:', error);
    res.status(500).json({
      error: 'Failed to get client options',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
