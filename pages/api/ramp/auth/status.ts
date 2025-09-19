import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accessToken = req.cookies.ramp_access_token;
    console.log('Auth status check:', {
      hasToken: !!accessToken,
      tokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : 'none',
      allCookies: Object.keys(req.cookies),
      cookieHeader: req.headers.cookie,
    });

    if (!accessToken) {
      console.log('No access token found');
      return res.status(200).json({ isAuthenticated: false });
    }

    try {
      const response = await fetch('https://api.ramp.com/developer/v1/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return res.status(200).json({ isAuthenticated: true });
      } else if (response.status === 401) {
        res.setHeader(
          'Set-Cookie',
          'ramp_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        );
        return res.status(200).json({ isAuthenticated: false });
      } else {
        return res.status(200).json({ isAuthenticated: false });
      }
    } catch (apiError) {
      console.error('Error validating token with Ramp API:', apiError);
      return res.status(200).json({ isAuthenticated: false });
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      error: 'Failed to check authentication status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
