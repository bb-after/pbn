import axios from 'axios';
import { getDataSourceById } from './dataSource';
import { anthropicApiKey } from '../../config';

export async function getClaudeSentiment(keyword: string, dataSourceId: number) {
  try {
    const dataSource = await getDataSourceById(dataSourceId);
    const prompt = dataSource.prompt.replace('{keyword}', keyword);
    const engine = dataSource.model;
    const maxAnthropicTokens = 4000;

    if (!anthropicApiKey) {
      throw new Error('Missing Anthropic API Key in environment variables.');
    }

    try {
      const messages = [{ role: 'user', content: prompt }];

      console.log('Claude analyzing keyword:', keyword);

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: engine,
          max_tokens: maxAnthropicTokens,
          messages: messages,
          tools: [
            {
              name: 'web_search',
              description:
                'Search the web for current information about topics, trends, and market data',
              input_schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query',
                  },
                },
                required: ['query'],
              },
            },
          ],
        },
        {
          headers: {
            'x-api-key': anthropicApiKey,
            'content-type': 'application/json',
            'anthropic-version': '2024-10-22',
            'anthropic-beta': 'tools-2024-10-22',
          },
        }
      );

      console.log('Claude response for keyword:', keyword);
      const result = response.data.content[0].text || 'No Summary available';

      return {
        engine: dataSource.name,
        summary: result,
        model: engine,
      };
    } catch (error: any) {
      console.error('Anthropic API Error:', error.response?.data || error.message || error);
      throw new Error('Failed to fetch response from Anthropic API.');
    }
  } catch (error) {
    console.error('Error fetching data from Claude:', error);
    throw new Error('Failed to get Claude result');
  }
}
