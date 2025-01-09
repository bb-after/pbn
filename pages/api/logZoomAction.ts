import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

    // Create a MySQL connection
  const connection = await mysql.createConnection(dbConfig);
  const { userToken, action, imageUrl } = req.body;

  if (!userToken || !action || !imageUrl) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const query = `
      INSERT INTO zoom_background_actions (user_token, action, image_url)
      VALUES (?, ?, ?)
    `;
    await connection.execute(query, [userToken, action, imageUrl]);
    // Close the MySQL connection
    await connection.end();
    
    res.status(200).json({ message: 'Action logged successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
