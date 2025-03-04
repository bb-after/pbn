import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { siteId } = req.query;
  
  if (!siteId) {
    return res.status(400).json({ error: 'Site ID is required' });
  }

  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Get all authors for this site
    const [authors] = await connection.query(
      `
      SELECT 
        id, 
        author_name, 
        author_username,
        wp_author_id,
        author_avatar
      FROM 
        superstar_authors
      WHERE 
        superstar_site_id = ?
      ORDER BY 
        author_name ASC
      `,
      [siteId]
    );

    await connection.end();

    return res.status(200).json({ authors });
  } catch (error: any) {
    console.error('Error fetching site authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors', details: error.message });

    if (connection && connection.end) {
      await connection.end();
    }
  }
}