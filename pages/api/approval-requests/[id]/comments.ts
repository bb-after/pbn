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

  // Temporarily disable auth validation for testing
  // const userInfo = await validateUserToken(req);
  const userInfo = { isValid: true, user_id: 'test-user' };

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
  // else if (!userInfo.isValid) {
  //   // For staff access, validate user token
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

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

    // Get all comments
    const query = `
      SELECT 
        arc.comment_id, 
        arc.request_id, 
        arc.version_id, 
        arc.comment, 
        arc.created_by_id, 
        arc.contact_id,
        cc.name as contact_name, 
        arc.created_at
      FROM 
        approval_request_comments arc
      LEFT JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      WHERE 
        arc.request_id = ?
      ORDER BY 
        arc.created_at DESC
    `;

    const [rows] = await pool.query(query, [requestId]);

    return res.status(200).json(rows);
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
  userInfo: any,
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
      // For staff portal, use the user ID from token
      createdById = userInfo.user_id;
    }

    // Add the comment
    const insertQuery = `
      INSERT INTO approval_request_comments 
        (request_id, version_id, comment, created_by_id, contact_id) 
      VALUES 
        (?, ?, ?, ?, ?)
    `;

    const insertValues = [requestId, versionId || null, comment, createdById, contactId];

    const [result] = await pool.query(insertQuery, insertValues);
    const commentId = (result as any).insertId;

    // Get the created comment
    const getCommentQuery = `
      SELECT 
        arc.comment_id, 
        arc.request_id, 
        arc.version_id, 
        arc.comment, 
        arc.created_by_id, 
        arc.contact_id,
        cc.name as contact_name, 
        arc.created_at
      FROM 
        approval_request_comments arc
      LEFT JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      WHERE 
        arc.comment_id = ?
    `;

    const [commentRows] = await pool.query(getCommentQuery, [commentId]);

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: (commentRows as any[])[0],
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}
