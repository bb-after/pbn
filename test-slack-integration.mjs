/**
 * Simple test script to verify Slack integration
 * Run with: node test-slack-integration.mjs
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function postToSlack(message) {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;

  if (!slackUrl) {
    throw new Error('SLACK_WEBHOOK_URL is not set in environment variables');
  }

  const payload = { text: message };

  const response = await fetch(slackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack API returned ${response.status}: ${response.statusText}`);
  }

  return response;
}

async function testSlackIntegration() {
  try {
    console.log('Testing Slack integration...');
    
    // Test basic message
    await postToSlack('🧪 *Test Message from PBN Approval System*\n\nThis is a test of the Slack notification system. If you see this message, the integration is working correctly!');
    
    console.log('✅ Slack test message sent successfully!');
    console.log('Check your Slack channel to verify the message was received.');
    
  } catch (error) {
    console.error('❌ Slack test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure SLACK_WEBHOOK_URL is set in your .env file');
    console.log('2. Verify the webhook URL is correct');
    console.log('3. Check that the Slack app has permission to post to the channel');
    console.log('4. Ensure the webhook URL starts with https://hooks.slack.com/services/');
  }
}

// Run the test
testSlackIntegration(); 