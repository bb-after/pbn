import { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction, getPool } from 'lib/db';
import { validateUserToken } from '../validate-user-token';
import { RowDataPacket } from 'mysql2';

// Use centralized connection pool
const pool = getPool();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid report ID' });
  }

  const reportId = parseInt(id as string, 10);
  if (isNaN(reportId)) {
    return res.status(400).json({ error: 'Invalid report ID format' });
  }

  // Validate user token
  const token = (req.headers['x-auth-token'] as string) || (req.cookies && req.cookies.auth_token);
  const userInfo = await validateUserToken(req);

  switch (req.method) {
    case 'GET':
      return getReport(req, res, reportId, userInfo);
    case 'PUT':
      if (!userInfo.isValid || !userInfo.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return updateReport(req, res, reportId, userInfo);
    case 'DELETE':
      if (!userInfo.isValid || !userInfo.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return deleteReport(req, res, reportId, userInfo);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get a specific report with details
async function getReport(
  req: NextApiRequest,
  res: NextApiResponse,
  reportId: number,
  userInfo: any
) {
  try {
    // Get the report details
    const reportQuery = `
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
      WHERE 
        r.report_id = ?
    `;

    const [reportResults] = (await query(reportQuery, [reportId])) as [RowDataPacket[], any];

    if (reportResults.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResults[0];

    // Check if user has permission to view this report
    const isAdmin = userInfo.role === 'admin';
    const isOwner = userInfo.user_id === report.created_by_id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the contacts associated with this report
    const contactsQuery = `
      SELECT 
        rc.report_contact_id,
        rc.contact_id,
        cc.name,
        cc.email,
        cc.job_title,
        rc.shared_at,
        rc.viewed_at,
        rc.created_at
      FROM 
        report_contacts rc
      JOIN
        client_contacts cc ON rc.contact_id = cc.contact_id
      WHERE 
        rc.report_id = ?
      ORDER BY cc.name
    `;

    const [contacts] = (await query(contactsQuery, [reportId])) as [RowDataPacket[], any];

    // Get comments on this report (if any)
    const commentsQuery = `
      SELECT 
        rc.comment_id,
        rc.contact_id,
        rc.staff_user_id,
        rc.comment_text,
        rc.created_at,
        rc.updated_at,
        cc.name as contact_name,
        cc.email as contact_email
      FROM 
        report_comments rc
      LEFT JOIN
        client_contacts cc ON rc.contact_id = cc.contact_id
      WHERE 
        rc.report_id = ?
      ORDER BY rc.created_at DESC
    `;

    const [comments] = (await query(commentsQuery, [reportId])) as [RowDataPacket[], any];

    const responseData = {
      ...report,
      contacts,
      comments,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
}

// Update a report
async function updateReport(
  req: NextApiRequest,
  res: NextApiResponse,
  reportId: number,
  userInfo: any
) {
  const { title, description, status, contactIds } = req.body;

  try {
    // First, verify the report exists and user has permission
    const [reportCheck] = (await query(
      'SELECT created_by_id FROM client_reports WHERE report_id = ?',
      [reportId]
    )) as [RowDataPacket[], any];

    if (reportCheck.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const isAdmin = userInfo.role === 'admin';
    const isOwner = userInfo.user_id === reportCheck[0].created_by_id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await transaction(async connection => {
      // Update the report basic info
      if (title || description || status) {
        const updateFields = [];
        const updateParams = [];

        if (title) {
          updateFields.push('title = ?');
          updateParams.push(title);
        }
        if (description !== undefined) {
          updateFields.push('description = ?');
          updateParams.push(description);
        }
        if (status) {
          updateFields.push('status = ?');
          updateParams.push(status);
        }

        updateFields.push('updated_at = NOW()');
        updateParams.push(reportId);

        const updateQuery = `UPDATE client_reports SET ${updateFields.join(', ')} WHERE report_id = ?`;
        await query(updateQuery, updateParams);
      }

      // Update contacts if provided
      if (contactIds && Array.isArray(contactIds)) {
        // Remove existing contacts
        await query('DELETE FROM report_contacts WHERE report_id = ?', [reportId]);

        // Add new contacts
        if (contactIds.length > 0) {
          const contactInserts = contactIds.map((contactId: number) =>
            query(
              `INSERT INTO report_contacts (report_id, contact_id, created_at, shared_at)
               VALUES (?, ?, NOW(), NOW())`,
              [reportId, contactId]
            )
          );

          await Promise.all(contactInserts);
        }
      }
    });

    return res.status(200).json({ message: 'Report updated successfully' });
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({ error: 'Failed to update report' });
  }
}

// Delete a report
async function deleteReport(
  req: NextApiRequest,
  res: NextApiResponse,
  reportId: number,
  userInfo: any
) {
  try {
    // First, verify the report exists and user has permission
    const [reportCheck] = (await query(
      'SELECT created_by_id FROM client_reports WHERE report_id = ?',
      [reportId]
    )) as [RowDataPacket[], any];

    if (reportCheck.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const isAdmin = userInfo.role === 'admin';
    const isOwner = userInfo.user_id === reportCheck[0].created_by_id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await transaction(async connection => {
      // Delete related records first (due to foreign key constraints)
      await query('DELETE FROM report_comments WHERE report_id = ?', [reportId]);
      await query('DELETE FROM report_contacts WHERE report_id = ?', [reportId]);

      // Delete the report
      await query('DELETE FROM client_reports WHERE report_id = ?', [reportId]);
    });

    return res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
}
