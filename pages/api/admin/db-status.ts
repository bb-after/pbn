import { NextApiRequest, NextApiResponse } from 'next';
import { getPoolStatus } from '../../../lib/db';

// API endpoint to monitor database connection status
// Only accessible to authenticated users with admin privileges
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // In a real application, you would add authentication checks here
    // to ensure only admins can access this information
    // if (!req.session?.user?.isAdmin) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    // Get database pool status
    const status = await getPoolStatus();

    // Add server timestamp
    const result = {
      ...status,
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      nodeEnv: process.env.NODE_ENV,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error retrieving DB status:', error);
    return res.status(500).json({
      error: 'Failed to retrieve database status',
      message: (error as Error).message,
    });
  }
}
