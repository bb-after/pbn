import { NextApiRequest, NextApiResponse } from 'next';
import { callOpenAI } from 'utils/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const result = await callOpenAI(req.body);
    res.status(200).json({ content: result });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ message: 'Error generating article', error: error.message });
  }
}

