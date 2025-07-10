import type { NextApiRequest, NextApiResponse } from 'next';
import { postToSlack } from 'utils/postToSlack';

// Extend execution time to maximum Vercel Pro plan allows (5 minutes)
export const config = {
  maxDuration: 300, // 5 minutes (300 seconds) - Pro plan limit
};

type DealData = {
  hs_object_id: Number;
  keyword: string;
  keyword_monthly_search_volume: string;
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
 * 1. HubSpot Files API: Retrieve Private File Paths - optimized parallel version
 */
async function getHubSpotFilePaths(fileIds: string[], dealId: string): Promise<string[]> {
  const fetchStartTime = Date.now();
  console.log(`[${dealId}] Fetching ${fileIds.length} HubSpot files in parallel...`);

  // Fetch all files in parallel for better performance
  const filePromises = fileIds.map(async fileId => {
    const fileStartTime = Date.now();
    try {
      console.log(`[${dealId}] Attempting to fetch HubSpot file: ${fileId}`);

      // Very aggressive timeout for production - 5 seconds max per file
      const response = await fetch(`https://api.hubapi.com/filemanager/api/v2/files/${fileId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // Reduced from 10s to 5s for production
      });

      const fileTime = Date.now() - fileStartTime;

      if (!response.ok) {
        console.log(
          `[${dealId}] HubSpot API error for file ${fileId}: ${response.status} (took ${fileTime}ms)`
        );
        return null;
      }

      const fileData = await response.json();
      if (fileData.url) {
        console.log(`[${dealId}] Successfully fetched file URL for ${fileId} (took ${fileTime}ms)`);
        return fileData.url;
      }
      console.log(`[${dealId}] No URL found for file ${fileId} (took ${fileTime}ms)`);
      return null;
    } catch (err: any) {
      const fileTime = Date.now() - fileStartTime;
      console.log(
        `[${dealId}] Error processing HubSpot file ${fileId} after ${fileTime}ms:`,
        err.message
      );

      // Immediately return null on any error to prevent hanging
      if (err.name === 'AbortError') {
        console.log(
          `[${dealId}] File ${fileId} aborted due to 5s timeout - production network issue`
        );
      } else if (err.message.includes('fetch failed')) {
        console.log(
          `[${dealId}] File ${fileId} network failure - likely Vercel->HubSpot connectivity issue`
        );
      }

      return null;
    }
  });

  // Wait for all requests to complete and filter out failures
  const results = await Promise.all(filePromises);
  const filePaths = results.filter((url): url is string => url !== null);

  const totalFetchTime = Date.now() - fetchStartTime;
  console.log(
    `[${dealId}] Successfully retrieved ${filePaths.length} out of ${fileIds.length} file paths in ${totalFetchTime}ms`
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
  • *Global Monthly Search Volume:* ${dealData.keyword_monthly_search_volume || 'N/A'}
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
  dealId,
}: {
  threadId: string;
  assistantId: string;
  dealId: string;
}): Promise<string> {
  const runStartTime = Date.now();
  console.log(`[${dealId}] Creating OpenAI thread run...`);

  // Create the run
  const createRunResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistant_id: assistantId,
    }),
  });

  if (!createRunResponse.ok) {
    throw new Error(`Failed to create run: ${createRunResponse.status}`);
  }

  const runData = await createRunResponse.json();
  const runId = runData.id;
  const createTime = Date.now() - runStartTime;
  console.log(`[${dealId}] Created run ${runId} in ${createTime}ms, now polling for completion...`);

  // Poll until completed with timeout protection
  const maxPollTime = 10 * 60 * 1000; // 10 minutes max polling time
  const pollStartTime = Date.now();
  let pollCount = 0;

  while (true) {
    // Check if we've exceeded max polling time
    const pollElapsed = Date.now() - pollStartTime;
    if (pollElapsed > maxPollTime) {
      console.log(
        `[${dealId}] 🚨 OpenAI polling timeout after ${(pollElapsed / 1000).toFixed(2)}s`
      );
      throw new Error(`OpenAI assistant run timed out after 10 minutes. Run ID: ${runId}`);
    }

    pollCount++;
    const pollIterationStart = Date.now();
    console.log(
      `[${dealId}] Polling attempt ${pollCount} for run ${runId} (elapsed: ${(pollElapsed / 1000).toFixed(2)}s)...`
    );

    const runStatusResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      {
        headers: {
          'OpenAI-Beta': 'assistants=v2',
          Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
        },
      }
    );

    const runStatus = await runStatusResponse.json();
    const pollIterationTime = Date.now() - pollIterationStart;
    console.log(`[${dealId}] Run status: ${runStatus.status} (poll took ${pollIterationTime}ms)`);

    if (runStatus.status === 'completed') {
      const totalRunTime = Date.now() - runStartTime;
      console.log(
        `[${dealId}] Run completed successfully after ${pollCount} polls in ${(totalRunTime / 1000).toFixed(2)}s`
      );

      // Get messages
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          headers: {
            'OpenAI-Beta': 'assistants=v2',
            Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
          },
        }
      );

      const messages = await messagesResponse.json();
      const lastAssistantMessage = messages.data?.find(
        (message: any) => message.role === 'assistant'
      );

      return lastAssistantMessage?.content[0]?.text?.value || 'No response received';
    } else if (runStatus.status === 'failed') {
      const totalRunTime = Date.now() - runStartTime;
      console.log(`[${dealId}] Run failed after ${(totalRunTime / 1000).toFixed(2)}s`);
      throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    // Wait 2 seconds before polling again (slightly longer interval for efficiency)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function processWebhook(body: any, dealId: string, startTime: number) {
  const dealData: DealData = {
    hs_object_id: body.hs_object_id,
    keyword: body.keyword,
    keyword_monthly_search_volume: body.keyword_monthly_search_volume,
    referral: body.referral,
    timeline: body.timeline,
    location: body.location,
    notes_on_quotes: body.notes_on_quotes,
    budget_discussed: body.budget_discussed,
  };

  console.log(`[${dealId}] Processing webhook for deal:`, dealData.hs_object_id);

  // Try to fetch screenshots with aggressive production fallback
  let screenshotPaths: string[] = [];
  let screenshotSection = 'No screenshots available';

  try {
    const screenshotFileIds = [
      body.quote_request_image_1,
      body.quote_attachment__2,
      body.quote_attachment__3,
    ].filter(Boolean);

    if (screenshotFileIds.length > 0) {
      console.log(`[${dealId}] Fetching screenshot files:`, screenshotFileIds);

      // Add very aggressive timeout for production
      const screenshotFetchPromise = getHubSpotFilePaths(screenshotFileIds, dealId);
      const timeoutPromise = new Promise<never>(
        (_, reject) =>
          setTimeout(
            () => reject(new Error('Production timeout - continuing without screenshots')),
            15000
          ) // 15 second max
      );

      try {
        screenshotPaths = (await Promise.race([
          screenshotFetchPromise,
          timeoutPromise,
        ])) as string[];

        if (screenshotPaths.length > 0) {
          screenshotSection = screenshotPaths
            .map((url, i) => `Screenshot #${i + 1}: ${url}`)
            .join('\n');
          console.log(
            `[${dealId}] ✅ Retrieved ${screenshotPaths.length} screenshot URLs successfully`
          );
        } else {
          // If no screenshots retrieved, provide HubSpot deal link instead
          screenshotSection = `Screenshots available in HubSpot deal: https://app.hubspot.com/contacts/24444832/record/0-3/${dealData.hs_object_id}`;
          console.log(`[${dealId}] ⚠️ No screenshots retrieved, using HubSpot deal link instead`);
        }
      } catch (timeoutError: any) {
        console.log(
          `[${dealId}] Screenshot fetch failed/timed out in 15s - continuing with quote request`
        );
        // Provide HubSpot deal link as backup
        screenshotSection = `Screenshots temporarily unavailable. View in HubSpot: https://app.hubspot.com/contacts/24444832/record/0-3/${dealData.hs_object_id}`;
      }
    }
  } catch (screenshotError: any) {
    console.log(`[${dealId}] Screenshot error:`, screenshotError.message);
    screenshotSection = `Screenshots could not be retrieved. View deal: https://app.hubspot.com/contacts/24444832/record/0-3/${dealData.hs_object_id}`;
  }

  const userMessage = `
  Here is the information for the quote request we need to generate:
  Keyword(s): ${dealData.keyword ?? 'N/A'}
  Global Monthly Search Volume: ${dealData.keyword_monthly_search_volume ?? 'N/A'}
  Referral: ${dealData.referral ?? 'N/A'}
  Budget Discussed: ${dealData.budget_discussed ?? 'N/A'}
  Timeline: ${dealData.timeline ?? 'N/A'}
  Location: ${dealData.location ?? 'N/A'}
  Notes on Quotes: ${dealData.notes_on_quotes ?? 'N/A'}
  
  Screenshots of Search Result Ranking:
  ${screenshotSection}`.trim();

  console.log(`[${dealId}] Sending message to OpenAI assistant...`);

  const assistantId = process.env.OPENAI_ASSISTANT_ID!;
  const threadId = process.env.OPENAI_THREAD_ID!;

  await sendMessageToThread({ threadId, userMessage, dealId });
  const assistantReply = await createThreadRun({ threadId, assistantId, dealId });

  const slackMessage = createSlackMessage(assistantReply, dealData, screenshotSection);

  await postToSlack(slackMessage, '#quote-requests-v2');
  console.log(`[${dealId}] Quote request processed and sent to Slack successfully`);
}

async function sendMessageToThread({
  threadId,
  userMessage,
  dealId,
}: {
  threadId: string;
  userMessage: string;
  dealId: string;
}): Promise<void> {
  const messageStartTime = Date.now();
  const url = `https://api.openai.com/v1/threads/${threadId}/messages`;

  const payload = {
    role: 'user',
    content: userMessage,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.status} ${errorText}`);
  }

  const messageTime = Date.now() - messageStartTime;
  console.log(`[${dealId}] Message sent to thread successfully in ${messageTime}ms`);
}

/**
 * 3. Main Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Check webhook secret
  const hubspotSecret = req.headers['hubspot_quote_request_webhook_secret'];
  if (!hubspotSecret || hubspotSecret !== process.env.HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Respond immediately to HubSpot
  res.status(200).json({ message: 'Quote request received' });

  // Extract deal ID for logging
  const dealId = req.body?.hs_object_id || 'Unknown';
  console.log(`[${dealId}] Starting quote request processing at ${new Date().toISOString()}`);
  console.log(`[${dealId}] Handler start time: ${startTime}`);

  try {
    await processWebhook(req.body, dealId, startTime);

    const totalTime = Date.now() - startTime;
    console.log(
      `[${dealId}] ✅ Quote request handler completed successfully in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`
    );
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.log(
      `[${dealId}] ❌ Quote request handler failed after ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s):`,
      error.message
    );

    // Check if it's a timeout-related error
    if (
      error.message.includes('timeout') ||
      error.message.includes('timed out') ||
      totalTime > 280000
    ) {
      console.log(
        `[${dealId}] 🚨 TIMEOUT DETECTED: Handler ran for ${(totalTime / 1000).toFixed(2)}s (limit: 300s)`
      );

      // Send timeout alert to Slack
      try {
        const timeoutMessage =
          `🚨 **QUOTE REQUEST TIMEOUT ALERT** 🚨\n\n` +
          `Deal ID: ${dealId}\n` +
          `Execution Time: ${(totalTime / 1000).toFixed(2)}s / 300s limit\n` +
          `Error: ${error.message}\n` +
          `Timestamp: ${new Date().toISOString()}\n\n` +
          `This indicates the quote request processor is hitting the 5-minute Vercel limit.`;

        await postToSlack(timeoutMessage, '#quote-requests-v2');
      } catch (slackError) {
        console.log(`[${dealId}] Failed to send timeout alert to Slack:`, slackError);
      }
    }
  }
}
