import { NextApiRequest, NextApiResponse } from 'next';
import { processScheduledAnalyses } from '../../scripts/scheduledGeoAnalysis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: Add authentication check here if needed
    const { adminKey } = req.body;

    // Simple admin key check (you might want to use a proper authentication system)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔧 Manual trigger: Running scheduled GEO analyses...');

    await processScheduledAnalyses();

    res.status(200).json({
      success: true,
      message: 'Scheduled analyses processed successfully',
    });
  } catch (error: any) {
    console.error('Error running scheduled analyses:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
