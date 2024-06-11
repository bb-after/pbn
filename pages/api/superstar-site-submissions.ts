// pages/api/superstar-site-submissions.ts

import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

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
    // Check for the search query parameter and userToken parameter
    const searchQuery = req.query.search;
    const userToken = req.query.userToken;

    const page = parseInt(typeof req.query.page === 'string' ? req.query.page : '0', 10) || 0;
    const rowsPerPage = parseInt(typeof req.query.rowsPerPage === 'string' ? req.query.rowsPerPage : '10', 10) || 10;
    const offset = page * rowsPerPage;

    let whereClauses = ['deleted_at IS NULL']; // Always include the check for non-deleted records
    let queryConfig = [];

    if (searchQuery) {
      whereClauses.push('title LIKE ?');
      queryConfig.push(`%${searchQuery}%`);
    }

    if (userToken) {
      whereClauses.push('superstar_site_submissions.user_token = ?');
      queryConfig.push(userToken);
    }

    const whereStatement = whereClauses.join(' AND ');
    const query = `
      SELECT superstar_site_submissions.*, users.name 
      FROM superstar_site_submissions 
      LEFT JOIN users ON users.user_token = superstar_site_submissions.user_token 
      WHERE ${whereStatement} 
      ORDER BY superstar_site_submissions.id DESC 
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
    const [totalCountRows] = await connection.query(totalCountQuery, totalCountConfig);
    const totalCount = totalCountRows[0]?.total;

    // Close the MySQL connection
    await connection.end();

    // Send the data as a JSON response
    res.status(200).json({ rows, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    // Close the MySQL connection in case of an error, but only if it's still open
    if (connection && connection.end) {
      await connection.end();
    }
  }
};
