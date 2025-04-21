import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  const { startOffset, endOffset, selectedText, commentText } = req.body;

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

  // --- Client Portal Authentication/Authorization ---
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  const contactIdHeader = req.headers['x-client-contact-id'];

  if (!isClientPortal || !contactIdHeader || isNaN(Number(contactIdHeader))) {
    // Only allow comments from authenticated client portal users
    return res.status(401).json({ error: 'Unauthorized - Client access required' });
  }
  const contactId = Number(contactIdHeader);

  // Verify contact has access to this specific request
  const hasAccess = await checkContactAccess(requestId, contactId);
  if (!hasAccess) {
    return res
      .status(403)
      .json({ error: 'Forbidden - Contact does not have access to this request' });
  }

  // --- Save Comment to Database ---
  try {
    const insertQuery = `
      INSERT INTO approval_request_section_comments
        (request_id, contact_id, start_offset, end_offset, selected_text, comment_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const insertValues = [
      requestId,
      contactId,
      Number(startOffset),
      Number(endOffset),
      selectedText || null, // Store selected text for context, allow null
      commentText.trim(),
    ];

    const [result] = await pool.query(insertQuery, insertValues);
    const insertedId = (result as any).insertId;

    // Fetch the newly created comment to return it (optional but good practice)
    const getCommentQuery = `
            SELECT sc.*, cc.name as contact_name 
            FROM approval_request_section_comments sc
            JOIN client_contacts cc ON sc.contact_id = cc.contact_id
            WHERE sc.section_comment_id = ?
        `;
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
