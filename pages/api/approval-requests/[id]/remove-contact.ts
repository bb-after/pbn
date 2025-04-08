import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../../validate-user-token'; // Adjust path if needed

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  const { contactId } = req.body;

  // Validate inputs
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }
  if (!contactId || isNaN(Number(contactId))) {
    return res.status(400).json({ error: 'Valid contact ID is required' });
  }

  const requestId = Number(id);
  const contactIdToRemove = Number(contactId);

  // --- Authentication (Ensure staff is logged in) ---
  const userInfo = await validateUserToken(req);
  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized - Staff login required' });
  }

  try {
    // --- Delete the Contact Association ---
    const deleteQuery = `
      DELETE FROM approval_request_contacts 
      WHERE request_id = ? AND contact_id = ?
    `;

    const [result] = await pool.query(deleteQuery, [requestId, contactIdToRemove]);

    // Check if any row was actually deleted
    if ((result as any).affectedRows === 0) {
      // This could mean the contact wasn't associated or the request didn't exist
      // For simplicity, we'll return success, but you could add more checks
      console.log(
        `No association found to delete for request ${requestId}, contact ${contactIdToRemove}`
      );
      // Consider checking if the request/contact exists separately if stricter validation is needed
    }

    // --- Optionally: Clean up related auth tokens? ---
    // You might want to invalidate any unused auth tokens for this contact for this specific request context if applicable.
    // This depends heavily on your token strategy. For now, we'll skip this.
    // Example (conceptual):
    // await pool.query('UPDATE client_auth_tokens SET is_used = 1 WHERE contact_id = ? AND ...');

    return res.status(200).json({ message: 'Contact removed successfully from request' });
  } catch (error) {
    console.error('Error removing contact from request:', error);
    return res.status(500).json({ error: 'Failed to remove contact' });
  }
  // Note: No transaction needed for a single DELETE operation unless combined with other actions.
}
