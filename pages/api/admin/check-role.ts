import { NextApiRequest, NextApiResponse } from 'next';
import { validateUserToken } from '../validate-user-token';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid || !userInfo.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get current user's details including role
    const [users] = await query(`
      SELECT id, name, email, role, is_active, created_at
      FROM users 
      WHERE id = ?
    `, [userInfo.user_id]);

    const currentUser = (users as any[])[0];

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also get all admin users
    const [adminUsers] = await query(`
      SELECT id, name, email, role, is_active, created_at
      FROM users 
      WHERE role = 'admin'
      ORDER BY name ASC
    `);

    return res.status(200).json({
      currentUser,
      adminUsers,
      message: `Your current role is: ${currentUser.role}. You ${currentUser.role === 'admin' ? 'have' : 'do not have'} admin privileges.`
    });
  } catch (error) {
    console.error('Error checking user role:', error);
    return res.status(500).json({ error: 'Failed to check user role' });
  }
}