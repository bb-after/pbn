import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { topic_id, industry_id, region_id, client_id } = req.query;

  if (!topic_id && !industry_id && !region_id) {
    return res.status(400).json({ error: 'At least one filter parameter is required' });
  }

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
    let query = '';
    let params: any[] = [];

    if (topic_id) {
      // Blogs by topic
      query = `
        SELECT DISTINCT s.id, s.domain,
        (
          SELECT COUNT(*) 
          FROM superstar_site_submissions sss 
          WHERE sss.superstar_site_id = s.id 
          ${client_id ? 'AND sss.client_id = ?' : ''}
        ) as post_count
        FROM superstar_sites s
        JOIN superstar_sites_article_topic_mapping stm ON s.id = stm.superstar_site_id
        WHERE stm.topic_id = ?
      `;

      if (client_id) {
        params.push(client_id);
      }
      params.push(topic_id);
    } else if (industry_id) {
      // Blogs by industry
      query = `
        SELECT DISTINCT s.id, s.domain,
        (
          SELECT COUNT(*) 
          FROM superstar_site_submissions sss 
          WHERE sss.superstar_site_id = s.id 
          ${client_id ? 'AND sss.client_id = ?' : ''}
        ) as post_count
        FROM superstar_sites s
        JOIN superstar_sites_industry_mapping sim ON s.id = sim.superstar_site_id
        WHERE sim.industry_id = ?
      `;

      if (client_id) {
        params.push(client_id);
      }
      params.push(industry_id);
    } else if (region_id) {
      // Blogs by region
      query = `
        SELECT DISTINCT s.id, s.domain,
        (
          SELECT COUNT(*) 
          FROM superstar_site_submissions sss 
          WHERE sss.superstar_site_id = s.id 
          ${client_id ? 'AND sss.client_id = ?' : ''}
        ) as post_count
        FROM superstar_sites s
        JOIN superstar_sites_geo_mapping ssgm ON s.id = ssgm.superstar_site_id
        WHERE ssgm.region_id = ?
      `;

      if (client_id) {
        params.push(client_id);
      }
      params.push(region_id);
    }

    const [rows] = await connection.execute(query, params);
    await connection.end();

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    await connection.end();
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
