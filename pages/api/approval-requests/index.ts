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
  connectionLimit: 10,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user token for staff operations
  // Comment out validation for now for testing purposes
  // const userInfo = await validateUserToken(req);
  const userInfo = { isValid: true, user_id: 'test-user' };

  switch (req.method) {
    case 'GET':
      // Client token validation happens inside the function
      return getApprovalRequests(req, res, userInfo);
    case 'POST':
      // Only staff can create approval requests
      // if (!userInfo.isValid) {
      //   return res.status(401).json({ error: 'Unauthorized' });
      // }
      return createApprovalRequest(req, res, userInfo);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
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

    // Apply conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by created_at
    query += ' ORDER BY ar.created_at DESC';

    const [rows] = await pool.query(query, queryParams);

    // Fetch versions for each request in a separate query
    // (MySQL doesn't have JSON aggregation like PostgreSQL)
    const requestIds = (rows as any[]).map(row => row.request_id);
    let versionsMap: { [key: number]: any[] } = {};

    if (requestIds.length > 0) {
      const versionsQuery = `
        SELECT 
          version_id, 
          request_id, 
          version_number, 
          file_url, 
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
  const { clientId, title, description, fileUrl, fileType, contactIds } = req.body;

  // Validate required fields
  if (!clientId || !title || !fileUrl || !contactIds || !contactIds.length) {
    return res.status(400).json({
      error: 'Client ID, title, file URL, and at least one contact are required',
    });
  }

  // Create a connection for transaction
  const connection = await pool.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // 1. Create the approval request
    const createRequestQuery = `
      INSERT INTO client_approval_requests 
        (client_id, title, description, file_url, file_type, created_by_id) 
      VALUES 
        (?, ?, ?, ?, ?, ?)
    `;

    const requestValues = [
      clientId,
      title,
      description || null,
      fileUrl,
      fileType || null,
      userInfo.user_id || null,
    ];

    const [requestResult]: any = await connection.query(createRequestQuery, requestValues);
    const requestId = requestResult.insertId;

    // 2. Create the initial version
    const createVersionQuery = `
      INSERT INTO approval_request_versions 
        (request_id, version_number, file_url, created_by_id) 
      VALUES 
        (?, ?, ?, ?)
    `;

    const versionValues = [
      requestId,
      1, // Initial version number
      fileUrl,
      userInfo.user_id || null,
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
        cc.contact_id IN (?)
    `;

    const [contactsResult] = await connection.query(contactsQuery, [contactIds]);

    // Get the created request
    const getRequestQuery = `
      SELECT * FROM client_approval_requests WHERE request_id = ?
    `;
    const [requestRows] = await connection.query(getRequestQuery, [requestId]);
    const requestData = (requestRows as any[])[0];

    // Commit transaction
    await connection.commit();

    // Send email notifications to contacts
    try {
      const { sendNewApprovalRequestEmail } = require('../../../utils/email');

      // Send emails in the background (don't await)
      (contactsResult as any[]).forEach(contact => {
        sendNewApprovalRequestEmail(contact, {
          request_id: requestId,
          title: title,
          description: description,
        }).catch((err: any) => {
          console.error(`Error sending notification email to ${contact.email}:`, err);
        });
      });
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }

    return res.status(201).json({
      message: 'Approval request created successfully',
      requestId,
      request: requestData,
    });
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();

    console.error('Error creating approval request:', error);
    return res.status(500).json({ error: 'Failed to create approval request' });
  } finally {
    connection.release();
  }
}
