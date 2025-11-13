import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import { query } from 'lib/db';
import { RowDataPacket } from 'mysql2/promise';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

const ALLOWED_DOMAINS = ['statuslabs.com', 'blp.co'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'Google ID token is required' });
  }

  try {
    // Verify the Google ID token
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const googleUser = await response.json();

    if (!response.ok || googleUser.error) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Check if the client ID matches our app
    if (googleUser.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Invalid token audience' });
    }

    // Check if email is from allowed domains
    const email = googleUser.email;
    const domain = email.split('@')[1];

    if (!ALLOWED_DOMAINS.includes(domain)) {
      return res.status(403).json({
        error: 'Access denied. Only statuslabs.com and blp.co email addresses are allowed.',
      });
    }

    // Check if user exists in database, if not create them
    let dbUser;
    try {
      const [existingUsers]: [RowDataPacket[], any] = await query(
        'SELECT id, name, email, role FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        // User exists, update their info if needed
        dbUser = existingUsers[0];
        await query(
          'UPDATE users SET name = ?, google_id = ?, last_login = NOW() WHERE id = ?',
          [googleUser.name, googleUser.sub, dbUser.id]
        );
      } else {
        // User doesn't exist, create them
        const [result]: any = await query(
          'INSERT INTO users (name, email, role, google_id, created_at, last_login) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [googleUser.name, email, 'staff', googleUser.sub]
        );
        
        dbUser = {
          id: result.insertId,
          name: googleUser.name,
          email: email,
          role: 'staff'
        };
      }
    } catch (dbError) {
      console.error('Database error during user sync:', dbError);
      return res.status(500).json({ error: 'Failed to sync user with database' });
    }

    // Create JWT with database user info
    const userData = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      picture: googleUser.picture,
      domain: domain,
      role: dbUser.role || 'staff',
      googleId: googleUser.sub,
    };

    const userJWT = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    // Set JWT as HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('auth_token', userJWT, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
    );

    return res.status(200).json({
      message: 'Authentication successful',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        picture: googleUser.picture,
        domain: domain,
        role: dbUser.role || 'staff',
      },
    });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
}