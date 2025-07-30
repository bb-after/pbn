import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db'; // Corrected the import path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate client portal headers
    const isClientPortal = req.headers['x-client-portal'] === 'true';
    const clientContactId = req.headers['x-client-contact-id'];

    if (!isClientPortal || !clientContactId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid client portal request' });
    }

    const { reportId } = req.query;

    if (!reportId || Array.isArray(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    // Mark the report as viewed by updating the viewed_at timestamp
    const updateQuery = `
      UPDATE report_contacts 
      SET viewed_at = CURRENT_TIMESTAMP 
      WHERE report_id = ? AND contact_id = ? AND viewed_at IS NULL
    `;

    await query(updateQuery, [reportId, clientContactId]);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking report as viewed:', error);
    res.status(500).json({ error: 'Failed to mark report as viewed' });
  }
}
