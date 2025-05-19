import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { sendEmail } from '../../../../utils/email';

// Create a connection pool (adjust config as needed)
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { contactIds } = req.body;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: 'contactIds array is required' });
  }

  const requestId = Number(id);

  try {
    // 0. Ensure all contactIds are associated with this request
    const [allowedRows] = await pool.query(
      `SELECT contact_id FROM approval_request_contacts WHERE request_id = ?`,
      [requestId]
    );
    const allowedContactIds = new Set((allowedRows as any[]).map(r => r.contact_id));
    const invalidIds = contactIds.filter((cid: number) => !allowedContactIds.has(cid));
    if (invalidIds.length > 0) {
      return res
        .status(403)
        .json({ error: 'One or more contactIds are not authorized for this request', invalidIds });
    }

    // 1. Fetch approval request details
    const [requestRows] = await pool.query(
      `SELECT ar.title, ar.client_id, c.client_name
       FROM client_approval_requests ar
       JOIN clients c ON ar.client_id = c.client_id
       WHERE ar.request_id = ?`,
      [requestId]
    );
    if ((requestRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    const request = (requestRows as any[])[0];

    // 2. Fetch contact info
    const [contactRows] = await pool.query(
      `SELECT contact_id, name, email FROM client_contacts WHERE contact_id IN (?)`,
      [contactIds]
    );
    if ((contactRows as any[]).length === 0) {
      return res.status(404).json({ error: 'No contacts found for notification' });
    }

    // 3. Send email to each contact (real email)
    for (const contact of contactRows as any[]) {
      const to = contact.email;
      const subject = `Content Approved: ${request.title}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Content Approved</h2>
          <p>Hello ${contact.name},</p>
          <p>The content titled <strong>"${request.title}"</strong> has been <span style="color: #4CAF50; font-weight: bold;">approved</span>.</p>
          <p>You can now view the approved content in your client portal.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-portal/requests/${requestId}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              View Approved Content
            </a>
          </p>
          <p>Thank you,<br>Content Approval Team</p>
        </div>
      `;
      const textBody = `
        Content Approved
        
        Hello ${contact.name},
        
        The content titled "${request.title}" has been approved.
        
        You can now view the approved content in your client portal:
        ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-portal/requests/${requestId}
        
        Thank you,
        Content Approval Team
      `;
      await sendEmail({ to, subject, htmlBody, textBody });
    }

    return res.status(200).json({ message: 'Client(s) notified of approval' });
  } catch (error) {
    console.error('Error notifying client of approval:', error);
    return res.status(500).json({ error: 'Failed to notify client of approval' });
  }
}
