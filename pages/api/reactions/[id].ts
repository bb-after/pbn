import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../validate-user-token';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  // Only allow DELETE method
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate reaction ID
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid reaction ID is required' });
  }

  const reactionId = Number(id);

  // Determine if this is a client or staff request
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  const contactIdHeader = req.headers['x-client-contact-id'];

  let contactId: number | null = null;
  let userId: string | null = null;

  // Check authentication based on source
  if (isClientPortal) {
    // Client portal authentication
    if (!contactIdHeader || isNaN(Number(contactIdHeader))) {
      return res.status(401).json({ error: 'Unauthorized - Missing or invalid contact ID' });
    }

    contactId = Number(contactIdHeader);
  } else {
    // Staff authentication
    const userInfo = await validateUserToken(req);
    if (!userInfo.isValid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    userId = userInfo.user_id;
  }

  try {
    // First, get the reaction to verify ownership
    const getQuery = `
      SELECT *
      FROM comment_reactions
      WHERE reaction_id = ?
    `;

    const [rows] = await pool.query(getQuery, [reactionId]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    const reaction = (rows as any[])[0];

    // Verify the user owns the reaction or is staff
    if (isClientPortal) {
      // Only allow clients to delete their own reactions
      if (reaction.client_contact_id !== contactId) {
        return res
          .status(403)
          .json({ error: 'Forbidden - Cannot delete reactions from other users' });
      }
    } else {
      // Staff can delete their own reactions or client reactions
      if (reaction.user_id !== userId && reaction.user_id !== null) {
        return res
          .status(403)
          .json({ error: 'Forbidden - Cannot delete reactions from other staff' });
      }
    }

    // Delete the reaction
    const deleteQuery = `
      DELETE FROM comment_reactions
      WHERE reaction_id = ?
    `;

    await pool.query(deleteQuery, [reactionId]);

    return res.status(200).json({ message: 'Reaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting reaction:', error);
    return res.status(500).json({ error: 'Failed to delete reaction' });
  }
}
