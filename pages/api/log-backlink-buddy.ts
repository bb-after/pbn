import { NextApiRequest, NextApiResponse } from 'next';
import * as mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { userToken, clientId, clientName, actionType, articleCount, details } = req.body;

  // Validate required fields
  if (!userToken || !actionType) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: userToken and actionType are required' });
  }

  // Validate action type
  const validActionTypes = ['content_generation', 'publish', 'regenerate'];
  if (!validActionTypes.includes(actionType)) {
    return res
      .status(400)
      .json({ error: `Invalid actionType. Must be one of: ${validActionTypes.join(', ')}` });
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Insert log entry
    await connection.execute(
      'INSERT INTO backlink_buddy_logs (user_token, client_id, client_name, action_type, article_count, details) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userToken,
        clientId || null,
        clientName || null,
        actionType,
        articleCount || 1,
        JSON.stringify(details || {}),
      ]
    );

    await connection.end();
    return res.status(200).json({ success: true, message: 'Activity logged successfully' });
  } catch (error: any) {
    console.error('Error logging backlink buddy activity:', error);

    if (connection) {
      await connection.end();
    }

    return res.status(500).json({ error: 'Failed to log activity', details: error.message });
  }
}
