import { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { analyzeKeywordWithEngines } from '../../../utils/ai-engines';
import { postToSlack } from '../../../utils/postToSlack';

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const SLACK_CHANNEL = '#geo-scheduled-runs';

// Interface for scheduled analysis data
interface ScheduledAnalysis {
  id: number;
  user_id: number;
  user_name?: string;
  client_name: string;
  keyword: string;
  analysis_type: 'brand' | 'individual';
  intent_category: string;
  custom_prompt: string;
  selected_engine_ids: number[];
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  timezone: string;
  is_active: boolean;
  last_run_at?: Date;
  next_run_at: Date;
  run_count: number;
}

// Calculate next run date based on schedule configuration
function calculateNextRun(schedule: ScheduledAnalysis): Date {
  const now = new Date();
  const [hours, minutes] = schedule.time_of_day.split(':').map(Number);

  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (schedule.frequency) {
    case 'hourly':
      nextRun.setHours(nextRun.getHours() + 1);
      break;
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      const targetDay = schedule.day_of_week || 1; // Default to Monday
      const currentDay = nextRun.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) {
        daysToAdd = 7; // Next week
      }
      nextRun.setDate(nextRun.getDate() + daysToAdd);
      break;
    case 'monthly':
      nextRun.setDate(schedule.day_of_month || 1); // Default to 1st of month
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }

  return nextRun;
}

// Create a run record in the database (with additional safety check)
async function createScheduledRun(scheduleId: number, scheduledFor: Date): Promise<number> {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // Double-check that there's no existing running instance before creating
    const [existingRuns] = await connection.execute(
      `SELECT COUNT(*) as running_count FROM geo_scheduled_analysis_runs 
       WHERE scheduled_analysis_id = ? AND status = 'running'`,
      [scheduleId]
    );

    if ((existingRuns as any)[0].running_count > 0) {
      throw new Error(`Schedule ${scheduleId} already has a running instance, skipping`);
    }

    const [result] = await connection.execute(
      `INSERT INTO geo_scheduled_analysis_runs (scheduled_analysis_id, scheduled_for, status, started_at)
       VALUES (?, ?, 'running', NOW())`,
      [scheduleId, scheduledFor]
    );
    return (result as any).insertId;
  } finally {
    await connection.end();
  }
}

// Update run record on completion/failure
async function updateScheduledRun(
  runId: number,
  status: 'completed' | 'failed',
  analysisResultId?: number,
  errorMessage?: string
) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.execute(
      `UPDATE geo_scheduled_analysis_runs 
       SET status = ?, completed_at = NOW(), analysis_result_id = ?, error_message = ?
       WHERE id = ?`,
      [status, analysisResultId, errorMessage, runId]
    );
  } finally {
    await connection.end();
  }
}

// Update scheduled analysis after execution
async function updateScheduledAnalysis(scheduleId: number, nextRunAt: Date) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.execute(
      `UPDATE geo_scheduled_analyses 
       SET last_run_at = NOW(), next_run_at = ?, run_count = run_count + 1
       WHERE id = ?`,
      [nextRunAt, scheduleId]
    );
  } finally {
    await connection.end();
  }
}

// Execute a single scheduled analysis
async function executeScheduledAnalysis(schedule: ScheduledAnalysis): Promise<void> {
  const runId = await createScheduledRun(schedule.id, schedule.next_run_at);

  try {
    console.log(
      `🚀 Executing scheduled analysis for ${schedule.client_name} - "${schedule.keyword}"`
    );

    // Run the analysis using the same logic as the API
    const result = await analyzeKeywordWithEngines(
      schedule.keyword,
      schedule.client_name,
      schedule.selected_engine_ids,
      schedule.custom_prompt,
      schedule.analysis_type,
      schedule.intent_category
    );

    // Save results to database
    const connection = await mysql.createConnection(dbConfig);

    try {
      const [insertResult] = await connection.execute(
        `INSERT INTO geo_analysis_results (
          user_id, client_name, keyword, analysis_type, intent_category, custom_prompt,
          results, aggregated_insights, selected_engine_ids, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schedule.user_id,
          schedule.client_name,
          schedule.keyword,
          schedule.analysis_type,
          schedule.intent_category,
          schedule.custom_prompt,
          JSON.stringify(result.results),
          JSON.stringify(result.aggregatedInsights),
          JSON.stringify(schedule.selected_engine_ids),
          result.timestamp,
        ]
      );

      const analysisResultId = (insertResult as any).insertId;

      // Update run record as completed
      await updateScheduledRun(runId, 'completed', analysisResultId);

      // Calculate and update next run date
      const nextRunAt = calculateNextRun(schedule);
      await updateScheduledAnalysis(schedule.id, nextRunAt);

      // Send success notification to Slack
      const message = `✅ **Scheduled GEO Analysis Complete**
**User:** ${schedule.user_name || `User ID ${schedule.user_id}`}
**Client:** ${schedule.client_name}
**Keyword:** "${schedule.keyword}"
**Type:** ${schedule.analysis_type}
**Engines:** ${schedule.selected_engine_ids.length} engines processed
**Run #:** ${schedule.run_count + 1}
**Next Run:** ${nextRunAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      await postToSlack(message, SLACK_CHANNEL);

      console.log(
        `✅ Successfully completed analysis for ${schedule.client_name} - "${schedule.keyword}"`
      );
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error(
      `❌ Failed to execute scheduled analysis for ${schedule.client_name} - "${schedule.keyword}":`,
      error.message
    );

    // Update run record as failed (with additional error handling)
    try {
      await updateScheduledRun(runId, 'failed', undefined, error.message);
    } catch (updateError: any) {
      console.error(`❌ Failed to update run record ${runId} as failed:`, updateError.message);
      // Log to Slack about the stuck run since we couldn't update the DB
      await postToSlack(
        `🚨 **Critical Error**: Run ${runId} is stuck - failed to update database status. Manual intervention required.`,
        SLACK_CHANNEL
      );
    }

    // Send failure notification to Slack
    const errorMessage = `❌ **Scheduled GEO Analysis Failed**
**User:** ${schedule.user_name || `User ID ${schedule.user_id}`}
**Client:** ${schedule.client_name}
**Keyword:** "${schedule.keyword}"
**Type:** ${schedule.analysis_type}
**Error:** ${error.message}
**Run #:** ${schedule.run_count + 1}

_The schedule remains active and will retry at the next scheduled time._`;

    await postToSlack(errorMessage, SLACK_CHANNEL);
  }
}

// Get all due scheduled analyses (exclude those with running instances)
async function getDueScheduledAnalyses(): Promise<ScheduledAnalysis[]> {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        gsa.id, gsa.user_id, u.name as user_name, gsa.client_name, gsa.keyword, 
        gsa.analysis_type, gsa.intent_category, gsa.custom_prompt, gsa.selected_engine_ids, 
        gsa.frequency, gsa.day_of_week, gsa.day_of_month, gsa.time_of_day, gsa.timezone, 
        gsa.is_active, gsa.last_run_at, gsa.next_run_at, gsa.run_count
      FROM geo_scheduled_analyses gsa
      LEFT JOIN users u ON gsa.user_id = u.id
      WHERE gsa.is_active = 1 
        AND gsa.next_run_at <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM geo_scheduled_analysis_runs gsar 
          WHERE gsar.scheduled_analysis_id = gsa.id 
            AND gsar.status = 'running'
        )
      ORDER BY gsa.next_run_at ASC`
    );

    return rows.map(row => {
      let parsedEngineIds;
      try {
        const engineIdsValue = String(row.selected_engine_ids);

        if (Array.isArray(row.selected_engine_ids)) {
          // Already an array
          parsedEngineIds = row.selected_engine_ids;
        } else if (engineIdsValue.startsWith('[') && engineIdsValue.endsWith(']')) {
          // JSON array format like "[1,2,3]"
          parsedEngineIds = JSON.parse(engineIdsValue);
        } else if (engineIdsValue.includes(',')) {
          // Comma-separated string like "8,3,5,6,4"
          parsedEngineIds = engineIdsValue
            .split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));
        } else if (/^\d+$/.test(engineIdsValue)) {
          // Single number like "5"
          parsedEngineIds = [parseInt(engineIdsValue, 10)];
        } else {
          // Fallback to regex extraction
          const matches = engineIdsValue.match(/\d+/g);
          parsedEngineIds = matches ? matches.map(Number) : [];
        }
      } catch (error) {
        console.error(
          `Error parsing selected_engine_ids for schedule ${row.id}:`,
          row.selected_engine_ids,
          error
        );
        parsedEngineIds = []; // Default to empty array if parsing fails
      }

      return {
        ...row,
        selected_engine_ids: parsedEngineIds,
      };
    }) as ScheduledAnalysis[];
  } finally {
    await connection.end();
  }
}

// Cleanup stuck runs that have been running for more than 10 minutes
async function cleanupStuckRuns(): Promise<number> {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [result] = await connection.execute(
      `UPDATE geo_scheduled_analysis_runs 
       SET status = 'failed', 
           completed_at = NOW(),
           error_message = 'Automatically marked as failed due to stuck running state (>10 minutes)'
       WHERE status = 'running' AND started_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
    );
    return (result as any).affectedRows;
  } finally {
    await connection.end();
  }
}

// Main function to process all due scheduled analyses
async function processScheduledAnalyses(): Promise<{ processed: number; errors: number }> {
  try {
    // First, cleanup any stuck runs
    const cleanedUp = await cleanupStuckRuns();
    if (cleanedUp > 0) {
      console.log(`🧹 Cleaned up ${cleanedUp} stuck runs`);
    }

    const dueSchedules = await getDueScheduledAnalyses();

    if (dueSchedules.length === 0) {
      console.log('📅 No scheduled GEO analyses due at this time');
      return { processed: 0, errors: 0 };
    }

    console.log(`📋 Found ${dueSchedules.length} scheduled GEO analyses due for execution`);

    let errors = 0;

    // Process each schedule
    for (const schedule of dueSchedules) {
      try {
        await executeScheduledAnalysis(schedule);
      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error);
        errors++;
      }
    }

    console.log(`✨ Completed processing ${dueSchedules.length} scheduled analyses`);

    return { processed: dueSchedules.length, errors };
  } catch (error: any) {
    console.error('❌ Error in processScheduledAnalyses:', error.message);
    await postToSlack(`🚨 **GEO Scheduler Error**: ${error.message}`, SLACK_CHANNEL);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is a cron request (Vercel adds specific headers)
  const cronSecret = req.headers.authorization;
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('⏰ Vercel Cron: Checking for due scheduled GEO analyses...');

    const result = await processScheduledAnalyses();

    res.status(200).json({
      success: true,
      message: 'Scheduled analyses processed successfully',
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
