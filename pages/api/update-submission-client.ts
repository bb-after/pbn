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
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId, clientId } = req.body;

  if (!submissionId) {
    return res.status(400).json({ error: 'Submission ID is required' });
  }

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Update the client assignment
    const [result] = await connection.execute(
      'UPDATE superstar_site_submissions SET client_id = ?, modified_at = NOW() WHERE id = ?',
      [clientId, submissionId]
    );

    if ((result as any).affectedRows === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Submission not found' });
    }

    await connection.end();

    return res.status(200).json({
      message: 'Client assignment updated successfully',
      submissionId,
      clientId,
    });
  } catch (error: any) {
    console.error('Error updating client assignment:', error);

    if (connection && connection.end) {
      await connection.end();
    }

    return res.status(500).json({
      error: 'Failed to update client assignment',
      details: error.message,
    });
  }
}
