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

    // Fetch data from the pbn_site_submissions table
    const [rows] = await connection.query('SELECT * FROM pbn_site_submissions order by id DESC');

    // Close the MySQL connection
    await connection.end();

    // Send the data as a JSON response
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
