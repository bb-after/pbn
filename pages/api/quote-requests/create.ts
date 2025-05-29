import type { NextApiRequest, NextApiResponse } from 'next';
import { postToSlack } from 'utils/postToSlack';
import * as mysql from 'mysql2/promise';

// Create a connection pool (reuse across requests)
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

// Fallback in-memory cache for when database is unavailable
const fallbackProcessedDeals = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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
 * 1. HubSpot Files API: Retrieve Private File Paths - simple working version
 */
async function getHubSpotFilePaths(fileIds: string[]): Promise<string[]> {
  const filePaths: string[] = [];

  for (const fileId of fileIds) {
    try {
      console.log(`Attempting to fetch HubSpot file: ${fileId}`);

      const response = await fetch(`https://api.hubapi.com/files/v3/files/${fileId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`HubSpot API error for file ${fileId}: ${response.status}`);
        continue;
      }

      const fileData = await response.json();
      if (fileData.url) {
        filePaths.push(fileData.url);
        console.log(`Added file URL for ${fileId}`);
      }
    } catch (err: any) {
      console.error(`Error processing HubSpot file ${fileId}:`, err.message);
    }
  }

  console.log(`Retrieved ${filePaths.length} file paths`);
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
      console.error('Could not read create run error response:', textError);
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
      console.error(`Failed to check run status (poll ${pollCount}):`, statusError.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    if (!runStatusResponse.ok) {
      console.error(
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
      console.error(`Failed to parse run status JSON (poll ${pollCount}):`, jsonError.message);

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
          console.error('Could not read messages error response:', textError);
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
    keyword_monthly_search_volume: body.keyword_monthly_search_volume,
    referral: body.referral,
    timeline: body.timeline,
    location: body.location,
    notes_on_quotes: body.notes_on_quotes,
    budget_discussed: body.budget_discussed,
  };

  console.log('Processing webhook for deal:', dealData.hs_object_id);

  // Try to fetch screenshots
  let screenshotPaths: string[] = [];
  let screenshotSection = 'No screenshots available';

  try {
    const screenshotFileIds = [
      body.quote_request_image_1,
      body.quote_attachment__2,
      body.quote_attachment__3,
    ].filter(Boolean);

    if (screenshotFileIds.length > 0) {
      console.log('Fetching screenshot files:', screenshotFileIds);
      screenshotPaths = await getHubSpotFilePaths(screenshotFileIds);

      if (screenshotPaths.length > 0) {
        screenshotSection = screenshotPaths
          .map((url, i) => `Screenshot #${i + 1}: ${url}`)
          .join('\n');
      }
    }
  } catch (screenshotError: any) {
    console.error('Error fetching screenshots:', screenshotError.message);
    screenshotSection = 'Screenshots could not be retrieved';
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

  console.log('Sending message to OpenAI assistant...');

  const assistantId = process.env.OPENAI_ASSISTANT_ID!;
  const threadId = process.env.OPENAI_THREAD_ID!;

  await sendMessageToThread({ threadId, userMessage });
  const assistantReply = await createThreadRun({ threadId, assistantId });

  const slackMessage = createSlackMessage(assistantReply, dealData, screenshotSection);

  await postToSlack(slackMessage, '#quote-requests-v2', process.env.SLACK_WEBHOOK_URL!);
  console.log('Quote request processed and sent to Slack successfully');
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

  console.log('Message sent to thread successfully');
}

// Database tracking functions
async function isRecentlyProcessed(dealId: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const query = `
    SELECT id FROM quote_request_tracking 
    WHERE hubspot_deal_id = ? 
    AND processed_at > ? 
    AND status IN ('processing', 'completed')
    ORDER BY processed_at DESC 
    LIMIT 1
  `;

  const [rows] = await pool.query(query, [dealId, fiveMinutesAgo]);
  return (rows as any[]).length > 0;
}

async function startTracking(dealId: string): Promise<number> {
  const query = `
    INSERT INTO quote_request_tracking (hubspot_deal_id, status) 
    VALUES (?, 'processing')
  `;

  const [result] = await pool.query(query, [dealId]);
  const insertId = (result as any).insertId;

  console.log(`Started tracking quote request for deal ${dealId} with ID ${insertId}`);
  return insertId;
}

async function markCompleted(trackingId: number): Promise<void> {
  const query = `
    UPDATE quote_request_tracking 
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;

  await pool.query(query, [trackingId]);
  console.log(`Marked quote request tracking ID ${trackingId} as completed`);
}

async function markFailed(trackingId: number, errorMessage: string): Promise<void> {
  const query = `
    UPDATE quote_request_tracking 
    SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;

  await pool.query(query, [errorMessage, trackingId]);
  console.log(`Marked quote request tracking ID ${trackingId} as failed: ${errorMessage}`);
}

/**
 * 3. Main Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const handlerStartTime = Date.now();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Log environment variable availability for debugging
  const requiredEnvVars = {
    HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN: !!process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN,
    OPENAI_QUOTE_REQUEST_API_KEY_ID: !!process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID,
    OPENAI_ASSISTANT_ID: !!process.env.OPENAI_ASSISTANT_ID,
    OPENAI_THREAD_ID: !!process.env.OPENAI_THREAD_ID,
    SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
    HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET: !!process.env.HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET,
  };

  // Also check database environment variables
  const dbEnvVars = {
    DB_HOST_NAME: !!process.env.DB_HOST_NAME,
    DB_USER_NAME: !!process.env.DB_USER_NAME,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_DATABASE: !!process.env.DB_DATABASE,
  };

  console.log('🔍 Environment variables check:', requiredEnvVars);
  console.log('🗄️ Database environment variables:', dbEnvVars);

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, present]) => !present)
    .map(([name, _]) => name);

  const missingDbVars = Object.entries(dbEnvVars)
    .filter(([_, present]) => !present)
    .map(([name, _]) => name);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
  }

  if (missingDbVars.length > 0) {
    console.error('❌ Missing database environment variables:', missingDbVars);
    console.log('⚠️ Database tracking will be disabled due to missing DB config');
  }

  // Check webhook secret
  const hubspotSecret = req.headers['hubspot_quote_request_webhook_secret'];
  if (!hubspotSecret || hubspotSecret !== process.env.HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Respond immediately to HubSpot
  res.status(200).json({ message: 'Quote request received' });

  // Extract deal ID for logging
  const dealId = req.body?.hs_object_id || 'Unknown';
  console.log(`Starting quote request processing for deal ${dealId}`);

  // Check for recent processing to prevent duplicates using database
  let useDatabaseTracking = true;
  try {
    const isRecentlyProcessedResult = await isRecentlyProcessed(dealId.toString());

    if (isRecentlyProcessedResult) {
      console.log(`⚠️ Deal ${dealId} was recently processed (database check), skipping duplicate`);
      return;
    }
  } catch (dbError: any) {
    console.error(`Database check failed for deal ${dealId}:`, dbError.message);
    console.error('Database error details:', dbError);
    useDatabaseTracking = false;
    console.log('⚠️ Falling back to in-memory deduplication due to DB error');

    // Fallback to in-memory deduplication
    const now = Date.now();
    const lastProcessed = fallbackProcessedDeals.get(dealId.toString());

    if (lastProcessed && now - lastProcessed < DEDUP_WINDOW_MS) {
      const timeSince = Math.round((now - lastProcessed) / 1000);
      console.log(
        `⚠️ Deal ${dealId} was already processed ${timeSince}s ago (fallback check), skipping duplicate`
      );
      return;
    }

    // Mark this deal as being processed in fallback cache
    fallbackProcessedDeals.set(dealId.toString(), now);

    // Clean up old entries from fallback cache
    for (const [id, timestamp] of fallbackProcessedDeals.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        fallbackProcessedDeals.delete(id);
      }
    }
  }

  // Start tracking this request in the database (if database is available)
  let trackingId: number | null = null;
  if (useDatabaseTracking) {
    try {
      trackingId = await startTracking(dealId.toString());
    } catch (dbError: any) {
      console.error(`Failed to start tracking for deal ${dealId}:`, dbError.message);
      console.error('Database error details:', dbError);
      // Continue processing even if tracking fails
      console.log('⚠️ Continuing without database tracking due to DB error');
      trackingId = null;
    }
  }

  try {
    await processWebhook(req.body);

    // Mark as completed in database (if database tracking is available)
    if (trackingId && useDatabaseTracking) {
      try {
        await markCompleted(trackingId);
      } catch (dbError: any) {
        console.error(`Failed to mark tracking ${trackingId} as completed:`, dbError.message);
      }
    }

    console.log(`✅ Quote request handler completed successfully for deal ${dealId}`);
  } catch (error: any) {
    console.error(`❌ Quote request handler failed for deal ${dealId}:`, error.message);

    // Mark as failed in database (if database tracking is available)
    if (trackingId && useDatabaseTracking) {
      try {
        await markFailed(trackingId, error.message);
      } catch (dbError: any) {
        console.error(`Failed to mark tracking ${trackingId} as failed:`, dbError.message);
      }
    }
  }
}
