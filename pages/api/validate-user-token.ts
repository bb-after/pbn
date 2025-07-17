import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2/promise';
import { query } from 'lib/db';

// Function to validate user token
export async function validateUserToken(req: NextApiRequest) {
  const token = (req.headers['x-auth-token'] as string) || (req.cookies && req.cookies.auth_token);

  if (!token) {
    return { isValid: false, user_id: null, role: null };
  }

  try {
    // Query the database for the user token
    const [rows]: [RowDataPacket[], any] = await query('SELECT * FROM users WHERE user_token = ?', [
      token,
    ]);

    if (rows.length === 0) {
      return { isValid: false, user_id: null, name: null, role: null };
    }

    return {
      isValid: true,
      user_id: rows[0].id,
      username: rows[0].name,
      role: rows[0].role || 'staff', // Default to 'staff' if role is not yet set
    };
  } catch (error) {
    console.error('Error validating user token:', error);
    return { isValid: false, user_id: null, role: null };
  }
}

// API endpoint handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Query the database for the user token
    const [rows]: [RowDataPacket[], any] = await query('SELECT * FROM users WHERE user_token = ?', [
      token,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ valid: false });
    }

    // Return valid flag and user information
    res.status(200).json({
      valid: true,
      user: {
        id: rows[0].id,
        username: rows[0].name,
        email: rows[0].email,
        role: rows[0].role || 'staff', // Include role in response
        // Include other user fields as needed
      },
    });
  } catch (error) {
    console.error('Error validating user token:', error);
    res.status(500).json({ valid: false });
  }
}
