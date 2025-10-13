import { NextApiRequest, NextApiResponse } from 'next';
import { analyzeKeywordWithEngines } from '../../utils/ai-engines';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Get user ID from token
const getUserFromToken = async (
  userToken: string
): Promise<{ id: number; name: string } | null> => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute('SELECT id, name FROM users WHERE user_token = ?', [
      userToken,
    ]);
    const users = rows as any[];
    return users.length > 0 ? { id: users[0].id, name: users[0].name } : null;
  } finally {
    await connection.end();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      keyword,
      clientName,
      selectedEngineIds,
      customPrompt,
      analysisType,
      intentCategory,
      userToken,
    } = req.body;

    if (
      !keyword ||
      !clientName ||
      !selectedEngineIds ||
      !Array.isArray(selectedEngineIds) ||
      !analysisType ||
      !intentCategory ||
      !userToken
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: keyword, clientName, selectedEngineIds, analysisType, intentCategory, userToken',
      });
    }

    // Get user ID from token
    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    console.log('=== GEO ANALYSIS API ===');
    console.log('Keyword:', keyword);
    console.log('Client:', clientName);
    console.log('Engine IDs:', selectedEngineIds);
    console.log('Analysis Type:', analysisType);
    console.log('Intent Category:', intentCategory);
    console.log('Custom Prompt:', customPrompt);
    console.log('User:', userInfo.name, `(ID: ${userInfo.id})`);
    console.log('=== STARTING ANALYSIS ===');

    const result = await analyzeKeywordWithEngines(
      keyword,
      clientName,
      selectedEngineIds,
      customPrompt,
      analysisType,
      intentCategory
    );

    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Results:', result.results.length, 'engines processed');

    // Save results to database
    try {
      const connection = await mysql.createConnection(dbConfig);

      // Save to new geo_check_results table
      await connection.execute(
        `INSERT INTO geo_check_results (
          user_id, keyword, analysis_type, intent_category, custom_prompt,
          selected_engine_ids, results, aggregated_insights, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userInfo.id,
          keyword,
          analysisType,
          intentCategory,
          customPrompt,
          JSON.stringify(selectedEngineIds),
          JSON.stringify(result.results),
          JSON.stringify(result.aggregatedInsights),
          result.timestamp,
        ]
      );

      // Also save to legacy geo_analysis_results table for backward compatibility
      await connection.execute(
        `INSERT INTO geo_analysis_results (
          user_id, client_name, keyword, analysis_type, intent_category, custom_prompt,
          results, aggregated_insights, selected_engine_ids, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userInfo.id,
          clientName,
          keyword,
          analysisType,
          intentCategory,
          customPrompt,
          JSON.stringify(result.results),
          JSON.stringify(result.aggregatedInsights),
          JSON.stringify(selectedEngineIds),
          result.timestamp,
        ]
      );

      await connection.end();
      console.log('Analysis results saved to database');
    } catch (dbError) {
      console.error('Failed to save analysis results:', dbError);
      // Continue without failing the request
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('GEO Analysis API Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
