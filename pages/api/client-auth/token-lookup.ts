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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log('Looking up email for token:', token);

    // Query to get email associated with the token
    const tokenQuery = `
      SELECT 
        cc.email
      FROM 
        client_auth_tokens cat
      JOIN
        client_contacts cc ON cat.contact_id = cc.contact_id
      WHERE 
        cat.token = ?
    `;

    const [tokenResult] = await pool.query(tokenQuery, [token]);

    if ((tokenResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const tokenData = (tokenResult as any[])[0];

    // Return only the email address
    return res.status(200).json({
      email: tokenData.email,
    });
  } catch (error) {
    console.error('Error looking up token:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return res.status(500).json({ error: 'Failed to look up token' });
  }
}
