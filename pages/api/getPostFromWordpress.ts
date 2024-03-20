import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';

// Your database connection options
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  try {
  
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM pbn_site_submissions WHERE id = ?', [id]);
    await connection.end();

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: 'Postt not found for id' + id });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
}
