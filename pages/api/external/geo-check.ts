import { NextApiRequest, NextApiResponse } from 'next';
import { analyzeKeywordWithEngines } from '../../../utils/ai-engines';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Simple API key validation - you should store these in environment variables or database
const VALID_API_KEYS = process.env.EXTERNAL_API_KEYS?.split(',') || [];

// Validate API key
const validateApiKey = (apiKey: string): boolean => {
  return VALID_API_KEYS.includes(apiKey);
};

// Get or create external API user record
const getOrCreateExternalApiUser = async (
  externalUserId: string,
  externalUserName: string,
  applicationName: string,
  apiKey: string
): Promise<{ id: number; name: string }> => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Try to find existing external user
    const [existingRows] = await connection.execute(
      'SELECT id, external_user_name FROM external_api_users WHERE external_user_id = ? AND application_name = ?',
      [externalUserId, applicationName]
    );
    const existingUsers = existingRows as any[];

    if (existingUsers.length > 0) {
      // Update last seen and increment request count
      await connection.execute(
        'UPDATE external_api_users SET last_seen = NOW(), total_requests = total_requests + 1 WHERE id = ?',
        [existingUsers[0].id]
      );
      return { id: existingUsers[0].id, name: existingUsers[0].external_user_name };
    }

    // Create new external API user record
    const [result] = (await connection.execute(
      `INSERT INTO external_api_users (external_user_id, external_user_name, application_name, api_key_used, total_requests) 
       VALUES (?, ?, ?, ?, 1)`,
      [externalUserId, externalUserName, applicationName, apiKey]
    )) as any;

    return { id: result.insertId, name: externalUserName };
  } finally {
    await connection.end();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for actual API calls
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      apiKey,
      keyword,
      selectedEngineIds,
      customPrompt,
      analysisType = 'brand',
      clientName = 'Status Score External Call',
      intentCategory = 'general_overview',
      externalUserId,
      externalUserName,
      applicationName,
      callbackUrl, // Optional webhook URL to send results to
    } = req.body;

    // Validate required fields
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!validateApiKey(apiKey)) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    if (!keyword || !externalUserId || !externalUserName || !applicationName) {
      return res.status(400).json({
        error:
          'Missing required fields: keyword, externalUserId, externalUserName, applicationName',
      });
    }

    console.log('=== EXTERNAL GEO ANALYSIS API ===');
    console.log('Application:', applicationName);
    console.log('External User:', externalUserName, `(ID: ${externalUserId})`);
    console.log('Keyword:', keyword);
    console.log('Client Name:', clientName);
    console.log('Selected Engine IDs:', selectedEngineIds);
    console.log('Analysis Type:', analysisType);
    console.log('Intent Category:', intentCategory);
    console.log('Callback URL:', callbackUrl);
    console.log('=== STARTING ANALYSIS ===');

    // Get or create external API user record
    const userInfo = await getOrCreateExternalApiUser(
      externalUserId,
      externalUserName,
      applicationName,
      apiKey
    );

    // Run the analysis - will default to all active engines if selectedEngineIds is not provided
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
    let analysisId = null;
    try {
      const connection = await mysql.createConnection(dbConfig);

      // Save to new geo_check_results table (without user_id for external calls)
      const [geoCheckResult] = (await connection.execute(
        `INSERT INTO geo_check_results (
          user_id, keyword, analysis_type, intent_category, custom_prompt,
          selected_engine_ids, results, aggregated_insights, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          null, // No user_id for external API calls
          keyword,
          analysisType,
          intentCategory,
          customPrompt,
          JSON.stringify(selectedEngineIds || []),
          JSON.stringify(result.results),
          JSON.stringify(result.aggregatedInsights),
          result.timestamp,
        ]
      )) as any;

      analysisId = geoCheckResult.insertId;

      // Also save to legacy geo_analysis_results table for backward compatibility
      await connection.execute(
        `INSERT INTO geo_analysis_results (
          external_api_user_id, client_name, keyword, analysis_type, intent_category, custom_prompt,
          results, aggregated_insights, selected_engine_ids, timestamp, external_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userInfo.id,
          clientName,
          keyword,
          analysisType,
          intentCategory,
          customPrompt,
          JSON.stringify(result.results),
          JSON.stringify(result.aggregatedInsights),
          JSON.stringify(selectedEngineIds || []),
          result.timestamp,
          JSON.stringify({
            applicationName,
            externalUserId,
            callbackUrl,
            apiVersion: '1.0',
          }),
        ]
      );

      await connection.end();
      console.log('External analysis results saved to database with ID:', analysisId);
    } catch (dbError) {
      console.error('Failed to save analysis results:', dbError);
      // Continue without failing the request
    }

    // Prepare response
    const response = {
      success: true,
      analysisId,
      timestamp: result.timestamp,
      keyword,
      clientName,
      applicationName,
      externalUserId,
      results: result.results,
      aggregatedInsights: result.aggregatedInsights,
      metadata: {
        enginesUsed: result.results.length,
        enginesRequested: selectedEngineIds ? selectedEngineIds.length : 'all available',
        analysisType,
        intentCategory,
      },
    };

    // Send callback notification if URL provided
    if (callbackUrl) {
      try {
        const callbackResponse = await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PBN-GeoCheck-API/1.0',
          },
          body: JSON.stringify({
            event: 'analysis_complete',
            analysisId,
            keyword,
            clientName,
            externalUserId,
            timestamp: result.timestamp,
            success: true,
          }),
        });

        console.log('Callback notification sent:', callbackResponse.status);
      } catch (callbackError) {
        console.error('Failed to send callback notification:', callbackError);
        // Don't fail the main request for callback failures
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('External GEO Analysis API Error:', error);

    // Send error callback if URL provided
    const { callbackUrl, externalUserId, keyword } = req.body;
    if (callbackUrl) {
      try {
        await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PBN-GeoCheck-API/1.0',
          },
          body: JSON.stringify({
            event: 'analysis_failed',
            externalUserId,
            keyword,
            timestamp: new Date().toISOString(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        });
      } catch (callbackError) {
        console.error('Failed to send error callback:', callbackError);
      }
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
