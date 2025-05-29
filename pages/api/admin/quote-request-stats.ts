import type { NextApiRequest, NextApiResponse } from 'next';
import { QuoteRequestTracker } from 'lib/quoteRequestTracking';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const hours = parseInt(req.query.hours as string) || 24;

      // Get processing statistics
      const stats = await QuoteRequestTracker.getStats(hours);

      // Get recent processing history if deal ID is provided
      let history = null;
      if (req.query.dealId) {
        const limit = parseInt(req.query.limit as string) || 10;
        history = await QuoteRequestTracker.getProcessingHistory(req.query.dealId as string, limit);
      }

      res.status(200).json({
        success: true,
        timeframe: `${hours} hours`,
        stats,
        history,
      });
    } catch (error: any) {
      console.error('Error fetching quote request stats:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } else if (req.method === 'POST') {
    // Handle cleanup operation
    if (req.body.action === 'cleanup') {
      try {
        const deletedCount = await QuoteRequestTracker.cleanupOldRecords();

        res.status(200).json({
          success: true,
          message: `Cleaned up ${deletedCount} old records`,
          deletedCount,
        });
      } catch (error: any) {
        console.error('Error cleaning up quote request records:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Supported actions: cleanup',
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
}
