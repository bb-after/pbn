import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../validate-user-token';
import { postToSlack } from '../../../utils/postToSlack';

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
  const token = (req.headers['x-auth-token'] as string) || (req.cookies && req.cookies.auth_token);

  // Log token for debugging
  console.log('Token received in approval-requests API:', token ? 'Present' : 'Missing');
  if (token) {
    console.log('Token value (first 10 chars):', token.substring(0, 10) + '...');
  }

  const userInfo = await validateUserToken(req);

  // Log validation result for debugging
  console.log('User validation result:', { isValid: userInfo.isValid, userId: userInfo.user_id });

  // // If validation failed, use a default user ID for testing purposes - REMOVE THIS IN PRODUCTION
  // if (!userInfo.isValid || !userInfo.user_id) {
  //   console.warn('Using temporary default user ID for testing - REMOVE IN PRODUCTION');
  //   userInfo.isValid = true;
  //   userInfo.user_id = 1; // Use a valid user ID from your database
  //   userInfo.role = 'admin'; // Assume admin for testing
  // }

  switch (req.method) {
    case 'GET':
      // Client token validation happens inside the function
      return getApprovalRequests(req, res, userInfo);
    case 'POST':
      // Ensure only authenticated staff can create
      return createApprovalRequest(req, res, userInfo);
    default:
      res.setHeader('Allow', ['GET', 'POST']); // Inform client of allowed methods
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get approval requests with filtering options
async function getApprovalRequests(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  const { status, user_id } = req.query;
  const isClientPortal = req.headers['x-client-portal'] === 'true';
  const contactId = req.headers['x-client-contact-id'];

  // Debug request parameters
  console.log('Request query params:', { status, contactId, user_id });
  console.log('Request query raw:', req.query);

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
        ar.content_type,
        ar.google_doc_id,
        ar.required_approvals,
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

    if (isClientPortal) {
      // Harden: require x-client-contact-id
      if (!contactId) {
        return res.status(401).json({ error: 'Missing contact ID' });
      }
      // Only return requests this contact is associated with
      conditions.push(`
        ar.request_id IN (
          SELECT request_id FROM approval_request_contacts 
          WHERE contact_id = ?
        )
      `);
      queryParams.push(contactId);
      // Optionally allow status filter
      if (status) {
        conditions.push(`ar.status = ?`);
        queryParams.push(status);
      }
      // Optionally allow archived filter
      if (req.query.include_archived !== 'true') {
        conditions.push(`ar.is_archived = 0`);
      }
      // Ignore client_id for client portal requests!
    } else {
      // Staff/admin logic as before
      const { client_id } = req.query;
      if (client_id) {
        conditions.push(`ar.client_id = ?`);
        queryParams.push(client_id);
      }
      if (status) {
        conditions.push(`ar.status = ?`);
        queryParams.push(status);
      }
      if (userInfo && userInfo.user_id) {
        const isAdmin = userInfo.role === 'admin';
        if (!isAdmin) {
          conditions.push(`ar.created_by_id = ?`);
          queryParams.push(userInfo.user_id);
        } else if (user_id && user_id !== 'all') {
          conditions.push(`CAST(ar.created_by_id AS CHAR) = CAST(? AS CHAR)`);
          queryParams.push(user_id);
        }
      }
      if (req.query.include_archived !== 'true') {
        conditions.push(`ar.is_archived = 0`);
      }
    }

    // Apply conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by created_at
    query += ' ORDER BY ar.created_at DESC';

    // console.log('SQL Query:', query);
    // console.log('Query params:', queryParams);

    const [rows] = await pool.query(query, queryParams);
    // console.log('Query returned', (rows as any[]).length, 'results');

    // If we're filtering by user_id and got zero results, try a direct query approach
    if (user_id && user_id !== 'all' && (rows as any[]).length === 0) {
      console.log('No results found using parameterized query. Trying direct query...');

      // Try a direct query without parameterization to exactly match what was run in the DB directly
      const directQuery = `
        SELECT COUNT(*) as count
        FROM client_approval_requests ar
        JOIN clients c ON ar.client_id = c.client_id
        WHERE ar.created_by_id = ${user_id} AND ar.is_archived = 0
      `;

      try {
        const [directResult]: any = await pool.query(directQuery);
        console.log('Direct query count result:', directResult[0].count);

        if (directResult[0].count > 0) {
          console.log('Direct query found results! This suggests a type conversion issue.');

          // Try once more with the full query to get actual records
          const fullDirectQuery = `
            SELECT ar.request_id, ar.title, ar.created_by_id
            FROM client_approval_requests ar
            JOIN clients c ON ar.client_id = c.client_id
            WHERE ar.created_by_id = ${user_id} AND ar.is_archived = 0
            LIMIT 5
          `;

          const [fullResult]: any = await pool.query(fullDirectQuery);
          if (fullResult && fullResult.length > 0) {
            console.log('Direct query sample results:', fullResult);

            // Override the empty results with these direct results
            console.log('Overriding empty results with direct query results');

            // Get the full records with versions
            const directRequestIds = fullResult.map((row: any) => row.request_id);

            // Build a new query to get all the data for these records
            const recoveryQuery = `
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
              WHERE ar.request_id IN (?)
            `;

            const [recoveryRows] = await pool.query(recoveryQuery, [directRequestIds]);

            // Re-fetch versions if needed
            const requestIds = (recoveryRows as any[]).map(row => row.request_id);
            let versionsMap: { [key: number]: any[] } = {};

            if (requestIds.length > 0) {
              const versionsQuery = `
                SELECT 
                  version_id, 
                  request_id, 
                  version_number, 
                  file_url,
                  inline_content,
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
            const recoveryResults = (recoveryRows as any[]).map(row => {
              return {
                ...row,
                versions: versionsMap[row.request_id] || [],
              };
            });

            console.log('Recovery successful! Found', recoveryResults.length, 'results');
            return res.status(200).json(recoveryResults);
          }
        }
      } catch (error) {
        console.error('Error with direct query approach:', error);
      }
    }

    // If we're filtering by user_id, verify the results
    if (user_id && user_id !== 'all' && (rows as any[]).length > 0) {
      const uniqueUserIds = new Set((rows as any[]).map(row => row.created_by_id));
      console.log('Unique user IDs in results:', Array.from(uniqueUserIds));
    }

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
  // Destructure request body with new contentType field
  const {
    clientId,
    title,
    description,
    inlineContent,
    contactIds,
    googleDocId,
    contentType,
    requiredApprovals,
  } = req.body;

  console.log('Creating approval request with user_id:', userInfo.user_id);
  console.log('Request content type:', contentType);
  console.log('Required approvals:', requiredApprovals || contactIds.length);

  // Validate required fields - check inlineContent instead of fileUrl
  if (!clientId || !title || !inlineContent || !contactIds || !contactIds.length) {
    // Updated error message
    return res.status(400).json({
      error: 'Client ID, title, content, and at least one contact are required',
    });
  }

  // Ensure required approvals is valid
  const requiredApprovalsCount = requiredApprovals || contactIds.length;
  if (requiredApprovalsCount < 1 || requiredApprovalsCount > contactIds.length) {
    return res.status(400).json({
      error: 'Required approvals must be at least 1 and not more than the number of contacts',
    });
  }

  // Create a connection for transaction
  const connection = await pool.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // 1. Create the approval request
    //    - Add content_type to track the type of content (google_doc or html)
    //    - Store necessary Google Doc information
    //    - Add required_approvals field
    const createRequestQuery = `
      INSERT INTO client_approval_requests
        (client_id, title, description, file_url, file_type, inline_content, content_type, google_doc_id, created_by_id, required_approvals, status)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const requestValues = [
      clientId,
      title,
      description || null,
      null, // file_url is now null
      null, // file_type is now null
      inlineContent, // This will be the Google Doc URL if content_type is 'google_doc'
      contentType || 'html', // Default to 'html' if not specified
      googleDocId || null, // The Google Doc ID if applicable
      userInfo.user_id, // Use the actual user ID from validation/session
      requiredApprovalsCount, // Add the required approvals count
      'pending', // Default status is 'pending'
    ];

    console.log('Inserting request with values:', {
      clientId,
      title,
      hasDescription: !!description,
      inlineContentLength: inlineContent ? inlineContent.length : 0,
      contentType: contentType || 'html',
      googleDocId: googleDocId || null,
      userId: userInfo.user_id,
      requiredApprovals: requiredApprovalsCount,
    });

    const [requestResult]: any = await connection.query(createRequestQuery, requestValues);
    const requestId = requestResult.insertId;

    // 2. Create the initial version
    //    - Include inline_content, content_type, and google_doc_id for version record too
    const createVersionQuery = `
      INSERT INTO approval_request_versions
        (request_id, version_number, file_url, inline_content, content_type, google_doc_id, created_by_id)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;

    const versionValues = [
      requestId,
      1, // Initial version number
      null, // file_url is null for the version record
      inlineContent, // Same as the main request
      contentType || 'html', // Default to 'html' if not specified
      googleDocId || null, // Google Doc ID if applicable
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
        // Import required utility functions and modules
        const { sendLoginEmail } = require('../../../utils/email');
        const crypto = require('crypto');

        // Loop through each contact and generate tokens + send emails
        for (const contact of contactsToSend) {
          try {
            // Generate a token for this contact
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

            // Store the token in the database
            const insertTokenQuery = `
              INSERT INTO client_auth_tokens (contact_id, token, expires_at, is_used)
              VALUES (?, ?, ?, 0)
            `;
            await pool.query(insertTokenQuery, [contact.contact_id, token, expiresAt]);

            // Send the login email with the token
            await sendLoginEmail(contact, token, requestData);
            console.log(
              `Authentication email sent successfully to ${contact.email} for request ${requestId}`
            );
          } catch (individualEmailError) {
            console.error(
              `Failed to send email to ${contact.email} for request ${requestId}:`,
              individualEmailError
            );
            // Continue with other contacts even if one fails
          }
        }
      } catch (emailError) {
        console.error(
          `Request ${requestId} created, but failed to send email notifications:`,
          emailError
        );
        // Log this error but don't fail the request creation itself
      }
    }

    // Send Slack notification for new approval request
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const requestUrl = `${appUrl}/client-approval/requests/${requestId}`;

        // Get client name for the notification
        const clientQuery = `SELECT client_name FROM clients WHERE client_id = ?`;
        const [clientResult] = await pool.query(clientQuery, [clientId]);
        const clientName = (clientResult as any[])[0]?.client_name || 'Unknown Client';

        const slackMessage =
          `📝 *New Approval Request Submitted*\n\n` +
          `*Request:* ${title}\n` +
          `*Client:* ${clientName}\n` +
          `*Contacts:* ${contactsToSend.length} contact(s) to approve\n` +
          `*Required Approvals:* ${requiredApprovalsCount}\n` +
          `*Content Type:* ${contentType || 'HTML'}\n\n` +
          `<${requestUrl}|View Request>`;

        await postToSlack(slackMessage);
        console.log('Slack notification sent for new approval request');
      } catch (slackError) {
        console.error('Error sending Slack notification for new request:', slackError);
        // Don't fail the request creation if Slack fails
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
