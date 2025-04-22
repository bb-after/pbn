import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

// Function to validate staff token using direct database check
async function validateToken(token: string): Promise<any> {
  try {
    // Query the database for the user token
    const query = `
      SELECT id, name, email
      FROM users 
      WHERE user_token = ?
    `;

    const [rows] = await pool.query(query, [token]);

    if ((rows as any[]).length === 0) {
      return null;
    }

    return (rows as any[])[0];
  } catch (error) {
    console.error('Error validating token against database:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, commentId } = req.query;
  const { replyText, user_id, contactId } = req.body;

  // --- Input Validation ---
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }

  if (!commentId || isNaN(Number(commentId))) {
    return res.status(400).json({ error: 'Valid comment ID is required' });
  }

  if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
    return res.status(400).json({ error: 'Reply text is required' });
  }

  const requestId = Number(id);
  const sectionCommentId = Number(commentId);

  // --- Authentication ---
  // Check if this is a staff member or client
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  const contactIdHeader = req.headers['x-client-contact-id'];

  // Get token from either Authorization header or x-auth-token
  let authToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Get token from Authorization: Bearer <token>
    authToken = authHeader.substring(7);
  } else {
    // Fallback to x-auth-token
    authToken = req.headers['x-auth-token'] as string;
  }

  // Log the token for debugging (remove in production)
  console.log('Auth token received:', authToken ? `${authToken.substring(0, 10)}...` : 'none');

  let isStaffReply = false;
  let staffUserInfo = null;

  // Staff authentication
  if (authToken) {
    staffUserInfo = await validateToken(authToken);
    if (!staffUserInfo) {
      return res.status(401).json({ error: 'Unauthorized - Invalid staff token' });
    }
    isStaffReply = true;
  }
  // Client portal authentication
  else if (isClientPortal && contactIdHeader && !isNaN(Number(contactIdHeader))) {
    // Verify client has access to this request
    try {
      const checkAccessQuery = `
        SELECT COUNT(*) as count
        FROM approval_request_contacts
        WHERE request_id = ? AND contact_id = ?
      `;
      const [result] = await pool.query(checkAccessQuery, [requestId, contactIdHeader]);
      if ((result as any[])[0].count === 0) {
        return res.status(403).json({ error: 'Forbidden - No access to this request' });
      }
    } catch (error) {
      console.error('Error checking contact access:', error);
      return res.status(500).json({ error: 'Failed to verify access' });
    }
  }
  // No valid authentication
  else {
    return res.status(401).json({ error: 'Unauthorized - Valid authentication required' });
  }

  // --- Verify the section comment exists ---
  try {
    const checkCommentQuery = `
      SELECT COUNT(*) as count
      FROM approval_request_section_comments
      WHERE section_comment_id = ? AND request_id = ?
    `;
    const [result] = await pool.query(checkCommentQuery, [sectionCommentId, requestId]);
    if ((result as any[])[0].count === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
  } catch (error) {
    console.error('Error checking comment:', error);
    return res.status(500).json({ error: 'Failed to verify comment' });
  }

  // --- Save Reply to Database ---
  try {
    // Create a new comment_reply table or use an existing one
    const insertQuery = `
      INSERT INTO approval_request_comment_replies
        (section_comment_id, user_id, client_contact_id, reply_text)
      VALUES (?, ?, ?, ?)
    `;

    const insertValues = [
      sectionCommentId,
      isStaffReply ? user_id || staffUserInfo.id : null,
      isStaffReply ? null : Number(contactIdHeader),
      replyText.trim(),
    ];

    const [result] = await pool.query(insertQuery, insertValues);
    const replyId = (result as any).insertId;

    // Fetch the newly created reply with author name
    let getReplyQuery;
    if (isStaffReply) {
      getReplyQuery = `
        SELECT r.*, u.name as author_name
        FROM approval_request_comment_replies r
        JOIN users u ON r.user_id = u.id
        WHERE r.reply_id = ?
      `;
    } else {
      getReplyQuery = `
        SELECT r.*, cc.name as author_name
        FROM approval_request_comment_replies r
        JOIN client_contacts cc ON r.client_contact_id = cc.contact_id
        WHERE r.reply_id = ?
      `;
    }

    const [replyRows] = await pool.query(getReplyQuery, [replyId]);
    const replyData = (replyRows as any[])[0] || null;

    return res.status(201).json({
      message: 'Reply added successfully',
      reply: replyData,
    });
  } catch (error) {
    console.error('Error saving reply:', error);
    return res.status(500).json({ error: 'Failed to save reply' });
  }
}
