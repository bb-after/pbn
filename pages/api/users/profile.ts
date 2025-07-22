import { NextApiRequest, NextApiResponse } from 'next';
import { query } from 'lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { validateUserToken } from '../validate-user-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user token
  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid || !userInfo.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      return getUserProfile(req, res, userInfo);
    case 'PUT':
      return updateUserProfile(req, res, userInfo);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get user profile with enhanced fields
async function getUserProfile(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  try {
    const getUserQuery = `
      SELECT 
        id,
        name,
        email,
        role,
        slack_handle,
        phone,
        department,
        location,
        bio,
        theme_preference,
        created_at,
        updated_at,
        last_login,
        is_active
      FROM users 
      WHERE id = ?
    `;

    const [rows] = (await query(getUserQuery, [userInfo.user_id])) as [RowDataPacket[], any];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Return user profile data
    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      slack_handle: user.slack_handle,
      phone: user.phone,
      department: user.department,
      location: user.location,
      bio: user.bio,
      theme_preference: user.theme_preference,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      is_active: user.is_active,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

// Update user profile
async function updateUserProfile(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  const { name, slack_handle, phone, department, location, bio, theme_preference } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Validate optional fields
  const updateFields: any = {
    name: name.trim(),
  };

  if (slack_handle !== undefined) {
    if (typeof slack_handle === 'string') {
      // Clean slack handle - remove @ if present and limit length
      let cleanSlackHandle = slack_handle.trim();
      if (cleanSlackHandle.startsWith('@')) {
        cleanSlackHandle = cleanSlackHandle.substring(1);
      }
      updateFields.slack_handle = cleanSlackHandle.length > 0 ? cleanSlackHandle : null;
    } else {
      updateFields.slack_handle = null;
    }
  }

  if (phone !== undefined) {
    updateFields.phone = typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null;
  }

  if (department !== undefined) {
    updateFields.department =
      typeof department === 'string' && department.trim().length > 0 ? department.trim() : null;
  }

  if (location !== undefined) {
    updateFields.location =
      typeof location === 'string' && location.trim().length > 0 ? location.trim() : null;
  }

  if (bio !== undefined) {
    updateFields.bio = typeof bio === 'string' && bio.trim().length > 0 ? bio.trim() : null;
  }

  if (theme_preference !== undefined) {
    const validThemes = ['light', 'dark'];
    if (typeof theme_preference === 'string' && validThemes.includes(theme_preference)) {
      updateFields.theme_preference = theme_preference;
    }
  }

  try {
    // Build dynamic update query
    const updateColumns = Object.keys(updateFields);
    const updateValues = Object.values(updateFields);

    // Add updated_at timestamp
    updateColumns.push('updated_at');
    updateValues.push(new Date());

    const updateQuery = `
      UPDATE users 
      SET ${updateColumns.map(col => `${col} = ?`).join(', ')}
      WHERE id = ?
    `;

    // Add user ID to values
    updateValues.push(userInfo.user_id);

    const [result] = (await query(updateQuery, updateValues)) as [ResultSetHeader, any];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch updated user data
    const getUserQuery = `
      SELECT 
        id,
        name,
        email,
        role,
        slack_handle,
        phone,
        department,
        location,
        bio,
        theme_preference,
        created_at,
        updated_at,
        last_login,
        is_active
      FROM users 
      WHERE id = ?
    `;

    const [rows] = (await query(getUserQuery, [userInfo.user_id])) as [RowDataPacket[], any];
    const updatedUser = rows[0];

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        slack_handle: updatedUser.slack_handle,
        phone: updatedUser.phone,
        department: updatedUser.department,
        location: updatedUser.location,
        bio: updatedUser.bio,
        theme_preference: updatedUser.theme_preference,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        last_login: updatedUser.last_login,
        is_active: updatedUser.is_active,
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
}
