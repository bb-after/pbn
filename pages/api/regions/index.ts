import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Fetch all regions
    const [rows] = await connection.execute(
      `SELECT region_id, region_name, region_type, parent_region_id
       FROM geo_regions
       ORDER BY region_name ASC`
    );

    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('Error fetching regions:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch regions',
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
