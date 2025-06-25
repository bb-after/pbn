// pages/api/setZoomBackground.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const refreshAccessToken = async (refreshToken: string) => {
  const clientId = process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh token');
  }

  try {
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (e) {
    console.error('Error parsing refresh token response:', e);
    throw new Error('Invalid refresh token response');
  }
};

const setZoomBackground = async (imageBuffer: Buffer, fileName: string, accessToken: string) => {
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer]), fileName);
  formData.append('type', 'image');
  formData.append('is_default', 'true');

  const response = await fetch('https://api.zoom.us/v2/users/me/settings/virtual_backgrounds', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  // Check for 401 before trying to parse JSON
  if (response.status === 401) {
    throw new Error('INVALID_TOKEN');
  }

  // Check if there's content to parse
  const contentType = response.headers.get('content-type');
  let responseData = null;

  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch (e) {
      console.error('Error parsing JSON:', e);
      const textContent = await response.text();
      console.error('Response text:', textContent);
    }
  }

  if (!response.ok) {
    console.error('Zoom API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      error: responseData,
    });
    throw new Error(
      responseData?.error?.message ||
        `Failed to update Zoom background (Status: ${response.status})`
    );
  }

  return responseData || { success: true };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { imageUrl, accessToken, refreshToken } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
      }

      try {
        // First attempt with current access token
        // Fetch image as buffer
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error('Failed to fetch image');
        const imageBuffer = await imageResponse.arrayBuffer();

        const result = await setZoomBackground(
          Buffer.from(imageBuffer),
          'background.png',
          accessToken
        );
        return res.status(200).json({
          message: 'Successfully set as Zoom background!',
          result,
        });
      } catch (error: unknown) {
        // If token is invalid and we have a refresh token, try refreshing
        if (error instanceof Error && error.message === 'INVALID_TOKEN' && refreshToken) {
          console.log('Token invalid, attempting refresh...');
          try {
            const tokens = await refreshAccessToken(refreshToken);
            console.log('Token refreshed successfully, retrying background update...');
            // Retry with new access token

            // Fetch image as buffer
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error('Failed to fetch image');
            const imageBuffer = await imageResponse.arrayBuffer();

            // First attempt with current access token
            const result = await setZoomBackground(
              Buffer.from(imageBuffer),
              'background.png',
              tokens.accessToken
            );
            // const result = await setZoomBackground(imageUrl, tokens.accessToken);
            return res.status(200).json({
              message: 'Successfully set as Zoom background!',
              result,
              newTokens: tokens, // Send back new tokens to update in frontend
            });
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Token refresh failed');
          }
        }
        throw error; // Re-throw if it's not a token error or we can't refresh
      }
    } catch (error: unknown) {
      console.error('Error setting Zoom background:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred.';
      return res.status(500).json({ error: errorMessage });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
