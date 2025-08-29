import axios from 'axios';
import { getDataSourceById } from './dataSource';
import { perplexityApiKey } from '../../config';

export async function searchPerplexity(keyword: string, dataSourceId: number) {
  try {
    const dataSource = await getDataSourceById(dataSourceId);
    const prompt = dataSource.prompt.replace('{keyword}', keyword);

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not set in environment variables.');
    }

    console.log('Perplexity analyzing keyword:', keyword);

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: dataSource.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data?.choices?.[0]?.message?.content || 'No response available';
    console.log('Perplexity response for keyword:', keyword);

    return {
      engine: 'Perplexity',
      summary: result,
      model: dataSource.model,
    };
  } catch (error) {
    console.error('Error fetching data from Perplexity:', error);
    throw new Error('Failed to get Perplexity result');
  }
}
