// pages/api/pbn-site-submissions.js

import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';

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

    // Check for the search query parameter
    const searchQuery = req.query.search;

    let query;
    let queryConfig;
    const page = parseInt(typeof req.query.page === 'string' ? req.query.page : '0', 10) || 0;
    const rowsPerPage = parseInt(typeof req.query.rowsPerPage === 'string' ? req.query.rowsPerPage : '10', 10) || 10;
    const offset = page * rowsPerPage;
    
    if (searchQuery) {
      query = 'SELECT * FROM pbn_site_submissions JOIN users ON users.user_token = pbn_site_submissions.user_token WHERE title LIKE ? and deleted_at is null ORDER BY pbn_site_submissions.id DESC LIMIT ? OFFSET ?';
      queryConfig = [`%${searchQuery}%`, rowsPerPage, offset];
    } else {
      query = 'SELECT * FROM pbn_site_submissions JOIN users ON users.user_token = pbn_site_submissions.user_token WHERE deleted_at is null ORDER BY pbn_site_submissions.id DESC LIMIT ? OFFSET ?';
      queryConfig = [rowsPerPage, offset];
    }

    const [rows] = await connection.query(query, queryConfig);  

    let totalCountQuery = 'SELECT COUNT(*) as total FROM pbn_site_submissions';
    if (searchQuery) {
        totalCountQuery += ' WHERE title LIKE ?';
        const [totalCountResult] = await connection.query(totalCountQuery, [`%${searchQuery}%`]) as RowDataPacket[];
        var totalCount = totalCountResult[0]?.total;
    } else {
        const [totalCountResult] = await connection.query(totalCountQuery) as RowDataPacket[];
        var totalCount = totalCountResult[0]?.total;
    }
    
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
