import { query, transaction } from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface QuoteRequestRecord extends RowDataPacket {
  id: number;
  hubspot_deal_id: string;
  processed_at: Date;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

// Helper function to add timeout to database operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Database operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

export class QuoteRequestTracker {
  /**
   * Check if a deal has been processed recently (within the last 5 minutes)
   * to prevent duplicate processing
   */
  static async isRecentlyProcessed(dealId: string): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [rows] = await withTimeout(
      query<QuoteRequestRecord[]>(
        `SELECT id FROM quote_request_tracking 
         WHERE hubspot_deal_id = ? 
         AND processed_at > ? 
         AND status IN ('processing', 'completed')
         ORDER BY processed_at DESC 
         LIMIT 1`,
        [dealId, fiveMinutesAgo]
      ),
      3000 // 3 second timeout for duplicate check
    );

    return rows.length > 0;
  }

  /**
   * Start tracking a new quote request processing
   * Returns the tracking record ID
   */
  static async startTracking(dealId: string): Promise<number> {
    const [result] = await withTimeout(
      query<ResultSetHeader>(
        `INSERT INTO quote_request_tracking (hubspot_deal_id, status) 
         VALUES (?, 'processing')`,
        [dealId]
      ),
      3000 // 3 second timeout for insert
    );

    console.log(`Started tracking quote request for deal ${dealId} with ID ${result.insertId}`);
    return result.insertId;
  }

  /**
   * Mark a quote request as completed successfully
   */
  static async markCompleted(trackingId: number): Promise<void> {
    await withTimeout(
      query(
        `UPDATE quote_request_tracking 
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [trackingId]
      ),
      3000 // 3 second timeout for update
    );

    console.log(`Marked quote request tracking ID ${trackingId} as completed`);
  }

  /**
   * Mark a quote request as failed with error message
   */
  static async markFailed(trackingId: number, errorMessage: string): Promise<void> {
    await withTimeout(
      query(
        `UPDATE quote_request_tracking 
         SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [errorMessage, trackingId]
      ),
      3000 // 3 second timeout for update
    );

    console.log(`Marked quote request tracking ID ${trackingId} as failed: ${errorMessage}`);
  }

  /**
   * Get recent processing history for a deal
   */
  static async getProcessingHistory(
    dealId: string,
    limit: number = 10
  ): Promise<QuoteRequestRecord[]> {
    const [rows] = await withTimeout(
      query<QuoteRequestRecord[]>(
        `SELECT * FROM quote_request_tracking 
         WHERE hubspot_deal_id = ? 
         ORDER BY processed_at DESC 
         LIMIT ?`,
        [dealId, limit]
      ),
      5000 // 5 second timeout for history query
    );

    return rows;
  }

  /**
   * Clean up old tracking records (older than 24 hours)
   * This should be run periodically to prevent the table from growing too large
   */
  static async cleanupOldRecords(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [result] = await withTimeout(
      query<ResultSetHeader>(
        `DELETE FROM quote_request_tracking 
         WHERE processed_at < ? 
         AND status IN ('completed', 'failed')`,
        [twentyFourHoursAgo]
      ),
      10000 // 10 second timeout for cleanup
    );

    const deletedCount = result.affectedRows || 0;
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old quote request tracking records`);
    }

    return deletedCount;
  }

  /**
   * Get statistics about quote request processing
   */
  static async getStats(hours: number = 24): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
  }> {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [rows] = await withTimeout(
      query<RowDataPacket[]>(
        `SELECT 
           status,
           COUNT(*) as count
         FROM quote_request_tracking 
         WHERE processed_at > ?
         GROUP BY status`,
        [hoursAgo]
      ),
      5000 // 5 second timeout for stats query
    );

    const stats = {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
    };

    rows.forEach(row => {
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
}
