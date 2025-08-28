import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

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

    // Create staff JWT
    const staffData = {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      domain: domain,
      role: 'staff',
      googleId: googleUser.sub,
    };

    const staffJWT = jwt.sign(staffData, JWT_SECRET, { expiresIn: '7d' });

    // Set JWT as HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('staff_auth_token', staffJWT, {
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
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        domain: domain,
        role: 'staff',
      },
    });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
}
