// Load environment variables from .env file
require('dotenv').config();

const mysql = require('mysql2/promise');
const axios = require('axios');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Configuration
const INACTIVITY_THRESHOLD_DAYS = parseInt(process.env.SUPERSTAR_INACTIVITY_THRESHOLD_DAYS || '7');
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_CHANNEL =
  process.env.SLACK_SUPERSTAR_ALERTS_CHANNEL || process.env.SLACK_APPROVAL_UPDATES_CHANNEL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Output configuration info
console.log('=== Superstar Site Inactivity Monitor ===');
console.log(`Inactivity threshold: ${INACTIVITY_THRESHOLD_DAYS} days`);
console.log(`Slack webhook configured: ${!!SLACK_WEBHOOK_URL}`);
console.log(`Slack channel: ${SLACK_CHANNEL || 'default'}`);
console.log(`App URL: ${APP_URL}`);

// Check if required environment variables are set
if (
  !process.env.DB_HOST_NAME ||
  !process.env.DB_USER_NAME ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_DATABASE
) {
  console.error('ERROR: Database environment variables are not set properly.');
  console.error(
    'Make sure you have a .env file with DB_HOST_NAME, DB_USER_NAME, DB_PASSWORD, and DB_DATABASE.'
  );
  process.exit(1);
}

if (!SLACK_WEBHOOK_URL) {
  console.error('ERROR: SLACK_WEBHOOK_URL environment variable is not set.');
  console.error('Slack notifications will not be sent.');
}

/**
 * Post message to Slack
 */
async function postToSlack(message, channel = null) {
  if (!SLACK_WEBHOOK_URL) {
    console.log('No Slack webhook configured, skipping notification');
    return;
  }

  try {
    const payload = {
      text: message,
      username: 'Superstar Monitor',
      icon_emoji: ':warning:',
    };

    if (channel) {
      payload.channel = channel;
    }

    await axios.post(SLACK_WEBHOOK_URL, payload);
    console.log('Slack notification sent successfully');
  } catch (error) {
    console.error('Error sending Slack notification:', error.message);
  }
}

/**
 * Get all active superstar sites with their last post information
 */
async function getInactiveSuperstarSites() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Calculate the date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVITY_THRESHOLD_DAYS);
    const thresholdDateString = thresholdDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`Checking for sites with no posts since: ${thresholdDateString}`);

    const query = `
      SELECT 
        ss.id,
        ss.domain,
        ss.login,
        ss.active,
        ss.created_at as site_created_at,
        COUNT(sss.id) as total_posts,
        MAX(sss.created) as last_post_date,
        DATEDIFF(CURDATE(), MAX(sss.created)) as days_since_last_post,
        CASE 
          WHEN MAX(sss.created) IS NULL THEN 'Never posted'
          WHEN MAX(sss.created) < ? THEN 'Inactive'
          ELSE 'Active'
        END as status
      FROM superstar_sites ss
      LEFT JOIN superstar_site_submissions sss ON ss.id = sss.superstar_site_id 
        AND sss.deleted_at IS NULL
      WHERE ss.active = 1
      GROUP BY ss.id, ss.domain, ss.login, ss.active, ss.created_at
      HAVING 
        status = 'Inactive' OR status = 'Never posted'
      ORDER BY 
        CASE 
          WHEN MAX(sss.created) IS NULL THEN 1
          ELSE 0
        END,
        last_post_date ASC
    `;

    const [rows] = await connection.query(query, [thresholdDateString]);
    return rows;
  } finally {
    await connection.end();
  }
}

/**
 * Get summary statistics for all superstar sites
 */
async function getSummaryStats() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVITY_THRESHOLD_DAYS);
    const thresholdDateString = thresholdDate.toISOString().split('T')[0];

    const query = `
      SELECT 
        COUNT(*) as total_active_sites,
        COUNT(CASE WHEN MAX(sss.created) IS NULL THEN 1 END) as never_posted,
        COUNT(CASE WHEN MAX(sss.created) < ? THEN 1 END) as inactive_sites,
        COUNT(CASE WHEN MAX(sss.created) >= ? THEN 1 END) as active_sites
      FROM superstar_sites ss
      LEFT JOIN superstar_site_submissions sss ON ss.id = sss.superstar_site_id 
        AND sss.deleted_at IS NULL
      WHERE ss.active = 1
      GROUP BY ()
    `;

    const [rows] = await connection.query(query, [thresholdDateString, thresholdDateString]);
    return rows[0] || {};
  } finally {
    await connection.end();
  }
}

/**
 * Format the inactive sites for Slack notification
 */
function formatSlackMessage(inactiveSites, stats) {
  if (inactiveSites.length === 0) {
    return `✅ *Superstar Sites Health Check*\n\nAll ${stats.total_active_sites || 0} active superstar sites have posted within the last ${INACTIVITY_THRESHOLD_DAYS} days. Great job! 🎉`;
  }

  let message = `🚨 *Superstar Sites Inactivity Alert*\n\n`;
  message += `Found ${inactiveSites.length} inactive site${inactiveSites.length > 1 ? 's' : ''} (no posts in ${INACTIVITY_THRESHOLD_DAYS}+ days):\n\n`;

  // Group sites by status
  const neverPosted = inactiveSites.filter(site => site.status === 'Never posted');
  const inactive = inactiveSites.filter(site => site.status === 'Inactive');

  if (neverPosted.length > 0) {
    message += `📋 *Never Posted (${neverPosted.length}):*\n`;
    neverPosted.forEach(site => {
      const daysSinceCreated = Math.floor(
        (new Date() - new Date(site.site_created_at)) / (1000 * 60 * 60 * 24)
      );
      message += `• \`${site.domain}\` (created ${daysSinceCreated} days ago)\n`;
    });
    message += '\n';
  }

  if (inactive.length > 0) {
    message += `⏰ *Inactive (${inactive.length}):*\n`;
    inactive.forEach(site => {
      const lastPostDate = new Date(site.last_post_date).toLocaleDateString();
      message += `• \`${site.domain}\` (last post: ${lastPostDate}, ${site.days_since_last_post} days ago)\n`;
    });
    message += '\n';
  }

  // Add summary stats
  message += `📊 *Summary:*\n`;
  message += `• Total Active Sites: ${stats.total_active_sites || 0}\n`;
  message += `• Recently Active: ${stats.active_sites || 0}\n`;
  message += `• Inactive: ${inactive.length}\n`;
  message += `• Never Posted: ${neverPosted.length}\n\n`;

  // Add action links
  message += `🔗 *Quick Actions:*\n`;
  message += `• <${APP_URL}/superstar-sites|Manage Superstar Sites>\n`;
  message += `• <${APP_URL}/superstar-form|Create New Post>\n`;
  message += `• <${APP_URL}/superstar-site-submissions|View All Submissions>`;

  return message;
}

/**
 * Main function to check inactive sites and send alerts
 */
async function checkInactiveSites() {
  try {
    console.log('Starting inactive superstar sites check...');

    // Get inactive sites and summary stats
    const [inactiveSites, stats] = await Promise.all([
      getInactiveSuperstarSites(),
      getSummaryStats(),
    ]);

    console.log(`Found ${inactiveSites.length} inactive sites`);
    console.log('Stats:', stats);

    // Log inactive sites details
    if (inactiveSites.length > 0) {
      console.log('\nInactive Sites:');
      inactiveSites.forEach(site => {
        console.log(
          `- ${site.domain}: ${site.status}${site.last_post_date ? ` (${site.days_since_last_post} days ago)` : ''}`
        );
      });
    }

    // Format and send Slack message
    const slackMessage = formatSlackMessage(inactiveSites, stats);
    console.log('\nSlack message to be sent:');
    console.log(slackMessage);

    // Send to Slack
    await postToSlack(slackMessage, SLACK_CHANNEL);

    console.log('Inactive sites check completed successfully');

    // Return results for potential use by other scripts
    return {
      inactiveSites,
      stats,
      thresholdDays: INACTIVITY_THRESHOLD_DAYS,
    };
  } catch (error) {
    console.error('Error checking inactive sites:', error);

    // Send error notification to Slack
    const errorMessage = `❌ *Superstar Sites Monitor Error*\n\nFailed to check inactive sites: ${error.message}`;
    await postToSlack(errorMessage, SLACK_CHANNEL);

    throw error;
  }
}

// Parse command line arguments for manual execution
async function main() {
  const args = process.argv.slice(2);
  const isQuiet = args.includes('--quiet');
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    console.log('DRY RUN MODE: Will not send Slack notifications');
    // Temporarily disable Slack for dry run
    process.env.SLACK_WEBHOOK_URL = '';
  }

  try {
    const results = await checkInactiveSites();

    if (!isQuiet) {
      console.log('\n=== RESULTS ===');
      console.log(`Inactive sites found: ${results.inactiveSites.length}`);
      console.log(`Total active sites: ${results.stats.total_active_sites || 0}`);
      console.log(`Threshold: ${results.thresholdDays} days`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

// Export for use by other modules
module.exports = {
  checkInactiveSites,
  getInactiveSuperstarSites,
  getSummaryStats,
  formatSlackMessage,
  postToSlack,
};
