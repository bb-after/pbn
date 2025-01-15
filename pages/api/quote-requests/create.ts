import type { NextApiRequest, NextApiResponse } from 'next';
import { postToSlack } from 'utils/postToSlack';

type DealData = {
    hs_object_id: Number;
    keyword: string;
    referral: string;
    timeline: string;
    location: string;
    notes_on_quotes: string;
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
    text = text.replace(/```[\s\S]*?```/g, (match) => {
      return '```' + match.slice(3, -3).trim() + '```';
    });
  
    return text;
  }
  
/**
 * 1. HubSpot Files API: Retrieve Private File Paths
 */
async function getHubSpotFilePaths(fileIds: string[]): Promise<string[]> {
  const filePaths: string[] = [];
  for (const fileId of fileIds) {
    try {
      // Example: https://developers.hubspot.com/docs/api/files/files
      const response = await fetch(
        `https://api.hubapi.com/files/v3/files/${fileId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        console.error('Error fetching file:', await response.text());
        // Decide whether to throw or just skip this file
        continue;
      }
      const fileData = await response.json();
      // Adjust property names as needed—this is hypothetical
      // Typically you might see { url, hiddenUrl, ... }
      if (fileData.url) {
        filePaths.push(fileData.url);
      }
    } catch (err) {
      console.error('Error in getHubSpotFilePaths:', err);
      // Could throw or just log
    }
  }
  return filePaths;
}

// Function to create the Slack message with deal data
function createSlackMessage(assistantReply: string, dealData: DealData): string {
    const dealSummary = `
  *New Quote Request Details:*
  • *HubSpot Deal:* https://app.hubspot.com/contacts/24444832/record/0-3/${dealData.hs_object_id}
  • *Keywords:* ${dealData.keyword || 'N/A'}
  • *Referral:* ${dealData.referral || 'N/A'}
  • *Timeline:* ${dealData.timeline || 'N/A'}
  • *Location:* ${dealData.location || 'N/A'}
  • *Additional Notes:* ${dealData.notes_on_quotes || 'N/A'}
  
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
    const createRunResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        method: 'POST',
        headers: {
          'OpenAI-Beta': 'assistants=v2',
          Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistant_id: assistantId,
        }),
      }
    );
  
    if (!createRunResponse.ok) {
      throw new Error('Failed to create run');
    }
  
    const runData = await createRunResponse.json();
    const runId = runData.id;
  
    // Poll the run status until it's completed
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
  
      if (!runStatusResponse.ok) {
        throw new Error('Failed to check run status');
      }
  
      const runStatus = await runStatusResponse.json();
      if (runStatus.status === 'completed') {
        // Get the latest message
        const messagesResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/messages?run_id=${runId}`,
          {
            headers: {
              'OpenAI-Beta': 'assistants=v2',
              Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`,
            },
          }
        );
  
        if (!messagesResponse.ok) {
          throw new Error('Failed to fetch messages');
        }
  
        const messages = await messagesResponse.json();
        // Get the first message (most recent) from the assistant
        const lastAssistantMessage = messages.data.find(
          (message: any) => message.role === 'assistant'
        );
        return lastAssistantMessage?.content[0]?.text?.value || 'No response received';
      } else if (runStatus.status === 'failed') {
        throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
  
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      role: "user",
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
      console.error('OpenAI Send Message error:', errorText);
      throw new Error('Failed to send message to thread');
    }
  }
  
  

/**
 * 3. Main Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // (Optional) check your custom webhook secret from HubSpot or any source
    const hubspotSecret = req.headers['hubspot_quote_request_webhook_secret'];
    if (!hubspotSecret || hubspotSecret !== process.env.HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1) Extract deal data
    const dealData: DealData = {
        hs_object_id: req.body.hs_object_id,
        keyword: req.body.keyword,
        referral: req.body.referral,
        timeline: req.body.timeline,
        location: req.body.location,
        notes_on_quotes: req.body.notes_on_quotes,
        };
      
    // Before creating the screenshot paths, filter out empty values
    const screenshotFileIds = [
        req.body.quote_request_image_1, 
        req.body.quote_attachment__2, 
        req.body.quote_attachment__3
    ].filter(Boolean);  // This removes null, undefined, empty strings, and falsy values
    
    console.log('screenshotFileIds', screenshotFileIds);
    // 2) Retrieve screenshot paths from HubSpot (if any screenshots are private)
    let screenshotPaths: string[] = [];
    if (screenshotFileIds.length > 0) {
      screenshotPaths = await getHubSpotFilePaths(screenshotFileIds);
    }
    

    // Format screenshot info for the prompt
    const screenshotSection = screenshotPaths.length
      ? screenshotPaths
          .map((url, i) => `Screenshot #${i + 1}: ${url}`)
          .join('\n')
      : 'No screenshots available';

    // 3) Construct the user message (prompt) for the assistant
    const userMessage = `
Here is the information for the quote request we need to generate:
Keyword(s): ${dealData.keyword ?? 'N/A'}
Referral: ${dealData.referral ?? 'N/A'}
Timeline: ${dealData.timeline ?? 'N/A'}
Location: ${dealData.location ?? 'N/A'}
Notes on Quotes: ${dealData.notes_on_quotes ?? 'N/A'}

Screenshots of Search Result Ranking:
${screenshotSection}
`;


    // Assistant and conversation IDs from env or config
    const assistantId = process.env.OPENAI_ASSISTANT_ID || 'YOUR_ASSISTANT_ID';
    const threadId = process.env.OPENAI_THREAD_ID; // optional


    // Send the message to the thread
    await sendMessageToThread({
        threadId: threadId || '',
        userMessage: userMessage.trim(),
        });
      

    const assistantReply = await createThreadRun({
        threadId: threadId || '',
        assistantId,
    });

    // Format the message for Slack with deal data
    const slackMessage = createSlackMessage(assistantReply, dealData);


    // 5) Post the assistant's reply to Slack
    const slackChannel = '#quote-requests-v2'; // or #channel-name
    await postToSlack(slackMessage, slackChannel, process.env.SLACK_QUOTE_REQUESTS_WEBHOOK_URL);
    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Quote request processed.',
      assistantReply: assistantReply,
    });
  } catch (error: any) {
    console.error('Error in /quote-requests/create:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
