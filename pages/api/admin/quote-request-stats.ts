import type { NextApiRequest, NextApiResponse } from 'next';
import * as mysql from 'mysql2/promise';

// Create a connection pool (reuse across requests)
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

// Database functions
async function getStats(hours: number = 24) {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

  const query = `
    SELECT 
      status,
      COUNT(*) as count
    FROM quote_request_tracking 
    WHERE processed_at > ?
    GROUP BY status
  `;

  const [rows] = await pool.query(query, [hoursAgo]);

  const stats = {
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
  };

  (rows as any[]).forEach(row => {
    const count = row.count as number;
    stats.total += count;

    switch (row.status) {
      case 'completed':
        stats.completed = count;
        break;
      case 'failed':
        stats.failed = count;
        break;
      case 'processing':
        stats.processing = count;
        break;
    }
  });

  return stats;
}

async function getProcessingHistory(dealId: string, limit: number = 10) {
  const query = `
    SELECT * FROM quote_request_tracking 
    WHERE hubspot_deal_id = ? 
    ORDER BY processed_at DESC 
    LIMIT ?
  `;

  const [rows] = await pool.query(query, [dealId, limit]);
  return rows;
}

async function cleanupOldRecords(): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const query = `
    DELETE FROM quote_request_tracking 
    WHERE processed_at < ? 
    AND status IN ('completed', 'failed')
  `;

  const [result] = await pool.query(query, [twentyFourHoursAgo]);
  const deletedCount = (result as any).affectedRows || 0;

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} old quote request tracking records`);
  }

  return deletedCount;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const hours = parseInt(req.query.hours as string) || 24;

      // Get processing statistics
      const stats = await getStats(hours);

      // Get recent processing history if deal ID is provided
      let history = null;
      if (req.query.dealId) {
        const limit = parseInt(req.query.limit as string) || 10;
        history = await getProcessingHistory(req.query.dealId as string, limit);
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
        const deletedCount = await cleanupOldRecords();

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
