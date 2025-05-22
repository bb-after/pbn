import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { query, transaction } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getClients(req, res);
      case 'POST':
        return await createClient(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in clients API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getClients(req: NextApiRequest, res: NextApiResponse) {
  const { search, active, includeStats, industryId, regionId } = req.query;

  // Main client query with optimized stats using single pass aggregation
  let queryText = `
    SELECT 
      c.client_id, 
      c.client_name, 
      c.is_active, 
      c.created_at, 
      c.updated_at
  `;

  if (includeStats === 'true') {
    queryText = `
      SELECT 
        c.client_id, 
        c.client_name, 
        c.is_active, 
        c.created_at, 
        c.updated_at,
        COUNT(DISTINCT ss.id) as superstar_posts,
        COUNT(DISTINCT ps.id) as pbn_posts
    `;
  }

  queryText += ` FROM clients c `;

  // Add joins for filtering by industry or region
  if (industryId) {
    queryText += ` JOIN clients_industry_mapping cim ON c.client_id = cim.client_id `;
  }

  if (regionId) {
    queryText += ` JOIN clients_region_mapping crm ON c.client_id = crm.client_id `;
  }

  // Left joins for stats - only add if includeStats is true
  if (includeStats === 'true') {
    queryText += `
      LEFT JOIN superstar_site_submissions ss ON c.client_id = ss.client_id
      LEFT JOIN pbn_site_submissions ps ON c.client_id = ps.client_id
    `;
  }

  let whereConditions = [];
  const params = [];

  if (search) {
    whereConditions.push(`c.client_name LIKE ?`);
    params.push(`%${search}%`);
  }

  if (active === 'true') {
    whereConditions.push(`c.is_active = 1`);
  } else if (active === 'false') {
    whereConditions.push(`c.is_active = 0`);
  }

  if (industryId) {
    whereConditions.push(`cim.industry_id = ?`);
    params.push(industryId);
  }

  if (regionId) {
    whereConditions.push(`crm.region_id = ?`);
    params.push(regionId);
  }

  if (whereConditions.length > 0) {
    queryText += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  if (includeStats === 'true') {
    queryText += ` GROUP BY c.client_id, c.client_name, c.is_active, c.created_at, c.updated_at`;
  }

  queryText += ` ORDER BY c.client_name ASC`;

  // Execute the main client query using our DB utility
  const [rows] = await query<RowDataPacket[]>(queryText, params);
  const clients = Array.isArray(rows) ? rows : [];

  // Fetch all industries and regions in bulk instead of per client
  const clientIds = clients.map((client: any) => client.client_id);

  let industriesMap = new Map();
  let regionsMap = new Map();

  if (clientIds.length > 0) {
    // Bulk fetch industries for all clients
    const [industryRows] = await query<RowDataPacket[]>(
      `SELECT cim.client_id, i.industry_id, i.industry_name
       FROM clients_industry_mapping cim
       JOIN industries i ON cim.industry_id = i.industry_id
       WHERE cim.client_id IN (?)`,
      [clientIds]
    );

    // Group industries by client_id
    industryRows.forEach((row: any) => {
      if (!industriesMap.has(row.client_id)) {
        industriesMap.set(row.client_id, []);
      }
      industriesMap.get(row.client_id).push({
        industry_id: row.industry_id,
        industry_name: row.industry_name,
      });
    });

    // Bulk fetch regions for all clients
    const [regionRows] = await query<RowDataPacket[]>(
      `SELECT crm.client_id, r.region_id, r.region_name, r.region_type
       FROM clients_region_mapping crm
       JOIN geo_regions r ON crm.region_id = r.region_id
       WHERE crm.client_id IN (?)`,
      [clientIds]
    );

    // Group regions by client_id
    regionRows.forEach((row: any) => {
      if (!regionsMap.has(row.client_id)) {
        regionsMap.set(row.client_id, []);
      }
      regionsMap.get(row.client_id).push({
        region_id: row.region_id,
        region_name: row.region_name,
        region_type: row.region_type,
      });
    });
  }

  // Map the industries and regions to each client
  const clientsWithMappings = clients.map((client: any) => ({
    ...client,
    industries: industriesMap.get(client.client_id) || [],
    regions: regionsMap.get(client.client_id) || [],
  }));

  return res.status(200).json(clientsWithMappings);
}

async function createClient(req: NextApiRequest, res: NextApiResponse) {
  const { clientName, isActive = 1, industries = [], regions = [] } = req.body;

  if (!clientName) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  // Check for duplicate client names
  const [existingClients] = await query<RowDataPacket[]>(
    'SELECT client_id FROM clients WHERE client_name = ?',
    [clientName]
  );

  if (Array.isArray(existingClients) && existingClients.length > 0) {
    return res.status(409).json({ error: 'A client with this name already exists' });
  }

  // Use transaction helper for the multi-statement operation
  try {
    const result = await transaction(async connection => {
      // Insert client
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO clients (client_name, is_active) VALUES (?, ?)',
        [clientName, isActive]
      );

      const clientId = result.insertId;

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
        await connection.query(
          'INSERT INTO clients_region_mapping (client_id, region_id) VALUES ?',
          [regionValues]
        );
      }

      return {
        clientId,
        clientName,
        isActive,
        industries,
        regions,
        message: 'Client created successfully',
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ error: 'Failed to create client' });
  }
}
