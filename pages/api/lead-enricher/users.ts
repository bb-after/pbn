import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../validate-user-token';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user token - any authenticated user can see the users list for assignment
  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Query to get all active users with basic info for assignment dropdown
    const query = `
      SELECT 
        id, 
        name,
        email
      FROM 
        users
      WHERE 
        is_active = 1
      ORDER BY 
        name ASC
    `;

    const [rows] = await pool.query(query);

    return res.status(200).json({ users: rows });
  } catch (error) {
    console.error('Error fetching users for assignment:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
