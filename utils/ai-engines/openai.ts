import OpenAI from 'openai';
import { getDataSourceById } from './dataSource';
import { openAIApiKey, openAIOrganizationId } from '../../config';

const getOpenAIClient: () => OpenAI = (() => {
  let openAIClient: OpenAI | undefined;

  return () => {
    if (!openAIClient) {
      if (!openAIApiKey || openAIApiKey === 'none') {
        throw new Error('OPENAI_API_KEY is not set');
      }

      openAIClient = new OpenAI({
        apiKey: openAIApiKey,
        organization: openAIOrganizationId,
        dangerouslyAllowBrowser: false,
      });
    }
    return openAIClient;
  };
})();

export async function getOpenAISentiment(
  keyword: string,
  dataSourceId: number,
  additionalInstructions?: string,
  analysisType?: 'brand' | 'individual',
  intentCategory?: string,
  customPrompt?: string
) {
  try {
    const dataSource = await getDataSourceById(dataSourceId);
    const openai = getOpenAIClient();

    // Use custom prompt if provided, otherwise use default data source prompt
    let prompt = customPrompt || dataSource.prompt.replace('{keyword}', keyword);

    // Only add additional instructions if not already included in custom prompt
    if (!customPrompt && additionalInstructions && additionalInstructions.trim()) {
      prompt += `\n\nAdditional specific instructions: ${additionalInstructions.trim()}`;
    }

    console.log('OpenAI analyzing keyword:', keyword);

    // Models that use max_completion_tokens instead of max_tokens
    const newParameterModels = ['gpt-5', 'o1-preview', 'o1-mini'];
    const usesNewParameter = newParameterModels.includes(dataSource.model);

    const completionParams: any = {
      model: dataSource.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    // Add the appropriate token parameter based on the model
    if (usesNewParameter) {
      completionParams.max_completion_tokens = 2000;
    } else {
      completionParams.max_tokens = 2000;
      completionParams.temperature = 0.8; // o1 models don't support temperature
    }

    const response = await openai.chat.completions.create(completionParams);

    const resultText = response.choices[0]?.message?.content?.trim() || 'No response';
    console.log('OpenAI response for keyword:', keyword, resultText.substring(0, 100) + '...');

    return {
      engine: dataSource.name,
      summary: resultText,
      model: dataSource.model,
    };
  } catch (error) {
    console.error('Error fetching data from OpenAI:', error);
    throw new Error('Failed to get OpenAI result');
  }
}
