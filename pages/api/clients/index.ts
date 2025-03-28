import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    switch (req.method) {
      case 'GET':
        return await getClients(req, res, connection);
      case 'POST':
        return await createClient(req, res, connection);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in clients API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await connection.end();
  }
}

async function getClients(req: NextApiRequest, res: NextApiResponse, connection: mysql.Connection) {
  const { search, active, includeStats } = req.query;

  let query = `
    SELECT c.client_id, c.client_name, c.is_active, c.created_at, c.updated_at
  `;

  if (includeStats === 'true') {
    query += `
      , (SELECT COUNT(*) FROM superstar_site_submissions WHERE client_id = c.client_id) as superstar_posts
      , (SELECT COUNT(*) FROM pbn_site_submissions WHERE client_id = c.client_id) as pbn_posts
    `;
  }

  query += ` FROM clients c `;

  if (includeStats === 'true') {
    query += `
      LEFT JOIN superstar_site_submissions ss ON c.client_id = ss.client_id
      LEFT JOIN pbn_site_submissions ps ON c.client_id = ps.client_id
    `;
  }

  let whereConditions = [];

  if (search) {
    whereConditions.push(`c.client_name LIKE ?`);
  }

  if (active === 'true') {
    whereConditions.push(`c.is_active = 1`);
  } else if (active === 'false') {
    whereConditions.push(`c.is_active = 0`);
  }

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  if (includeStats === 'true') {
    query += ` GROUP BY c.client_id`;
  }

  query += ` ORDER BY c.client_name ASC`;

  const params = [];
  if (search) {
    params.push(`%${search}%`);
  }

  const [rows] = await connection.execute(query, params);
  return res.status(200).json(rows);
}

async function createClient(
  req: NextApiRequest,
  res: NextApiResponse,
  connection: mysql.Connection
) {
  const { clientName, isActive = 1, industries = [], regions = [] } = req.body;

  if (!clientName) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  // Check for duplicate client names
  const [existingClients] = await connection.execute(
    'SELECT client_id FROM clients WHERE client_name = ?',
    [clientName]
  );

  if (Array.isArray(existingClients) && existingClients.length > 0) {
    return res.status(409).json({ error: 'A client with this name already exists' });
  }

  try {
    await connection.beginTransaction();

    // Insert client
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      'INSERT INTO clients (client_name, is_active) VALUES (?, ?)',
      [clientName, isActive]
    );

    const clientId = (result as mysql.ResultSetHeader).insertId;

    // Insert industry mappings
    if (industries.length > 0) {
      const industryValues = industries.map((id: any) => [clientId, id]);
      await connection.query(
        'INSERT INTO clients_industry_mapping (client_id, industry_id) VALUES ?',
        [industryValues]
      );
    }

    // Insert region mappings
    if (regions.length > 0) {
      const regionValues = regions.map((id: any) => [clientId, id]);
      await connection.query('INSERT INTO clients_region_mapping (client_id, region_id) VALUES ?', [
        regionValues,
      ]);
    }

    await connection.commit();

    return res.status(201).json({
      clientId,
      clientName,
      isActive,
      industries,
      regions,
      message: 'Client created successfully',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating client:', error);
    return res.status(500).json({ error: 'Failed to create client' });
  }
}
