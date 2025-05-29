import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or with proper authorization
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.authorization !== process.env.DEBUG_SECRET
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(200).json({
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
    nodeEnv: process.env.NODE_ENV,
  });
}
