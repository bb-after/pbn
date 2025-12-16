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

interface WeatherKeyword {
  id?: number;
  keyword: string;
  description?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// GET - List all weather keywords
const getKeywords = async (req: NextApiRequest, res: NextApiResponse) => {
  const { active_only } = req.query;
  
  const connection = await pool.getConnection();
  try {
    let sql = `SELECT id, keyword, description, active, created_at, updated_at 
               FROM weather_alert_keywords`;
    const params: any[] = [];
    
    if (active_only === 'true') {
      sql += ' WHERE active = true';
    }
    
    sql += ' ORDER BY keyword ASC';
    
    const [rows] = await connection.execute(sql, params);
    
    res.status(200).json({
      success: true,
      keywords: rows
    });
  } finally {
    connection.release();
  }
};

// POST - Add new keyword
const createKeyword = async (req: NextApiRequest, res: NextApiResponse) => {
  const { keyword, description, active = true }: WeatherKeyword = req.body;

  if (!keyword || keyword.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Keyword is required'
    });
  }

  const cleanKeyword = keyword.trim().toLowerCase();

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO weather_alert_keywords (keyword, description, active)
       VALUES (?, ?, ?)`,
      [cleanKeyword, description || null, active]
    );

    const insertResult = result as mysql.ResultSetHeader;
    
    res.status(201).json({
      success: true,
      message: 'Keyword added successfully',
      keywordId: insertResult.insertId
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Keyword already exists'
      });
    }
    throw error;
  } finally {
    connection.release();
  }
};

// PUT - Update keyword
const updateKeyword = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const { keyword, description, active }: WeatherKeyword = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Keyword ID is required'
    });
  }

  const connection = await pool.getConnection();
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (keyword !== undefined) {
      const cleanKeyword = keyword.trim().toLowerCase();
      if (cleanKeyword.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Keyword cannot be empty'
        });
      }
      updateFields.push('keyword = ?');
      updateValues.push(cleanKeyword);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description || null);
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
      `UPDATE weather_alert_keywords SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const updateResult = result as mysql.ResultSetHeader;

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Keyword updated successfully'
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Keyword already exists'
      });
    }
    throw error;
  } finally {
    connection.release();
  }
};

// DELETE - Remove keyword
const deleteKeyword = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Keyword ID is required'
    });
  }

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM weather_alert_keywords WHERE id = ?',
      [id]
    );

    const deleteResult = result as mysql.ResultSetHeader;

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Keyword deleted successfully'
    });
  } finally {
    connection.release();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        await getKeywords(req, res);
        break;
      case 'POST':
        await createKeyword(req, res);
        break;
      case 'PUT':
        await updateKeyword(req, res);
        break;
      case 'DELETE':
        await deleteKeyword(req, res);
        break;
      default:
        res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error: any) {
    console.error('Error in weather keywords API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}