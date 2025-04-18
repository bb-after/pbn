import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid client ID' });
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
    switch (req.method) {
      case 'GET':
        return await getClient(req, res, connection, id);
      case 'PUT':
        return await updateClient(req, res, connection, id);
      case 'DELETE':
        return await deleteClient(req, res, connection, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in client API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await connection.end();
  }
}

async function getClient(
  req: NextApiRequest,
  res: NextApiResponse,
  connection: mysql.Connection,
  id: string
) {
  // Get client data
  const [clientRows] = await connection.execute(
    'SELECT client_id, client_name, is_active, created_at, updated_at FROM clients WHERE client_id = ?',
    [id]
  );

  if (!Array.isArray(clientRows) || clientRows.length === 0) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const client = clientRows[0];

  // Get industry mappings
  const [industryRows] = await connection.execute(
    `SELECT i.industry_id, i.industry_name
     FROM clients_industry_mapping cim
     JOIN industries i ON cim.industry_id = i.industry_id
     WHERE cim.client_id = ?`,
    [id]
  );

  // Get region mappings
  const [regionRows] = await connection.execute(
    `SELECT r.region_id, r.region_name, r.region_type
     FROM clients_region_mapping crm
     JOIN geo_regions r ON crm.region_id = r.region_id
     WHERE crm.client_id = ?`,
    [id]
  );

  // Get statistics
  const [statsRows] = await connection.execute(
    `SELECT 
       COUNT(DISTINCT ss.id) as total_submissions,
       COUNT(DISTINCT CASE WHEN ss.autogenerated = 1 THEN ss.id END) as auto_count,
       COUNT(DISTINCT CASE WHEN ss.autogenerated = 0 THEN ss.id END) as manual_count
     FROM clients c
     LEFT JOIN superstar_site_submissions ss ON c.client_id = ss.client_id
     WHERE c.client_id = ?
     GROUP BY c.client_id`,
    [id]
  );

  const stats =
    Array.isArray(statsRows) && statsRows.length > 0
      ? statsRows[0]
      : { total_submissions: 0, auto_count: 0, manual_count: 0 };

  return res.status(200).json({
    ...client,
    industries: industryRows,
    regions: regionRows,
    stats,
  });
}

async function updateClient(
  req: NextApiRequest,
  res: NextApiResponse,
  connection: mysql.Connection,
  id: string
) {
  const { clientName, isActive, industries = [], regions = [] } = req.body;

  if (!clientName) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  // Check if client exists
  const [existingClients] = await connection.execute(
    'SELECT client_id FROM clients WHERE client_id = ?',
    [id]
  );

  if (!Array.isArray(existingClients) || existingClients.length === 0) {
    return res.status(404).json({ error: 'Client not found' });
  }

  // Check for duplicate client names (excluding this client)
  const [duplicateClients] = await connection.execute(
    'SELECT client_id FROM clients WHERE client_name = ? AND client_id != ?',
    [clientName, id]
  );

  if (Array.isArray(duplicateClients) && duplicateClients.length > 0) {
    return res.status(409).json({ error: 'Another client with this name already exists' });
  }

  try {
    await connection.beginTransaction();

    // Update client
    await connection.execute(
      'UPDATE clients SET client_name = ?, is_active = ? WHERE client_id = ?',
      [clientName, isActive, id]
    );

    // Delete existing industry mappings
    await connection.execute('DELETE FROM clients_industry_mapping WHERE client_id = ?', [id]);

    // Insert new industry mappings
    if (industries.length > 0) {
      const industryValues = industries.map((industryId: any) => [id, industryId]);
      await connection.query(
        'INSERT INTO clients_industry_mapping (client_id, industry_id) VALUES ?',
        [industryValues]
      );
    }

    // Delete existing region mappings
    await connection.execute('DELETE FROM clients_region_mapping WHERE client_id = ?', [id]);

    // Insert new region mappings
    if (regions.length > 0) {
      const regionValues = regions.map((regionId: any) => [id, regionId]);
      await connection.query('INSERT INTO clients_region_mapping (client_id, region_id) VALUES ?', [
        regionValues,
      ]);
    }

    await connection.commit();

    return res.status(200).json({
      clientId: id,
      clientName,
      isActive,
      industries,
      regions,
      message: 'Client updated successfully',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating client:', error);
    return res.status(500).json({ error: 'Failed to update client' });
  }
}

async function deleteClient(
  req: NextApiRequest,
  res: NextApiResponse,
  connection: mysql.Connection,
  id: string
) {
  // Check if client exists
  const [existingClients] = await connection.execute(
    'SELECT client_id FROM clients WHERE client_id = ?',
    [id]
  );

  if (!Array.isArray(existingClients) || existingClients.length === 0) {
    return res.status(404).json({ error: 'Client not found' });
  }

  // Check if client is referenced in superstar_site_submissions
  const [references] = await connection.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM superstar_site_submissions WHERE client_id = ?',
    [id]
  );

  const count = references[0]?.count ?? 0;

  if (count > 0) {
    // Instead of deleting, mark as inactive
    await connection.execute('UPDATE clients SET is_active = 0 WHERE client_id = ?', [id]);

    return res.status(200).json({
      message:
        'Client has associated submissions and cannot be deleted. It has been marked as inactive instead.',
    });
  }

  try {
    await connection.beginTransaction();

    // Delete industry mappings
    await connection.execute('DELETE FROM clients_industry_mapping WHERE client_id = ?', [id]);

    // Delete region mappings
    await connection.execute('DELETE FROM clients_region_mapping WHERE client_id = ?', [id]);

    // Delete client
    await connection.execute('DELETE FROM clients WHERE client_id = ?', [id]);

    await connection.commit();

    return res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting client:', error);
    return res.status(500).json({ error: 'Failed to delete client' });
  }
}
