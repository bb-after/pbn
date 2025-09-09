import mysql, { RowDataPacket } from 'mysql2/promise';
import cron from 'node-cron';
import { analyzeKeywordWithEngines } from '../utils/ai-engines';
import { postToSlack } from '../utils/postToSlack';

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
  user_name?: string; // Add user name to interface
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

// Create a run record in the database
async function createScheduledRun(scheduleId: number, scheduledFor: Date): Promise<number> {
  const connection = await mysql.createConnection(dbConfig);
  try {
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

// Get the result ID from the most recent analysis for this user/keyword combination
async function getAnalysisResultId(
  userId: number,
  keyword: string,
  clientName: string
): Promise<number | null> {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM geo_analysis_results 
       WHERE user_id = ? AND keyword = ? AND client_name = ?
       ORDER BY timestamp DESC LIMIT 1`,
      [userId, keyword, clientName]
    );

    return rows.length > 0 ? rows[0].id : null;
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

    // Update run record as failed
    await updateScheduledRun(runId, 'failed', undefined, error.message);

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

// Get all due scheduled analyses
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
      WHERE gsa.is_active = 1 AND gsa.next_run_at <= NOW()
      ORDER BY gsa.next_run_at ASC`
    );

    return rows.map(row => {
      let parsedEngineIds;
      try {
        // Handle different formats that might be stored
        if (typeof row.selected_engine_ids === 'string') {
          // Try to parse as JSON first
          try {
            parsedEngineIds = JSON.parse(row.selected_engine_ids);
          } catch {
            // If that fails, try to clean up the string and parse again
            const cleanedString = row.selected_engine_ids
              .replace(/\s/g, '') // Remove all spaces
              .replace(/^\[/, '[') // Ensure proper array format
              .replace(/\]$/, ']');
            parsedEngineIds = JSON.parse(cleanedString);
          }
        } else if (Array.isArray(row.selected_engine_ids)) {
          // Already an array
          parsedEngineIds = row.selected_engine_ids;
        } else {
          // Fallback
          parsedEngineIds = [];
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

// Main function to process all due scheduled analyses
async function processScheduledAnalyses(): Promise<void> {
  try {
    const dueSchedules = await getDueScheduledAnalyses();

    if (dueSchedules.length === 0) {
      console.log('📅 No scheduled GEO analyses due at this time');
      return;
    }

    console.log(`📋 Found ${dueSchedules.length} scheduled GEO analyses due for execution`);

    // Process each schedule
    for (const schedule of dueSchedules) {
      try {
        await executeScheduledAnalysis(schedule);
      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error);
      }
    }

    console.log(`✨ Completed processing ${dueSchedules.length} scheduled analyses`);
  } catch (error: any) {
    console.error('❌ Error in processScheduledAnalyses:', error.message);
    await postToSlack(`🚨 **GEO Scheduler Error**: ${error.message}`, SLACK_CHANNEL);
  }
}

// Schedule the job to run every minute to check for due analyses
console.log('🕐 Starting GEO Analysis Scheduler (runs every minute)');

cron.schedule('* * * * *', () => {
  console.log('⏰ Checking for due scheduled GEO analyses...');
  processScheduledAnalyses();
});

// Export for manual testing if needed
export { processScheduledAnalyses, executeScheduledAnalysis };
