import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../../validate-user-token';
import nodemailer from 'nodemailer';
import { postToSlack } from '../../../../utils/postToSlack';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Creating a minimal mock request object for the validateUserToken function
const createTokenRequest = (token: string): NextApiRequest => {
  return {
    headers: {
      'x-auth-token': token,
    },
    cookies: {},
  } as unknown as NextApiRequest;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT method for feedback submission
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }

  const requestId = Number(id);

  // Check if request is from client portal
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  let contactId: number | undefined;
  let userId: string | undefined;

  // Handle authentication based on request source
  if (isClientPortal) {
    // Get contact ID from header for client portal requests
    const contactIdHeader = req.headers['x-client-contact-id'];

    if (!contactIdHeader || isNaN(Number(contactIdHeader))) {
      return res
        .status(400)
        .json({ error: 'Valid contact ID is required for client portal access' });
    }

    contactId = Number(contactIdHeader);

    // Verify the contact has access to this request
    const hasAccess = await checkContactAccess(requestId, contactId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to update this request' });
    }
  } else {
    // For internal/admin requests, validate user token
    const userToken = req.headers.authorization?.split(' ')[1];

    if (!userToken) {
      return res.status(401).json({ error: 'Authentication token is required' });
    }

    // Create a mock request object with the token
    const tokenRequest = createTokenRequest(userToken);
    const validationResult = await validateUserToken(tokenRequest);

    if (!validationResult.isValid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    userId = validationResult.user_id;
  }

  // Extract feedback from request body
  const { feedback, notifyOwner = true } = req.body;

  if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
    return res.status(400).json({ error: 'Feedback content is required' });
  }

  try {
    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Get request details to identify owner and client
      const requestQuery = `
        SELECT ar.*, c.client_name, u.name as owner_name, u.email as owner_email, u.id as owner_id, ar.project_slack_channel
        FROM client_approval_requests ar
        JOIN clients c ON ar.client_id = c.client_id
        LEFT JOIN users u ON ar.created_by_id = u.id
        WHERE ar.request_id = ?
      `;
      const [requestRows] = await connection.query(requestQuery, [requestId]);

      if ((requestRows as any[]).length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Approval request not found' });
      }

      const requestData = (requestRows as any[])[0];

      // 2. Update the request status to "feedback" if it's coming from client portal
      if (isClientPortal) {
        const updateStatusQuery = `
          UPDATE client_approval_requests 
          SET status = 'pending', updated_at = NOW()
          WHERE request_id = ?
        `;
        await connection.query(updateStatusQuery, [requestId]);
      }

      // 3. Save the feedback as a comment
      const insertCommentQuery = `
        INSERT INTO approval_request_comments (request_id, user_id, client_contact_id, comment, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      const commentParams = [
        requestId,
        isClientPortal ? null : userId,
        isClientPortal ? contactId : null,
        `[FEEDBACK] ${feedback}`,
      ];
      const [commentResult] = await connection.query(insertCommentQuery, commentParams);
      const commentId = (commentResult as any).insertId;

      // 4. If client portal user, mark if they have provided feedback
      if (isClientPortal && contactId) {
        const markFeedbackQuery = `
          UPDATE approval_request_contacts
          SET has_provided_feedback = 1, feedback_at = NOW()
          WHERE request_id = ? AND contact_id = ?
        `;
        await connection.query(markFeedbackQuery, [requestId, contactId]);
      }

      // Get contact info if feedback is from client portal
      let contactName = 'A team member';
      let contactEmail = '';

      if (isClientPortal && contactId) {
        const contactQuery = `
          SELECT name, email FROM client_contacts WHERE contact_id = ?
        `;
        const [contactRows] = await connection.query(contactQuery, [contactId]);

        if ((contactRows as any[]).length > 0) {
          contactName = (contactRows as any[])[0].name;
          contactEmail = (contactRows as any[])[0].email;
        }
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      // 5. Send notification email if requested and owner exists
      if (notifyOwner && requestData.owner_email) {
        await sendFeedbackEmail({
          ownerName: requestData.owner_name || 'Content Owner',
          ownerEmail: requestData.owner_email,
          clientName: requestData.client_name,
          requestTitle: requestData.title,
          requestId: requestId,
          feedback: feedback,
          senderName: isClientPortal ? contactName : 'Internal Team',
          senderEmail: isClientPortal ? contactEmail : '',
        });
      }

      // 6. Send Slack notification if webhook URL is configured
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const requestUrl = `${appUrl}/client-approval/requests/${requestId}`;

          // Get contact info for notification
          const contactQuery = `
            SELECT name, email FROM client_contacts WHERE contact_id = ?
          `;
          const [contactRows] = await connection.query(contactQuery, [contactId]);
          const contactData = (contactRows as any[])[0];

          const slackMessage =
            `💬 *New Client Feedback Submitted*\n\n` +
            `*${contactData?.name || 'Client'}* (${contactData?.email || 'No email'}) has provided feedback on your content\n\n` +
            `*Request:* ${requestData.title}\n` +
            `*Client:* ${requestData.client_name}\n` +
            `*Owner:* ${requestData.owner_name || 'Content Owner'}\n\n` +
            `*Feedback:*\n${feedback}\n\n` +
            `<${requestUrl}|View Request>`;

          const channel =
            requestData.project_slack_channel || process.env.SLACK_APPROVAL_UPDATES_CHANNEL;
          await postToSlack(slackMessage, channel);
          console.log(`Slack feedback notification sent to ${channel || 'default channel'}`);
        } catch (slackError) {
          console.error('Error sending Slack notification:', slackError);
          // Don't let Slack errors affect the database transaction
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        commentId: commentId,
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: 'Failed to process feedback submission' });
  }
}

// Helper to check if a contact has access to a request
async function checkContactAccess(requestId: number, contactId: number): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM approval_request_contacts 
      WHERE request_id = ? AND contact_id = ?
    `;

    const [result] = await pool.query(query, [requestId, contactId]);
    return (result as any)[0].count > 0;
  } catch (error) {
    console.error('Error checking contact access:', error);
    return false;
  }
}

// Email notification for feedback
async function sendFeedbackEmail(params: {
  ownerName: string;
  ownerEmail: string;
  clientName: string;
  requestTitle: string;
  requestId: number;
  feedback: string;
  senderName: string;
  senderEmail: string;
}) {
  const {
    ownerName,
    ownerEmail,
    clientName,
    requestTitle,
    requestId,
    feedback,
    senderName,
    senderEmail,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const requestUrl = `${appUrl}/approval-requests/${requestId}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Feedback Received</h2>
      <p>Hello ${ownerName},</p>
      <p><strong>${senderName}</strong> has provided feedback on your content approval request.</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #2196F3;">
        <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${clientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Request:</strong> ${requestTitle}</p>
        <p style="margin: 0; font-weight: bold;">Feedback:</p>
        <p style="white-space: pre-line;">${feedback}</p>
      </div>
      
      <p>Please review the feedback and make necessary updates to the content.</p>
      
      <p>
        <a href="${requestUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
          View Request
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This is an automated email from your content approval system.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Content Approval System" <noreply@example.com>',
      to: ownerEmail,
      subject: `Feedback Received: ${requestTitle} (${clientName})`,
      html: emailHtml,
      replyTo: senderEmail || undefined,
    });

    console.log(`Feedback email sent to ${ownerEmail}`);
  } catch (error) {
    console.error('Error sending feedback email:', error);
    // Don't throw - allow the API to complete even if email fails
  }
}
