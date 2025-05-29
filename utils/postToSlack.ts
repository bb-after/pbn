export const postToSlack = async (message: string, channel?: string, webhookUrl?: string) => {
  const slackUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!slackUrl) {
    console.error('Slack Webhook URL is missing.');
    return;
  }

  const payload: any = { text: message };
  if (channel) {
    payload.channel = channel;
  }

  try {
    const response = await fetch(slackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('Notification posted to Slack successfully');
    } else {
      console.error('Failed to post notification to Slack:', response.status);
    }
  } catch (error: any) {
    console.error('Error posting to Slack:', error.message);
  }
};
