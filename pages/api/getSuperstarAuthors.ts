import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Define your MySQL connection options
  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  // Create a MySQL connection
  const connection = await mysql.createConnection(dbConfig);

  try {
    const { siteId } = req.query;
    
    // Base query for all authors or site-specific authors
    let query = `
      SELECT 
        sa.id, 
        sa.author_name, 
        sa.author_email,
        sa.author_username,
        sa.author_avatar,
        sa.author_bio,
        sa.wp_author_id,
        sa.superstar_site_id,
        ss.domain as site_domain,
        COUNT(sss.id) as submission_count
      FROM 
        superstar_authors sa
      LEFT JOIN 
        superstar_sites ss ON sa.superstar_site_id = ss.id
      LEFT JOIN 
        superstar_site_submissions sss ON sss.superstar_author_id = sa.id
    `;
    
    // If siteId is provided, filter by that site
    const queryParams = [];
    if (siteId) {
      query += ` WHERE sa.superstar_site_id = ? `;
      queryParams.push(siteId);
    }
    
    // Complete the query with grouping and ordering
    query += `
      GROUP BY 
        sa.id
      ORDER BY 
        submission_count DESC, author_name ASC
    `;

    const [rows] = await connection.query(query, queryParams);

    // Close the MySQL connection
    await connection.end();

    // Send the data as a JSON response
    res.status(200).json({ authors: rows });
  } catch (error: any) {
    console.error('Error fetching superstar authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors', details: error.message });

    // Close the MySQL connection in case of an error
    if (connection && connection.end) {
      await connection.end();
    }
  }
}