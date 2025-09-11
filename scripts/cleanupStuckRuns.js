const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function cleanupStuckRuns() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🧹 Cleaning up stuck scheduled analysis runs...');

    // Mark old running records as failed
    const [result] = await connection.execute(`
      UPDATE geo_scheduled_analysis_runs 
      SET status = 'failed', 
          completed_at = NOW(),
          error_message = 'Marked as failed due to stuck running state - likely caused by JSON parsing error'
      WHERE status = 'running' AND started_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `);

    console.log(`✅ Marked ${result.affectedRows} stuck runs as failed`);

    // Update the next_run_at for the hourly schedule that's stuck in the past
    const [scheduleResult] = await connection.execute(`
      UPDATE geo_scheduled_analyses 
      SET next_run_at = CASE 
        WHEN frequency = 'hourly' THEN DATE_ADD(NOW(), INTERVAL 1 HOUR)
        WHEN frequency = 'daily' THEN DATE_ADD(CURDATE() + INTERVAL 1 DAY, INTERVAL HOUR(time_of_day) HOUR) + INTERVAL MINUTE(time_of_day) MINUTE
        WHEN frequency = 'weekly' THEN DATE_ADD(DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE()) + day_of_week - 1) % 7 DAY), INTERVAL HOUR(time_of_day) HOUR) + INTERVAL MINUTE(time_of_day) MINUTE
        WHEN frequency = 'monthly' THEN DATE_ADD(DATE_FORMAT(NOW() + INTERVAL 1 MONTH, '%Y-%m-01') + INTERVAL (day_of_month - 1) DAY, INTERVAL HOUR(time_of_day) HOUR) + INTERVAL MINUTE(time_of_day) MINUTE
      END
      WHERE next_run_at <= NOW()
    `);

    console.log(`✅ Updated ${scheduleResult.affectedRows} schedules with new next_run_at times`);

    // Show the updated status
    const [updatedSchedules] = await connection.execute(`
      SELECT id, client_name, keyword, frequency, next_run_at, 
             CASE WHEN next_run_at <= NOW() THEN 'DUE' ELSE 'SCHEDULED' END as status
      FROM geo_scheduled_analyses 
      ORDER BY id
    `);

    console.log('\n📋 UPDATED SCHEDULE STATUS:');
    for (const schedule of updatedSchedules) {
      console.log(
        `Schedule ${schedule.id}: ${schedule.client_name} - Next: ${schedule.next_run_at} (${schedule.status})`
      );
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

cleanupStuckRuns();
