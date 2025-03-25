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

    // Fetch all topics with blog counts
    const [topics] = await connection.query(`
      SELECT 
        at.topic_id, 
        at.topic_title,
        COUNT(DISTINCT ssatm.superstar_site_id) as blog_count
      FROM 
        article_topics at
      LEFT JOIN 
        superstar_sites_article_topic_mapping ssatm ON at.topic_id = ssatm.topic_id
      GROUP BY 
        at.topic_id, at.topic_title
      ORDER BY 
        at.topic_title ASC
    `);

    // Close the database connection
    await connection.end();

    // Return the topics as JSON
    res.status(200).json(topics);
  } catch (error) {
    console.error('Error fetching article topics:', error);
    res.status(500).json({ error: 'Failed to fetch article topics' });
  }
}