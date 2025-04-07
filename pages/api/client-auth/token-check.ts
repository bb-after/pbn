import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log('Checking token in token-check endpoint:', token);

    // 1. Check if token exists and is valid
    const tokenQuery = `
      SELECT 
        cat.token_id,
        cat.contact_id,
        cat.expires_at,
        cat.is_used,
        cc.name,
        cc.email,
        c.client_id,
        c.client_name
      FROM 
        client_auth_tokens cat
      JOIN
        client_contacts cc ON cat.contact_id = cc.contact_id
      JOIN
        clients c ON cc.client_id = c.client_id
      WHERE 
        cat.token = ?
    `;

    const [tokenResult] = await pool.query(tokenQuery, [token]);
    console.log('Token query result:', tokenResult);

    if ((tokenResult as any[]).length === 0) {
      return res.status(400).json({ error: 'Invalid token', message: 'No token found' });
    }

    const tokenData = (tokenResult as any[])[0];

    // 2. Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token has expired', message: 'Token expired' });
    }

    // 3. Check if token is already used
    if (tokenData.is_used) {
      return res.status(400).json({ error: 'Token has already been used', message: 'Token used' });
    }

    // Return success with contact info (but don't mark as used)
    return res.status(200).json({
      message: 'Token is valid',
      contact: {
        contact_id: tokenData.contact_id,
        name: tokenData.name,
        email: tokenData.email,
        client_id: tokenData.client_id,
        client_name: tokenData.client_name,
      },
    });
  } catch (error) {
    console.error('Error checking token:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return res.status(500).json({ error: 'Failed to check token' });
  }
}
