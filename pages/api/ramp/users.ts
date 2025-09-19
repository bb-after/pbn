import { NextApiRequest, NextApiResponse } from 'next';

interface RampUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accessToken = req.cookies.ramp_access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const response = await fetch('https://api.ramp.com/developer/v1/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'Authentication expired' });
      }
      throw new Error(`Ramp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const users: User[] = data.data
      .filter((user: RampUser) => user.status === 'ACTIVE')
      .map((user: RampUser) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      }));

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching Ramp users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
