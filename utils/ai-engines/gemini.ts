import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDataSourceById } from './dataSource';
import { geminiApiKey } from '../../config';

const getGeminiClient = (() => {
  let genAIClient: GoogleGenerativeAI | undefined;

  return () => {
    if (!genAIClient) {
      if (!geminiApiKey) {
        throw new Error(
          'Google Gemini API key is not set. Please set GOOGLE_GEMINI_API_KEY in your environment variables. Get your API key from https://makersuite.google.com/app/apikey'
        );
      }

      // Validate API key format (Google AI Studio keys start with AIzaSy)
      if (!geminiApiKey.startsWith('AIzaSy')) {
        throw new Error(
          'Invalid Google Gemini API key format. API keys should start with "AIzaSy". Get a valid key from https://makersuite.google.com/app/apikey'
        );
      }

      genAIClient = new GoogleGenerativeAI(geminiApiKey);
    }
    return genAIClient;
  };
})();

export async function getGeminiSentiment(
  keyword: string,
  dataSourceId: number,
  additionalInstructions?: string,
  analysisType?: 'brand' | 'individual',
  intentCategory?: string,
  customPrompt?: string
) {
  try {
    const dataSource = await getDataSourceById(dataSourceId);
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: dataSource.model });

    // Use custom prompt if provided, otherwise use default data source prompt
    let prompt = customPrompt || dataSource.prompt.replace('{keyword}', keyword);

    // Only add additional instructions if not already included in custom prompt
    if (!customPrompt && additionalInstructions && additionalInstructions.trim()) {
      prompt += `\n\nAdditional specific instructions: ${additionalInstructions.trim()}`;
    }

    console.log('Gemini analyzing keyword:', keyword);

    const result = await model.generateContent(prompt);
    const generatedText = result.response.text();

    console.log('Gemini response for keyword:', keyword);

    return {
      engine: dataSource.name,
      summary: generatedText,
      model: dataSource.model,
    };
  } catch (error: any) {
    console.error('Error fetching data from Gemini:', error);

    // Provide more specific error messages
    if (error.message?.includes('API key')) {
      throw new Error(
        'Gemini API key is invalid or not configured. Please get a valid API key from https://makersuite.google.com/app/apikey'
      );
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      throw new Error('Gemini API quota exceeded or billing not enabled');
    } else if (error.message?.includes('model')) {
      throw new Error('Gemini model not found or not accessible with current API key');
    }

    throw new Error(`Failed to get Gemini result: ${error.message || 'Unknown error'}`);
  }
}
