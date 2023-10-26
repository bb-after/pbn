// pages/api/pbn-site-submissions.js

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

  try {
    // Create a MySQL connection
    const connection = await mysql.createConnection(dbConfig);

    // Check for the search query parameter
    const searchQuery = req.query.search;

    let query;
    let queryConfig: string[];

    if (searchQuery) {
      // If a query parameter is provided, use it to filter the results
      query = 'SELECT * FROM pbn_site_submissions WHERE title LIKE ? ORDER BY id DESC';
      queryConfig = [`%${searchQuery}%`]; // using a parameterized query to prevent SQL injection
    } else {
      // If no query parameter, select all entries
      query = 'SELECT * FROM pbn_site_submissions ORDER BY id DESC';
      queryConfig = [];
    }

    // Execute the query with the provided configuration
    const [rows] = await connection.query(query, queryConfig);  
    
    // Fetch data from the pbn_site_submissions table
    // const [rows] = await connection.query('SELECT * FROM pbn_site_submissions order by id DESC');

    // Close the MySQL connection
    await connection.end();

    // Send the data as a JSON response
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
