import { NextApiRequest, NextApiResponse } from 'next';
import * as mysql from 'mysql2/promise';
import * as AWS from 'aws-sdk';
import { URL } from 'url';
import { validateUserToken } from '../validate-user-token'; // Ensure this import is present
import * as nodemailer from 'nodemailer';
import axios from 'axios';

// Configure AWS (ensure region is set, credentials should be auto-loaded from env)
AWS.config.update({ region: 'us-east-2' }); // Force us-east-2 based on bucket URL
const s3 = new AWS.S3();

// Create a connection pool (reuse across requests)
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

// --- Updated Interface ---
// Reflects that contacts will now have an array of views
interface ContactDetails {
  contact_id: number;
  name: string;
  email: string;
  has_approved: boolean; // Keep approval status
  approved_at: string | null; // Keep approval timestamp
  views: Array<{ view_id: number; viewed_at: string; email: string }>; // Array of view records
}

// (Update ApprovalRequest interface if needed, maybe make contacts: ContactDetails[])
// ...

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }

  const requestId = Number(id);

  // Check if request is from client portal
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  let contactId: number | undefined;

  if (isClientPortal) {
    // Get contact ID from header
    const contactIdHeader = req.headers['x-client-contact-id'];

    if (!contactIdHeader || isNaN(Number(contactIdHeader))) {
      return res
        .status(400)
        .json({ error: 'Valid contact ID is required for client portal access' });
    }

    contactId = Number(contactIdHeader);
  }

  // Process by method
  switch (req.method) {
    case 'GET':
      return getApprovalRequest(requestId, res, isClientPortal, contactId);
    case 'PUT':
      return updateApprovalRequest(requestId, req, res, isClientPortal);
    case 'DELETE':
      // Assuming DELETE logic might involve S3 for versions, keep AWS/S3 for now
      return deleteApprovalRequest(requestId, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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
    return (result as any)[0].count > 0;
  } catch (error) {
    console.error('Error checking contact access:', error);
    return false;
  }
}

// Get a single approval request by ID
async function getApprovalRequest(
  requestId: number,
  res: NextApiResponse,
  isClientPortal: boolean = false,
  contactId?: number
) {
  try {
    // Initialize response data object to store all information
    const responseData: any = {};

    // Query to get basic request details
    const requestQuery = `
      SELECT ar.*, c.client_name, 
        u.name as approved_by_name,
        CASE 
          WHEN ar.approved_by_user_id IS NOT NULL THEN ar.updated_at
          ELSE NULL
        END as staff_approved_at
      FROM client_approval_requests ar
      JOIN clients c ON ar.client_id = c.client_id
      LEFT JOIN users u ON ar.approved_by_user_id = u.id
      WHERE ar.request_id = ?
    `;

    const [requestRows] = await pool.query(requestQuery, [requestId]);

    if ((requestRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const requestData = (requestRows as any[])[0];

    // If this is a client portal request, verify that the contact has access to this client's requests
    if (isClientPortal && contactId) {
      const checkAccessQuery = `
        SELECT COUNT(*) as count
        FROM client_contacts
        WHERE contact_id = ? AND client_id = ?
      `;

      const [accessResult] = await pool.query(checkAccessQuery, [contactId, requestData.client_id]);

      if ((accessResult as any[])[0].count === 0) {
        console.log(
          `Access denied: Contact ${contactId} attempted to access request ${requestId} for client ${requestData.client_id}`
        );
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to view this request',
        });
      }
    }

    // Query to get contacts associated with this request
    const contactsQuery = `
      SELECT arc.contact_id, cc.name, cc.email, arc.has_approved, arc.approved_at
      FROM approval_request_contacts arc
      JOIN client_contacts cc ON arc.contact_id = cc.contact_id
      WHERE arc.request_id = ?
    `;
    const [contactRows] = await pool.query(contactsQuery, [requestId]);

    // Get contact IDs for subsequent view records query
    const contactIds = (contactRows as any[]).map(c => c.contact_id);

    // Query to get view records for each contact
    let contactsWithViews = [];
    if (contactIds.length > 0) {
      const viewsQuery = `
        SELECT * FROM approval_request_views
        WHERE request_id = ? AND contact_id IN (?)
        ORDER BY viewed_at DESC
      `;
      const [viewRows] = await pool.query(viewsQuery, [requestId, contactIds]);

      // Group views by contact_id
      const viewsByContact: Record<number, any[]> = {};
      (viewRows as any[]).forEach(view => {
        if (!viewsByContact[view.contact_id]) {
          viewsByContact[view.contact_id] = [];
        }
        viewsByContact[view.contact_id].push(view);
      });

      // Merge contact data with view data
      contactsWithViews = (contactRows as any[]).map(contact => ({
        ...contact,
        has_viewed: Boolean(viewsByContact[contact.contact_id]?.length),
        views: viewsByContact[contact.contact_id] || [],
      }));
    } else {
      contactsWithViews = contactRows as any[];
    }

    // Query to get versions
    const versionsQuery = `
      SELECT *
      FROM approval_request_versions
      WHERE request_id = ?
      ORDER BY version_number DESC
    `;
    const [versionRows] = await pool.query(versionsQuery, [requestId]);

    // Query to get comments
    const commentsQuery = `
      SELECT c.*, cc.name as contact_name, u.name as staff_name,
        COALESCE(cc.name, u.name, 'Unknown') as commenter_name
      FROM approval_request_comments c
      LEFT JOIN client_contacts cc ON c.client_contact_id = cc.contact_id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.request_id = ?
      ORDER BY c.created_at DESC
    `;
    const [standardComments] = await pool.query(commentsQuery, [requestId]);

    // Query to get section comments
    const sectionCommentsQuery = `
      SELECT sc.*, 
             cc.name as contact_name, 
             u.name as user_name,
             DATE_FORMAT(sc.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at_iso
      FROM approval_request_section_comments sc
      LEFT JOIN client_contacts cc ON sc.client_contact_id = cc.contact_id
      LEFT JOIN users u ON sc.user_id = u.id
      WHERE sc.request_id = ?
      ORDER BY sc.created_at DESC
    `;
    const [sectionCommentRows] = await pool.query(sectionCommentsQuery, [requestId]);

    // Fetch replies for section comments
    let sectionCommentsWithReplies = [];
    if ((sectionCommentRows as any[]).length > 0) {
      const commentIds = (sectionCommentRows as any[]).map(comment => comment.section_comment_id);

      // Updated query to join with users and client_contacts tables to get names
      const repliesQuery = `
        SELECT 
          r.*,
          u.name as user_name,
          cc.name as client_name,
          COALESCE(u.name, cc.name, 'Unknown') as author_name,
          DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at_iso
        FROM 
          approval_request_comment_replies r
        LEFT JOIN 
          users u ON r.user_id = u.id
        LEFT JOIN 
          client_contacts cc ON r.client_contact_id = cc.contact_id
        WHERE 
          r.section_comment_id IN (?)
        ORDER BY 
          r.created_at ASC
      `;

      const [repliesRows] = await pool.query(repliesQuery, [commentIds]);

      // Attach replies to their parent comments
      sectionCommentsWithReplies = (sectionCommentRows as any[]).map(comment => {
        const commentReplies = (repliesRows as any[]).filter(
          reply => reply.section_comment_id === comment.section_comment_id
        );
        return {
          ...comment,
          replies: commentReplies.length > 0 ? commentReplies : [],
        };
      });
    } else {
      sectionCommentsWithReplies = sectionCommentRows as any[];
    }

    // Combine all data
    responseData.request_id = requestData.request_id;
    responseData.client_id = requestData.client_id;
    responseData.client_name = requestData.client_name;
    responseData.title = requestData.title;
    responseData.description = requestData.description;
    responseData.file_url = requestData.file_url;
    responseData.file_type = requestData.file_type;
    responseData.status = requestData.status;
    responseData.created_by_id = requestData.created_by_id;
    responseData.published_url = requestData.published_url;
    responseData.created_at = requestData.created_at;
    responseData.updated_at = requestData.updated_at;
    responseData.is_archived = Boolean(requestData.is_archived);
    responseData.inline_content = requestData.inline_content || null;
    responseData.content_type = requestData.content_type || 'html';
    responseData.google_doc_id = requestData.google_doc_id || null;
    responseData.required_approvals = requestData.required_approvals || contactsWithViews.length;
    responseData.approved_by_user_id = requestData.approved_by_user_id || null;
    responseData.approved_by_name = requestData.approved_by_name || null;
    responseData.staff_approved_at = requestData.staff_approved_at || null;
    responseData.contacts = contactsWithViews;
    responseData.versions = versionRows;
    responseData.comments = standardComments;
    responseData.section_comments = sectionCommentsWithReplies;

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching approval request details:', error);
    return res.status(500).json({ error: 'Failed to fetch approval request details' });
  }
}

// Update an approval request
async function updateApprovalRequest(
  requestId: number,
  req: NextApiRequest,
  res: NextApiResponse,
  isClientPortal: boolean
) {
  try {
    // Extract update data
    const {
      status,
      title,
      description,
      file,
      inlineContent,
      contactId,
      contacts,
      markViewed,
      note, // Add handling for notes
      notifyOwner = true, // Add notification flag
      publishedUrl, // Restore this parameter
      isArchived, // Restore this parameter
    } = req.body;

    // Staff authentication
    if (!isClientPortal) {
      const userToken =
        (req.headers['x-auth-token'] as string) || (req.cookies && req.cookies.auth_token);
      if (!userToken) {
        return res.status(401).json({ error: 'Authentication token is required' });
      }

      const validationResult = await validateUserToken(req);

      if (!validationResult.isValid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    // Add this line to declare validationResult in outer scope
    let staffValidationResult: {
      isValid: boolean;
      user_id: any;
      username?: any;
      role?: any;
    } | null = null;

    // If not client portal, get the staff user info
    if (!isClientPortal) {
      staffValidationResult = await validateUserToken(req);
      if (staffValidationResult && !staffValidationResult.isValid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      let updated = false;

      // Handle view marking
      if (markViewed && contactId) {
        const checkRecentViewQuery = `
          SELECT COUNT(*) as count 
          FROM approval_request_views 
          WHERE request_id = ? AND contact_id = ? AND viewed_at > NOW() - INTERVAL 30 SECOND
        `;
        const [recentViewResult] = await connection.query(checkRecentViewQuery, [
          requestId,
          contactId,
        ]);

        if ((recentViewResult as any[])[0].count === 0) {
          // No recent view found, proceed with insert
          // Explicitly insert UTC timestamp
          const insertViewQuery = `
            INSERT INTO approval_request_views (request_id, contact_id, viewed_at) 
            VALUES (?, ?, UTC_TIMESTAMP())
          `;
          // Pass only request_id and contact_id as values now
          await connection.query(insertViewQuery, [requestId, contactId]);
          console.log(`View logged (UTC) for request ${requestId}, contact ${contactId}`);
          updated = true; // Mark as updated because we inserted
        } else {
          console.log(
            `Duplicate view detected within 30s for request ${requestId}, contact ${contactId}. Skipping insert.`
          );
          // Still mark as updated because the *intent* to mark view was processed
          updated = true;
        }
      }

      if (isClientPortal && contactId) {
        // Additional check: Verify the contact is associated with this request
        const hasAccess = await checkContactAccess(requestId, contactId);
        if (!hasAccess) {
          await connection.rollback();
          connection.release();
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to update this request',
          });
        }

        // Mark contact as having approved the request if status is provided
        if (status === 'approved') {
          const approvalUpdateQuery = `
            UPDATE approval_request_contacts
            SET has_approved = 1, approved_at = NOW()
            WHERE request_id = ? AND contact_id = ?
          `;
          await connection.query(approvalUpdateQuery, [requestId, contactId]);

          // Add note as a comment if provided
          if (note && note.trim()) {
            const addNoteQuery = `
              INSERT INTO approval_request_comments (request_id, user_id, client_contact_id, comment, created_at)
              VALUES (?, NULL, ?, ?, NOW())
            `;
            await connection.query(addNoteQuery, [
              requestId,
              contactId,
              `[APPROVAL NOTE] ${note.trim()}`,
            ]);
          }

          // Check if all contacts have approved
          const checkApprovalQuery = `
            SELECT 
              COUNT(*) as total_contacts,
              SUM(CASE WHEN has_approved = 1 THEN 1 ELSE 0 END) as approved_contacts,
              cr.required_approvals
            FROM approval_request_contacts arc
            JOIN client_approval_requests cr ON arc.request_id = cr.request_id
            WHERE arc.request_id = ?
            GROUP BY cr.request_id
          `;
          const [approvalResult] = await connection.query(checkApprovalQuery, [requestId]);
          const approvalData = (approvalResult as any[])[0];

          // If we've reached the required number of approvals, update the request status
          if (
            approvalData.total_contacts > 0 &&
            approvalData.approved_contacts >=
              (approvalData.required_approvals || approvalData.total_contacts)
          ) {
            const updateRequestQuery = `
              UPDATE client_approval_requests
              SET status = 'approved', updated_at = NOW()
              WHERE request_id = ?
            `;
            await connection.query(updateRequestQuery, [requestId]);
          }

          // If notifyOwner is true, send email and Slack notifications
          if (notifyOwner) {
            // Get request details for notification
            const requestDetailsQuery = `
              SELECT ar.*, c.client_name, u.name as owner_name, u.email as owner_email, u.id as owner_id
              FROM client_approval_requests ar
              JOIN clients c ON ar.client_id = c.client_id
              LEFT JOIN users u ON ar.created_by_id = u.id
              WHERE ar.request_id = ?
            `;
            const [requestDetails] = await connection.query(requestDetailsQuery, [requestId]);

            if ((requestDetails as any[]).length > 0) {
              const requestData = (requestDetails as any[])[0];

              // Get contact info
              const contactQuery = `
                SELECT name, email FROM client_contacts WHERE contact_id = ?
              `;
              const [contactRows] = await connection.query(contactQuery, [contactId]);
              const contactData = (contactRows as any[])[0];

              // Send notifications
              if (requestData.owner_email) {
                await sendApprovalEmail({
                  ownerName: requestData.owner_name || 'Content Owner',
                  ownerEmail: requestData.owner_email,
                  clientName: requestData.client_name,
                  requestTitle: requestData.title,
                  requestId: requestId,
                  note: note || null,
                  approverName: contactData?.name || 'Client',
                  approverEmail: contactData?.email || '',
                });
              }

              // Send Slack notification if configured
              if (process.env.SLACK_APPROVAL_WEBHOOK) {
                await sendApprovalSlackNotification({
                  ownerName: requestData.owner_name || 'Content Owner',
                  ownerId: requestData.owner_id,
                  clientName: requestData.client_name,
                  requestTitle: requestData.title,
                  requestId: requestId,
                  note: note || null,
                  approverName: contactData?.name || 'Client',
                  isFullyApproved:
                    approvalData.approved_contacts >=
                    (approvalData.required_approvals || approvalData.total_contacts),
                  approvedCount: approvalData.approved_contacts,
                  totalCount: approvalData.total_contacts,
                  requiredApprovals: approvalData.required_approvals || approvalData.total_contacts,
                  isStaffApproval: false,
                });
              }
            }
          }
        }

        // If this is just a view marking operation, don't perform other updates
        if (markViewed && !status) {
          await connection.commit();
          connection.release();
          return res.status(200).json({ message: 'Request view marked successfully' });
        }
      }

      // Handle status update (both client portal and staff)
      if (status) {
        let updateQuery = `
          UPDATE client_approval_requests SET status = ?
        `;
        const queryParams = [status];

        // If this is a staff approval (not client portal) and status is 'approved',
        // record which staff member approved it
        if (!isClientPortal && status === 'approved') {
          // Assuming validationResult is meant to be a variable that should be defined earlier in the code
          const validationResult = await validateUserToken({
            headers: { 'x-auth-token': req.headers.authorization?.split(' ')[1] || '' },
          } as unknown as NextApiRequest);

          if (validationResult.isValid) {
            // Store the user ID of the staff member who approved
            updateQuery += `, approved_by_user_id = ?`;
            queryParams.push(validationResult.user_id);

            // Add a system comment to record the manual approval
            const addNoteQuery = `
              INSERT INTO approval_request_comments (request_id, user_id, client_contact_id, comment, created_at)
              VALUES (?, ?, NULL, ?, NOW())
            `;

            await connection.query(addNoteQuery, [
              requestId,
              validationResult.user_id,
              `[STAFF APPROVAL] This content was manually approved by staff`,
            ]);

            const requestDetailsQuery = `
              SELECT ar.*, c.client_name, u.name as owner_name, u.email as owner_email, u.id as owner_id,
              su.name as staff_name
              FROM client_approval_requests ar
              JOIN clients c ON ar.client_id = c.client_id
              LEFT JOIN users u ON ar.created_by_id = u.id
              LEFT JOIN users su ON su.id = ?
              WHERE ar.request_id = ?
            `;

            const [requestDetails] = await connection.query(requestDetailsQuery, [
              validationResult.user_id,
              requestId,
            ]);

            if ((requestDetails as any[]).length > 0) {
              const requestData = (requestDetails as any[])[0];

              // Send Slack notification for staff approval
              if (process.env.SLACK_WEBHOOK_URL) {
                try {
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                  const requestUrl = `${appUrl}/client-approval/requests/${requestId}`;

                  await axios.post(process.env.SLACK_WEBHOOK_URL, {
                    text: `🚨 Content for ${requestData.client_name} manually approved by staff: ${requestData.staff_name || 'Unknown'}`,
                    blocks: [
                      {
                        type: 'header',
                        text: {
                          type: 'plain_text',
                          text: '🚨 Content Manually Approved by Staff 🚨',
                          emoji: true,
                        },
                      },
                      {
                        type: 'section',
                        text: {
                          type: 'mrkdwn',
                          text: `*${requestData.staff_name || 'Staff member'}* has manually approved content`,
                        },
                      },
                      {
                        type: 'section',
                        fields: [
                          {
                            type: 'mrkdwn',
                            text: `*Title:*\n${requestData.title}`,
                          },
                          {
                            type: 'mrkdwn',
                            text: `*Client:*\n${requestData.client_name}`,
                          },
                        ],
                      },
                      {
                        type: 'actions',
                        elements: [
                          {
                            type: 'button',
                            text: {
                              type: 'plain_text',
                              text: 'View Request',
                              emoji: true,
                            },
                            style: 'primary',
                            url: requestUrl,
                          },
                        ],
                      },
                    ],
                  });
                  console.log('Staff approval Slack notification sent');
                } catch (slackError) {
                  console.error('Error sending Slack notification for staff approval:', slackError);
                }
              }
            }
          }
        }

        updateQuery += `, updated_at = NOW() WHERE request_id = ?`;
        queryParams.push(requestId);

        await connection.query(updateQuery, queryParams);
        console.log(`Status updated to ${status} for request ${requestId}`);
        updated = true;
      }

      // Handle published URL update (staff only)
      if (publishedUrl !== undefined && !isClientPortal) {
        const query = `
          UPDATE client_approval_requests SET published_url = ? WHERE request_id = ?
        `;
        await connection.query(query, [publishedUrl || null, requestId]);
        console.log(`Published URL updated for request ${requestId}`);
        updated = true;
      }

      // Handle file update (likely staff only)
      if (file !== undefined && !isClientPortal) {
        const query = `
          UPDATE client_approval_requests SET file_url = ? WHERE request_id = ?
        `;
        await connection.query(query, [file || null, requestId]);
        console.log(`File updated for request ${requestId}`);
        updated = true;
      }

      // Handle inline content update (likely staff only)
      if (inlineContent !== undefined && !isClientPortal) {
        const query = `
          UPDATE client_approval_requests SET inline_content = ? WHERE request_id = ?
        `;
        await connection.query(query, [inlineContent || null, requestId]);
        console.log(`Inline content updated for request ${requestId}`);
        updated = true;
      }

      // Handle archiving (staff only)
      if (isArchived !== undefined && !isClientPortal) {
        const query = `
          UPDATE client_approval_requests SET is_archived = ? WHERE request_id = ?
        `;
        await connection.query(query, [isArchived ? 1 : 0, requestId]);
        console.log(`Archive status updated for request ${requestId}`);
        updated = true;
      }

      // If nothing was updated, there might be an issue
      if (!updated) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'No updates were made' });
      }

      await connection.commit();
      connection.release();
      return res.status(200).json({ message: 'Approval request updated successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error updating approval request:', error);
    return res.status(500).json({ error: 'Failed to update approval request' });
  }
}

// Delete (or archive) an approval request
async function deleteApprovalRequest(requestId: number, res: NextApiResponse) {
  // ... (permission checks needed here) ...
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Optionally delete related S3 objects if versions have file_urls...

    // Delete from related tables first due to foreign key constraints
    await connection.query('DELETE FROM approval_request_views WHERE request_id = ?', [requestId]);
    await connection.query('DELETE FROM approval_request_section_comments WHERE request_id = ?', [
      requestId,
    ]);
    await connection.query('DELETE FROM approval_request_comments WHERE request_id = ?', [
      requestId,
    ]);
    await connection.query('DELETE FROM approval_request_contacts WHERE request_id = ?', [
      requestId,
    ]);
    await connection.query('DELETE FROM approval_request_versions WHERE request_id = ?', [
      requestId,
    ]);

    // Finally delete the main request
    const [result]: any = await connection.query(
      'DELETE FROM client_approval_requests WHERE request_id = ?',
      [requestId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Approval request not found' });
    }

    await connection.commit();
    return res.status(200).json({ message: 'Approval request deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting approval request:', error);
    return res.status(500).json({ error: 'Failed to delete approval request' });
  } finally {
    connection.release();
  }
}

// Add email notification for approvals
async function sendApprovalEmail(params: {
  ownerName: string;
  ownerEmail: string;
  clientName: string;
  requestTitle: string;
  requestId: number;
  note: string | null;
  approverName: string;
  approverEmail: string;
}) {
  const {
    ownerName,
    ownerEmail,
    clientName,
    requestTitle,
    requestId,
    note,
    approverName,
    approverEmail,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const requestUrl = `${appUrl}/approval-requests/${requestId}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Content Approval Notification</h2>
      <p>Hello ${ownerName},</p>
      <p><strong>${approverName}</strong> has approved your content request.</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #4CAF50;">
        <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${clientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Request:</strong> ${requestTitle}</p>
        ${
          note
            ? `<p style="margin: 0; font-weight: bold;">Note:</p>
        <p style="white-space: pre-line;">${note}</p>`
            : ''
        }
      </div>
      
      <p>
        <a href="${requestUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
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
      subject: `Content Approved: ${requestTitle} (${clientName})`,
      html: emailHtml,
      replyTo: approverEmail || undefined,
    });

    console.log(`Approval email sent to ${ownerEmail}`);
  } catch (error) {
    console.error('Error sending approval email:', error);
    // Don't throw - allow the API to complete even if email fails
  }
}

// Slack notification for approvals
async function sendApprovalSlackNotification(params: {
  ownerName: string;
  ownerId: string;
  clientName: string;
  requestTitle: string;
  requestId: number;
  note: string | null;
  approverName: string;
  isFullyApproved: boolean;
  approvedCount: number;
  totalCount: number;
  requiredApprovals: number;
  isStaffApproval: boolean;
}) {
  const {
    ownerName,
    ownerId,
    clientName,
    requestTitle,
    requestId,
    note,
    approverName,
    isFullyApproved,
    approvedCount,
    totalCount,
    requiredApprovals,
    isStaffApproval,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const requestUrl = `${appUrl}/approval-requests/${requestId}`;

  try {
    // Create Slack message with properly defined types
    const message: any = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: isStaffApproval
              ? '🚨 Content Manually Approved by Staff 🚨'
              : isFullyApproved
                ? 'Content Fully Approved! 🎉'
                : 'Content Approval Update ✅',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: isStaffApproval
              ? `*${approverName}* has manually approved this content as staff`
              : isFullyApproved
                ? `*${approverName}* has approved your content, completing the approval process!`
                : `*${approverName}* has approved your content (${approvedCount}/${totalCount} approvals received, ${requiredApprovals} required)`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Client:*\n${clientName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Request:*\n${requestTitle}`,
            },
          ],
        },
      ],
    };

    // Add note if provided
    if (note) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Approval Note:*\n${note}`,
        },
      });
    }

    // Add footer
    message.blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Request',
              emoji: true,
            },
            url: requestUrl,
            style: 'primary',
          },
        ],
      }
    );

    // Add user mention if we have owner ID
    if (ownerId) {
      message.blocks.unshift({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${ownerId}> Your content has received an approval`,
        },
      });
    }

    // Send to Slack
    await axios.post(process.env.SLACK_APPROVAL_WEBHOOK as string, message);
    console.log('Slack approval notification sent');
  } catch (error) {
    console.error('Error sending Slack approval notification:', error);
    // Don't throw - allow the API to complete even if Slack notification fails
  }
}
