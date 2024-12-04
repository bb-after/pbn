export const postToSlack = async (message: string, channel?: string) => {
  const slack_url = process.env.SLACK_WEBHOOK_URL;

  if (!slack_url) {
    console.error("Slack Webhook URL is missing.");
    return;
  }

  try {
    const response = await fetch(slack_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, channel }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Notification posted to Slack successfully');
    } else {
      console.error('Failed to post notification to Slack:', data.message);
    }
  } catch (error) {
    console.error('Error notifying Slack:', error);
  }
};
