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
        },
        {
          headers: {
            'x-api-key': anthropicApiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
            // 'anthropic-beta': 'tools-2024-10-22',
          },
        }
      );

      console.log('Claude response for keyword:', keyword);
      console.log('Full Claude response:', JSON.stringify(response.data, null, 2));

      // Handle multiple content blocks and tool use
      let result = '';
      if (response.data.content && Array.isArray(response.data.content)) {
        for (const content of response.data.content) {
          if (content.type === 'text') {
            result += content.text + '\n';
          }
          // If there are tool use blocks, we might need to handle them differently
        }
      }

      result = result.trim() || 'No Summary available';

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
