export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).end(); // Method Not Allowed if not POST
  }

  const notificationMessage = req.body.message;
  const channel = req.body.channel || '#pbnj-notifications'; // Default to a general channel if not specified

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return res
      .status(500)
      .json({
        success: false,
        message: 'Server configuration error. Slack webhook URL is not set.',
      });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'PBNJ Bot',
        icon_url: 'https://statusapprovals.com/_next/image?url=%2Fimages%2Fpbnj.png&w=128&q=75',
        text: notificationMessage,
        channel, // Add the channel to the payload
      }),
    });

    if (!response.ok) {
      throw new Error('Slack API Error');
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
