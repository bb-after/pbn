import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { verify } from 'jsonwebtoken';

// Database connection pool (reuse configuration)
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20, // Use consistent limit
});

// Basic function to check client portal access (can be refactored later)
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

// Function to validate staff token
async function validateToken(token: string): Promise<any> {
  try {
    const decoded = verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');
    return decoded;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  const { startOffset, endOffset, selectedText, commentText, staffId, staffName } = req.body;

  // --- Input Validation ---
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }
  if (
    startOffset === undefined ||
    startOffset === null ||
    isNaN(Number(startOffset)) ||
    Number(startOffset) < 0
  ) {
    return res.status(400).json({ error: 'Valid startOffset is required' });
  }
  if (
    endOffset === undefined ||
    endOffset === null ||
    isNaN(Number(endOffset)) ||
    Number(endOffset) <= Number(startOffset)
  ) {
    return res
      .status(400)
      .json({ error: 'Valid endOffset (greater than startOffset) is required' });
  }
  if (!commentText || typeof commentText !== 'string' || !commentText.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const requestId = Number(id);

  // Determine if this is a client or staff comment
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  const contactIdHeader = req.headers['x-client-contact-id'];
  const authToken = req.headers['x-auth-token'] as string;

  let contactId: number | null = null;
  let isStaffComment = false;
  let staffUserInfo = null;

  // Check for client portal authentication
  if (isClientPortal && contactIdHeader && !isNaN(Number(contactIdHeader))) {
    contactId = Number(contactIdHeader);

    // Verify contact has access to this specific request
    const hasAccess = await checkContactAccess(requestId, contactId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden - Contact does not have access to this request' });
    }
  }
  // Check for staff authentication
  else if (authToken) {
    staffUserInfo = await validateToken(authToken);
    if (!staffUserInfo) {
      return res.status(401).json({ error: 'Unauthorized - Invalid staff token' });
    }
    isStaffComment = true;
  }
  // No valid authentication
  else {
    return res.status(401).json({ error: 'Unauthorized - Valid authentication required' });
  }

  // --- Save Comment to Database ---
  try {
    let insertQuery = '';
    let insertValues = [];
    let getCommentQuery = '';
    let queryParams = [];

    if (isStaffComment) {
      // Staff comment
      insertQuery = `
        INSERT INTO approval_request_section_comments
          (request_id, contact_id, staff_id, staff_name, start_offset, end_offset, selected_text, comment_text)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
      `;
      insertValues = [
        requestId,
        staffId || staffUserInfo.id,
        staffName || staffUserInfo.name || 'Staff',
        Number(startOffset),
        Number(endOffset),
        selectedText || null,
        commentText.trim(),
      ];

      getCommentQuery = `
        SELECT sc.*, NULL as contact_name, sc.staff_name as contact_name 
        FROM approval_request_section_comments sc
        WHERE sc.section_comment_id = ?
      `;
    } else {
      // Client comment
      insertQuery = `
        INSERT INTO approval_request_section_comments
          (request_id, contact_id, staff_id, staff_name, start_offset, end_offset, selected_text, comment_text)
        VALUES (?, ?, NULL, NULL, ?, ?, ?, ?)
      `;
      insertValues = [
        requestId,
        contactId,
        Number(startOffset),
        Number(endOffset),
        selectedText || null,
        commentText.trim(),
      ];

      getCommentQuery = `
        SELECT sc.*, cc.name as contact_name 
        FROM approval_request_section_comments sc
        JOIN client_contacts cc ON sc.contact_id = cc.contact_id
        WHERE sc.section_comment_id = ?
      `;
    }

    // Insert the comment
    const [result] = await pool.query(insertQuery, insertValues);
    const insertedId = (result as any).insertId;

    // Fetch the newly created comment
    const [commentRows] = await pool.query(getCommentQuery, [insertedId]);

    return res.status(201).json({
      message: 'Section comment added successfully',
      comment: (commentRows as any[])[0] || null,
    });
  } catch (error) {
    console.error('Error saving section comment:', error);
    return res.status(500).json({ error: 'Failed to save section comment' });
  }
}
