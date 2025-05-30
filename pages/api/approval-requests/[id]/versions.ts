import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 20,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid request ID is required' });
  }

  const requestId = Number(id);

  // Temporarily disable auth check for testing
  // const userInfo = await validateUserToken(req);
  // if (!userInfo.isValid) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }
  const userInfo = { isValid: true, user_id: 'test-user' };

  switch (req.method) {
    case 'GET':
      return getVersions(requestId, res);
    case 'POST':
      return addVersion(requestId, req, res, userInfo);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all versions for an approval request
async function getVersions(requestId: number, res: NextApiResponse) {
  try {
    // First check if the request exists
    const checkQuery = 'SELECT request_id FROM client_approval_requests WHERE request_id = ?';
    const [checkResult] = await pool.query(checkQuery, [requestId]);

    if ((checkResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    // Get all versions
    const query = `
      SELECT 
        version_id, 
        request_id, 
        version_number, 
        file_url, 
        inline_content,
        content_type,
        google_doc_id,
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

    const [rows] = await pool.query(query, [requestId]);

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return res.status(500).json({ error: 'Failed to fetch versions' });
  }
}

// Add a new version to an approval request
async function addVersion(
  requestId: number,
  req: NextApiRequest,
  res: NextApiResponse,
  userInfo: any
) {
  const { fileUrl, inlineContent, comments, contentType, googleDocId } = req.body;

  // Either fileUrl or inlineContent must be provided (supporting both for backward compatibility)
  if (!fileUrl && !inlineContent) {
    return res.status(400).json({ error: 'Either file URL or inline content is required' });
  }

  // Create a connection for transaction
  const connection = await pool.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // 1. Check if the request exists
    const checkQuery =
      'SELECT request_id, content_type, google_doc_id FROM client_approval_requests WHERE request_id = ?';
    const [checkResult] = await connection.query(checkQuery, [requestId]);

    if ((checkResult as any[]).length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const existingRequest = (checkResult as any[])[0];

    // 2. Get the current highest version number
    const versionQuery = `
      SELECT MAX(version_number) as max_version 
      FROM approval_request_versions 
      WHERE request_id = ?
    `;

    const [versionResult] = await connection.query(versionQuery, [requestId]);
    const currentMaxVersion = (versionResult as any[])[0].max_version || 0;
    const newVersionNumber = currentMaxVersion + 1;

    // Determine the content type for the new version
    // If explicitly provided, use that. Otherwise, inherit from the existing request
    const versionContentType = contentType || existingRequest.content_type || 'html';
    const versionGoogleDocId = googleDocId || existingRequest.google_doc_id || null;

    // 3. Add the new version
    const insertQuery = `
      INSERT INTO approval_request_versions 
        (request_id, version_number, file_url, inline_content, content_type, google_doc_id, comments, created_by_id) 
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertValues = [
      requestId,
      newVersionNumber,
      fileUrl || null, // Use fileUrl if provided, otherwise null
      inlineContent || null, // Store inline content in versions table
      versionContentType,
      versionGoogleDocId,
      comments || null,
      userInfo.id || null,
    ];

    const [insertResult] = await connection.query(insertQuery, insertValues);
    const versionId = (insertResult as any).insertId;

    // 4. Update the main request with the new file URL or inline content and reset status to pending
    const updateQuery = `
      UPDATE client_approval_requests
      SET 
        file_url = ?,
        inline_content = ?,
        content_type = ?,
        google_doc_id = ?,
        status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        request_id = ?
    `;

    await connection.query(updateQuery, [
      fileUrl || null,
      inlineContent || null,
      versionContentType,
      versionGoogleDocId,
      requestId,
    ]);

    // 5. Reset approval status for all contacts (without resetting view status which is now in a separate table)
    const resetApprovalsQuery = `
      UPDATE approval_request_contacts
      SET 
        has_approved = 0,
        approved_at = NULL
      WHERE 
        request_id = ?
    `;

    await connection.query(resetApprovalsQuery, [requestId]);

    // Get the inserted version
    const getVersionQuery = `
      SELECT 
        version_id, 
        request_id, 
        version_number, 
        file_url, 
        inline_content,
        content_type,
        google_doc_id,
        comments, 
        created_by_id, 
        created_at
      FROM 
        approval_request_versions
      WHERE 
        version_id = ?
    `;

    const [versionRows] = await connection.query(getVersionQuery, [versionId]);
    const versionData = (versionRows as any[])[0];

    // Get contacts for this request to send emails
    const contactsQuery = `
      SELECT 
        cc.contact_id, 
        cc.name, 
        cc.email, 
        c.client_id, 
        c.client_name 
      FROM 
        approval_request_contacts arc
      JOIN
        client_contacts cc ON arc.contact_id = cc.contact_id
      JOIN
        clients c ON cc.client_id = c.client_id
      WHERE 
        arc.request_id = ? AND cc.is_active = 1
    `;

    const [contactRows] = await connection.query(contactsQuery, [requestId]);

    // Get request details
    const requestQuery = `
      SELECT title FROM client_approval_requests WHERE request_id = ?
    `;
    const [requestRows] = await connection.query(requestQuery, [requestId]);

    // Commit transaction
    await connection.commit();

    // Send email notifications to contacts about the new version
    try {
      const { sendNewVersionEmail } = require('../../../../utils/email');

      // Send emails in the background (don't await)
      (contactRows as any[]).forEach(contact => {
        sendNewVersionEmail(
          contact,
          {
            request_id: requestId,
            title: (requestRows as any[])[0].title,
          },
          versionData
        ).catch((err: any) => {
          console.error(`Error sending new version notification email to ${contact.email}:`, err);
        });
      });
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }

    return res.status(201).json({
      message: 'New version added successfully',
      version: versionData,
    });
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();

    console.error('Error adding new version:', error);
    return res.status(500).json({ error: 'Failed to add new version' });
  } finally {
    connection.release();
  }
}
