import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Simple in-memory store for state validation (in production, use Redis or database)
const stateStore = new Map<string, { timestamp: number }>();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > 600000) {
      // 10 minutes
      stateStore.delete(state);
    }
  }
}, 600000);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientId = process.env.RAMP_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({ error: 'Ramp client ID not configured' });
    }

    // Generate a secure random state parameter
    const state = crypto.randomBytes(32).toString('base64url');

    // Store state in memory with timestamp
    stateStore.set(state, { timestamp: Date.now() });

    const redirectUri = `${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/ramp/auth/callback`;
    const scope = 'users:read transactions:read';

    const authUrl = `https://app.ramp.com/v1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

    console.log('Generated state:', state);

    res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Error initiating auth:', error);
    res.status(500).json({
      error: 'Failed to initiate authentication',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Export the state store for use in the callback
export { stateStore };
