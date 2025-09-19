import { NextApiRequest, NextApiResponse } from 'next';
import { stateStore } from './initiate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(
      '/ramp-expense-sync?error=' +
        encodeURIComponent((error_description as string) || (error as string))
    );
  }

  if (!code) {
    return res.redirect(
      '/ramp-expense-sync?error=' + encodeURIComponent('No authorization code received')
    );
  }

  if (!state) {
    return res.redirect(
      '/ramp-expense-sync?error=' + encodeURIComponent('No state parameter received')
    );
  }

  // Validate the state parameter using in-memory store
  const storedStateData = stateStore.get(state as string);
  console.log('State validation debug:', {
    received: state,
    storedData: storedStateData,
    storeSize: stateStore.size,
    storeKeys: Array.from(stateStore.keys()),
  });

  if (!storedStateData) {
    console.error('State validation failed: state not found or expired');
    return res.redirect(
      '/ramp-expense-sync?error=' + encodeURIComponent('Invalid or expired state parameter')
    );
  }

  // Check if state is expired (more than 10 minutes old)
  if (Date.now() - storedStateData.timestamp > 600000) {
    stateStore.delete(state as string);
    console.error('State validation failed: state expired');
    return res.redirect(
      '/ramp-expense-sync?error=' + encodeURIComponent('State parameter expired')
    );
  }

  // Remove the used state to prevent replay attacks
  stateStore.delete(state as string);

  try {
    const clientId = process.env.RAMP_CLIENT_ID;
    const clientSecret = process.env.RAMP_CLIENT_SECRET;
    const redirectUri = `${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/ramp/auth/callback`;

    if (!clientId || !clientSecret) {
      console.error('Ramp credentials not configured');
      return res.redirect(
        '/ramp-expense-sync?error=' + encodeURIComponent('Server configuration error')
      );
    }

    const tokenResponse = await fetch('https://api.ramp.com/developer/v1/public/customer/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return res.redirect(
        '/ramp-expense-sync?error=' +
          encodeURIComponent('Failed to exchange authorization code for token')
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      console.error('No access token received from Ramp');
      return res.redirect(
        '/ramp-expense-sync?error=' + encodeURIComponent('No access token received')
      );
    }

    const expiryDate = new Date(Date.now() + expires_in * 1000);

    console.log('Setting authentication cookies:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in,
      expiryDate: expiryDate.toUTCString(),
    });

    const isSecure = !req.headers.host?.includes('localhost');
    const cookies = [
      `ramp_access_token=${access_token}; Path=/; HttpOnly; SameSite=Lax; ${isSecure ? 'Secure;' : ''} Expires=${expiryDate.toUTCString()}`,
      refresh_token
        ? `ramp_refresh_token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; ${isSecure ? 'Secure;' : ''} Expires=${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()}`
        : '',
    ].filter(Boolean);

    console.log('Setting cookies:', cookies);
    res.setHeader('Set-Cookie', cookies);

    res.redirect('/ramp-expense-sync?auth=success');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect('/ramp-expense-sync?error=' + encodeURIComponent('Authentication failed'));
  }
}
