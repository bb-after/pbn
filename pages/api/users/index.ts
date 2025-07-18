import { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction, getPool } from 'lib/db';
import { validateUserToken } from '../validate-user-token';

// Use centralized connection pool
const pool = getPool();
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user token
  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin users should be able to see all users
  if (userInfo.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  switch (req.method) {
    case 'GET':
      return getUsers(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get all users
async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Query to get all users
    const query = `
      SELECT 
        id, 
        name, 
        email,
        role
      FROM 
        users
      ORDER BY 
        name
    `;

    const [rows] = await pool.query(query);

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
