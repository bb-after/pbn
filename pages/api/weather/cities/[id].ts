import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const pool = mysql.createPool(dbConfig);

// GET - Get specific city details including recent alerts
const getCityDetails = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  const connection = await pool.getConnection();
  try {
    // Get city details
    const [cityRows] = await connection.execute(
      `SELECT id, city_name, state_code, country_code, latitude, longitude, 
              client_id, slack_channel, active, created_at, updated_at 
       FROM weather_monitored_cities WHERE id = ?`,
      [id]
    );

    if ((cityRows as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found'
      });
    }

    const city = (cityRows as any[])[0];

    // Get recent alerts for this city (last 30 days)
    const [alertRows] = await connection.execute(
      `SELECT alert_id, alert_type, alert_title, alert_description, 
              severity, expires_at, sent_at, slack_channel, slack_message_ts
       FROM weather_alerts_sent 
       WHERE city_id = ? AND sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY sent_at DESC 
       LIMIT 50`,
      [id]
    );

    res.status(200).json({
      success: true,
      city,
      recentAlerts: alertRows
    });
  } finally {
    connection.release();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        await getCityDetails(req, res);
        break;
      default:
        res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error: any) {
    console.error('Error in weather city details API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}