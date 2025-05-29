import type { NextApiRequest, NextApiResponse } from 'next';
import { postToSlack } from 'utils/postToSlack';

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

  // Poll until completed
  while (true) {
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

    if (runStatus.status === 'completed') {
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
      throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
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

  await postToSlack(
    slackMessage,
    '#quote-requests-v2',
    process.env.SLACK_QUOTE_REQUESTS_WEBHOOK_URL!
  );
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

/**
 * 3. Main Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  console.log(`Starting quote request processing for deal ${dealId}`);

  try {
    await processWebhook(req.body);

    console.log(`✅ Quote request handler completed successfully for deal ${dealId}`);
  } catch (error: any) {
    console.error(`❌ Quote request handler failed for deal ${dealId}:`, error.message);
  }
}
