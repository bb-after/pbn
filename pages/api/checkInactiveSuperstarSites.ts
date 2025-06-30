import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ai.statuscrawl.io';

/**
 * Post message to Slack
 */
async function postToSlack(message: string, channel: string | null = null): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.log('No Slack webhook configured, skipping notification');
    return;
  }

  try {
    const payload: any = {
      text: message,
      username: 'Superstar Monitor',
      icon_emoji: ':warning:',
    };

    if (channel) {
      payload.channel = channel;
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API responded with status ${response.status}`);
    }

    console.log('Slack notification sent successfully');
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    throw error;
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
    return rows as any[];
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
    return (rows as any[])[0] || {};
  } finally {
    await connection.end();
  }
}

/**
 * Format the inactive sites for Slack notification
 */
function formatSlackMessage(inactiveSites: any[], stats: any): string {
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
        (new Date().getTime() - new Date(site.site_created_at).getTime()) / (1000 * 60 * 60 * 24)
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
    console.log(`Inactivity threshold: ${INACTIVITY_THRESHOLD_DAYS} days`);
    console.log(`Slack webhook configured: ${!!SLACK_WEBHOOK_URL}`);
    console.log(`Slack channel: ${SLACK_CHANNEL || 'default'}`);

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

    // Return results
    return {
      inactiveSites,
      stats,
      thresholdDays: INACTIVITY_THRESHOLD_DAYS,
      slackMessage,
    };
  } catch (error) {
    console.error('Error checking inactive sites:', error);

    // Send error notification to Slack
    const errorMessage = `❌ *Superstar Sites Monitor Error*\n\nFailed to check inactive sites: ${error instanceof Error ? error.message : 'Unknown error'}`;
    await postToSlack(errorMessage, SLACK_CHANNEL);

    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const results = await checkInactiveSites();

    res.status(200).json({
      success: true,
      message: 'Inactive sites check completed successfully',
      data: {
        inactiveSitesCount: results.inactiveSites.length,
        totalActiveSites: results.stats.total_active_sites || 0,
        thresholdDays: results.thresholdDays,
        slackSent: !!SLACK_WEBHOOK_URL,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check inactive sites',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
