import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { validateUserToken } from '../validate-user-token';

interface SlackReminderRequest {
  ramp_user_email: string;
  ramp_user_name: string;
  sync_month: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ramp_user_email, ramp_user_name, sync_month }: SlackReminderRequest = req.body;

  if (!ramp_user_email || !ramp_user_name || !sync_month) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: ramp_user_email, ramp_user_name, sync_month' });
  }

  try {
    // Validate user token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Temporarily add token to headers for validation
    req.headers['x-auth-token'] = token;
    const validation = await validateUserToken(req);

    if (!validation.isValid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Find the user's slack handle by matching email
    const [userRows] = (await query(
      'SELECT slack_handle, name FROM users WHERE email = ? AND slack_handle IS NOT NULL',
      [ramp_user_email]
    )) as unknown as [{ slack_handle: string; name: string }[], any];

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        error: 'User not found or no Slack handle configured',
        details: `No user found with email ${ramp_user_email} or user has no Slack handle set`,
      });
    }

    const user = userRows[0];
    const slackHandle = user.slack_handle;

    // Format the sync month for display
    const monthDate = new Date(sync_month + '-01');
    const monthDisplay = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Prepare Slack DM message
    const message = `👋 Hi there! 

📊 **Ramp Expense Sync Reminder**

You haven't synced your Ramp expenses for **${monthDisplay}** yet. 

Please visit the expense sync page to complete your sync: https://ai.statuscrawl.io/ramp-expense-sync

Thank you! 🙏`;

    // Send DM using Slack Web API
    const slackBotToken = process.env.SLACK_BOT_TOKEN;

    if (!slackBotToken) {
      return res.status(500).json({
        error: 'Slack bot token not configured. Please set SLACK_BOT_TOKEN environment variable.',
      });
    }

    // First, find the user's Slack ID by email
    let slackUserId;
    try {
      const userLookupResponse = await fetch(
        `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(ramp_user_email)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${slackBotToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const userLookupData = await userLookupResponse.json();

      if (!userLookupData.ok) {
        throw new Error(`Failed to find Slack user: ${userLookupData.error}`);
      }

      slackUserId = userLookupData.user.id;
    } catch (error) {
      throw new Error(
        `Could not find Slack user with email ${ramp_user_email}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Send the DM
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: slackUserId, // Send to user's DM
        text: message,
        username: 'PBNJ Expense Bot',
        icon_url: 'https://statusapprovals.com/_next/image?url=%2Fimages%2Fpbnj.png&w=128&q=75',
      }),
    });

    const slackData = await slackResponse.json();

    if (!slackData.ok) {
      throw new Error(`Slack API Error: ${slackData.error}`);
    }

    // Log the reminder
    console.log(`Slack reminder sent to ${ramp_user_name} (${ramp_user_email}) for ${sync_month}`);

    res.status(200).json({
      success: true,
      message: `Slack reminder sent to ${ramp_user_name}`,
      slack_handle: slackHandle,
    });
  } catch (error) {
    console.error('Error sending Slack reminder:', error);
    res.status(500).json({
      error: 'Failed to send Slack reminder',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
