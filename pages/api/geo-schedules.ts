import { NextApiRequest, NextApiResponse } from 'next';
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

// Calculate next run date based on schedule configuration
const calculateNextRun = (
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  timeOfDay?: string,
  timezone?: string
) => {
  const now = new Date();
  const [hours, minutes] = (timeOfDay || '09:00').split(':').map(Number);

  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'hourly':
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 1);
      }
      break;
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      const targetDay = dayOfWeek || 1; // Default to Monday
      const currentDay = nextRun.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0 && nextRun <= now) {
        daysToAdd = 7;
      }
      nextRun.setDate(nextRun.getDate() + daysToAdd);
      break;
    case 'monthly':
      nextRun.setDate(dayOfMonth || 1); // Default to 1st of month
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Create new scheduled analysis
    try {
      const {
        clientName,
        keyword,
        analysisType,
        intentCategory,
        customPrompt,
        selectedEngines,
        schedule,
        userToken,
      } = req.body;

      // Validate required fields
      if (
        !clientName ||
        !keyword ||
        !analysisType ||
        !intentCategory ||
        !customPrompt ||
        !selectedEngines ||
        !Array.isArray(selectedEngines) ||
        !schedule ||
        !userToken
      ) {
        return res.status(400).json({
          error: 'Missing required fields for scheduled analysis',
        });
      }

      // Get user ID from token
      const userInfo = await getUserFromToken(userToken);
      if (!userInfo) {
        return res.status(401).json({ error: 'Invalid user token' });
      }

      // Calculate next run time
      const nextRunAt = calculateNextRun(
        schedule.frequency,
        schedule.dayOfWeek,
        schedule.dayOfMonth,
        schedule.time,
        schedule.timezone
      );

      const connection = await mysql.createConnection(dbConfig);

      try {
        const [result] = await connection.execute(
          `INSERT INTO geo_scheduled_analyses (
            user_id, client_name, keyword, analysis_type, intent_category, 
            custom_prompt, selected_engine_ids, frequency, day_of_week, 
            day_of_month, time_of_day, timezone, next_run_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userInfo.id,
            clientName,
            keyword,
            analysisType,
            intentCategory,
            customPrompt,
            JSON.stringify(selectedEngines),
            schedule.frequency,
            schedule.dayOfWeek || null,
            schedule.dayOfMonth || null,
            schedule.time,
            schedule.timezone || 'UTC',
            nextRunAt,
            schedule.isActive !== false,
          ]
        );

        await connection.end();

        console.log('Scheduled analysis created:', {
          id: (result as any).insertId,
          user: userInfo.name,
          keyword,
          frequency: schedule.frequency,
          nextRun: nextRunAt.toISOString(),
        });

        res.status(201).json({
          id: (result as any).insertId,
          message: 'Scheduled analysis created successfully',
          nextRun: nextRunAt.toISOString(),
        });
      } catch (dbError) {
        await connection.end();
        throw dbError;
      }
    } catch (error) {
      console.error('Error creating scheduled analysis:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  } else if (req.method === 'PUT') {
    // Update existing scheduled analysis
    try {
      const {
        id,
        clientName,
        keyword,
        analysisType,
        intentCategory,
        customPrompt,
        selectedEngines,
        schedule,
        userToken,
      } = req.body;

      // Validate required fields
      if (
        !id ||
        !clientName ||
        !keyword ||
        !analysisType ||
        !intentCategory ||
        !customPrompt ||
        !selectedEngines ||
        !Array.isArray(selectedEngines) ||
        !schedule ||
        !userToken
      ) {
        return res.status(400).json({
          error: 'Missing required fields for scheduled analysis update',
        });
      }

      // Get user ID from token
      const userInfo = await getUserFromToken(userToken);
      if (!userInfo) {
        return res.status(401).json({ error: 'Invalid user token' });
      }

      // Calculate next run time
      const nextRunAt = calculateNextRun(
        schedule.frequency,
        schedule.dayOfWeek,
        schedule.dayOfMonth,
        schedule.time,
        schedule.timezone
      );

      const connection = await mysql.createConnection(dbConfig);

      try {
        const [result] = await connection.execute(
          `UPDATE geo_scheduled_analyses 
           SET client_name = ?, keyword = ?, analysis_type = ?, intent_category = ?, 
               custom_prompt = ?, selected_engine_ids = ?, frequency = ?, day_of_week = ?, 
               day_of_month = ?, time_of_day = ?, timezone = ?, next_run_at = ?, is_active = ?
           WHERE id = ? AND user_id = ?`,
          [
            clientName,
            keyword,
            analysisType,
            intentCategory,
            customPrompt,
            JSON.stringify(selectedEngines),
            schedule.frequency,
            schedule.dayOfWeek || null,
            schedule.dayOfMonth || null,
            schedule.time,
            schedule.timezone || 'UTC',
            nextRunAt,
            schedule.isActive !== false,
            id,
            userInfo.id,
          ]
        );

        await connection.end();

        const updateResult = result as any;
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Scheduled analysis not found or unauthorized' });
        }

        console.log('Scheduled analysis updated:', {
          id,
          user: userInfo.name,
          keyword,
          frequency: schedule.frequency,
          nextRun: nextRunAt.toISOString(),
        });

        res.status(200).json({
          message: 'Scheduled analysis updated successfully',
          nextRun: nextRunAt.toISOString(),
        });
      } catch (dbError) {
        await connection.end();
        throw dbError;
      }
    } catch (error) {
      console.error('Error updating scheduled analysis:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  } else if (req.method === 'DELETE') {
    // Delete scheduled analysis
    try {
      const { id, userToken } = req.body;

      if (!id || !userToken) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get user ID from token
      const userInfo = await getUserFromToken(userToken);
      if (!userInfo) {
        return res.status(401).json({ error: 'Invalid user token' });
      }

      const connection = await mysql.createConnection(dbConfig);

      try {
        const [result] = await connection.execute(
          'DELETE FROM geo_scheduled_analyses WHERE id = ? AND user_id = ?',
          [id, userInfo.id]
        );

        await connection.end();

        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Scheduled analysis not found or unauthorized' });
        }

        console.log('Scheduled analysis deleted:', { id, user: userInfo.name });

        res.status(200).json({ message: 'Scheduled analysis deleted successfully' });
      } catch (dbError) {
        await connection.end();
        throw dbError;
      }
    } catch (error) {
      console.error('Error deleting scheduled analysis:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  } else if (req.method === 'PATCH') {
    // Toggle active status
    try {
      const { id, isActive, userToken } = req.body;

      if (id === undefined || isActive === undefined || !userToken) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get user ID from token
      const userInfo = await getUserFromToken(userToken);
      if (!userInfo) {
        return res.status(401).json({ error: 'Invalid user token' });
      }

      const connection = await mysql.createConnection(dbConfig);

      try {
        const [result] = await connection.execute(
          'UPDATE geo_scheduled_analyses SET is_active = ? WHERE id = ? AND user_id = ?',
          [isActive, id, userInfo.id]
        );

        await connection.end();

        const updateResult = result as any;
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Scheduled analysis not found or unauthorized' });
        }

        console.log('Scheduled analysis status toggled:', { id, user: userInfo.name, isActive });

        res.status(200).json({ message: 'Scheduled analysis status updated successfully' });
      } catch (dbError) {
        await connection.end();
        throw dbError;
      }
    } catch (error) {
      console.error('Error toggling scheduled analysis status:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  } else if (req.method === 'GET') {
    // Get user's scheduled analyses
    try {
      const { userToken } = req.query;

      if (!userToken || typeof userToken !== 'string') {
        return res.status(401).json({ error: 'User token is required' });
      }

      const userInfo = await getUserFromToken(userToken);
      if (!userInfo) {
        return res.status(401).json({ error: 'Invalid user token' });
      }

      const connection = await mysql.createConnection(dbConfig);

      try {
        const [schedules] = await connection.execute(
          `SELECT 
            id, client_name, keyword, analysis_type, intent_category,
            custom_prompt, selected_engine_ids, frequency, day_of_week,
            day_of_month, time_of_day, timezone, is_active, last_run_at,
            next_run_at, run_count, created_at, updated_at
          FROM geo_scheduled_analyses 
          WHERE user_id = ? 
          ORDER BY created_at DESC`,
          [userInfo.id]
        );

        await connection.end();

        // Parse JSON fields with error handling
        const parsedSchedules = (schedules as any[]).map(schedule => {
          let parsedEngineIds;
          try {
            // Handle different formats that might be stored
            if (typeof schedule.selected_engine_ids === 'string') {
              // Try to parse as JSON first
              try {
                parsedEngineIds = JSON.parse(schedule.selected_engine_ids);
              } catch {
                // If that fails, try to clean up the string and parse again
                const cleanedString = schedule.selected_engine_ids
                  .replace(/\s/g, '') // Remove all spaces
                  .replace(/^\[/, '[') // Ensure proper array format
                  .replace(/\]$/, ']');
                parsedEngineIds = JSON.parse(cleanedString);
              }
            } else if (Array.isArray(schedule.selected_engine_ids)) {
              // Already an array
              parsedEngineIds = schedule.selected_engine_ids;
            } else {
              // Fallback
              parsedEngineIds = [];
            }
          } catch (error) {
            console.error(
              `Error parsing selected_engine_ids for schedule ${schedule.id}:`,
              schedule.selected_engine_ids,
              error
            );
            parsedEngineIds = []; // Default to empty array if parsing fails
          }

          return {
            ...schedule,
            selected_engine_ids: parsedEngineIds,
          };
        });

        res.status(200).json({ schedules: parsedSchedules });
      } catch (dbError) {
        await connection.end();
        throw dbError;
      }
    } catch (error) {
      console.error('Error fetching scheduled analyses:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
