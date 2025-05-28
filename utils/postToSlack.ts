export const postToSlack = async (message: string, channel?: string, webhookUrl?: string) => {
  const slackUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!slackUrl) {
    console.error('Slack Webhook URL is missing.');
    return;
  }

  const payload: any = { text: message };
  if (channel) {
    payload.channel = channel; // Only if your webhook allows channel overrides
  }

  let retries = 3;
  let lastError;

  while (retries > 0) {
    // Create a new AbortController for each retry attempt
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Timeout triggered for Slack webhook after 15 seconds');
      controller.abort();
    }, 15000); // 15 second timeout

    try {
      console.log(`Posting to Slack (attempt ${4 - retries}/3)`);

      const response = await fetch(slackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Slack typically returns plain text: "ok" on success, or an error message
      let responseText = 'Unable to read response';
      try {
        responseText = await response.text();
      } catch (textError) {
        console.warn('Could not read Slack response text:', textError);
      }

      if (response.ok && responseText === 'ok') {
        console.log('Notification posted to Slack successfully');
        return; // Success, exit function
      } else {
        console.error('Failed to post notification to Slack:', {
          status: response.status,
          statusText: response.statusText,
          responseText,
        });

        // Don't retry for client errors (4xx), only server errors (5xx) and network issues
        if (response.status >= 400 && response.status < 500) {
          console.error('Client error, not retrying');
          return;
        }

        lastError = new Error(`Slack API error: ${response.status} ${responseText}`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      console.warn(`Slack webhook retry ${4 - retries}/3:`, {
        message: error.message,
        name: error.name,
        code: error.code,
      });
    }

    retries--;

    if (retries === 0) {
      console.error('Failed to post to Slack after 3 retries. Last error:', {
        message: lastError?.message || 'Unknown error',
        name: lastError?.name,
        code: lastError?.code,
      });
      return;
    }

    // Wait before retry (exponential backoff)
    const backoffDelay = (4 - retries) * 1000;
    console.log(`Waiting ${backoffDelay}ms before Slack retry`);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
  }
};
