import type { NextApiRequest, NextApiResponse } from 'next';
import { postToSlack } from 'utils/postToSlack';

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

/**
 * 2. OpenAI Assistants API: Send a message
 *    Reference: https://platform.openai.com/docs/assistants/overview
 *    
 *    Key points:
 *    - You must already have created an Assistant (so you have the `assistant_id`).
 *    - Optionally, you may pass a `conversation_id` to continue or retrieve a specific conversation.
 *    - Body includes your user messages. The API returns the assistant’s reply.
 */
async function sendMessageToOpenAIAssistant({
  assistantId,
  conversationId,
  userMessage,
}: {
  assistantId: string;
  conversationId?: string;
  userMessage: string;
}): Promise<string> {
  // The typical endpoint (in preview) is:
  // POST https://api.openai.com/v1/assistants/{assistant_id}/messages
  // with a JSON body that includes your conversation and user input.

  const url = `https://api.openai.com/v1/assistants/${assistantId}/messages`;

  const payload = {
    // If you have a conversation ID, include it:
    conversation_id: conversationId,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_QUOTE_REQUEST_API_KEY_ID}`, // Ensure secrecy
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Assistants API error:', errorText);
    throw new Error('Failed to get response from OpenAI Assistants API');
  }

  const data = await response.json();
  /**
   * The response shape (as of early preview) might look something like:
   * {
   *   "id": "...",
   *   "object": "assistant.message",
   *   "created": 1686801234,
   *   "choices": [
   *     {
   *       "index": 0,
   *       "message": {
   *         "role": "assistant",
   *         "content": "..."
   *       }
   *     }
   *   ]
   * }
   */
  const assistantContent =
    data?.choices?.[0]?.message?.content ?? 'No content returned';

  return assistantContent;
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

    // 1) Extract data from HubSpot's payload
    //    Adjust names for real property keys
    const {
      keyword,
      referral,
      timeline,
      location,
      notes_on_quotes,
      screenshotFileIds,
    } = req.body;

    // 2) Retrieve file paths from HubSpot (if any screenshots are private)
    let screenshotPaths: string[] = [];
    if (Array.isArray(screenshotFileIds) && screenshotFileIds.length > 0) {
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
Keyword(s): ${keyword ?? 'N/A'}
Referral: ${referral ?? 'N/A'}
Timeline: ${timeline ?? 'N/A'}
Location: ${location ?? 'N/A'}
Notes on Quotes: ${notes_on_quotes ?? 'N/A'}

Screenshots of Search Result Ranking:
${screenshotSection}
`;

    // Assistant and conversation IDs from env or config
    const assistantId = process.env.OPENAI_ASSISTANT_ID || 'YOUR_ASSISTANT_ID';
    const conversationId = process.env.OPENAI_CONVERSATION_ID; // optional

    // 4) Send the message to the Assistants API
    const assistantReply = await sendMessageToOpenAIAssistant({
      assistantId,
      conversationId,
      userMessage: userMessage.trim(),
    });

    // 5) Post the assistant's reply to Slack
    const slackChannel = '#quote-requests-v2'; // or #channel-name
    await postToSlack(assistantReply, slackChannel);
    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Quote request processed.',
      assistantReply,
    });
  } catch (error: any) {
    console.error('Error in /quote-requests/create:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
