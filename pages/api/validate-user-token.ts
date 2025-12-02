import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2/promise';
import { query } from 'lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Function to validate user token (now using JWT cookies)
export async function validateUserToken(req: NextApiRequest) {
  // First try JWT cookie (new method)
  const jwtToken = req.cookies && req.cookies.auth_token;
  
  if (jwtToken) {
    try {
      const decoded = jwt.verify(jwtToken, JWT_SECRET) as any;
      
      // Check if user is still active in database
      const [userRows]: [RowDataPacket[], any] = await query(
        'SELECT is_active FROM users WHERE id = ?', 
        [decoded.id]
      );
      
      if (userRows.length === 0 || !userRows[0].is_active) {
        return { isValid: false, user_id: null, username: null, email: null, role: null };
      }
      
      return {
        isValid: true,
        user_id: decoded.id,
        username: decoded.name,
        email: decoded.email,
        role: decoded.role || 'staff',
      };
    } catch (jwtError) {
      console.error('JWT validation error:', jwtError);
      // JWT invalid, fall through to legacy token check
    }
  }

  // Legacy token support (for backward compatibility during transition)
  const legacyToken =
    (req.headers['x-auth-token'] as string) ||
    (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

  if (!legacyToken) {
    return { isValid: false, user_id: null, username: null, email: null, role: null };
  }

  try {
    // Query the database for the legacy user token
    const [rows]: [RowDataPacket[], any] = await query('SELECT * FROM users WHERE user_token = ?', [
      legacyToken,
    ]);

    if (rows.length === 0 || !rows[0].is_active) {
      return { isValid: false, user_id: null, username: null, email: null, role: null };
    }

    return {
      isValid: true,
      user_id: rows[0].id,
      username: rows[0].name,
      email: rows[0].email,
      role: rows[0].role || 'staff',
    };
  } catch (error) {
    console.error('Error validating legacy user token:', error);
    return { isValid: false, user_id: null, username: null, email: null, role: null };
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

    if (rows.length === 0 || !rows[0].is_active) {
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
