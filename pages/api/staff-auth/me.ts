import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the staff_auth_token cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.staff_auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify the JWT token
    const decodedToken = jwt.verify(token, JWT_SECRET) as any;

    if (!decodedToken || !decodedToken.email) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Return the staff data
    return res.status(200).json({
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      domain: decodedToken.domain,
      role: decodedToken.role,
      googleId: decodedToken.googleId,
    });
  } catch (error) {
    console.error('Error getting current staff user:', error);

    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized - Token expired' });
    }

    return res.status(500).json({ error: 'Failed to get current staff user' });
  }
}
