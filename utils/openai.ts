import OpenAI from 'openai';
import axios from 'axios';

// Constants
const modelType = process.env.NEXT_PUBLIC_GPT_ENGINE || 'gpt-4'; // Default to GPT-4
const mockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === '1';
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION === '1';
const maxTokens = 16000;
const maxAnthropicTokens = 8192;

const getAnthropicApiKey = (): string => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Anthropic API Key in environment variables.');
  }
  return apiKey;
};


// OpenAI Client Initialization
const getOpenAIClient = (() => {
  let openAIClient: OpenAI | undefined;

  return () => {
    if (!openAIClient) {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      const organization = process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION_ID;

      if (!apiKey || !organization) {
        throw new Error('Missing OpenAI API Key or Organization ID in environment variables.');
      }

      openAIClient = new OpenAI({ apiKey, organization });
    }
    return openAIClient;
  };
})();

// Function to Trim Keywords
const trimKeywords = (keywords: string[]) => keywords.map((keyword) => keyword.trim());

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

  const { engine = 'gpt-4o-mini', sourceContent = '', sourceUrl } = inputData;

  const keywords = Array.isArray(inputData.keywords) ? inputData.keywords : [inputData.keywords];
  const keywordsToExclude = Array.isArray(inputData.keywordsToExclude) ? inputData.keywordsToExclude : [inputData.keywordsToExclude];

  const promptMessage = `Write an article approximately ${inputData.wordCount} words long, incorporating these keywords: "${keywords.join(', ')}". Avoid: "${keywordsToExclude.join(', ')}". Use a ${inputData.tone} tone.`;

  if (engine === 'gpt-4o-mini' || engine === 'gpt-4') {
    const gptMessage = trimContentToFitTokenLimit(
      [
        { role: 'system', content: `Write as a professional SEO expert fluent in ${inputData.language}.` },
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

      console.log('OpenAI Response:', response.choices[0].message.content);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error.message || error);
      throw new Error('Failed to fetch response from OpenAI API.');
    }
  } else if (engine.match(/claude-/)) {
    const anthropicApiKey = validateAnthropicKey();
    try {
      const apiKey = getAnthropicApiKey();
      const messages = [
        { role: 'user', content: promptMessage },
      ];
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: engine,
          max_tokens: maxAnthropicTokens,
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
    const gptMessage = trimContentToFitTokenLimit([
      { role: 'system', content: 'Act as a high-level SEO expert and copywriter.' },
      { role: 'user', content: promptMessage },
    ], maxTokens);

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: engine,
        messages: gptMessage,
        temperature: 0.8,
      });

      console.log('Rewritten Article (OpenAI):', response.choices[0].message.content);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error.message || error);
      throw new Error('Failed to rewrite article with OpenAI API.');
    }
  } else if (engine.match(/claude-/)) {
    const anthropicApiKey = getAnthropicApiKey();
    const messages = [
      { role: 'user', content: promptMessage },
    ];

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
    console.error("Invalid content provided.");
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
export const insertBacklinks = async (backlinkValues: string[], openAIResponse: string): Promise<string> => {
  if (backlinkValues.length < 1) {
    console.log('No backlinks provided. Returning original response.');
    return openAIResponse || "";
  }

  const prompt = `Add the following backlinks into the content: ${backlinkValues.join(', ')}`;

  const gptMessage = trimContentToFitTokenLimit([
    { role: 'user', content: openAIResponse },
    { role: 'user', content: prompt },
  ], maxTokens);

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: modelType,
      messages: gptMessage,
      temperature: 0.8,
    });

    // Ensure `content` is a string or fallback to the original response
    const generatedContent = response.choices[0]?.message?.content || openAIResponse;

    // Call bulkReplaceLinks with a guaranteed string
    const hyperLinkReplacementText = bulkReplaceLinks(generatedContent);

    return hyperLinkReplacementText;
  } catch (error: any) {
    console.error('OpenAI API Error:', error.message || error);
    return openAIResponse || "";
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

