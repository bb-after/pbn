import { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const handleRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  // Create a MySQL connection
  const connection = await mysql.createConnection(dbConfig);

  try {
    if (req.method === 'GET') {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT ss.id, domain, login, hosting_site as hosting_site_password,
              password AS application_password, custom_prompt,
                GROUP_CONCAT(topic) AS topics 
         FROM superstar_sites ss 
         LEFT JOIN superstar_site_topics sst 
         ON ss.id = sst.superstar_site_id 
         WHERE ss.id = ? 
         GROUP BY ss.id`,
        [id]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Site not found' });
      } else {
        const site = rows[0];
        const topicsArray = site.topics ? site.topics.split(',') : [];
        res.status(200).json({
          ...site,
          topics: topicsArray
        });
      }
    } else if (req.method === 'PUT') {
      const { topics, wpUsername, wpPassword, wpAppPassword, active, customPrompt } = req.body;
      
      // Update the superstar_sites table with the new login, password, and custom prompt information
      await connection.query(
        'UPDATE superstar_sites SET login = ?, hosting_site = ?, password = ?, active = ?, custom_prompt = ?, modified = NOW() WHERE id = ?',
        [wpUsername, wpPassword, wpAppPassword, active, customPrompt, id]
      );

      // Delete existing topics
      await connection.query('DELETE FROM superstar_site_topics WHERE superstar_site_id = ?', [id]);
      
      // Insert new topics
      for (const topic of topics) {
        await connection.query('INSERT INTO superstar_site_topics (superstar_site_id, topic) VALUES (?, ?)', [id, topic]);
      }

      res.status(200).json({ message: 'Site updated successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch or update data', details: error.message });
  } finally {
    // Close the MySQL connection
    if (connection && connection.end) {
      await connection.end();
    }
  }
};

export default handleRequest;
