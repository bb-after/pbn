// pages/api/getUsers.ts

import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';

const getSuperstarUsersHandler = async (req: NextApiRequest, res: NextApiResponse) => {
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
  
    let query = 'SELECT users.name, users.user_token, count(*) as `superstar_count` FROM users join superstar_site_submissions on users.user_token = superstar_site_submissions.user_token where users.user_token IS NOT NULL and superstar_site_submissions.deleted_at IS NULL group by superstar_site_submissions.user_token HAVING COUNT(*) > 0 order by name ASC';
    const [rows] = await connection.query(query);  

    // Close the MySQL connection
    await connection.end();

    // Send the data as a JSON response
    res.status(200).json({ rows });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
      // Close the MySQL connection in case of an error, but only if it's still open
    if (connection && connection.end) {
      await connection.end();
    }
  }
};

export default getSuperstarUsersHandler;
