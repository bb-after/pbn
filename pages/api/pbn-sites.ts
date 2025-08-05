import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { search, active } = req.query;

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST_NAME,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    let whereClauses = ['1=1']; // Always true to start
    let queryParams: any[] = [];

    // Add search filter
    if (search && typeof search === 'string') {
      whereClauses.push('domain LIKE ?');
      queryParams.push(`%${search}%`);
    }

    // Add active filter
    if (active && active !== 'all') {
      whereClauses.push('active = ?');
      queryParams.push(parseInt(active as string));
    }

    const whereClause = whereClauses.join(' AND ');

    const query = `
      SELECT 
        ps.id,
        ps.domain,
        ps.login,
        ps.password,
        ps.active,
        COALESCE(post_counts.post_count, 0) as post_count,
        COALESCE(client_counts.client_count, 0) as client_count
      FROM pbn_sites ps
      LEFT JOIN (
        SELECT 
          pbn_site_id,
          COUNT(*) as post_count
        FROM pbn_site_submissions 
        WHERE deleted_at IS NULL
        GROUP BY pbn_site_id
      ) post_counts ON ps.id = post_counts.pbn_site_id
      LEFT JOIN (
        SELECT 
          pbn_site_id,
          COUNT(DISTINCT client_name) as client_count
        FROM pbn_site_submissions 
        WHERE deleted_at IS NULL AND client_name IS NOT NULL AND client_name != ''
        GROUP BY pbn_site_id
      ) client_counts ON ps.id = client_counts.pbn_site_id
      WHERE ${whereClause}
      ORDER BY ps.domain ASC
    `;

    const [rows] = await connection.execute(query, queryParams);
    await connection.end();

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching PBN sites:', error);
    res.status(500).json({ error: 'Failed to fetch PBN sites' });
  }
}
