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

// Choose token param shape based on model family and API type.
function tokenParams(model: string, isResponsesApi = false) {
  if (NEW_PARAM_MODELS.has(model)) {
    // Responses API uses max_output_tokens, Chat API uses max_completion_tokens
    // Increase tokens for GPT-5 to account for reasoning + response
    const maxTokens = model === 'gpt-5' ? 4000 : 2000;
    return isResponsesApi
      ? { max_output_tokens: maxTokens as number }
      : { max_completion_tokens: maxTokens as number };
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

    console.log(`OpenAI analyzing keyword: ${keyword}`);
    console.log(`model? ${dataSource.model}`);

    // Use direct HTTP API for Responses API (more up-to-date than SDK)
    try {
      const responsesApiPayload = {
        model: dataSource.model,
        input: prompt,
        ...tokenParams(dataSource.model, true), // true = isResponsesApi
        ...maybeReasoning(dataSource.model),
      };

      console.log(
        `Trying Responses API with payload:`,
        JSON.stringify(responsesApiPayload, null, 2)
      );

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          ...(openAIOrganizationId ? { 'OpenAI-Organization': openAIOrganizationId } : {}),
        },
        body: JSON.stringify(responsesApiPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { raw_error: errorText };
        }

        console.log(`Responses API failed with ${response.status}: ${response.statusText}`);
        console.log(`Error details:`, JSON.stringify(errorDetails, null, 2));

        throw new Error(
          `Responses API failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorDetails)}`
        );
      }

      let data = await response.json();

      console.log(`Responses API initial data:`, JSON.stringify(data, null, 2));

      // Handle incomplete responses by polling
      if (data.status === 'in_progress' || data.status === 'incomplete') {
        console.log(`Response status: ${data.status}, polling for completion...`);

        const responseId = data.id;
        const maxPollingAttempts = 30; // 30 seconds max

        for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

          const pollResponse = await fetch(`https://api.openai.com/v1/responses/${responseId}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
              ...(openAIOrganizationId ? { 'OpenAI-Organization': openAIOrganizationId } : {}),
            },
          });

          if (!pollResponse.ok) {
            console.log(`Polling failed on attempt ${attempt}: ${pollResponse.status}`);
            break;
          }

          data = await pollResponse.json();
          console.log(`Polling attempt ${attempt}: status = ${data.status}`);

          if (data.status === 'completed') {
            console.log(`Response completed after ${attempt} polling attempts`);
            break;
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            console.log(`Response failed with status: ${data.status}`);
            break;
          }
        }
      }

      console.log(`Final Responses API data:`, JSON.stringify(data, null, 2));

      // Check final status
      if (data.status !== 'completed') {
        throw new Error(`Response not completed. Final status: ${data.status}`);
      }

      // Extract text from the nested response structure
      let resultText = 'No response';
      if (data.output && Array.isArray(data.output)) {
        // Find the message output (not reasoning)
        const messageOutput = data.output.find((item: any) => item.type === 'message');
        if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
          // Find the text content
          const textContent = messageOutput.content.find(
            (item: any) => item.type === 'output_text'
          );
          if (textContent && textContent.text) {
            resultText = textContent.text;
          }
        } else {
          // No message output found - check if we only have reasoning
          const reasoningOutput = data.output.find((item: any) => item.type === 'reasoning');
          if (reasoningOutput) {
            console.log('Warning: Only reasoning output found, no message content generated');
            console.log('Reasoning output:', JSON.stringify(reasoningOutput, null, 2));

            // Check if reasoning has a summary or content we can use
            if (reasoningOutput.summary && reasoningOutput.summary.length > 0) {
              resultText = `Reasoning summary: ${reasoningOutput.summary.join(' ')}`;
            } else {
              resultText =
                'GPT-5 completed reasoning but generated no response text. Try increasing max_output_tokens or adjusting the prompt.';
            }
          }
        }
      }

      console.log(`Extracted text length: ${resultText.length} characters`);

      console.log(
        `OpenAI response (Responses API): model=${dataSource.model} req=${data._request_id ?? data.id ?? 'n/a'} ` +
          `keyword="${keyword}" preview="${resultText.slice(0, 100)}..."`
      );

      return {
        engine: dataSource.name,
        summary: resultText,
        model: dataSource.model,
      };
    } catch (responsesError: any) {
      console.log(
        `Responses API error: ${responsesError.message}, falling back to Chat Completions`
      );

      // Fallback: Chat Completions API via SDK
      const response = await openai.chat.completions.create({
        model: dataSource.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...tokenParams(dataSource.model, false), // false = not ResponsesApi
      });

      const resultText = response.choices[0]?.message?.content ?? 'No response';

      console.log(
        `OpenAI response (Chat API fallback): model=${dataSource.model} req=${response.id ?? 'n/a'} ` +
          `keyword="${keyword}" preview="${resultText.slice(0, 100)}..."`
      );

      return {
        engine: dataSource.name,
        summary: resultText,
        model: dataSource.model,
      };
    }
  } catch (error) {
    console.error('Error fetching data from OpenAI:', error);
    throw new Error('Failed to get OpenAI result');
  }
}
