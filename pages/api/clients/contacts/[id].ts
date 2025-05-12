import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { validateUserToken } from '../../../api/validate-user-token';

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
  // Validate user token for all requests
  const userInfo = await validateUserToken(req);
  if (!userInfo.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Valid contact ID is required' });
  }

  const contactId = Number(id);

  switch (req.method) {
    case 'GET':
      return getContactById(contactId, res);
    case 'PUT':
      return updateContact(contactId, req, res);
    case 'DELETE':
      return deleteContact(contactId, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get a single contact by ID
async function getContactById(contactId: number, res: NextApiResponse) {
  try {
    const query = `
      SELECT 
        contact_id, 
        client_id, 
        name, 
        job_title,
        email, 
        phone, 
        is_active, 
        created_at, 
        updated_at
      FROM 
        client_contacts
      WHERE 
        contact_id = ?
    `;

    const [rows] = await pool.query(query, [contactId]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.status(200).json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return res.status(500).json({ error: 'Failed to fetch contact' });
  }
}

// Update a contact by ID
async function updateContact(contactId: number, req: NextApiRequest, res: NextApiResponse) {
  const { name, job_title, email, phone, is_active } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    // First check if the contact exists
    const checkQuery = 'SELECT contact_id FROM client_contacts WHERE contact_id = ?';
    const [checkResult] = await pool.query(checkQuery, [contactId]);

    if ((checkResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const query = `
      UPDATE client_contacts
      SET 
        name = ?, 
        job_title = ?,
        email = ?, 
        phone = ?, 
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        contact_id = ?
    `;

    const values = [name, job_title || null, email, phone || null, is_active ? 1 : 0, contactId];
    await pool.query(query, values);

    // Get the updated record
    const [updatedRows] = await pool.query(
      'SELECT contact_id, client_id, name, job_title, email, phone, is_active, created_at, updated_at FROM client_contacts WHERE contact_id = ?',
      [contactId]
    );

    return res.status(200).json((updatedRows as any[])[0]);
  } catch (error) {
    console.error('Error updating contact:', error);

    // Check for duplicate email error
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return res.status(409).json({ error: 'A contact with this email already exists' });
    }

    return res.status(500).json({ error: 'Failed to update contact' });
  }
}

// Delete a contact by ID
async function deleteContact(contactId: number, res: NextApiResponse) {
  try {
    // First check if the contact exists
    const checkQuery = 'SELECT contact_id FROM client_contacts WHERE contact_id = ?';
    const [checkResult] = await pool.query(checkQuery, [contactId]);

    if ((checkResult as any[]).length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if contact has any approval requests
    const approvalCheckQuery = `
      SELECT COUNT(*) as count 
      FROM approval_request_contacts 
      WHERE contact_id = ?
    `;
    const [approvalCheck] = await pool.query(approvalCheckQuery, [contactId]);
    const hasApprovalRequests = (approvalCheck as any[])[0].count > 0;

    if (hasApprovalRequests) {
      // If contact has approval requests, just mark as inactive
      const updateQuery = `
        UPDATE client_contacts
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE contact_id = ?
      `;
      await pool.query(updateQuery, [contactId]);

      return res.status(200).json({
        message:
          'Contact has associated approval requests and has been marked as inactive instead of deleted',
      });
    }

    // If no approval requests, proceed with deletion
    const deleteQuery = 'DELETE FROM client_contacts WHERE contact_id = ?';
    await pool.query(deleteQuery, [contactId]);

    return res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return res.status(500).json({ error: 'Failed to delete contact' });
  }
}
