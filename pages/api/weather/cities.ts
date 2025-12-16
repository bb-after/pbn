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

interface MonitoredCity {
  id?: number;
  city_name: string;
  state_code: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  client_id?: number;
  slack_channel: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// GET - List all monitored cities
const getCities = async (req: NextApiRequest, res: NextApiResponse) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, city_name, state_code, country_code, latitude, longitude, 
              client_id, slack_channel, active, created_at, updated_at 
       FROM weather_monitored_cities 
       ORDER BY city_name ASC`
    );
    
    res.status(200).json({
      success: true,
      cities: rows
    });
  } finally {
    connection.release();
  }
};

// POST - Add new monitored city
const createCity = async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    city_name,
    state_code,
    country_code = 'US',
    latitude,
    longitude,
    client_id,
    slack_channel,
    active = true
  }: MonitoredCity = req.body;

  // Validation
  if (!city_name || !state_code || !latitude || !longitude || !slack_channel) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: city_name, state_code, latitude, longitude, slack_channel'
    });
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180'
    });
  }

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO weather_monitored_cities 
       (city_name, state_code, country_code, latitude, longitude, client_id, slack_channel, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [city_name, state_code, country_code, latitude, longitude, client_id || null, slack_channel, active]
    );

    const insertResult = result as mysql.ResultSetHeader;
    
    res.status(201).json({
      success: true,
      message: 'City added successfully',
      cityId: insertResult.insertId
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'City with these coordinates already exists'
      });
    }
    throw error;
  } finally {
    connection.release();
  }
};

// PUT - Update monitored city
const updateCity = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const {
    city_name,
    state_code,
    country_code,
    latitude,
    longitude,
    client_id,
    slack_channel,
    active
  }: MonitoredCity = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'City ID is required'
    });
  }

  const connection = await pool.getConnection();
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (city_name !== undefined) {
      updateFields.push('city_name = ?');
      updateValues.push(city_name);
    }
    if (state_code !== undefined) {
      updateFields.push('state_code = ?');
      updateValues.push(state_code);
    }
    if (country_code !== undefined) {
      updateFields.push('country_code = ?');
      updateValues.push(country_code);
    }
    if (latitude !== undefined) {
      if (Math.abs(latitude) > 90) {
        return res.status(400).json({
          success: false,
          error: 'Invalid latitude: must be between -90 and 90'
        });
      }
      updateFields.push('latitude = ?');
      updateValues.push(latitude);
    }
    if (longitude !== undefined) {
      if (Math.abs(longitude) > 180) {
        return res.status(400).json({
          success: false,
          error: 'Invalid longitude: must be between -180 and 180'
        });
      }
      updateFields.push('longitude = ?');
      updateValues.push(longitude);
    }
    if (client_id !== undefined) {
      updateFields.push('client_id = ?');
      updateValues.push(client_id);
    }
    if (slack_channel !== undefined) {
      updateFields.push('slack_channel = ?');
      updateValues.push(slack_channel);
    }
    if (active !== undefined) {
      updateFields.push('active = ?');
      updateValues.push(active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const [result] = await connection.execute(
      `UPDATE weather_monitored_cities SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updateResult = result as mysql.ResultSetHeader;

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'City updated successfully'
    });
  } finally {
    connection.release();
  }
};

// DELETE - Remove monitored city
const deleteCity = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'City ID is required'
    });
  }

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM weather_monitored_cities WHERE id = ?',
      [id]
    );

    const deleteResult = result as mysql.ResultSetHeader;

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'City not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'City deleted successfully'
    });
  } finally {
    connection.release();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        await getCities(req, res);
        break;
      case 'POST':
        await createCity(req, res);
        break;
      case 'PUT':
        await updateCity(req, res);
        break;
      case 'DELETE':
        await deleteCity(req, res);
        break;
      default:
        res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error: any) {
    console.error('Error in weather cities API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}