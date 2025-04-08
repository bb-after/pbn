import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

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
      return deleteApprovalRequest(requestId, res);
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
    return (result as any)[0].count > 0;
  } catch (error) {
    console.error('Error checking contact access:', error);
    return false;
  }
}

// Get a single approval request by ID
async function getApprovalRequest(requestId: number, res: NextApiResponse) {
  try {
    // Get the main request data
    const requestQuery = `
      SELECT 
        ar.request_id, 
        ar.client_id, 
        c.client_name,
        ar.title, 
        ar.description, 
        ar.file_url, 
        ar.file_type, 
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

    // Get contacts for this request
    const contactsQuery = `
      SELECT 
        cc.contact_id,
        cc.name,
        cc.email,
        arc.has_viewed,
        arc.has_approved,
        arc.viewed_at,
        arc.approved_at
      FROM 
        approval_request_contacts arc
      JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      WHERE 
        arc.request_id = ?
    `;

    const [contactRows] = await pool.query(contactsQuery, [requestId]);

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
    const comments = (commentRows as any[]).map(comment => ({
      ...comment,
      commenter_name: comment.contact_name || comment.staff_name || 'Unknown',
    }));

    // Combine all data
    const responseData = {
      ...request,
      contacts: contactRows,
      versions: versionRows,
      comments: comments,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching approval request:', error);
    return res.status(500).json({ error: 'Failed to fetch approval request' });
  }
}

// Update an approval request
async function updateApprovalRequest(
  requestId: number,
  req: NextApiRequest,
  res: NextApiResponse,
  isClientPortal: boolean
) {
  // Different update scenarios:
  // 1. Staff updating title, description, etc. (staff only)
  // 2. Staff updating published URL (staff only)
  // 3. Client/Staff updating status (approve/reject)
  // 4. Client marking as viewed (client only)

  const { title, description, status, publishedUrl, isArchived, markViewed, contactId } = req.body;

  // For client portal, can only update status or mark as viewed
  if (isClientPortal && (title || description || publishedUrl || isArchived !== undefined)) {
    return res.status(403).json({ error: 'Forbidden - Client portal cannot update these fields' });
  }

  // Create a connection for transaction
  const connection = await pool.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // First check if the request exists
    const checkQuery =
      'SELECT request_id, status FROM client_approval_requests WHERE request_id = ?';
    const [checkResult] = await connection.query(checkQuery, [requestId]);

    if ((checkResult as any[]).length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const currentStatus = (checkResult as any[])[0].status;

    // Handle client marking request as viewed
    if (isClientPortal && markViewed && contactId) {
      const viewedQuery = `
        UPDATE approval_request_contacts
        SET 
          has_viewed = 1,
          viewed_at = CURRENT_TIMESTAMP
        WHERE 
          request_id = ? AND contact_id = ?
      `;

      await connection.query(viewedQuery, [requestId, contactId]);
    }

    // Handle status updates (approve/reject)
    if (status && status !== currentStatus) {
      // Status can only be set to 'pending', 'approved', or 'rejected'
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid status value' });
      }

      // Update the request status
      const statusUpdateQuery = `
        UPDATE client_approval_requests
        SET 
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE 
          request_id = ?
      `;

      await connection.query(statusUpdateQuery, [status, requestId]);

      // If client is approving through the portal, update their approval status
      if (isClientPortal && status === 'approved' && contactId) {
        const approvalQuery = `
          UPDATE approval_request_contacts
          SET 
            has_approved = 1,
            approved_at = CURRENT_TIMESTAMP
          WHERE 
            request_id = ? AND contact_id = ?
        `;

        await connection.query(approvalQuery, [requestId, contactId]);
      }
    }

    // Handle staff-only updates (title, description, publishedUrl, isArchived)
    if (!isClientPortal) {
      const updateFields = [];
      const updateValues = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }

      if (publishedUrl !== undefined) {
        updateFields.push('published_url = ?');
        updateValues.push(publishedUrl);
      }

      if (isArchived !== undefined) {
        updateFields.push('is_archived = ?');
        updateValues.push(isArchived ? 1 : 0);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        const updateQuery = `
          UPDATE client_approval_requests
          SET ${updateFields.join(', ')}
          WHERE request_id = ?
        `;

        updateValues.push(requestId);
        await connection.query(updateQuery, updateValues);
      }
    }

    // Commit transaction
    await connection.commit();

    // Return the updated request
    return getApprovalRequest(requestId, res);
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();

    console.error('Error updating approval request:', error);
    return res.status(500).json({ error: 'Failed to update approval request' });
  } finally {
    connection.release();
  }
}

// Delete (or archive) an approval request
async function deleteApprovalRequest(requestId: number, res: NextApiResponse) {
  try {
    // Check if the request exists
    const checkQuery = 'SELECT request_id FROM client_approval_requests WHERE request_id = ?';
    const [checkResult] = await pool.query(checkQuery, [requestId]);

    if ((checkResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    // Instead of deleting, we'll mark as archived
    const archiveQuery = `
      UPDATE client_approval_requests
      SET 
        is_archived = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        request_id = ?
    `;

    await pool.query(archiveQuery, [requestId]);

    return res.status(200).json({ message: 'Approval request archived successfully' });
  } catch (error) {
    console.error('Error archiving approval request:', error);
    return res.status(500).json({ error: 'Failed to archive approval request' });
  }
}
