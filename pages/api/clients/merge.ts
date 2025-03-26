import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sourceClientId, targetClientId } = req.body;

  if (!sourceClientId || !targetClientId) {
    return res.status(400).json({ error: 'Source and target client IDs are required' });
  }

  if (sourceClientId === targetClientId) {
    return res.status(400).json({ error: 'Source and target clients must be different' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    // Update superstar_site_submissions
    await connection.execute(
      'UPDATE superstar_site_submissions SET client_id = ? WHERE client_id = ?',
      [targetClientId, sourceClientId]
    );

    // Also update client_name field in superstar_site_submissions to maintain compatibility
    // Get the target client name
    const [targetClientRows] = await connection.execute(
      'SELECT client_name FROM clients WHERE client_id = ?',
      [targetClientId]
    );

    if (Array.isArray(targetClientRows) && targetClientRows.length > 0) {
      const targetClientName = (targetClientRows[0] as any).client_name;

      // Update client_name in superstar_site_submissions for records that had the source client_id
      await connection.execute(
        'UPDATE superstar_site_submissions SET client_name = ? WHERE client_id = ?',
        [targetClientName, targetClientId]
      );
    }

    // Update pbn_site_submissions if the table exists
    try {
      await connection.execute(
        'UPDATE pbn_site_submissions SET client_id = ? WHERE client_id = ?',
        [targetClientId, sourceClientId]
      );

      // Also update client_name field in pbn_site_submissions if target client name is available
      if (Array.isArray(targetClientRows) && targetClientRows.length > 0) {
        const targetClientName = (targetClientRows[0] as any).client_name;

        await connection.execute(
          'UPDATE pbn_site_submissions SET client_name = ? WHERE client_id = ?',
          [targetClientName, targetClientId]
        );
      }
    } catch (err) {
      // If the table doesn't exist or doesn't have these columns, just log and continue
      console.warn('Could not update pbn_site_submissions table:', err);
    }

    // Update clients_industry_mapping
    await connection.execute(
      `INSERT IGNORE INTO clients_industry_mapping (client_id, industry_id)
       SELECT ?, industry_id FROM clients_industry_mapping WHERE client_id = ?`,
      [targetClientId, sourceClientId]
    );
    await connection.execute('DELETE FROM clients_industry_mapping WHERE client_id = ?', [
      sourceClientId,
    ]);

    // Update clients_region_mapping
    await connection.execute(
      `INSERT IGNORE INTO clients_region_mapping (client_id, region_id)
       SELECT ?, region_id FROM clients_region_mapping WHERE client_id = ?`,
      [targetClientId, sourceClientId]
    );
    await connection.execute('DELETE FROM clients_region_mapping WHERE client_id = ?', [
      sourceClientId,
    ]);

    // Delete the source client
    await connection.execute('DELETE FROM clients WHERE client_id = ?', [sourceClientId]);

    await connection.commit();
    res.status(200).json({ message: 'Clients merged successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error merging clients:', error);
    res.status(500).json({ error: 'Failed to merge clients' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
