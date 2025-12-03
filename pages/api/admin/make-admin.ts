import { NextApiRequest, NextApiResponse } from 'next';
import { validateUserToken } from '../validate-user-token';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid || !userInfo.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId } = req.body;
    
    // If no userId provided, make the current user an admin
    const targetUserId = userId || userInfo.user_id;

    // Update user role to admin
    await query(`
      UPDATE users 
      SET role = 'admin', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [targetUserId]);

    // Get updated user info
    const [users] = await query(`
      SELECT id, name, email, role
      FROM users 
      WHERE id = ?
    `, [targetUserId]);

    const updatedUser = (users as any[])[0];

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: `User ${updatedUser.name} (${updatedUser.email}) has been granted admin privileges.`
    });
  } catch (error) {
    console.error('Error making user admin:', error);
    return res.status(500).json({ error: 'Failed to grant admin privileges' });
  }
}