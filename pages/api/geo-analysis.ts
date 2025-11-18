import { NextApiRequest, NextApiResponse } from 'next';
import { analyzeKeywordWithEngines } from '../../utils/ai-engines';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Authenticate user from JWT token
const authenticateUser = async (req: NextApiRequest): Promise<{ id: number; name: string; email: string } | null> => {
  try {
    const token = req.cookies.auth_token;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
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
    } = req.body;

    if (
      !keyword ||
      !clientName ||
      !selectedEngineIds ||
      !Array.isArray(selectedEngineIds) ||
      selectedEngineIds.length === 0 ||
      !analysisType ||
      !intentCategory
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: keyword, clientName, selectedEngineIds, analysisType, intentCategory',
      });
    }

    // Authenticate user from JWT token
    const userInfo = await authenticateUser(req);
    if (!userInfo) {
      return res.status(401).json({ error: 'Authentication required' });
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

      // Save to geo_analysis_results table
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
