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

  // Get query parameters
  const { topic_id, industry_id, region_id } = req.query;

  if (!topic_id && !industry_id && !region_id) {
    return res.status(400).json({ error: 'One of topic_id, industry_id, or region_id is required' });
  }

  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);

    // Different query depending on which parameter was provided
    let query = '';
    let params: (string | string[])[] = [];

    if (topic_id) {
      // Fetch blogs by topic - using existing query
      query = `
        SELECT 
          ss.id, 
          ss.domain
        FROM 
          superstar_sites ss
        JOIN 
          superstar_sites_article_topic_mapping sstm 
          ON ss.id = sstm.superstar_site_id
        WHERE 
          sstm.topic_id = ?
          AND ss.active = 1
        ORDER BY 
          ss.domain ASC
      `;
      params = [topic_id];
    } else if (industry_id) {
      // Fetch blogs by industry
      query = `
        SELECT 
          ss.id, 
          ss.domain
        FROM 
          superstar_sites ss
        JOIN 
          superstar_sites_industry_mapping ssim ON ss.id = ssim.superstar_site_id
        WHERE 
          ssim.industry_id = ?
          AND ss.active = 1
        ORDER BY 
          ss.domain ASC
      `;
      params = [industry_id];
    } else if (region_id) {
      // Fetch blogs by region
      query = `
        SELECT 
          ss.id, 
          ss.domain
        FROM 
          superstar_sites ss
        JOIN 
          superstar_sites_geo_mapping ssgm ON ss.id = ssgm.superstar_site_id
        WHERE 
          ssgm.region_id = ?
          AND ss.active = 1
        ORDER BY 
          ss.domain ASC
      `;
      params = [region_id];
    }

    // Execute the query
    const [blogs] = await connection.query(query, params);

    // Close the database connection
    await connection.end();

    // Return the blogs as JSON
    res.status(200).json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
}