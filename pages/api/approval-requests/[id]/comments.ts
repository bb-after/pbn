import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../../validate-user-token'; // Import validation function
import nodemailer from 'nodemailer'; // Import nodemailer

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

// Helper function to send email (basic implementation)
async function sendEmail(to: string, subject: string, html: string) {
  try {
    // Configure Nodemailer (use environment variables for credentials)
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: (process.env.SMTP_PORT || '587') === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send mail
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_FROM_EMAIL}>`, // Sender address
      to: to, // List of receivers
      subject: subject, // Subject line
      html: html, // HTML body content
    });

    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    // Log the error but don't necessarily block the API response
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }

  const requestId = Number(id);

  // Validate user token for staff access
  const userInfo = await validateUserToken(req);

  const isClientPortal = req.headers['x-client-portal'] === 'true';

  // For client portal access, need to verify the contact has access to this request
  if (isClientPortal) {
    const contactId = req.headers['x-client-contact-id'];
    if (!contactId) {
      return res.status(401).json({ error: 'Unauthorized - Missing contact ID' });
    }

    const hasAccess = await checkContactAccess(requestId, Number(contactId));
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden - Contact does not have access to this request' });
    }
  } else if (!userInfo.isValid) {
    // For staff access, validate user token
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      return getComments(requestId, res);
    case 'POST':
      return addComment(requestId, req, res, userInfo, isClientPortal);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Check if a contact has access to a request
async function checkContactAccess(requestId: number, contactId: number): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM approval_request_contacts 
      WHERE request_id = ? AND contact_id = ?
    `;

    const [result] = await pool.query(query, [requestId, contactId]);
    return (result as any[])[0].count > 0;
  } catch (error) {
    console.error('Error checking contact access:', error);
    return false;
  }
}

// Get all comments for an approval request
async function getComments(requestId: number, res: NextApiResponse) {
  try {
    // First check if the request exists
    const checkQuery = 'SELECT request_id FROM client_approval_requests WHERE request_id = ?';
    const [checkResult] = await pool.query(checkQuery, [requestId]);

    if ((checkResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    // Get all comments, joining with users table for staff names
    const query = `
      SELECT 
        arc.comment_id, 
        arc.request_id, 
        arc.version_id, 
        arc.comment, 
        arc.created_by_id, 
        arc.contact_id,
        cc.name as contact_name, 
        u.name as staff_name, -- Get staff name from users table (Reverted)
        arc.created_at
      FROM 
        approval_request_comments arc
      LEFT JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      LEFT JOIN
        users u ON arc.created_by_id = u.id -- Join with users table
      WHERE 
        arc.request_id = ?
      ORDER BY 
        arc.created_at DESC
    `;

    const [rows] = await pool.query(query, [requestId]);

    // Map result to replace staff_name with contact_name where appropriate
    const comments = (rows as any[]).map(comment => {
      // Log the raw values before calculating commenter_name
      console.log('Raw comment data from DB (getComments):', {
        contact_name: comment.contact_name,
        staff_name: comment.staff_name,
      });
      return {
        ...comment,
        commenter_name: comment.contact_name || comment.staff_name || 'Unknown',
      };
    });

    return res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
}

// Add a new comment to an approval request
async function addComment(
  requestId: number,
  req: NextApiRequest,
  res: NextApiResponse,
  userInfo: any, // Receive userInfo
  isClientPortal: boolean
) {
  const { comment, versionId, contactId: clientProvidedContactId } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  try {
    // First check if the request exists
    const checkQuery = 'SELECT request_id FROM client_approval_requests WHERE request_id = ?';
    const [checkResult] = await pool.query(checkQuery, [requestId]);

    if ((checkResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    let createdById = null;
    let contactId = null;
    let staffName = null;

    if (isClientPortal) {
      // For client portal, use the provided contact ID
      contactId = clientProvidedContactId;

      // Verify the contact exists
      const contactCheckQuery = 'SELECT contact_id FROM client_contacts WHERE contact_id = ?';
      const [contactCheckResult] = await pool.query(contactCheckQuery, [contactId]);

      if ((contactCheckResult as any[]).length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }
    } else {
      // For staff portal, use the user ID and name from token
      if (userInfo.isValid && !userInfo.user_id) {
        // Log an error if validation passed but user_id is missing
        console.error('Validation successful but user_id is missing from userInfo:', userInfo);
      }
      createdById = userInfo.user_id; // Assign user_id from the userInfo object
      staffName = userInfo.username; // Get staff name from validated token info
    }

    // Add the comment
    const insertQuery = `
      INSERT INTO approval_request_comments 
        (request_id, version_id, comment, created_by_id, contact_id) 
      VALUES 
        (?, ?, ?, ?, ?)
    `;

    const insertValues = [requestId, versionId || null, comment, createdById, contactId];

    // Log the value being inserted for created_by_id
    console.log('Inserting comment with createdById:', createdById);

    const [result] = await pool.query(insertQuery, insertValues);
    const commentId = (result as any).insertId;

    // Get the created comment, joining with users table for staff name
    const getCommentQuery = `
      SELECT 
        arc.comment_id, 
        arc.request_id, 
        arc.version_id, 
        arc.comment, 
        arc.created_by_id, 
        arc.contact_id,
        cc.name as contact_name, 
        u.name as staff_name, -- Get staff name (Reverted)
        arc.created_at
      FROM 
        approval_request_comments arc
      LEFT JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      LEFT JOIN
        users u ON arc.created_by_id = u.id -- Join with users
      WHERE 
        arc.comment_id = ?
    `;

    const [commentRows] = await pool.query(getCommentQuery, [commentId]);
    const createdComment = (commentRows as any[])[0];

    // Log the raw values before calculating commenter_name for the new comment
    console.log('Raw comment data from DB (addComment):', {
      contact_name: createdComment.contact_name,
      staff_name: createdComment.staff_name,
    });

    // Prepare comment response
    const responseComment = {
      ...createdComment,
      commenter_name: createdComment.contact_name || createdComment.staff_name || 'Unknown',
    };

    // Send email notification if comment is from staff
    if (!isClientPortal && createdById) {
      try {
        // Fetch request details (title)
        const [requestRows]: any = await pool.query(
          'SELECT title FROM client_approval_requests WHERE request_id = ?',
          [requestId]
        );
        const requestTitle = requestRows[0]?.title || 'a content request';

        // Fetch contacts associated with the request
        const [contactsResult]: any = await pool.query(
          'SELECT email FROM client_contacts WHERE contact_id IN (SELECT contact_id FROM approval_request_contacts WHERE request_id = ?)',
          [requestId]
        );

        if (contactsResult.length > 0) {
          const subject = `New comment on "${requestTitle}"`;
          // Provide a link back to the client portal request page
          const portalLink = `${process.env.NEXT_PUBLIC_BASE_URL}/client-portal/requests/${requestId}`;
          const html = `
            <p>Hello,</p>
            <p>A new comment has been added by ${staffName || 'Staff'} on the content request: <strong>${requestTitle}</strong>.</p>
            <p>Comment: "${comment}"</p>
            <p>You can view the request and comment here:</p>
            <p><a href="${portalLink}">${portalLink}</a></p>
            <p>Thank you</p>
          `;

          for (const contact of contactsResult) {
            await sendEmail(contact.email, subject, html);
          }
        }
      } catch (emailError) {
        console.error('Error fetching data or sending notification emails:', emailError);
        // Log error but don't fail the comment creation
      }
    }

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: responseComment, // Return the enhanced comment object
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}
