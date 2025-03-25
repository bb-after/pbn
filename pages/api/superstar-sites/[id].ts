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

      // Additionally fetch industry and region mappings
      const [industryRows] = await connection.query<RowDataPacket[]>(
        `SELECT i.industry_id, i.industry_name
         FROM superstar_sites_industry_mapping sim
         JOIN industries i ON sim.industry_id = i.industry_id
         WHERE sim.superstar_site_id = ?`,
        [id]
      );

      const [regionRows] = await connection.query<RowDataPacket[]>(
        `SELECT r.region_id, r.region_name, r.region_type, r.parent_region_id
         FROM superstar_sites_geo_mapping sgm
         JOIN geo_regions r ON sgm.region_id = r.region_id
         WHERE sgm.superstar_site_id = ?`,
        [id]
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Site not found' });
      } else {
        const site = rows[0];
        const topicsArray = site.topics ? site.topics.split(',') : [];
        res.status(200).json({
          ...site,
          topics: topicsArray,
          industries: industryRows,
          regions: regionRows,
        });
      }
    } else if (req.method === 'PUT') {
      const {
        topics,
        wpUsername,
        wpPassword,
        wpAppPassword,
        active,
        customPrompt,
        industries,
        regions,
      } = req.body;

      try {
        // Start a transaction
        await connection.beginTransaction();

        // Update the superstar_sites table with the new login, password, and custom prompt information
        await connection.query(
          'UPDATE superstar_sites SET login = ?, hosting_site = ?, password = ?, active = ?, custom_prompt = ?, modified = NOW() WHERE id = ?',
          [wpUsername, wpPassword, wpAppPassword, active, customPrompt, id]
        );

        // Delete existing topics
        await connection.query('DELETE FROM superstar_site_topics WHERE superstar_site_id = ?', [
          id,
        ]);

        // Insert new topics
        for (const topic of topics) {
          await connection.query(
            'INSERT INTO superstar_site_topics (superstar_site_id, topic) VALUES (?, ?)',
            [id, topic]
          );
        }

        // Update industry mappings
        // Delete existing mappings
        await connection.query(
          'DELETE FROM superstar_sites_industry_mapping WHERE superstar_site_id = ?',
          [id]
        );

        // Insert new industry mappings
        if (industries && industries.length > 0) {
          const industryValues = industries.map((industryId: number) => [id, industryId]);
          await connection.query(
            'INSERT INTO superstar_sites_industry_mapping (superstar_site_id, industry_id) VALUES ?',
            [industryValues]
          );
        }

        // Update region mappings
        // Delete existing mappings
        await connection.query(
          'DELETE FROM superstar_sites_geo_mapping WHERE superstar_site_id = ?',
          [id]
        );

        // Insert new region mappings
        if (regions && regions.length > 0) {
          const regionValues = regions.map((regionId: number) => [id, regionId]);
          await connection.query(
            'INSERT INTO superstar_sites_geo_mapping (superstar_site_id, region_id) VALUES ?',
            [regionValues]
          );
        }

        // Commit the transaction
        await connection.commit();

        res.status(200).json({ message: 'Site updated successfully' });
      } catch (error) {
        // Rollback the transaction if there was an error
        await connection.rollback();
        throw error;
      }
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
