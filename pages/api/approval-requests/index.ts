import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../validate-user-token';

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
  // Validate user token for staff operations
  // const userInfo = await validateUserToken(req);
  // Replace test-user with actual user ID from validated token/session
  const userInfo = { isValid: true, user_id: 'staff-user-id-from-token' }; // Example: Replace!

  switch (req.method) {
    case 'GET':
      // Client token validation happens inside the function
      return getApprovalRequests(req, res, userInfo);
    case 'POST':
      // Ensure only authenticated staff can create
      if (!userInfo.isValid || !userInfo.user_id) {
        return res.status(401).json({ error: 'Unauthorized: Staff login required' });
      }
      return createApprovalRequest(req, res, userInfo);
    default:
      res.setHeader('Allow', ['GET', 'POST']); // Inform client of allowed methods
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get approval requests with filtering options
async function getApprovalRequests(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  const { client_id, status, contact_id } = req.query;
  const isClientPortal = req.headers['x-client-portal'] === 'true';

  try {
    let query = `
      SELECT 
        ar.request_id, 
        ar.client_id, 
        c.client_name,
        ar.title, 
        ar.description, 
        ar.file_url, 
        ar.file_type, 
        ar.inline_content, -- Select inline_content
        ar.status, 
        ar.created_by_id, 
        ar.published_url,
        ar.is_archived,
        ar.created_at, 
        ar.updated_at,
        (
          SELECT COUNT(*) FROM approval_request_contacts arc 
          WHERE arc.request_id = ar.request_id AND arc.has_approved = 1
        ) as approvals_count,
        (
          SELECT COUNT(*) FROM approval_request_contacts arc 
          WHERE arc.request_id = ar.request_id
        ) as total_contacts
      FROM 
        client_approval_requests ar
      JOIN
        clients c ON ar.client_id = c.client_id
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    // Add filters
    if (client_id) {
      conditions.push(`ar.client_id = ?`);
      queryParams.push(client_id);
    }

    if (status) {
      conditions.push(`ar.status = ?`);
      queryParams.push(status);
    }

    // For client portal, filter by contact_id
    if (isClientPortal && contact_id) {
      conditions.push(`
        ar.request_id IN (
          SELECT request_id FROM approval_request_contacts 
          WHERE contact_id = ?
        )
      `);
      queryParams.push(contact_id);
    }

    // Exclude archived requests by default unless specified otherwise
    if (req.query.include_archived !== 'true') {
      conditions.push(`ar.is_archived = 0`);
    }

    // Apply conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by created_at
    query += ' ORDER BY ar.created_at DESC';

    const [rows] = await pool.query(query, queryParams);

    // Fetch versions for each request
    const requestIds = (rows as any[]).map(row => row.request_id);
    let versionsMap: { [key: number]: any[] } = {};

    if (requestIds.length > 0) {
      const versionsQuery = `
        SELECT 
          version_id, 
          request_id, 
          version_number, 
          file_url, -- Keep file_url here for historical versions if needed
          inline_content, -- Add inline_content for historical versions
          comments, 
          created_at
        FROM 
          approval_request_versions
        WHERE 
          request_id IN (?)
        ORDER BY 
          version_number DESC
      `;

      const [versionRows] = await pool.query(versionsQuery, [requestIds]);

      // Group versions by request_id
      (versionRows as any[]).forEach(version => {
        if (!versionsMap[version.request_id]) {
          versionsMap[version.request_id] = [];
        }
        versionsMap[version.request_id].push(version);
      });
    }

    // Add versions to each request
    const results = (rows as any[]).map(row => {
      return {
        ...row,
        versions: versionsMap[row.request_id] || [],
      };
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    return res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
}

// Create a new approval request
async function createApprovalRequest(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  // Destructure inlineContent instead of fileUrl/fileType
  const { clientId, title, description, inlineContent, contactIds } = req.body;

  // Validate required fields - check inlineContent instead of fileUrl
  if (!clientId || !title || !inlineContent || !contactIds || !contactIds.length) {
    // Updated error message
    return res.status(400).json({
      error: 'Client ID, title, content, and at least one contact are required',
    });
  }

  // Basic HTML sanitization or validation might be needed here depending on trust level
  // For simplicity, we assume content is safe or handled elsewhere

  // Create a connection for transaction
  const connection = await pool.getConnection();

  try {
    // Start transactiond
    await connection.beginTransaction();

    // 1. Create the approval request
    //    - Add inline_content column
    //    - Set file_url and file_type to NULL
    const createRequestQuery = `
      INSERT INTO client_approval_requests
        (client_id, title, description, file_url, file_type, inline_content, created_by_id)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;

    const requestValues = [
      clientId,
      title,
      description || null,
      null, // file_url is now null
      null, // file_type is now null
      inlineContent, // Use inlineContent here
      userInfo.user_id, // Use the actual user ID from validation/session
    ];

    const [requestResult]: any = await connection.query(createRequestQuery, requestValues);
    const requestId = requestResult.insertId;

    // 2. Create the initial version
    //    - Set file_url to null for the version record too
    const createVersionQuery = `
      INSERT INTO approval_request_versions
        (request_id, version_number, file_url, created_by_id)
      VALUES
        (?, ?, ?, ?)
    `;

    const versionValues = [
      requestId,
      1, // Initial version number
      null, // file_url is null for the version record too
      userInfo.user_id,
    ];

    await connection.query(createVersionQuery, versionValues);

    // 3. Associate contacts with the request
    for (const contactId of contactIds) {
      const query = `
        INSERT INTO approval_request_contacts
          (request_id, contact_id)
        VALUES
          (?, ?)
      `;
      await connection.query(query, [requestId, contactId]);
    }

    // Get the contacts for sending emails
    const contactsQuery = `
      SELECT
        cc.contact_id,
        cc.name,
        cc.email,
        c.client_id,
        c.client_name
      FROM
        client_contacts cc
      JOIN
        clients c ON cc.client_id = c.client_id
      WHERE
        cc.contact_id IN (?) AND cc.is_active = 1 -- Ensure contacts are active
    `;

    const [contactsResult] = await connection.query(contactsQuery, [contactIds]);
    const contactsToSend = contactsResult as any[]; // Cast for iteration

    if (contactsToSend.length === 0) {
      console.warn(`Request ${requestId} created, but no active contacts found to notify.`);
      // Decide if this should be an error or just a warning
    }

    // Get the created request data (including inline_content)
    const getRequestQuery = `
      SELECT * FROM client_approval_requests WHERE request_id = ?
    `;
    const [requestRows] = await connection.query(getRequestQuery, [requestId]);
    const requestData = (requestRows as any[])[0];

    // Commit transaction
    await connection.commit();

    // Send email notifications AFTER commit
    if (contactsToSend.length > 0) {
      try {
        const { sendNewApprovalRequestEmail } = require('../../../utils/email'); // Ensure path is correct
        // Consider adapting sendNewApprovalRequestEmail if it needs different parameters now
        await sendNewApprovalRequestEmail(requestData, contactsToSend);
        console.log(`Emails sent successfully for request ${requestId}`);
      } catch (emailError) {
        console.error(
          `Request ${requestId} created, but failed to send email notifications:`,
          emailError
        );
        // Log this error but don't fail the request creation itself
      }
    }

    return res
      .status(201)
      .json({ message: 'Approval request created successfully', request: requestData });
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    console.error('Error creating approval request:', error);
    return res.status(500).json({ error: 'Failed to create approval request' });
  } finally {
    // Release connection back to the pool
    connection.release();
  }
}
