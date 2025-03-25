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

  // Check if we should include blog counts
  const withCount = req.query.with_count === 'true';

  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);

    // Build the query based on parameters
    let query = `
      SELECT 
        i.industry_id, 
        i.industry_name
    `;

    // Add blog count if requested
    if (withCount) {
      query += `,
        COUNT(DISTINCT ssim.superstar_site_id) as blog_count`;
    }

    query += `
      FROM 
        industries i
    `;

    // Add join for blog count
    if (withCount) {
      query += `
      LEFT JOIN 
        superstar_sites_industry_mapping ssim ON i.industry_id = ssim.industry_id
      `;
    }

    // Add group by and order by
    query += `
      GROUP BY 
        i.industry_id, i.industry_name
      ORDER BY 
        i.industry_name ASC
    `;

    // Execute the query
    const [industries] = await connection.query(query);

    // Close the database connection
    await connection.end();

    // Return the industries as JSON
    res.status(200).json(industries);
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
}