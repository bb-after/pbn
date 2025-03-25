import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Interface for regions
interface Region {
  region_id: number;
  region_name: string;
  region_type: string;
  parent_region_id: number | null;
  blog_count?: number;
  sub_regions?: Region[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Query parameters
  const withCount = req.query.with_count === 'true';
  const withHierarchy = req.query.with_hierarchy === 'true';

  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);

    // Query to fetch regions
    let query = `
      SELECT 
        gr.region_id, 
        gr.region_name,
        gr.region_type,
        gr.parent_region_id
    `;

    // Add blog count if requested
    if (withCount) {
      query += `,
        COUNT(DISTINCT ssgm.superstar_site_id) as blog_count`;
    }

    query += `
      FROM 
        geo_regions gr
    `;

    // Join with mappings if count is requested
    if (withCount) {
      query += `
      LEFT JOIN 
        superstar_sites_geo_mapping ssgm ON gr.region_id = ssgm.region_id
      `;
    }

    // Group by and order
    query += `
      GROUP BY 
        gr.region_id, gr.region_name, gr.region_type, gr.parent_region_id
      ORDER BY 
        gr.parent_region_id IS NULL DESC, gr.region_name ASC
    `;

    // Execute the query
    const [rows] = await connection.query(query);

    // Process the results
    let result;
    if (withHierarchy) {
      // Convert flat list to hierarchical structure
      const flatRegions = rows as Region[];
      // First get all top-level regions (continents)
      const continents = flatRegions.filter(r => r.parent_region_id === null);
      
      // Add sub-regions to their parents
      continents.forEach(continent => {
        continent.sub_regions = flatRegions.filter(r => r.parent_region_id === continent.region_id);
      });
      
      result = continents;
    } else {
      result = rows;
    }

    // Close the database connection
    await connection.end();

    // Return the regions as JSON
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching geographic regions:', error);
    res.status(500).json({ error: 'Failed to fetch geographic regions' });
  }
}