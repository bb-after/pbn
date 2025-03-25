import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { client_id, type } = req.query;
  
  if (!client_id || Array.isArray(client_id)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }

  if (type !== 'industries' && type !== 'regions' && type !== 'all') {
    return res.status(400).json({ error: 'Type must be industries, regions, or all' });
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    let industries: mysql.RowDataPacket[] = [];
    let regions: mysql.RowDataPacket[] = [];

    if (type === 'industries' || type === 'all') {
      const [industryRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT i.industry_id, i.industry_name
         FROM clients_industry_mapping cim
         JOIN industries i ON cim.industry_id = i.industry_id
         WHERE cim.client_id = ?`,
        [client_id]
      );
      industries = industryRows;
    }

    if (type === 'regions' || type === 'all') {
      const [regionRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT r.region_id, r.region_name, r.region_type, r.parent_region_id
         FROM clients_region_mapping crm
         JOIN geo_regions r ON crm.region_id = r.region_id
         WHERE crm.client_id = ?`,
        [client_id]
      );
      regions = regionRows;
    }

    return res.status(200).json({
      client_id,
      ...(type === 'industries' || type === 'all' ? { industries } : {}),
      ...(type === 'regions' || type === 'all' ? { regions } : {})
    });
  } catch (error) {
    console.error('Error fetching client mappings:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await connection.end();
  }
}