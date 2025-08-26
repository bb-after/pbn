import OpenAI from 'openai';
import axios from 'axios';

// Constants
const modelType = process.env.NEXT_PUBLIC_GPT_ENGINE || 'claude-3-5-sonnet-20241022'; // Default to Claude 3.5 Sonnet
const mockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === '1';
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION === '1';
const maxTokens = 16000;
const maxAnthropicTokens = 8192;

export const getAnthropicApiKey = (): string => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Anthropic API Key in environment variables.');
  }
  return apiKey;
};

export async function getClientNameFromTranscript(transcript: string): Promise<string> {
  try {
    const apiKey = getAnthropicApiKey();
    const promptMessage = `Given the following transcript, identify and return only the client's name. If you can't determine a specific client name, return "Uncategorized".  Format the client name in bold: **Client Name**.\n\nTranscript:\n${transcript}\n\n`;
    const messages = [{ role: 'user', content: promptMessage }];
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-2',
        max_tokens: 100,
        messages: messages,
      },
      {
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
      }
    );

    console.log('Anthropic API Response:', response.data);
    const clientName = response.data.content[0].text.trim();
    const match = clientName.match(/\*\*(.*?)\*\*/);
    return match ? match[1] : 'Uncategorized';
  } catch (error: any) {
    console.error('Anthropic API Error:', error.response?.data || error.message || error);
    throw new Error('Failed to fetch response from Anthropic API.');
  }
}

// OpenAI Client Initialization
const getOpenAIClient = (() => {
  let openAIClient: OpenAI | undefined;

  return () => {
    if (!openAIClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      const organization = process.env.OPENAI_ORGANIZATION_ID;

      if (!apiKey || !organization) {
        throw new Error('Missing OpenAI API Key or Organization ID in environment variables.');
      }

      openAIClient = new OpenAI({ apiKey, organization });
    }
    return openAIClient;
  };
})();

// Function to Trim Keywords
const trimKeywords = (keywords: string[]) => keywords.map(keyword => keyword.trim());

// Content Trimming for Token Limit
const trimContentToFitTokenLimit = (contentArray: any[], maxTokens: number) => {
  let totalTokens = 0;
  const trimmedContent = [];

  for (const content of contentArray) {
    const tokens = content.content.split(/\s+/).length;
    if (totalTokens + tokens <= maxTokens) {
      trimmedContent.push(content);
      totalTokens += tokens;
    } else {
      const remainingTokens = maxTokens - totalTokens;
      const trimmedText = content.content.split(/\s+/).slice(0, remainingTokens).join(' ');
      trimmedContent.push({ ...content, content: trimmedText });
      break;
    }
  }
  return trimmedContent;
};

// OpenAI API Call
export const callOpenAI = async (inputData: any) => {
  if (mockData) {
    console.log('Mock mode enabled. Returning dummy text.');
    return `Mocked response based on input: ${JSON.stringify(inputData)}`;
  }

  const { engine = 'claude-3-5-sonnet-20241022', sourceContent = '', sourceUrl } = inputData;

  // Use customPrompt if provided, otherwise construct the default prompt
  let promptMessage;
  if (inputData.customPrompt) {
    promptMessage = inputData.customPrompt;
  } else {
    const keywords = Array.isArray(inputData.keywords) ? inputData.keywords : [inputData.keywords];
    const keywordsToExclude = Array.isArray(inputData.keywordsToExclude)
      ? inputData.keywordsToExclude
      : [inputData.keywordsToExclude];
    if (inputData.sourceContent && inputData.sourceContent.trim()) {
      promptMessage = `Using the following source content as reference, write an article approximately ${inputData.wordCount} words long, incorporating these keywords: "${keywords.join(', ')}". Avoid: "${keywordsToExclude.join(', ')}". Use a ${inputData.tone} tone.\n\nSource Content:\n${inputData.sourceContent}`;
    } else if (inputData.sourceUrl && inputData.sourceUrl.trim()) {
      promptMessage = `Using the article at this URL as reference (${inputData.sourceUrl}), write an article approximately ${inputData.wordCount} words long, incorporating these keywords: "${keywords.join(', ')}". Avoid: "${keywordsToExclude.join(', ')}". Use a ${inputData.tone} tone.`;
    } else {
      promptMessage = `Write an article approximately ${inputData.wordCount} words long, incorporating these keywords: "${keywords.join(', ')}". Avoid: "${keywordsToExclude.join(', ')}". Use a ${inputData.tone} tone.`;
    }
  }

  if (
    engine === 'gpt-5-mini' ||
    engine === 'gpt-5' ||
    engine === 'gpt-4o-mini' ||
    engine === 'gpt-4'
  ) {
    const gptMessage = trimContentToFitTokenLimit(
      [
        {
          role: 'system',
          content: `Write as a professional SEO expert fluent in ${inputData.language}.`,
        },
        { role: 'user', content: promptMessage },
      ],
      maxTokens
    );

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: engine,
        messages: gptMessage,
        temperature: engine == 'gpt-5' || engine == 'gpt-5-mini' ? 1 : 0.8,
      });

      console.log('OpenAI Response:', response.choices[0].message.content);
      return response.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenAI API Error:', error.message || error);
      throw new Error('Failed to fetch response from OpenAI API.');
    }
  } else if (engine.match(/claude-/)) {
    const anthropicApiKey = validateAnthropicKey();
    try {
      const apiKey = getAnthropicApiKey();
      const messages = [{ role: 'user', content: promptMessage }];
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: engine,
          max_tokens: maxAnthropicTokens,
          messages: messages,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
        }
      );

      console.log('Anthropic API Response:', response.data);
      return response.data.content[0].text;
    } catch (error: any) {
      console.error('Anthropic API Error:', error.response?.data || error.message || error);
      throw new Error('Failed to fetch response from Anthropic API.');
    }
  }

  throw new Error(`Unsupported AI engine: ${engine}`);
};

const validateAnthropicKey = () => {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) throw new Error('Missing Anthropic API Key in environment variables.');
  return anthropicApiKey;
};

// Rewrite Article with OpenAI
export const callOpenAIToRewriteArticle = async (content: string, inputData: any) => {
  const promptMessage = `Rewrite the following article to be unique, engaging, and conversational: "${content}"`;

  const { engine = 'gpt-4o-mini' } = inputData;

  if (engine === 'gpt-4o-mini' || engine === 'gpt-4') {
    const gptMessage = trimContentToFitTokenLimit(
      [
        { role: 'system', content: 'Act as a high-level SEO expert and copywriter.' },
        { role: 'user', content: promptMessage },
      ],
      maxTokens
    );

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: engine,
        messages: gptMessage,
        temperature: 0.8,
      });

      console.log('Rewritten Article (OpenAI):', response.choices[0].message.content);
      return response.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenAI API Error:', error.message || error);
      throw new Error('Failed to rewrite article with OpenAI API.');
    }
  } else if (engine.match(/claude-/)) {
    const anthropicApiKey = getAnthropicApiKey();
    const messages = [{ role: 'user', content: promptMessage }];

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: engine,
          max_tokens: maxAnthropicTokens,
          messages: messages,
        },
        {
          headers: {
            'x-api-key': anthropicApiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
        }
      );

      console.log('Rewritten Article (Claude):', response.data.content[0].text);
      return response.data.content[0].text;
    } catch (error: any) {
      console.error('Anthropic API Error:', error.response?.data || error.message || error);
      throw new Error('Failed to rewrite article with Claude API.');
    }
  } else {
    throw new Error(`Unsupported AI engine: ${engine}`);
  }
};

export const bulkReplaceLinks = (content: string): string => {
  if (!content || typeof content !== 'string') {
    console.error('Invalid content provided.');
    return content;
  }

  // Regex to match [Text](URL) pattern
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

  // Replace each match with the desired hyperlink format
  const updatedContent = content.replace(linkPattern, (match, text, url) => {
    return `<a href="${url}" target="_blank">${text}</a>`;
  });

  return updatedContent;
};

// Insert Backlinks
export const insertBacklinks = async (
  backlinkValues: string[],
  openAIResponse: string
): Promise<string> => {
  if (backlinkValues.length < 1) {
    console.log('No backlinks provided. Returning original response.');
    return openAIResponse || '';
  }

  const prompt = `Add the following backlinks into the content: ${backlinkValues.join(', ')}`;

  const gptMessage = trimContentToFitTokenLimit(
    [
      { role: 'user', content: openAIResponse },
      { role: 'user', content: prompt },
    ],
    maxTokens
  );

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: modelType,
      messages: gptMessage,
      temperature: modelType == 'gpt-5-mini' ? 1 : 0.8,
    });

    // Ensure `content` is a string or fallback to the original response
    const generatedContent = response.choices[0]?.message?.content || openAIResponse;

    // Call bulkReplaceLinks with a guaranteed string
    const hyperLinkReplacementText = bulkReplaceLinks(generatedContent);

    return hyperLinkReplacementText;
  } catch (error: any) {
    console.error('OpenAI API Error:', error.message || error);
    return openAIResponse || '';
  }
};

// Parse Title from Article
export const parseTitleFromArticle = (input: string): string => {
  const titleMatch = input.match(/<h1>(.*?)<\/h1>/) || input.match(/<title>(.*?)<\/title>/);
  return titleMatch ? titleMatch[1] : 'Untitled Article';
};

// Extract Backlink Array
export const getBacklinkArray = (inputData: any): string[] => {
  const backlinks = [];
  for (let i = 1; i <= 5; i++) {
    if (inputData[`backlink${i}`]) backlinks.push(inputData[`backlink${i}`].trim());
  }
  return backlinks;
};

export const callOpenAISuperstarVersion = async (inputData: any) => {
  var initialGptMessage = inputData.promptMessage;

  const gptMessage = trimContentToFitTokenLimit(initialGptMessage, maxTokens);
  console.log('.....', gptMessage);
  try {
    const openai = getOpenAIClient();
    const GPTRequest = async (message: any) => {
      const response = await openai.chat.completions.create({
        model: modelType,
        temperature: 1,
        messages: message,
      });

      return response;
    };

    const response = GPTRequest(gptMessage);
    const content = (await response).choices[0].message.content;

    // Second request to generate SEO-friendly blog title
    const seoTitleMessage = [
      { role: 'system', content: 'You are an assistant that generates SEO-friendly blog titles.' },
      {
        role: 'user',
        content: `Generate an SEO-friendly blog title for the following content: ${content}`,
      },
    ];

    const titleResponse = await GPTRequest(seoTitleMessage);
    const seoTitle = titleResponse.choices[0].message.content;

    return { content, seoTitle };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to fetch response from OpenAI API.');
  }
};

// Add this new function to fetch Google Doc content
export const fetchGoogleDocContent = async (docId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/google-docs/content?docId=${docId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Doc: ${response.statusText}`);
    }
    const data = await response.json();
    return data.content || '';
  } catch (error) {
    console.error('Error fetching Google Doc:', error);
    return '';
  }
};

// Add this enhanced function that can include document context
export const callOpenAIWithDocuments = async (inputData: any, documentIds: string[] = []) => {
  const { engine = 'gpt-4o-mini', maxTokens = 4000 } = inputData;
  const maxAnthropicTokens = 4000;

  // Fetch document contents if provided
  let documentContext = '';
  if (documentIds.length > 0) {
    console.log('Fetching document contents for assistant context...');
    const documentContents = await Promise.all(
      documentIds.map(async docId => {
        const content = await fetchGoogleDocContent(docId);
        return content ? `\n\n--- Document ${docId} ---\n${content}\n--- End Document ---\n` : '';
      })
    );
    documentContext = documentContents.join('');
  }

  // Create enhanced prompt with document context
  const promptMessage = documentContext
    ? `${inputData.prompt}\n\nPlease take into account the following documents:\n${documentContext}`
    : inputData.prompt;

  const enhancedInputData = {
    ...inputData,
    prompt: promptMessage,
  };

  // Use existing callOpenAI function with enhanced prompt
  return callOpenAI(enhancedInputData);
};

// Add this function to include public document URLs in prompts
export const callOpenAIWithPublicDocuments = async (
  inputData: any,
  documentUrls: string[] = []
) => {
  // Create document references for the prompt
  let documentContext = '';
  if (documentUrls.length > 0) {
    const documentList = documentUrls
      .map((url, index) => `Document ${index + 1}: ${url}`)
      .join('\n');

    documentContext = `\n\nPlease reference and analyze the following documents:\n${documentList}\n`;
  }

  // Create enhanced prompt with document URLs
  const promptMessage = documentContext
    ? `${inputData.prompt}${documentContext}`
    : inputData.prompt;

  const enhancedInputData = {
    ...inputData,
    prompt: promptMessage,
  };

  // Use existing callOpenAI function with enhanced prompt
  return callOpenAI(enhancedInputData);
};
