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

  // Check client portal access
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
  }

  switch (req.method) {
    case 'GET':
      return getApprovalRequest(requestId, res);
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
async function getApprovalRequest(requestId: number, res: NextApiResponse) {
  try {
    // Get the main request data (including inline_content)
    const requestQuery = `
      SELECT 
        ar.request_id, 
        ar.client_id, 
        c.client_name,
        ar.title, 
        ar.description, 
        ar.file_url, 
        ar.file_type, 
        ar.inline_content, 
        ar.status, 
        ar.created_by_id, 
        ar.published_url,
        ar.is_archived,
        ar.created_at, 
        ar.updated_at
      FROM 
        client_approval_requests ar
      JOIN
        clients c ON ar.client_id = c.client_id
      WHERE 
        ar.request_id = ?
    `;

    const [requestRows] = await pool.query(requestQuery, [requestId]);

    if ((requestRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    const request = (requestRows as any[])[0];

    // Get contacts (basic info + approval status)
    const contactsQuery = `
      SELECT 
        cc.contact_id,
        cc.name,
        cc.email,
        arc.has_approved,
        arc.approved_at
      FROM 
        approval_request_contacts arc
      JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      WHERE 
        arc.request_id = ? AND cc.is_active = 1
    `;
    const [contactRows] = await pool.query(contactsQuery, [requestId]);

    // --- Get ALL views for this request ---
    const viewsQuery = `
      SELECT 
        av.view_id,
        av.contact_id,
        av.viewed_at,
        cc.email -- Select the contact's email
      FROM
        approval_request_views av -- Alias view table
      JOIN 
        client_contacts cc ON av.contact_id = cc.contact_id -- Join to get email
      WHERE
        av.request_id = ?
      ORDER BY
        av.viewed_at DESC -- Show most recent first
    `;
    const [viewRows] = await pool.query(viewsQuery, [requestId]);

    // --- Process views and merge with contacts ---
    const contactsMap: { [key: number]: ContactDetails } = {};
    (contactRows as any[]).forEach(contact => {
      contactsMap[contact.contact_id] = {
        ...contact,
        views: [], // Initialize empty views array
      };
    });

    (viewRows as any[]).forEach(view => {
      if (contactsMap[view.contact_id]) {
        // Ensure viewed_at is sent in ISO format (UTC)
        // Append Z to indicate UTC before parsing and converting
        const viewedAtISO =
          view.viewed_at instanceof Date
            ? view.viewed_at.toISOString()
            : new Date(String(view.viewed_at) + 'Z').toISOString(); // Treat DB string as UTC

        contactsMap[view.contact_id].views.push({
          view_id: view.view_id,
          viewed_at: viewedAtISO, // Send ISO string
          email: view.email,
        });
      }
    });
    const contactsWithViews = Object.values(contactsMap);
    // --- End view processing ---

    // Get versions for this request
    const versionsQuery = `
      SELECT 
        version_id,
        version_number,
        file_url,
        comments,
        created_by_id,
        created_at
      FROM 
        approval_request_versions
      WHERE 
        request_id = ?
      ORDER BY 
        version_number DESC
    `;

    const [versionRows] = await pool.query(versionsQuery, [requestId]);

    // Get comments for this request
    const commentsQuery = `
      SELECT 
        arc.comment_id,
        arc.comment,
        arc.created_by_id,
        arc.contact_id,
        cc.name as contact_name,
        u.name as staff_name,
        arc.created_at
      FROM 
        approval_request_comments arc
      LEFT JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      LEFT JOIN
        users u ON arc.created_by_id = u.id
      WHERE 
        arc.request_id = ?
      ORDER BY 
        arc.created_at DESC
    `;

    const [commentRows] = await pool.query(commentsQuery, [requestId]);

    // Map comments to include commenter_name
    const standardComments = (commentRows as any[]).map(comment => ({
      ...comment,
      commenter_name: comment.contact_name || comment.staff_name || 'Unknown',
    }));

    // Get section-specific comments for this request
    const sectionCommentsQuery = `
      SELECT 
        sc.section_comment_id,
        sc.request_id,
        sc.contact_id,
        sc.start_offset,
        sc.end_offset,
        sc.selected_text,
        sc.comment_text,
        sc.created_at,
        cc.name as contact_name -- Get commenter name
      FROM 
        approval_request_section_comments sc
      JOIN 
        client_contacts cc ON sc.contact_id = cc.contact_id
      WHERE 
        sc.request_id = ?
      ORDER BY 
        sc.created_at ASC -- Or order by offset?
    `;
    const [sectionCommentRows] = await pool.query(sectionCommentsQuery, [requestId]);

    // Combine all data
    const responseData = {
      ...request,
      contacts: contactsWithViews, // Use the processed contacts with views
      versions: versionRows,
      comments: standardComments,
      section_comments: sectionCommentRows,
    };

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
