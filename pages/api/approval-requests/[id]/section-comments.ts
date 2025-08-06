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

// Function to validate staff token using database lookup (consistent with other APIs)
async function validateToken(token: string): Promise<any> {
  try {
    // Query the database for the user token
    const query = `
      SELECT id, name, email, role
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
  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID required' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getSectionComments(req, res);
    case 'POST':
      return createSectionComment(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

// GET handler to retrieve section comments
async function getSectionComments(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const versionId = req.query.versionId ? Number(req.query.versionId) : null;

  try {
    // Build the SQL query with optional version filter
    let query = `
      SELECT 
        sc.*, 
        u.name as user_name,
        cc.name as contact_name,
        DATE_FORMAT(sc.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at_iso
      FROM 
        approval_request_section_comments sc
      LEFT JOIN 
        users u ON sc.user_id = u.id
      LEFT JOIN 
        client_contacts cc ON sc.client_contact_id = cc.contact_id
      WHERE 
        sc.request_id = ?
    `;

    const params = [Number(id)];

    // Add version filter if specified
    if (versionId !== null) {
      query += ' AND sc.version_id = ?';
      params.push(versionId);
    }

    query += ' ORDER BY sc.created_at ASC';

    const [rows] = await pool.query(query, params);

    // Get reactions for each comment
    const commentsWithReactions = await Promise.all(
      (rows as any[]).map(async comment => {
        // Query to get reactions for this comment
        const reactionQuery = `
          SELECT 
            r.reaction_id,
            r.emoji,
            u.id as user_id,
            u.name as user_name,
            cc.contact_id,
            cc.name as contact_name
          FROM 
            reactions r
          LEFT JOIN 
            users u ON r.user_id = u.id
          LEFT JOIN 
            client_contacts cc ON r.contact_id = cc.contact_id
          WHERE 
            r.target_type = 'section_comment' AND r.target_id = ?
        `;

        const [reactionRows] = await pool.query(reactionQuery, [comment.section_comment_id]);

        // Format reactions
        const reactions = (reactionRows as any[]).map(reaction => ({
          id: reaction.reaction_id,
          emoji: reaction.emoji,
          userId: reaction.user_id || null,
          userName: reaction.user_name || null,
          contactId: reaction.contact_id || null,
          contactName: reaction.contact_name || null,
        }));

        // Get replies for this comment
        const repliesQuery = `
          SELECT 
            r.reply_id,
            r.reply_text,
            DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at_iso,
            u.id as user_id,
            u.name as user_name,
            cc.contact_id,
            cc.name as contact_name
          FROM 
            approval_request_comment_replies r
          LEFT JOIN 
            users u ON r.user_id = u.id
          LEFT JOIN 
            client_contacts cc ON r.contact_id = cc.contact_id
          WHERE 
            r.section_comment_id = ?
          ORDER BY 
            r.created_at ASC
        `;

        const [replyRows] = await pool.query(repliesQuery, [comment.section_comment_id]);

        // Format replies
        const replies = (replyRows as any[]).map(reply => ({
          id: reply.reply_id,
          text: reply.reply_text,
          createdAt: reply.created_at_iso,
          userId: reply.user_id || null,
          userName: reply.user_name || null,
          contactId: reply.contact_id || null,
          contactName: reply.contact_name || null,
        }));

        // Return comment with reactions and replies
        return {
          ...comment,
          reactions,
          replies,
        };
      })
    );

    return res.status(200).json({
      comments: commentsWithReactions,
      message:
        `Retrieved ${commentsWithReactions.length} comments` +
        (versionId ? ` for version ${versionId}` : ''),
    });
  } catch (error) {
    console.error('Error fetching section comments:', error);
    return res.status(500).json({ error: 'Database error while fetching comments' });
  }
}

// POST handler to create a new section comment
async function createSectionComment(req: NextApiRequest, res: NextApiResponse) {
  // Validate input parameters
  const { id } = req.query;
  const {
    startOffset,
    endOffset,
    commentText,
    selectedText,
    versionId,
    contactId: bodyContactId,
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Request ID is required' });
  }

  if (startOffset === undefined || endOffset === undefined) {
    return res.status(400).json({ error: 'Start and end offsets are required' });
  }

  if (!commentText) {
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
  }
  // Also check for contactId in the request body (for client requests coming from Recogito)
  else if (bodyContactId && !isNaN(Number(bodyContactId))) {
    contactId = Number(bodyContactId);
  }

  // For client comments, check access
  if (contactId) {
    // Verify contact has access to this specific request
    const hasAccess = await checkContactAccess(requestId, contactId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: 'Forbidden - Contact does not have access to this request' });
    }
  }
  // Check for staff authentication if not a client request
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

  // --- Get the current version if not provided ---
  let currentVersionId = versionId;
  if (!currentVersionId) {
    try {
      const versionQuery = `
        SELECT version_id FROM approval_request_versions 
        WHERE request_id = ? 
        ORDER BY version_number DESC 
        LIMIT 1
      `;
      const [versionResult] = await pool.query(versionQuery, [requestId]);
      if ((versionResult as any[]).length === 0) {
        return res.status(404).json({ error: 'Current version not found' });
      }
      currentVersionId = (versionResult as any[])[0].version_id;
    } catch (error) {
      console.error('Error fetching current version ID:', error);
      // Continue even if we can't get the version ID
    }
  }

  // --- Save Comment to Database ---
  try {
    let insertQuery = '';
    let insertValues = [];
    let getCommentQuery = '';

    if (isStaffComment) {
      // Staff comment
      insertQuery = `
        INSERT INTO approval_request_section_comments
          (request_id, client_contact_id, user_id, start_offset, end_offset, selected_text, comment_text, version_id)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
      `;
      insertValues = [
        requestId,
        staffUserInfo.id,
        Number(startOffset),
        Number(endOffset),
        selectedText || null,
        commentText.trim(),
        currentVersionId || null,
      ];

      // Get staff name from the users table
      getCommentQuery = `
        SELECT sc.*, u.name as user_name, v.version_number,
               DATE_FORMAT(sc.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at_iso
        FROM approval_request_section_comments sc
        JOIN users u ON sc.user_id = u.id
        LEFT JOIN approval_request_versions v ON sc.version_id = v.version_id
        WHERE sc.section_comment_id = ?
      `;
    } else {
      // Client comment
      insertQuery = `
        INSERT INTO approval_request_section_comments
          (request_id, client_contact_id, user_id, start_offset, end_offset, selected_text, comment_text, version_id)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
      `;
      insertValues = [
        requestId,
        contactId,
        Number(startOffset),
        Number(endOffset),
        selectedText || null,
        commentText.trim(),
        currentVersionId || null,
      ];

      getCommentQuery = `
        SELECT sc.*, cc.name as contact_name, v.version_number,
               DATE_FORMAT(sc.created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at_iso
        FROM approval_request_section_comments sc
        JOIN client_contacts cc ON sc.client_contact_id = cc.contact_id
        LEFT JOIN approval_request_versions v ON sc.version_id = v.version_id
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
