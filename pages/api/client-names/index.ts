// pages/api/client-names/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);

    // Get the search parameter if it exists
    const search = req.query.search as string | undefined;

    // Build the SQL query with optional search filter
    let query = `
      SELECT client_id, client_name 
      FROM clients
      WHERE is_active = 1
    `;
    
    const queryParams = [];
    
    // Add search filter if provided
    if (search) {
      query += ` AND client_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }
    
    // Add order by clause
    query += ` ORDER BY client_name ASC`;

    // Execute the query
    const [clientNames] = await connection.query(query, queryParams);
    
    // Close the database connection
    await connection.end();

    // Return the client names as JSON
    res.status(200).json(clientNames);
  } catch (error) {
    console.error('Error fetching client names:', error);
    res.status(500).json({ error: 'Failed to fetch client names' });
  }
}