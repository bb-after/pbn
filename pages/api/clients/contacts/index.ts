import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user token for all routes except GET for client portal access
  // const userInfo = await validateUserToken(req);
  // if (!userInfo.isValid) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  switch (req.method) {
    case 'GET':
      return getClientContacts(req, res);
    case 'POST':
      return createClientContact(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all contacts for a specific client
async function getClientContacts(req: NextApiRequest, res: NextApiResponse) {
  const { client_id } = req.query;

  if (!client_id) {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    const query = `
      SELECT 
        contact_id, 
        client_id, 
        name, 
        job_title,
        email, 
        phone, 
        is_active, 
        created_at, 
        updated_at
      FROM 
        client_contacts
      WHERE 
        client_id = ?
      ORDER BY 
        name ASC
    `;

    const [rows] = await pool.query(query, [client_id]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching client contacts:', error);
    return res.status(500).json({ error: 'Failed to fetch client contacts' });
  }
}

// Create a new client contact
async function createClientContact(req: NextApiRequest, res: NextApiResponse) {
  const { client_id, name, job_title, email, phone, is_active = true } = req.body;

  if (!client_id || !name || !email) {
    return res.status(400).json({ error: 'Client ID, name, and email are required' });
  }

  try {
    // First validate that the client exists
    const [clientRows] = await pool.query('SELECT client_id FROM clients WHERE client_id = ?', [
      client_id,
    ]);

    if ((clientRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const query = `
      INSERT INTO client_contacts 
        (client_id, name, job_title, email, phone, is_active) 
      VALUES 
        (?, ?, ?, ?, ?, ?)
    `;

    const values = [client_id, name, job_title || null, email, phone || null, is_active ? 1 : 0];
    const [result] = await pool.query(query, values);

    // Get the inserted record
    const [insertedRows] = await pool.query(
      'SELECT contact_id, client_id, name, job_title, email, phone, is_active, created_at, updated_at FROM client_contacts WHERE contact_id = ?',
      [(result as any).insertId]
    );

    return res.status(201).json((insertedRows as any[])[0]);
  } catch (error) {
    console.error('Error creating client contact:', error);

    // Check for duplicate email error
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return res.status(409).json({ error: 'A contact with this email already exists' });
    }

    return res.status(500).json({ error: 'Failed to create client contact' });
  }
}
