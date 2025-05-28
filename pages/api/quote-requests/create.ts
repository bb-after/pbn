import type { NextApiRequest, NextApiResponse } from 'next';
import { postToSlack } from 'utils/postToSlack';

type DealData = {
  hs_object_id: Number;
  keyword: string;
  referral: string;
  timeline: string;
  location: string;
  notes_on_quotes: string;
  budget_discussed: string;
};

// Function to format OpenAI's markdown for Slack
function formatForSlack(text: string): string {
  // Convert markdown headers (###, ##, #) to bold
  text = text.replace(/^###\s+(.+)$/gm, '*$1*');
  text = text.replace(/^##\s+(.+)$/gm, '*$1*');
  text = text.replace(/^#\s+(.+)$/gm, '*$1*');

  // Convert markdown bold (**text**) to Slack bold
  text = text.replace(/\*\*(.*?)\*\*/g, '*$1*');

  // Convert markdown italics (*text*) to Slack italics (if needed)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_');

  // Convert markdown lists to Slack lists
  text = text.replace(/^\s*-\s+/gm, '• ');
  text = text.replace(/^\s*\d\.\s+/gm, '$& ');

  // Convert markdown code blocks (if any)
  text = text.replace(/```[\s\S]*?```/g, match => {
    return '```' + match.slice(3, -3).trim() + '```';
  });

  return text;
}

/**
 * 1. HubSpot Files API: Retrieve Private File Paths with improved error handling
 */
async function getHubSpotFilePaths(fileIds: string[]): Promise<string[]> {
  const filePaths: string[] = [];

  for (const fileId of fileIds) {
    try {
      console.log(`Attempting to fetch HubSpot file: ${fileId}`);

      // Retry logic for network issues
      let retries = 3;
      let response;
      let lastError;

      while (retries > 0) {
        // Create a new AbortController for each retry attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`Timeout triggered for HubSpot file ${fileId} after 8 seconds`);
          controller.abort();
        }, 8000); // 8 second timeout per request

        try {
          console.log(`Retry attempt ${4 - retries}/3 for file ${fileId}`);

          response = await fetch(`https://api.hubapi.com/files/v3/files/${fileId}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          console.log(
            `Successfully received response for file ${fileId}, status: ${response.status}`
          );
          break; // Success, exit retry loop
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          lastError = fetchError;
          retries--;

          console.warn(`HubSpot API retry ${4 - retries}/3 for file ${fileId}:`, {
            message: fetchError.message,
            name: fetchError.name,
            code: fetchError.code,
          });

          if (retries === 0) {
            console.error(`Failed to fetch HubSpot file ${fileId} after 3 retries. Last error:`, {
              message: fetchError.message,
              name: fetchError.name,
              code: fetchError.code,
            });
            // Don't throw, just skip this file and continue processing
            break;
          }

          // Wait before retry (exponential backoff)
          const backoffDelay = (4 - retries) * 1000;
          console.log(`Waiting ${backoffDelay}ms before retry for file ${fileId}`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }

      if (!response) {
        console.error(`No response received for file ${fileId} after all retries, skipping`);
        continue;
      }

      if (!response.ok) {
        let errorText = 'Unable to read error response';
        try {
          errorText = await response.text();
        } catch (textError) {
          console.warn(`Could not read error response text for file ${fileId}:`, textError);
        }
        console.error(`HubSpot API error for file ${fileId}:`, {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        continue; // Skip this file but continue processing others
      }

      let fileData;
      try {
        fileData = await response.json();
        console.log(`Successfully parsed JSON for file ${fileId}:`, {
          hasUrl: !!fileData.url,
          keys: Object.keys(fileData),
        });
      } catch (jsonError: any) {
        console.error(`Failed to parse JSON response for file ${fileId}:`, jsonError.message);
        continue;
      }

      // Adjust property names as needed—this is hypothetical
      // Typically you might see { url, hiddenUrl, ... }
      if (fileData.url) {
        filePaths.push(fileData.url);
        console.log(`Added file URL for ${fileId}: ${fileData.url}`);
      } else {
        console.warn(
          `No URL found in file data for ${fileId}. Available keys:`,
          Object.keys(fileData)
        );
      }
    } catch (err: any) {
      console.error(`Unexpected error processing HubSpot file ${fileId}:`, {
        message: err.message,
        code: err.code,
        type: err.name,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
      });
      // Continue processing other files instead of failing completely
    }
  }

  console.log(
    `HubSpot file processing complete. Retrieved ${filePaths.length} file paths out of ${fileIds.length} attempted.`
  );
  return filePaths;
}

// Function to create the Slack message with deal data
function createSlackMessage(
  assistantReply: string,
  dealData: DealData,
  screenshotSection: string
): string {
  const dealSummary = `
  *New Quote Request Details:*
  • *HubSpot Deal:* https://app.hubspot.com/contacts/24444832/record/0-3/${dealData.hs_object_id}
  • *Keywords:* ${dealData.keyword || 'N/A'}
  • *Referral:* ${dealData.referral || 'N/A'}
  • *Timeline:* ${dealData.timeline || 'N/A'}
  • *Location:* ${dealData.location || 'N/A'}
  • *Budget Discussed:* ${dealData.budget_discussed || 'N/A'}
  • *Additional Notes:* ${dealData.notes_on_quotes || 'N/A'}
  • *Screenshots:* ${screenshotSection}
  
  *AI Response:*
  ${formatForSlack(assistantReply)}
  `;

  return dealSummary.trim();
}

async function createThreadRun({
  threadId,
  assistantId,
}: {
  threadId: string;
  assistantId: string;
}): Promise<string> {
  console.log('Creating OpenAI thread run for assistant:', assistantId);

  // Create the run with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('Timeout triggered for createThreadRun after 30 seconds');
    controller.abort();
  }, 30000);

  let createRunResponse;
  try {
    createRunResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'OpenAI-Beta': 'assistants=v2',
        Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Failed to create OpenAI run:', error.message);
    throw new Error(`Failed to create run: ${error.message}`);
  }

  if (!createRunResponse.ok) {
    let errorText = 'Unable to read error response';
    try {
      errorText = await createRunResponse.text();
    } catch (textError) {
      console.warn('Could not read create run error response:', textError);
    }
    console.error('OpenAI create run error:', {
      status: createRunResponse.status,
      statusText: createRunResponse.statusText,
      errorText,
    });
    throw new Error(`Failed to create run: ${createRunResponse.status} ${errorText}`);
  }

  const runData = await createRunResponse.json();
  const runId = runData.id;
  console.log('Created OpenAI run:', runId);

  // Poll the run status until it's completed with timeout
  const maxPollingTime = 120000; // 2 minutes max
  const startTime = Date.now();
  let pollCount = 0;
  const maxPolls = 120; // Max 120 polls (2 minutes at 1 second intervals)

  while (pollCount < maxPolls) {
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > maxPollingTime) {
      console.error(`OpenAI run polling timeout after ${elapsedTime}ms`);
      throw new Error(`Run polling timeout after ${Math.round(elapsedTime / 1000)} seconds`);
    }

    pollCount++;
    console.log(`Polling run status (attempt ${pollCount}/${maxPolls})`);

    const statusController = new AbortController();
    const statusTimeoutId = setTimeout(() => {
      console.log('Timeout triggered for run status check after 10 seconds');
      statusController.abort();
    }, 10000); // 10 second timeout for each status check

    let runStatusResponse;
    try {
      runStatusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2',
            Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
          },
          signal: statusController.signal,
        }
      );
      clearTimeout(statusTimeoutId);
    } catch (statusError: any) {
      clearTimeout(statusTimeoutId);
      console.warn(`Failed to check run status (poll ${pollCount}):`, statusError.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    if (!runStatusResponse.ok) {
      console.warn(
        `Run status check failed with status ${runStatusResponse.status} (poll ${pollCount})`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    let runStatus;
    try {
      runStatus = await runStatusResponse.json();
    } catch (jsonError: any) {
      console.warn(`Failed to parse run status JSON (poll ${pollCount}):`, jsonError.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    console.log(`Run status: ${runStatus.status} (poll ${pollCount})`);

    if (runStatus.status === 'completed') {
      console.log('OpenAI run completed, fetching messages');

      // Get the latest message with timeout
      const messagesController = new AbortController();
      const messagesTimeoutId = setTimeout(() => {
        console.log('Timeout triggered for messages fetch after 15 seconds');
        messagesController.abort();
      }, 15000);

      let messagesResponse;
      try {
        messagesResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/messages?run_id=${runId}`,
          {
            headers: {
              'OpenAI-Beta': 'assistants=v2',
              Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
            },
            signal: messagesController.signal,
          }
        );
        clearTimeout(messagesTimeoutId);
      } catch (messagesError: any) {
        clearTimeout(messagesTimeoutId);
        console.error('Failed to fetch messages:', messagesError.message);
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }

      if (!messagesResponse.ok) {
        let errorText = 'Unable to read error response';
        try {
          errorText = await messagesResponse.text();
        } catch (textError) {
          console.warn('Could not read messages error response:', textError);
        }
        console.error('Failed to fetch messages:', {
          status: messagesResponse.status,
          statusText: messagesResponse.statusText,
          errorText,
        });
        throw new Error(`Failed to fetch messages: ${messagesResponse.status} ${errorText}`);
      }

      const messages = await messagesResponse.json();
      console.log(`Received ${messages.data?.length || 0} messages`);

      // Get the first message (most recent) from the assistant
      const lastAssistantMessage = messages.data?.find(
        (message: any) => message.role === 'assistant'
      );

      const response = lastAssistantMessage?.content[0]?.text?.value || 'No response received';
      console.log('Successfully retrieved assistant response');
      return response;
    } else if (runStatus.status === 'failed') {
      const errorMessage = runStatus.last_error?.message || 'Unknown error';
      console.error('OpenAI run failed:', errorMessage);
      throw new Error(`Run failed: ${errorMessage}`);
    } else if (runStatus.status === 'cancelled') {
      console.error('OpenAI run was cancelled');
      throw new Error('Run was cancelled');
    } else if (runStatus.status === 'expired') {
      console.error('OpenAI run expired');
      throw new Error('Run expired');
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.error(`OpenAI run polling exceeded maximum attempts (${maxPolls})`);
  throw new Error(`Run polling exceeded maximum attempts after ${maxPolls} polls`);
}

async function processWebhook(body: any) {
  const dealData: DealData = {
    hs_object_id: body.hs_object_id,
    keyword: body.keyword,
    referral: body.referral,
    timeline: body.timeline,
    location: body.location,
    notes_on_quotes: body.notes_on_quotes,
    budget_discussed: body.budget_discussed,
  };

  console.log('Processing webhook for deal:', dealData.hs_object_id);

  // Try to fetch screenshots, but don't fail if this doesn't work
  let screenshotPaths: string[] = [];
  let screenshotSection = 'No screenshots available';

  try {
    const screenshotFileIds = [
      body.quote_request_image_1,
      body.quote_attachment__2,
      body.quote_attachment__3,
    ].filter(Boolean);

    if (screenshotFileIds.length > 0) {
      console.log('Attempting to fetch screenshot files:', screenshotFileIds);
      screenshotPaths = await getHubSpotFilePaths(screenshotFileIds);

      if (screenshotPaths.length > 0) {
        screenshotSection = screenshotPaths
          .map((url, i) => `Screenshot #${i + 1}: ${url}`)
          .join('\n');
        console.log('Successfully retrieved screenshot URLs:', screenshotPaths);
      } else {
        console.warn('No screenshot URLs were retrieved');
      }
    } else {
      console.log('No screenshot file IDs provided');
    }
  } catch (screenshotError: any) {
    console.error('Error fetching screenshots (continuing anyway):', screenshotError.message);
    screenshotSection = 'Screenshots could not be retrieved due to network issues';
  }

  const userMessage = `
  Here is the information for the quote request we need to generate:
  Keyword(s): ${dealData.keyword ?? 'N/A'}
  Referral: ${dealData.referral ?? 'N/A'}
  Budget Discussed: ${dealData.budget_discussed ?? 'N/A'}
  Timeline: ${dealData.timeline ?? 'N/A'}
  Location: ${dealData.location ?? 'N/A'}
  Notes on Quotes: ${dealData.notes_on_quotes ?? 'N/A'}
  
  Screenshots of Search Result Ranking:
  ${screenshotSection}`.trim();

  console.log('Sending message to OpenAI assistant...');

  try {
    const assistantId = process.env.OPENAI_ASSISTANT_ID!;
    const threadId = process.env.OPENAI_THREAD_ID!;

    await sendMessageToThread({ threadId, userMessage });
    console.log('Message sent to thread successfully');

    const assistantReply = await createThreadRun({ threadId, assistantId });
    console.log('Received assistant reply');

    const slackMessage = createSlackMessage(assistantReply, dealData, screenshotSection);

    await postToSlack(
      slackMessage,
      '#quote-requests-v2',
      process.env.SLACK_QUOTE_REQUESTS_WEBHOOK_URL!
    );
    console.log('Quote request processed and sent to Slack successfully');
  } catch (aiError: any) {
    console.error('Error processing AI request:', aiError.message);

    // Send a fallback message to Slack even if AI processing fails
    try {
      const fallbackMessage = createSlackMessage(
        'AI processing failed due to network issues. Please process this quote request manually.',
        dealData,
        screenshotSection
      );

      await postToSlack(
        fallbackMessage,
        '#quote-requests-v2',
        process.env.SLACK_QUOTE_REQUESTS_WEBHOOK_URL!
      );
      console.log('Fallback message sent to Slack');
    } catch (slackError: any) {
      console.error('Failed to send fallback Slack message:', slackError.message);
      throw new Error(
        `Both AI processing and Slack fallback failed: ${aiError.message} | ${slackError.message}`
      );
    }
  }
}

async function sendMessageToThread({
  threadId,
  userMessage,
}: {
  threadId: string;
  userMessage: string;
}): Promise<void> {
  const url = `https://api.openai.com/v1/threads/${threadId}/messages`;

  const payload = {
    role: 'user',
    content: userMessage,
  };

  console.log('Preparing to send message to OpenAI thread:', threadId);

  try {
    let retries = 3;
    let response;
    let lastError;

    while (retries > 0) {
      // Create a new AbortController for each retry attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Timeout triggered for OpenAI API call after 30 seconds`);
        controller.abort();
      }, 30000);

      try {
        console.log(`OpenAI API attempt ${4 - retries}/3`);

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'OpenAI-Beta': 'assistants=v2',
            Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`Successfully received response from OpenAI API, status: ${response.status}`);
        break; // Success, exit retry loop
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        lastError = fetchError;
        retries--;

        console.warn(`OpenAI API retry ${4 - retries}/3:`, {
          message: fetchError.message,
          name: fetchError.name,
          code: fetchError.code,
        });

        if (retries === 0) {
          console.error('Failed to send message to OpenAI thread after 3 retries. Last error:', {
            message: fetchError.message,
            name: fetchError.name,
            code: fetchError.code,
          });
          throw fetchError;
        }

        // Wait before retry (exponential backoff)
        const backoffDelay = (4 - retries) * 2000;
        console.log(`Waiting ${backoffDelay}ms before retry for OpenAI API`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    if (!response) {
      throw new Error('No response received from OpenAI API after all retries');
    }

    if (!response.ok) {
      let errorText = 'Unable to read error response';
      try {
        errorText = await response.text();
      } catch (textError) {
        console.warn('Could not read OpenAI error response text:', textError);
      }
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`Failed to send message to thread: ${response.status} ${errorText}`);
    }

    // Parse the successful response
    try {
      const responseData = await response.json();
      console.log('Successfully sent message to OpenAI thread:', {
        messageId: responseData.id,
        threadId: responseData.thread_id,
      });
    } catch (jsonError: any) {
      console.warn(
        'Could not parse OpenAI response JSON (but request was successful):',
        jsonError.message
      );
    }
  } catch (error: unknown) {
    console.error('Unexpected error in sendMessageToThread:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined,
      nodeVersion: process.version,
    });
    throw error;
  }
}

/**
 * 3. Main Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // (Optional) check your custom webhook secret from HubSpot or any source
  const hubspotSecret = req.headers['hubspot_quote_request_webhook_secret'];
  if (!hubspotSecret || hubspotSecret !== process.env.HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // respond right away to hubspot to avoid timeout
  res.status(200).json({ message: 'Quote request received' });

  // Extract deal ID for error reporting
  const dealId = req.body?.hs_object_id || 'Unknown';

  try {
    await processWebhook(req.body);
  } catch (error: any) {
    console.error('Error in /quote-requests/create:', {
      dealId,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    // Final fallback: Always notify Slack when the entire process fails
    try {
      const errorMessage = `🚨 *Quote Request Processing Failed*

*Deal ID:* ${dealId}
*HubSpot Deal:* https://app.hubspot.com/contacts/24444832/record/0-3/${dealId}
*Error:* ${error.message}
*Time:* ${new Date().toISOString()}

The quote request webhook was received but processing failed completely. Please check the server logs and process this request manually.

*Request Data:*
\`\`\`
${JSON.stringify(req.body, null, 2).slice(0, 1000)}${JSON.stringify(req.body, null, 2).length > 1000 ? '...' : ''}
\`\`\``;

      await postToSlack(
        errorMessage,
        '#quote-requests-v2',
        process.env.SLACK_QUOTE_REQUESTS_WEBHOOK_URL!
      );
      console.log('Emergency error notification sent to Slack');
    } catch (slackError: any) {
      console.error('Failed to send emergency error notification to Slack:', slackError.message);
      // At this point we've done everything we can - log the final error
      console.error('CRITICAL: Both quote processing and error notification failed', {
        originalError: error.message,
        slackError: slackError.message,
        dealId,
      });
    }
  }
}
