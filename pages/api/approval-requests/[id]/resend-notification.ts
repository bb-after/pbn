import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../../validate-user-token'; // Adjust path if needed
import crypto from 'crypto';
import { sendLoginEmail } from '../../../../utils/email'; // Import the correct utility

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
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

  // --- Authentication (Ensure staff is logged in) ---
  const userInfo = await validateUserToken(req);
  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized - Staff login required' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // --- Fetch Required Data ---
    // 1. Get Request Title
    const [requestRows]: any = await connection.query(
      'SELECT title FROM client_approval_requests WHERE request_id = ?',
      [requestId]
    );
    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Approval request not found' });
    }
    const requestTitle = requestRows[0].title;

    // 2. Get Contact Details (Email, Name, Client Name)
    const [contactRows]: any = await connection.query(
      `SELECT 
         cc.email, 
         cc.name, 
         c.client_name 
       FROM client_contacts cc
       JOIN approval_request_contacts arc ON cc.contact_id = arc.contact_id
       JOIN clients c ON cc.client_id = c.client_id -- Join clients table
       WHERE arc.request_id = ? AND arc.contact_id = ?`,
      [requestId, contactId]
    );
    if (contactRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Contact not found for this request' });
    }
    const contactDetails = contactRows[0]; // Contains email, name, client_name

    // --- Generate New Auth Token ---
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    const insertTokenQuery = `
      INSERT INTO client_auth_tokens (contact_id, token, expires_at, is_used)
      VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at), is_used = 0;
    `; // Use ON DUPLICATE KEY UPDATE to handle potential existing unused tokens safely
    await connection.query(insertTokenQuery, [contactId, token, expiresAt]);

    // --- Send Email Notification using Utility ---
    await sendLoginEmail(contactDetails, token); // Pass contact object and token

    // --- Commit Transaction ---
    await connection.commit();

    return res.status(200).json({ message: 'Notification resent successfully' });
  } catch (error) {
    await connection.rollback(); // Rollback transaction on error
    console.error('Error resending notification:', error);
    // Use a generic error message unless specific handling is needed
    return res.status(500).json({ error: 'Failed to resend notification' });
  } finally {
    connection.release(); // Release connection back to the pool
  }
}
