import { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { executeScheduledAnalysis } from '../../scripts/scheduledGeoAnalysis';

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
    const [rows] = await connection.execute('SELECT id, name FROM users WHERE user_token = ? AND is_active = 1', [
      userToken,
    ]);
    const users = rows as any[];
    return users.length > 0 ? { id: users[0].id, name: users[0].name } : null;
  } finally {
    await connection.end();
  }
};

// Get scheduled analysis by ID
const getScheduledAnalysis = async (id: number, userId: number): Promise<any | null> => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        gsa.id, gsa.user_id, u.name as user_name, gsa.client_name, gsa.keyword, 
        gsa.analysis_type, gsa.intent_category, gsa.custom_prompt, gsa.selected_engine_ids, 
        gsa.frequency, gsa.day_of_week, gsa.day_of_month, gsa.time_of_day, gsa.timezone, 
        gsa.is_active, gsa.last_run_at, gsa.next_run_at, gsa.run_count
      FROM geo_scheduled_analyses gsa
      LEFT JOIN users u ON gsa.user_id = u.id
      WHERE gsa.id = ? AND gsa.user_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    let parsedEngineIds;
    try {
      // Handle different formats that might be stored
      const engineIdsValue = String(row.selected_engine_ids); // Convert to string first

      if (typeof engineIdsValue === 'string') {
        // Try to parse as JSON first
        try {
          parsedEngineIds = JSON.parse(engineIdsValue);
        } catch {
          // If that fails, try to clean up the string and parse again
          try {
            const cleanedString = engineIdsValue
              .replace(/\s/g, '') // Remove all spaces
              .replace(/^\[/, '[') // Ensure proper array format
              .replace(/\]$/, ']');
            parsedEngineIds = JSON.parse(cleanedString);
          } catch {
            // If cleaning doesn't work, try extracting numbers with regex
            const matches = engineIdsValue.match(/\d+/g);
            parsedEngineIds = matches ? matches.map(Number) : [];
            console.warn(`Used regex fallback for schedule ${row.id}, extracted:`, parsedEngineIds);
          }
        }
      } else if (Array.isArray(row.selected_engine_ids)) {
        // Already an array
        parsedEngineIds = row.selected_engine_ids;
      } else {
        // Fallback
        parsedEngineIds = [];
      }
    } catch (error) {
      console.error(
        `Error parsing selected_engine_ids for schedule ${row.id}:`,
        row.selected_engine_ids,
        error
      );
      parsedEngineIds = []; // Default to empty array if parsing fails
    }

    return {
      ...row,
      selected_engine_ids: parsedEngineIds,
    };
  } finally {
    await connection.end();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scheduleId, userToken } = req.body;

    if (!scheduleId || !userToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user ID from token
    const userInfo = await getUserFromToken(userToken);
    if (!userInfo) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    // Get the scheduled analysis
    const schedule = await getScheduledAnalysis(scheduleId, userInfo.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Scheduled analysis not found or unauthorized' });
    }

    if (!schedule.is_active) {
      return res.status(400).json({ error: 'Cannot execute inactive scheduled analysis' });
    }

    console.log(
      `🔧 Manual execution of scheduled analysis ${scheduleId} requested by ${userInfo.name}`
    );

    // Execute the scheduled analysis using the scheduler logic
    // This will create run records, send Slack notifications, etc.
    await executeScheduledAnalysis(schedule);

    res.status(200).json({
      success: true,
      message: `Scheduled analysis executed successfully for ${schedule.client_name} - "${schedule.keyword}"`,
    });
  } catch (error: any) {
    console.error('Error executing scheduled analysis:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
