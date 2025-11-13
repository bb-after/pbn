import { NextApiRequest, NextApiResponse } from 'next';
import * as cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear the auth cookie
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    })
  );

  return res.status(200).json({ message: 'Logged out successfully' });
}