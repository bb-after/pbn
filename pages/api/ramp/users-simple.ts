import { NextApiRequest, NextApiResponse } from 'next';
import { getRampAccessToken } from '../../../utils/rampAuth';

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
    const accessToken = await getRampAccessToken();

    // Fetch ALL users with pagination
    let allUsers: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount: number = 0;

    do {
      const url = new URL('https://api.ramp.com/developer/v1/users?page_size=100');
      // url.searchParams.append('page_size', '99'); // Max page size
      if (nextPageToken) {
        url.searchParams.append('start', nextPageToken);
      }

      console.log(`Fetching users page ${pageCount + 1}...`);

      const usersResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!usersResponse.ok) {
        const errorText = await usersResponse.text();
        console.error('Users API error:', usersResponse.status, errorText);
        return res.status(500).json({
          error: 'Failed to fetch users from Ramp',
          details: `${usersResponse.status}: ${errorText}`,
        });
      }

      const pageData = await usersResponse.json();
      allUsers = allUsers.concat(pageData.data || []);
      nextPageToken = pageData.page?.next;
      pageCount++;

      console.log(
        `Page ${pageCount}: ${pageData.data?.length || 0} users, next token: ${nextPageToken ? 'exists' : 'none'}`
      );
    } while (nextPageToken && pageCount < 10); // Safety limit

    console.log(`Total users fetched: ${allUsers.length} across ${pageCount} pages`);

    const usersData = { data: allUsers };
    console.log('Users response:', { count: usersData.data?.length || 0 });
    console.log('Raw user data (first user):', usersData.data?.[0]);
    console.log(
      'User statuses:',
      usersData.data?.map((u: any) => u.status)
    );

    // Check if filtering is removing all users
    const processedUsers =
      usersData.data?.map((user: RampUser) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        status: user.status, // Include status for debugging
      })) || [];

    const activeUsers = processedUsers.filter((user: any) => user.status === 'ACTIVE');

    console.log('All users count:', processedUsers.length);
    console.log('Active users count:', activeUsers.length);
    console.log('Sample users:', processedUsers.slice(0, 3));

    // Return all users sorted alphabetically by name
    const users: User[] = processedUsers
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching Ramp users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
