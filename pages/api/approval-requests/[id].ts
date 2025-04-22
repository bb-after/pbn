import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import AWS from 'aws-sdk';
import { URL } from 'url';

// Configure AWS (ensure region is set, credentials should be auto-loaded from env)
AWS.config.update({ region: 'us-east-2' }); // Force us-east-2 based on bucket URL
const s3 = new AWS.S3();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
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
      SELECT ar.*, c.client_name
      FROM client_approval_requests ar
      JOIN clients c ON ar.client_id = c.client_id
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
      LEFT JOIN client_contacts cc ON c.contact_id = cc.contact_id
      LEFT JOIN users u ON c.created_by_id = u.id
      WHERE c.request_id = ?
      ORDER BY c.created_at DESC
    `;
    const [standardComments] = await pool.query(commentsQuery, [requestId]);

    // Query to get section comments
    const sectionCommentsQuery = `
      SELECT sc.*, cc.name as contact_name 
      FROM approval_request_section_comments sc
      LEFT JOIN client_contacts cc ON sc.contact_id = cc.contact_id
      WHERE sc.request_id = ?
      ORDER BY sc.created_at DESC
    `;
    const [sectionCommentRows] = await pool.query(sectionCommentsQuery, [requestId]);

    // Fetch replies for section comments
    let sectionCommentsWithReplies = [];
    if ((sectionCommentRows as any[]).length > 0) {
      const commentIds = (sectionCommentRows as any[]).map(comment => comment.section_comment_id);

      const repliesQuery = `
        SELECT * FROM approval_request_comment_replies
        WHERE section_comment_id IN (?)
        ORDER BY created_at ASC
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
  const { status, publishedUrl, contactId, markViewed, isArchived } = req.body;

  // Validate contactId if action is from client portal
  if (isClientPortal && !contactId) {
    return res.status(400).json({ error: 'Contact ID is required for client portal actions' });
  }

  // Validate required fields based on action
  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  if (status && !contactId) {
    return res.status(400).json({ error: 'Contact ID is required when updating status' });
  }
  if (markViewed && !contactId) {
    return res.status(400).json({ error: 'Contact ID is required when marking as viewed' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    let updated = false;

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

    // Handle status update (approved/rejected)
    if (status && contactId) {
      const updateStatusQuery = `
        UPDATE client_approval_requests 
        SET status = ? 
        WHERE request_id = ? 
      `;
      // Only update main status if ALL contacts have approved or if one rejects
      // This logic might need refinement based on specific business rules
      // For now, let's assume rejection sets status immediately,
      // and approval only sets main status if everyone approved (checked separately)

      // Update the specific contact's approval record using UTC_TIMESTAMP()
      const updateContactQuery = `
        UPDATE approval_request_contacts 
        SET has_approved = ?, approved_at = CASE WHEN ? = 'approved' THEN UTC_TIMESTAMP() ELSE NULL END
        WHERE request_id = ? AND contact_id = ?
      `;

      const hasApproved = status === 'approved' ? 1 : 0;

      // Pass status for the CASE statement, instead of approvedAt
      await connection.query(updateContactQuery, [
        hasApproved,
        status, // Parameter for the CASE statement
        requestId,
        contactId,
      ]);
      console.log(
        `Approval updated (UTC) for request ${requestId}, contact ${contactId}, status: ${status}`
      );
      updated = true;

      // Logic to update the main request status (can be complex)
      if (status === 'rejected') {
        // If one rejects, reject the whole request
        await connection.query(updateStatusQuery, ['rejected', requestId]);
        console.log(`Request ${requestId} status set to rejected.`);
      } else if (status === 'approved') {
        // Check if all other contacts have also approved
        const checkAllApprovedQuery = `
          SELECT COUNT(*) as total, SUM(has_approved) as approved_count
          FROM approval_request_contacts
          WHERE request_id = ?
        `;
        const [approvalStatusRows]: any = await connection.query(checkAllApprovedQuery, [
          requestId,
        ]);
        if (approvalStatusRows[0].total === approvalStatusRows[0].approved_count) {
          // All contacts have approved, update main status
          await connection.query(updateStatusQuery, ['approved', requestId]);
          console.log(`Request ${requestId} status set to approved (all contacts approved).`);
          // TODO: Potentially trigger publish workflow here?
        }
      }
    }

    // Handle published URL update (likely staff only)
    if (publishedUrl !== undefined && !isClientPortal) {
      const query = `
        UPDATE client_approval_requests SET published_url = ? WHERE request_id = ?
      `;
      await connection.query(query, [publishedUrl || null, requestId]);
      console.log(`Published URL updated for request ${requestId}`);
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

    // If no action resulted in 'updated' being true, then it was an invalid request
    if (!updated) {
      await connection.rollback();
      return res.status(400).json({ error: 'No valid update operation specified' });
    }

    await connection.commit();
    return res.status(200).json({ message: 'Approval request updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating approval request:', error);
    return res.status(500).json({ error: 'Failed to update approval request' });
  } finally {
    connection.release();
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
