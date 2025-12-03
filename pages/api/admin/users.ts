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
  // Validate user token - only authenticated users can access admin functions
  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // TODO: Add admin role check here if you have role-based permissions
  // For now, any authenticated user can manage users

  if (req.method === 'GET') {
    return await handleGetUsers(req, res);
  } else if (req.method === 'PUT') {
    return await handleUpdateUser(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function handleGetUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get all users with their status and basic info
    const query = `
      SELECT 
        id, 
        name,
        email,
        is_active,
        created_at,
        updated_at,
        last_login
      FROM 
        users
      ORDER BY 
        name ASC
    `;

    const [rows] = await pool.query(query);

    return res.status(200).json({ users: rows });
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function handleUpdateUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, isActive } = req.body;

    if (!userId || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request. userId and isActive (boolean) are required.' });
    }

    // Update user's active status
    const updateQuery = `
      UPDATE users 
      SET 
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        id = ?
    `;

    const [result] = await pool.query(updateQuery, [isActive ? 1 : 0, userId]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get updated user data
    const selectQuery = `
      SELECT 
        id, 
        name,
        email,
        is_active,
        created_at,
        updated_at,
        last_login
      FROM 
        users
      WHERE 
        id = ?
    `;

    const [updatedUser] = await pool.query(selectQuery, [userId]);

    return res.status(200).json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: (updatedUser as any[])[0]
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
}