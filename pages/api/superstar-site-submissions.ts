// pages/api/superstar-site-submissions.ts

import mysql, { RowDataPacket } from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

// Define the type for the total count query result
interface TotalCountRow extends RowDataPacket {
  total: number;
}

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req: NextApiRequest, res: NextApiResponse) => {
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
    // Check for query parameters
    const searchQuery = req.query.search as string | undefined;
    const userToken = Array.isArray(req.query.userToken) ? req.query.userToken[0] : req.query.userToken;
    const authorId = Array.isArray(req.query.authorId) ? req.query.authorId[0] : req.query.authorId;
    const autogenerated = req.query.autogenerated as string | undefined;

    const page = parseInt(typeof req.query.page === 'string' ? req.query.page : '0', 10) || 0;
    const rowsPerPage = parseInt(typeof req.query.rowsPerPage === 'string' ? req.query.rowsPerPage : '10', 10) || 10;
    const offset = page * rowsPerPage;

    let whereClauses = ['deleted_at IS NULL']; // Always include the check for non-deleted records
    let queryConfig: (string | number)[] = [];

    if (searchQuery) {
      whereClauses.push('title LIKE ?');
      queryConfig.push(`%${searchQuery}%`);
    }

    if (userToken) {
      whereClauses.push('superstar_site_submissions.user_token = ?');
      queryConfig.push(userToken);
    }

    // Add filter for author
    if (authorId) {
      whereClauses.push('superstar_site_submissions.superstar_author_id = ?');
      queryConfig.push(authorId);
    }

    // Add filter for autogenerated
    if (autogenerated !== undefined) {
      whereClauses.push('superstar_site_submissions.autogenerated = ?');
      queryConfig.push(autogenerated === 'true' ? 1 : 0);
    }

    const whereStatement = whereClauses.join(' AND ');
    const query = `
      SELECT 
        superstar_site_submissions.*, 
        users.name,
        sa.author_name, 
        sa.author_username, 
        sa.author_email, 
        sa.author_avatar,
        sa.wp_author_id
      FROM 
        superstar_site_submissions 
      LEFT JOIN 
        users ON users.user_token = superstar_site_submissions.user_token 
      LEFT JOIN 
        superstar_authors sa ON sa.id = superstar_site_submissions.superstar_author_id
      WHERE 
        ${whereStatement} 
      ORDER BY 
        superstar_site_submissions.id DESC 
      LIMIT ? 
      OFFSET ?
    `;

    queryConfig.push(rowsPerPage, offset);

    const [rows] = await connection.query(query, queryConfig);

    let totalCountQuery = 'SELECT COUNT(*) as total FROM superstar_site_submissions';
    if (whereClauses.length > 0) {
      totalCountQuery += ` WHERE ${whereStatement}`;
    }

    const totalCountConfig = queryConfig.slice(0, -2); // Remove limit and offset for total count query
    const [totalCountRows] = await connection.query<TotalCountRow[]>(totalCountQuery, totalCountConfig);
    const totalCount = totalCountRows[0]?.total;

    // Close the MySQL connection
    await connection.end();

    // Send the data as a JSON response
    res.status(200).json({ rows, totalCount });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    // Close the MySQL connection in case of an error, but only if it's still open
    if (connection && connection.end) {
      await connection.end();
    }
  }
};
