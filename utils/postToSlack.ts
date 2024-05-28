export const postToSlack = async (message: string, channel?: string) => {
  try {
    const response = await fetch('/api/slackNotification', {
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
