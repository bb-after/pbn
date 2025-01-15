export const postToSlack = async (message: string, channel?: string, webhookUrl?: string) => {
  const slackUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!slackUrl) {
    console.error("Slack Webhook URL is missing.");
    return;
  }

  try {
    const payload: any = { text: message };
    if (channel) {
      payload.channel = channel; // Only if your webhook allows channel overrides
    }

    const response = await fetch(slackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Slack typically returns plain text: "ok" on success, or an error message
    const responseText = await response.text();

    if (response.ok && responseText === 'ok') {
      console.log('Notification posted to Slack successfully');
    } else {
      console.error('Failed to post notification to Slack:', responseText);
    }
  } catch (error) {
    console.error('Error notifying Slack:', error);
  }

};
