import OpenAI from 'openai';
import { getDataSourceById } from './dataSource';
import { openAIApiKey, openAIOrganizationId } from '../../config';
type AnalysisType = 'brand' | 'individual';

const NEW_PARAM_MODELS = new Set(['gpt-5', 'o1-preview', 'o1-mini']);
const REASONING_MODELS = new Set(['gpt-5']); // o1* doesn't use reasoning.effort

const getOpenAIClient: () => OpenAI = (() => {
  let client: OpenAI | undefined;
  return () => {
    if (!client) {
      if (!openAIApiKey || openAIApiKey === 'none') {
        throw new Error('OPENAI_API_KEY is not set');
      }
      client = new OpenAI({
        apiKey: openAIApiKey,
        organization: openAIOrganizationId,
      });
    }
    return client;
  };
})();

// Choose token param shape based on model family.
function tokenParams(model: string) {
  if (NEW_PARAM_MODELS.has(model)) {
    return { max_completion_tokens: 2000 as number };
  }
  return { max_tokens: 2000 as number, temperature: 0.8 as number };
}

function maybeReasoning(model: string) {
  if (REASONING_MODELS.has(model)) {
    return { reasoning: { effort: 'medium' as const } };
  }
  return {};
}

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
    // const openai = getOpenAIClient();
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION_ID,
    });

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

    console.log('model?', dataSource.model);

    /*
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
    */

    // const resp = await openai.responses.create({
    //   model: dataSource.model,
    //   input: prompt,                       // no messages[] needed here
    //   ...(usesNewParameter ? { max_completion_tokens: 2000 } : { max_tokens: 2000, temperature: 0.8 }),
    //   reasoning: { effort: "medium" },     // optional but recommended for GPT-5
    // });
    // const resultText = resp.output_text ?? "No response";

    // Primary path: Responses API (recommended for GPT-5 / o-series)
    const resp = await openai.responses.create({
      model: dataSource.model,
      input: prompt,
      ...tokenParams(dataSource.model),
      ...maybeReasoning(dataSource.model),
    });

    const resultText = resp.output_text ?? 'No response';

    // Minimal, useful diagnostics
    // eslint-disable-next-line no-console
    console.log(
      `OpenAI response: model=${dataSource.model} req=${resp._request_id ?? 'n/a'} ` +
        `keyword="${keyword}" preview="${resultText.slice(0, 100)}..."`
    );

    // console.log('OpenAI response for keyword:', keyword, resultText.substring(0, 100) + '...');

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
