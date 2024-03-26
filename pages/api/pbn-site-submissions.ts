// pages/api/pbn-site-submissions.js

import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket, FieldPacket } from 'mysql2';

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

    let query;
    let queryConfig;
    const page = parseInt(typeof req.query.page === 'string' ? req.query.page : '0', 10) || 0;
    const rowsPerPage = parseInt(typeof req.query.rowsPerPage === 'string' ? req.query.rowsPerPage : '10', 10) || 10;
    const offset = page * rowsPerPage;
    
    let whereClauses = ['deleted_at is null']; // Always include the check for non-deleted records
    if (searchQuery) {
      whereClauses.push('title LIKE ?');
      queryConfig = [`%${searchQuery}%`];
    }
    if (userToken) {
      whereClauses.push('pbn_site_submissions.user_token = ?');
      queryConfig = queryConfig ? [...queryConfig, userToken] : [userToken];
    }
    const whereStatement = whereClauses.join(' AND ');
  
    query = `SELECT pbn_site_submissions.*, users.name FROM pbn_site_submissions JOIN users ON users.user_token = pbn_site_submissions.user_token WHERE ${whereStatement} ORDER BY pbn_site_submissions.id DESC LIMIT ? OFFSET ?`;
    queryConfig = queryConfig ? [...queryConfig, rowsPerPage, offset] : [rowsPerPage, offset];


    const [rows] = await connection.query(query, queryConfig);  

    let totalCountQuery = 'SELECT COUNT(*) as total FROM pbn_site_submissions';
    if (whereClauses.length > 0) {
      totalCountQuery += ` WHERE ${whereStatement}`;
    }
    
    // Reuse queryConfig without limit and offset for total count
    const totalCountConfig = queryConfig.slice(0, -2);
    const [totalCountRows] = await connection.query(totalCountQuery, totalCountConfig) as [RowDataPacket[], FieldPacket[]];
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
