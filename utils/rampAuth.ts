interface RampTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export async function getRampAccessToken(): Promise<string> {
  const clientId = process.env.RAMP_CLIENT_ID;
  const clientSecret = process.env.RAMP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Ramp credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenResponse = await fetch('https://api.ramp.com/developer/v1/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'users:read transactions:read',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Ramp token request failed:', errorText);
    throw new Error(`Failed to get Ramp access token: ${errorText}`);
  }

  const tokenData: RampTokenResponse = await tokenResponse.json();
  return tokenData.access_token;
}
