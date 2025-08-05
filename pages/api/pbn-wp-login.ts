import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { siteId } = req.body;

  if (!siteId) {
    return res.status(400).json({ error: 'Site ID is required' });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST_NAME,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    // Get PBN site credentials
    const [rows] = await connection.execute(
      'SELECT domain, login, password FROM pbn_sites WHERE id = ?',
      [siteId]
    );

    await connection.end();

    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'PBN site not found' });
    }

    const site = (rows as any[])[0];

    if (!site.login || !site.password) {
      return res.status(400).json({ error: 'No valid WordPress credentials found for this site' });
    }

    // Return the credentials for the frontend to use
    res.status(200).json({
      domain: site.domain,
      login: site.login,
      password: site.password,
      adminUrl: `${site.domain}/wp-admin/`,
    });
  } catch (error) {
    console.error('Error fetching PBN site credentials:', error);
    res.status(500).json({ error: 'Failed to fetch site credentials' });
  }
}
