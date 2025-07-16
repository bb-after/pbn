import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';
import { query } from '../../../../lib/db';
import { sendLoginEmail } from '../../../../utils/email';
import { postToSlack } from '../../../../utils/postToSlack';
import crypto from 'crypto';

interface RequestDetails extends RowDataPacket {
  request_id: number;
  title: string;
  client_name: string;
}

interface ContactDetails extends RowDataPacket {
  contact_id: number;
  name: string;
  email: string;
}

interface StaffDetails extends RowDataPacket {
  name: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { contactIds, notify } = req.body;

  if (!id || !Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: 'Request ID and a list of contact IDs are required.' });
  }

  try {
    const requestId = parseInt(id as string, 10);

    // 1. Add contacts to the approval_request_contacts table
    const insertPromises = contactIds.map(contactId => {
      return query(
        'INSERT INTO approval_request_contacts (request_id, contact_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE request_id = request_id',
        [requestId, contactId]
      );
    });
    await Promise.all(insertPromises);

    // 2. If notify is true, fetch details and send emails
    // Robust check for various "truthy" values (true, 1, '1', 'true')
    const shouldNotify = [true, 1, '1', 'true'].includes(notify);
    if (shouldNotify) {
      // Fetch request details
      const [requestDetails] = await query<RequestDetails[]>(
        'SELECT r.request_id, r.title, c.client_name FROM client_approval_requests r JOIN clients c ON r.client_id = c.client_id WHERE r.request_id = ?',
        [requestId]
      );
      const requestData = requestDetails[0];

      // Fetch new contacts' details
      const [contactsDetails] = await query<ContactDetails[]>(
        'SELECT contact_id, name, email FROM client_contacts WHERE contact_id IN (?)',
        [contactIds]
      );

      const emailPromises = contactsDetails.map(async (contact: ContactDetails) => {
        // Generate a unique token for the login link
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        // Store the token in the database
        await query(
          'INSERT INTO client_auth_tokens (contact_id, token, expires_at) VALUES (?, ?, ?)',
          [contact.contact_id, token, expiresAt]
        );

        // Call the reusable email utility
        return sendLoginEmail(contact, token, requestData);
      });

      await Promise.all(emailPromises);

      // Optional: Post a Slack notification
      postToSlack(
        `Added ${contactsDetails.length} new reviewer(s) to approval request: "${requestData.title}" for ${requestData.client_name}.`,
        '#approval-requests'
      );
    }

    res.status(200).json({ message: 'Reviewers added successfully.' });
  } catch (error) {
    console.error('Error adding reviewers:', error);
    res.status(500).json({
      error: 'Failed to add reviewers.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
