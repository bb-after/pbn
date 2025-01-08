// pages/api/zoom/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const clientID = process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_ZOOM_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/zoom/callback`;

  const authHeader = Buffer.from(`${clientID}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string, // Cast code to string since we know it exists from query
        redirect_uri: redirectUri,
      }).toString(),
    });

    const data = await response.json();
    console.log(data);
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get Zoom access token');
    }

    // Store the access token in a cookie or send it back as part of the response
    res.status(200).json({
        access_token: data.access_token,  // Send the access token to the frontend
        refresh_token: data.refresh_token,
    });
      
  } catch (error: unknown) {
    console.error('Error fetching Zoom access token:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to get Zoom access token' + (error instanceof Error ? error.message : String(error)) });
  }
}
