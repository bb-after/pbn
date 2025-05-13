import { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';

// Database connection setup
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Function to validate user token
export async function validateUserToken(req: NextApiRequest) {
  const token = (req.headers['x-auth-token'] as string) || (req.cookies && req.cookies.auth_token);

  if (!token) {
    return { isValid: false, user_id: null, role: null };
  }

  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Query the database for the user token
      const [rows]: [RowDataPacket[], any] = await connection.execute(
        'SELECT * FROM users WHERE user_token = ?',
        [token]
      );

      if (rows.length === 0) {
        return { isValid: false, user_id: null, role: null };
      }

      return {
        isValid: true,
        user_id: rows[0].id,
        username: rows[0].username,
        role: rows[0].role || 'staff', // Default to 'staff' if role is not yet set
      };
    } finally {
      await connection.end();
    }
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

  // Create a connection to the database
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Query the database for the user token
    const [rows]: [RowDataPacket[], any] = await connection.execute(
      'SELECT * FROM users WHERE user_token = ?',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ valid: false });
    }

    // Return valid flag and user information
    res.status(200).json({
      valid: true,
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        role: rows[0].role || 'staff', // Include role in response
        // Include other user fields as needed
      },
    });
  } catch (error) {
    console.error('Error validating user token:', error);
    res.status(500).json({ valid: false });
  } finally {
    await connection.end();
  }
}
