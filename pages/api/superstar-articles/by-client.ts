import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { clientId, search } = req.query;

  if (!clientId || Array.isArray(clientId)) {
    return res.status(400).json({ error: 'Client ID is required as a single value' });
  }

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    let query = `
      SELECT 
        sss.id,
        sss.title,
        sss.submission_response as url,
        s.domain
      FROM 
        superstar_site_submissions sss
      JOIN
        superstar_sites s ON sss.superstar_site_id = s.id
      WHERE 
        sss.client_id = ?
        AND sss.submission_response IS NOT NULL
    `;

    const params: any[] = [clientId];

    // Add search filter if provided
    if (search && !Array.isArray(search)) {
      query += ` AND (sss.title LIKE ? OR s.domain LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY sss.created DESC LIMIT 50`;

    const [rows] = await connection.execute(query, params);

    // Format the results
    const articles = Array.isArray(rows)
      ? rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          url: row.url,
          domain: row.domain,
          display: `${row.title} (${row.domain})`,
        }))
      : [];

    return res.status(200).json(articles);
  } catch (error: any) {
    console.error('Error fetching superstar articles:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch superstar articles',
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
