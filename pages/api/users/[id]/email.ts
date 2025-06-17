import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

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
  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid user ID is required' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const [rows] = await pool.query('SELECT email FROM users WHERE id = ?', [id]);
        if ((rows as any[]).length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        const user = (rows as any[])[0];
        return res.status(200).json({ email: user.email });
      } catch (error) {
        console.error('Error fetching user email:', error);
        return res.status(500).json({ error: 'Failed to fetch user email' });
      }
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
