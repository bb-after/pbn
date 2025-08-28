import { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear the staff authentication cookie
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('staff_auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1, // Expire immediately
        path: '/',
      })
    );

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error logging out staff user:', error);
    return res.status(500).json({ error: 'Failed to log out' });
  }
}
