import type { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { generateSuperStarContent } from '../../utils/generateSuperStarContent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get topic and siteId from query parameters
    const topic = (req.query.topic as string) || 'default_topic';
    const siteId = req.query.siteId as string;

    if (!siteId) {
      return res.status(400).json({ success: false, error: 'siteId is required' });
    }

    // Database connection configuration
    const dbConfig = {
      host: process.env.DB_HOST_NAME,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    };

    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);

    // Query to get the site information from the database
    const [sites] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM superstar_sites WHERE id = ?',
      [siteId]
    );

    // Ensure a site was found
    if (sites.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    const site = sites[0]; // Extract the site information

    // Call the function to generate content
    const { title, body } = await generateSuperStarContent(topic, site);

    // Send the generated content back as a response
    res.status(200).json({ success: true, title, body });
  } catch (error: any) {
    // Handle errors and send the error message as a response
    res.status(500).json({ success: false, error: error.message });
  }
}
