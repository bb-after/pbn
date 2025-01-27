// pages/api/zoom-webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const zoomWebhookSecret = process.env.ZOOM_WEBHOOK_SECRET;
  if (!zoomWebhookSecret) {
    return res.status(500).json({ message: 'Zoom webhook secret not configured' });
  }

  const signature = req.headers['x-zm-signature'] as string;
  const timestamp = req.headers['x-zm-request-timestamp'] as string;
  const payload = await getRawBody(req);

  const message = `v0:${timestamp}:${payload}`;
  const hash = crypto.createHmac('sha256', zoomWebhookSecret).update(message).digest('hex');
  const expectedSignature = `v0=${hash}`;

  if (signature !== expectedSignature) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  if (event.event === 'endpoint.url_validation') {
    const plainToken = event.payload.plainToken;
    const encryptedToken = crypto.createHmac('sha256', zoomWebhookSecret).update(plainToken).digest('hex');
    return res.status(200).json({ plainToken, encryptedToken });
  }

  // Handle other event types here
  console.log('Received Zoom event:', event);

  res.status(200).json({ message: 'Webhook received' });
}

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
