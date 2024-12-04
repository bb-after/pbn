import { NextApiRequest, NextApiResponse } from 'next';
import { insertBacklinks } from '../../utils/openai'; // Adjust path as needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { backlinkArray, articleContent } = req.body;

  // Validate input
  if (!Array.isArray(backlinkArray) || typeof articleContent !== 'string') {
    return res.status(400).json({ message: 'Invalid input. Expecting backlinkArray and articleContent.' });
  }

  try {
    // Call insertBacklinks utility
    const content = await insertBacklinks(backlinkArray, articleContent);

    res.status(200).json({ content });
  } catch (error) {
    console.error('Error in insert-backlinks endpoint:', error);
    res.status(500).json({ error: 'Failed to process backlink insertion request.' });
  }
}
