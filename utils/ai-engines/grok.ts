import axios from 'axios';
import { getDataSourceById } from './dataSource';
import { grokApiKey } from '../../config';

export async function getGrokSentiment(
  keyword: string,
  dataSourceId: number,
  additionalInstructions?: string,
  analysisType?: 'brand' | 'individual',
  intentCategory?: string,
  customPrompt?: string
) {
  try {
    const dataSource = await getDataSourceById(dataSourceId);

    // Use custom prompt if provided, otherwise use default data source prompt
    let prompt = customPrompt || dataSource.prompt.replace('{keyword}', keyword);

    // Only add additional instructions if not already included in custom prompt
    if (!customPrompt && additionalInstructions && additionalInstructions.trim()) {
      prompt += `\n\nAdditional specific instructions: ${additionalInstructions.trim()}`;
    }

    if (!grokApiKey) {
      throw new Error('XAI_API_KEY or GROK_API_KEY is not set in the environment variables.');
    }

    console.log('Grok analyzing keyword:', keyword);

    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: dataSource.model,
        stream: false,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${grokApiKey}`,
        },
      }
    );

    const generatedText = response.data?.choices?.[0]?.message?.content || 'No response available';
    console.log('Grok response for keyword:', keyword);

    return {
      engine: dataSource.name,
      summary: generatedText,
      model: dataSource.model,
    };
  } catch (error: any) {
    console.error('Error fetching data from Grok:', error);

    // Enhanced error reporting for debugging
    if (error.response) {
      console.error('Grok API Response Status:', error.response.status);
      console.error('Grok API Response Data:', error.response.data);
      console.error('Grok API Response Headers:', error.response.headers);

      if (error.response.status === 403) {
        const responseData = error.response.data;
        if (responseData?.error?.includes('credits')) {
          throw new Error(
            'Grok API: No credits available. Please add credits at https://console.x.ai/'
          );
        }
        throw new Error(
          `Grok API authentication failed. Status: 403. Response: ${JSON.stringify(responseData)}`
        );
      } else if (error.response.status === 401) {
        throw new Error('Grok API key is invalid or expired');
      } else {
        throw new Error(
          `Grok API error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
      }
    } else if (error.request) {
      throw new Error('Grok API request failed - no response received');
    } else {
      throw new Error(`Grok request setup error: ${error.message}`);
    }
  }
}
