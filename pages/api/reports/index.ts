import { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction, getPool } from 'lib/db';
import { validateUserToken } from '../validate-user-token';
import { OkPacket } from 'mysql2';

// Use centralized connection pool
const pool = getPool();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate user token for staff operations
  const token = (req.headers['x-auth-token'] as string) || (req.cookies && req.cookies.auth_token);

  console.log('Token received in reports API:', token ? 'Present' : 'Missing');
  if (token) {
    console.log('Token value (first 10 chars):', token.substring(0, 10) + '...');
  }

  const userInfo = await validateUserToken(req);

  console.log('User validation result:', { isValid: userInfo.isValid, userId: userInfo.user_id });

  switch (req.method) {
    case 'GET':
      return getReports(req, res, userInfo);
    case 'POST':
      // Ensure only authenticated staff can create
      if (!userInfo.isValid || !userInfo.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return createReport(req, res, userInfo);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get reports with filtering options
async function getReports(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  const { status, user_id, client_id, admin } = req.query;

  console.log('Request query params:', { status, user_id, client_id, admin });

  try {
    let queryStr = `
      SELECT 
        r.report_id,
        r.client_id,
        c.client_name,
        r.title,
        r.description,
        r.file_url,
        r.file_type,
        r.file_name,
        r.status,
        r.created_by_id,
        r.created_at,
        r.updated_at,
        (
          SELECT COUNT(*) FROM report_contacts rc 
          WHERE rc.report_id = r.report_id AND rc.shared_at IS NOT NULL
        ) as shared_contacts_count,
        (
          SELECT COUNT(*) FROM report_contacts rc 
          WHERE rc.report_id = r.report_id AND rc.viewed_at IS NOT NULL
        ) as viewed_contacts_count,
        (
          SELECT COUNT(*) FROM report_contacts rc 
          WHERE rc.report_id = r.report_id
        ) as total_contacts
      FROM 
        client_reports r
      JOIN
        clients c ON r.client_id = c.client_id
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    // Check if user is admin and in admin mode
    const isAdmin = userInfo.role === 'admin';
    const isAdminMode = admin === 'true';

    // If not admin or not in admin mode, only show user's own reports
    if (!isAdmin || !isAdminMode) {
      if (!userInfo.isValid || !userInfo.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      conditions.push('r.created_by_id = ?');
      queryParams.push(userInfo.user_id);
    }

    // Filter by specific user (admin only)
    if (isAdmin && isAdminMode && user_id && user_id !== 'all') {
      conditions.push('r.created_by_id = ?');
      queryParams.push(user_id);
    }

    // Filter by client
    if (client_id && client_id !== 'all') {
      conditions.push('r.client_id = ?');
      queryParams.push(client_id);
    }

    // Filter by status
    if (status && status !== 'all') {
      conditions.push('r.status = ?');
      queryParams.push(status);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by creation date (newest first)
    queryStr += ' ORDER BY r.created_at DESC';

    console.log('Executing query:', queryStr);
    console.log('Query params:', queryParams);

    const reports = await query(queryStr, queryParams);

    console.log('Found reports:', reports.length);

    return res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

// Create a new report
async function createReport(req: NextApiRequest, res: NextApiResponse, userInfo: any) {
  const { clientId, title, description, fileUrl, fileType, fileName, contactIds } = req.body;

  console.log('Creating report with data:', {
    clientId,
    title,
    description,
    fileUrl,
    fileType,
    fileName,
    contactIds,
    userId: userInfo.user_id,
  });

  // Validate required fields
  if (!clientId || !title || !fileUrl || !contactIds || contactIds.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields: clientId, title, fileUrl, and contactIds are required',
    });
  }

  try {
    // Use transaction to ensure data consistency
    const result = await transaction(async connection => {
      // Insert the report
      const reportResult = await query(
        `INSERT INTO client_reports 
         (client_id, title, description, file_url, file_type, file_name, status, created_by_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
        [
          clientId,
          title,
          description || null,
          fileUrl,
          fileType || null,
          fileName || null,
          userInfo.user_id,
        ]
      );

      const reportId = (reportResult[0] as OkPacket).insertId;
      console.log('Created report with ID:', reportId);

      // Insert report-contact relationships
      const contactInserts = contactIds.map((contactId: number) =>
        query(
          `INSERT INTO report_contacts (report_id, contact_id, created_at)
           VALUES (?, ?, NOW())`,
          [reportId, contactId]
        )
      );

      await Promise.all(contactInserts);
      console.log('Created report-contact relationships for', contactIds.length, 'contacts');

      // Optionally, update status to 'shared' if we want to mark it as shared immediately
      await query(
        `UPDATE client_reports SET status = 'shared', updated_at = NOW() WHERE report_id = ?`,
        [reportId]
      );

      // Update shared_at timestamp for all contacts
      await query(`UPDATE report_contacts SET shared_at = NOW() WHERE report_id = ?`, [reportId]);

      return { reportId };
    });

    console.log('Report creation completed successfully');

    return res.status(201).json({
      message: 'Report created successfully',
      reportId: result.reportId,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ error: 'Failed to create report' });
  }
}
