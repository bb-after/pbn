import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { addMinutes } from 'date-fns';
import { sendLoginEmail } from '../../../utils/email';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 1. Check if the email belongs to a client contact
    const contactQuery = `
      SELECT 
        cc.contact_id, 
        cc.name, 
        cc.email, 
        c.client_id, 
        c.client_name
      FROM 
        client_contacts cc
      JOIN 
        clients c ON cc.client_id = c.client_id
      WHERE 
        cc.email = ? AND cc.is_active = true AND c.is_active = 1
    `;

    const [contactResult] = await pool.query(contactQuery, [email]);
    console.log('Contact query result:', contactResult);

    // If we don't find any matching contacts
    if (!(contactResult as any[]).length) {
      // Don't reveal if email exists or not for security
      console.log('No contact found for email:', email);
      return res.status(200).json({
        message:
          'If your email is associated with a client account, you will receive a login link shortly.',
      });
    }

    const contact = (contactResult as any[])[0];
    console.log('Found contact:', contact);

    // 2. Generate a secure token
    const token = uuidv4();
    const expiresAt = addMinutes(new Date(), 30); // Token expires in 30 minutes

    // 3. Save token to database
    const insertTokenQuery = `
      INSERT INTO client_auth_tokens 
        (contact_id, token, expires_at) 
      VALUES 
        (?, ?, ?)
    `;

    console.log('Inserting token for contact ID:', contact.contact_id);
    await pool.query(insertTokenQuery, [contact.contact_id, token, expiresAt]);

    // 4. Send email with login link
    // For testing without actually sending an email
    console.log('Login link would be sent to:', contact.email);
    console.log(
      'Login URL:',
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-portal/verify?token=${token}`
    );

    // Comment this out for now to avoid actual email sending during testing
    await sendLoginEmail(contact, token);

    return res.status(200).json({
      message:
        'If your email is associated with a client account, you will receive a login link shortly.',
    });
  } catch (error) {
    console.error('Error requesting login:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return res.status(500).json({ error: 'Failed to process login request' });
  }
}
