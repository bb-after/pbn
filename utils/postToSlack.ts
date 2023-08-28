  // Function to post a notification to Slack
  export async function postToSlack(notificationMessage: string) {
    const webhookUrl = 'https://hooks.slack.com/services/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';
    
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'PBNJ Bot',
            icon_url: 'https://ai.statuscrawl.io/_next/image?url=%2Fimages%2Fpbnj.png&w=128&q=75',
            text: notificationMessage,
        }),
    });

    if (response.ok) {
        console.log('Notification posted to Slack successfully');
    } else {
        console.error('Failed to post notification to Slack');
    }
  }

