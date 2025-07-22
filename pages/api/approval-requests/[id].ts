import { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction, getPool } from 'lib/db';
import * as AWS from 'aws-sdk';
import { URL } from 'url';
import { validateUserToken } from '../validate-user-token'; // Ensure this import is present
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { postToSlack } from '../../../utils/postToSlack';
import { RowDataPacket } from 'mysql2';

// Use centralized connection pool instead of creating a new one
const pool = getPool();

// Configure AWS (ensure region is set, credentials should be auto-loaded from env)
AWS.config.update({ region: 'us-east-2' }); // Force us-east-2 based on bucket URL
const s3 = new AWS.S3();

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
    case 'PATCH':
      return updateApprovalRequestDetails(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
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
      SELECT 
        ar.*, 
        c.client_name,
        u.name as created_by_name,
        u.email as created_by_email,
        u.name as approved_by_name,
        CASE 
          WHEN ar.approved_by_user_id IS NOT NULL THEN ar.updated_at
          ELSE NULL
        END as staff_approved_at,
        ar.project_slack_channel
      FROM client_approval_requests ar
      JOIN clients c ON ar.client_id = c.client_id
      LEFT JOIN users u ON ar.created_by_id = u.id
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
        FROM approval_request_contacts
        WHERE contact_id = ? AND request_id = ?
      `;

      const [accessResult] = await pool.query(checkAccessQuery, [contactId, requestId]);

      if ((accessResult as any[])[0].count === 0) {
        console.log(`Access denied: Contact ${contactId} attempted to access request ${requestId}`);
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
    responseData.project_slack_channel = requestData.project_slack_channel || null;
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

      console.log('isClientPortal', isClientPortal);
      console.log('contactId', contactId);
      if (isClientPortal && contactId) {
        console.log('🔍 CLIENT PORTAL APPROVAL ATTEMPT');
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
          console.log('🔍 STATUS IS APPROVED - PROCESSING CLIENT APPROVAL');
          // First, check if the contact association exists
          const checkAssociationQuery = `
            SELECT * FROM approval_request_contacts 
            WHERE request_id = ? AND contact_id = ?
          `;
          const [associationResult] = await connection.query(checkAssociationQuery, [
            requestId,
            contactId,
          ]);

          if ((associationResult as any[]).length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
              error: 'Contact not associated with this request',
              message: `Contact ${contactId} is not associated with request ${requestId}`,
            });
          }

          const approvalUpdateQuery = `
            UPDATE approval_request_contacts
            SET has_approved = 1, approved_at = NOW()
            WHERE request_id = ? AND contact_id = ?
          `;
          console.log('requestId', requestId);
          console.log('contactId', contactId);
          console.log('approvalUpdateQuery', approvalUpdateQuery);
          const [updateResult] = await connection.query(approvalUpdateQuery, [
            requestId,
            contactId,
          ]);
          console.log('UPDATE RESULT:', updateResult);
          console.log('affectedRows:', (updateResult as any).affectedRows);
          console.log('changedRows:', (updateResult as any).changedRows);

          // Let's verify the update actually happened by querying the row
          const verifyQuery = `SELECT has_approved, approved_at FROM approval_request_contacts WHERE request_id = ? AND contact_id = ?`;
          const [verifyResult] = await connection.query(verifyQuery, [requestId, contactId]);
          console.log('VERIFICATION AFTER UPDATE:', verifyResult);

          // Check if the update actually affected any rows
          if ((updateResult as any).affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
              error: 'No updates were made',
              message:
                'The approval status could not be updated. This may indicate the contact is not associated with this request or the approval was already recorded.',
            });
          }

          // Mark as updated since we successfully recorded the approval
          updated = true;

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

          // Convert values to numbers to avoid string comparison bugs
          const totalContacts = Number(approvalData.total_contacts);
          const approvedContacts = Number(approvalData.approved_contacts);
          const requiredApprovals = Number(approvalData.required_approvals) || totalContacts;
          console.log('totalContacts', totalContacts);
          console.log('approvedContacts', approvedContacts);
          console.log('requiredApprovals', requiredApprovals);
          if (totalContacts > 0 && approvedContacts >= requiredApprovals) {
            console.log('🎉 Threshold met! Updating request status to approved');
            const updateRequestQuery = `
              UPDATE client_approval_requests
              SET status = 'approved', updated_at = NOW()
              WHERE request_id = ?
            `;
            await connection.query(updateRequestQuery, [requestId]);
          } else {
            console.log('⏳ Threshold not met yet:', {
              condition1: totalContacts > 0,
              condition2: approvedContacts >= requiredApprovals,
              message: `Need ${requiredApprovals} approvals, have ${approvedContacts}`,
            });
          }

          // If notifyOwner is true, send email and Slack notifications
          if (notifyOwner) {
            console.log('🔍 NOTIFY OWNER IS TRUE - PREPARING NOTIFICATIONS');
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
                try {
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
                } catch (emailError) {
                  console.error('Error sending approval email:', emailError);
                  // Don't let email errors affect the database transaction
                }
              }

              // Send Slack notification if configured
              console.log('🔍 CHECKING SLACK WEBHOOK URL:', !!process.env.SLACK_WEBHOOK_URL);
              if (process.env.SLACK_WEBHOOK_URL) {
                console.log('🔍 SLACK WEBHOOK FOUND - SENDING NOTIFICATION');
                try {
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                  const requestUrl = `${appUrl}/client-approval/requests/${requestId}`;

                  const isFullyApproved = approvedContacts >= requiredApprovals;
                  const approvalEmoji = isFullyApproved ? '🎉' : '✅';

                  let slackMessage =
                    `${approvalEmoji} *${isFullyApproved ? 'Content Fully Approved!' : 'Content Approval Update'}*\n\n` +
                    `*${contactData?.name || 'Client'}* (${contactData?.email || 'No email'}) has approved your content`;

                  if (!isFullyApproved) {
                    slackMessage += ` (${approvedContacts}/${totalContacts} approvals received, ${requiredApprovals} required)`;
                  } else {
                    slackMessage += `, completing the approval process!`;
                  }

                  slackMessage +=
                    `\n\n*Request:* ${requestData.title}\n` +
                    `*Client:* ${requestData.client_name}\n` +
                    `*Owner:* ${requestData.owner_name || 'Content Owner'}`;

                  if (note) {
                    slackMessage += `\n\n*Approval Note:*\n${note}`;
                  }

                  slackMessage += `\n\n<${requestUrl}|View Request>`;

                  const channel =
                    requestData.project_slack_channel || process.env.SLACK_APPROVAL_UPDATES_CHANNEL;
                  await postToSlack(slackMessage, channel);
                  console.log(
                    `Client approval Slack notification sent to ${channel || 'default channel'}`
                  );
                } catch (slackError) {
                  console.error('Error sending Slack notification:', slackError);
                  // Don't let Slack errors affect the database transaction
                }
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
        if (isClientPortal) {
          // Prevent client from setting status directly unless threshold is met (handled above)
          // Do nothing here; approval logic is handled in the earlier block
        } else {
          // Staff override: allow manual approval
          let updateQuery = `
            UPDATE client_approval_requests SET status = ?
          `;
          const queryParams = [status];

          // If this is a staff approval and status is 'approved', record staff member
          if (status === 'approved') {
            console.log('🔍 STAFF APPROVAL - STATUS IS APPROVED');
            const validationResult = await validateUserToken({
              headers: { 'x-auth-token': req.headers.authorization?.split(' ')[1] || '' },
            } as unknown as NextApiRequest);
            console.log('🔍 STAFF VALIDATION RESULT:', validationResult.isValid);

            if (validationResult.isValid) {
              console.log('🔍 STAFF VALIDATION PASSED - PROCESSING MANUAL APPROVAL');
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
                SELECT ar.title, ar.client_id, c.client_name, u.name as owner_name, ar.project_slack_channel
                FROM client_approval_requests ar
                JOIN clients c ON ar.client_id = c.client_id
                LEFT JOIN users u ON ar.created_by_id = u.id
                WHERE ar.request_id = ?
              `;

              const [requestDetailsRows] = await connection.query<RowDataPacket[]>(
                requestDetailsQuery,
                [requestId]
              );

              if (requestDetailsRows.length > 0) {
                const requestData = requestDetailsRows[0];
                console.log('SLACK_WEBHOOK_URL', process.env.SLACK_WEBHOOK_URL);
                console.log(
                  '🔍 STAFF APPROVAL - CHECKING SLACK WEBHOOK URL:',
                  !!process.env.SLACK_WEBHOOK_URL
                );
                // Send Slack notification for staff approval
                if (process.env.SLACK_WEBHOOK_URL) {
                  console.log('🔍 STAFF APPROVAL - SLACK WEBHOOK FOUND - SENDING NOTIFICATION');
                  try {
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                    const requestUrl = `${appUrl}/client-approval/requests/${requestId}`;

                    const slackMessage =
                      `✅ *Content Manually Approved* by staff\n\n` +
                      `*Request:* ${requestData.title}\n` +
                      `*Client:* ${requestData.client_name}\n` +
                      `*Owner:* ${requestData.owner_name || 'Content Owner'}\n\n` +
                      `<${requestUrl}|View Request>`;

                    // Fetch the project-specific slack channel separately to ensure it's available
                    const [channelRows] = await query<RowDataPacket[]>(
                      'SELECT project_slack_channel FROM client_approval_requests WHERE request_id = ?',
                      [requestId]
                    );
                    const specificChannel = channelRows[0]?.project_slack_channel;

                    const channel = specificChannel || process.env.SLACK_APPROVAL_UPDATES_CHANNEL;
                    await postToSlack(slackMessage, channel);
                    console.log(
                      `Staff approval Slack notification sent to ${channel || 'default channel'}`
                    );
                  } catch (slackError) {
                    console.error(
                      'Error sending Slack notification for staff approval:',
                      slackError
                    );
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
          UPDATE client_approval_requests SET is_archived = ?, updated_at = NOW() WHERE request_id = ?
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

async function updateApprovalRequestDetails(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { project_slack_channel } = req.body;

  // Staff authentication
  const userInfo = await validateUserToken(req);
  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (project_slack_channel === undefined) {
    return res.status(400).json({ error: 'No update data provided.' });
  }

  // Sanitize the channel name
  let channelToUpdate = project_slack_channel;
  if (channelToUpdate && typeof channelToUpdate === 'string') {
    channelToUpdate = channelToUpdate.trim();
    if (channelToUpdate && !channelToUpdate.startsWith('#')) {
      channelToUpdate = `#${channelToUpdate}`;
    }
  } else if (channelToUpdate === '' || channelToUpdate === null) {
    channelToUpdate = null; // Use NULL to clear the field in the database
  }

  try {
    const updateQuery = `
      UPDATE client_approval_requests
      SET project_slack_channel = ?
      WHERE request_id = ?
    `;

    const [result] = await query(updateQuery, [channelToUpdate, id]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Approval request not found.' });
    }

    return res.status(200).json({
      message: 'Slack channel updated successfully.',
      project_slack_channel: channelToUpdate,
    });
  } catch (error) {
    console.error('Error updating approval request details:', error);
    return res.status(500).json({ error: 'Failed to update approval request.' });
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
