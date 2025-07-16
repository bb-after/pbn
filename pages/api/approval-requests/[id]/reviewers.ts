import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';
import { query } from '../../../../lib/db';
import { sendEmail } from '../../../../utils/email';
import { postToSlack } from '../../../../utils/postToSlack';

interface RequestDetails extends RowDataPacket {
  title: string;
  client_name: string;
}

interface ContactDetails extends RowDataPacket {
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
        'SELECT r.title, c.client_name FROM client_approval_requests r JOIN clients c ON r.client_id = c.client_id WHERE r.request_id = ?',
        [requestId]
      );
      const { title, client_name } = requestDetails[0];

      // Fetch new contacts' details
      const [contactsDetails] = await query<ContactDetails[]>(
        'SELECT name, email FROM client_contacts WHERE contact_id IN (?)',
        [contactIds]
      );

      // Fetch the name of the staff member who initiated the request
      const [staffDetails] = await query<StaffDetails[]>(
        'SELECT u.name FROM users u JOIN client_approval_requests r ON u.id = r.created_by_id WHERE r.request_id = ?',
        [requestId]
      );
      const staffName = staffDetails.length > 0 ? staffDetails[0].name : 'A team member';
      const approvalUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/client-portal/requests/${requestId}`;

      const emailPromises = contactsDetails.map((contact: ContactDetails) => {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been added as a reviewer</h2>
            <p>Hello ${contact.name},</p>
            <p>${staffName} has added you as a reviewer for a content approval request for <strong>${client_name}</strong>.</p>
            <div style="background-color: #f5f5f5; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${title}</h3>
            </div>
            <p>Please review this content and provide your approval or feedback.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Review Content
              </a>
            </p>
            <p>Thank you,<br>The Status Labs Team</p>
          </div>
        `;
        const textBody = `
          Hello ${contact.name},
          ${staffName} has added you as a reviewer for a content approval request for ${client_name}.
          Request: ${title}
          Review Content: ${approvalUrl}
        `;

        return sendEmail({
          to: contact.email,
          subject: `You've been added to the approval request: ${title}`,
          htmlBody,
          textBody,
        });
      });

      await Promise.all(emailPromises);

      // Optional: Post a Slack notification
      postToSlack(
        `Added ${contactsDetails.length} new reviewer(s) to approval request: "${title}" for ${client_name}.`,
        '#approval-requests'
      );
    }

    res.status(200).json({ message: 'Reviewers added successfully.' });
  } catch (error) {
    console.error('Error adding reviewers:', error);
    res
      .status(500)
      .json({
        error: 'Failed to add reviewers.',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
  }
}
