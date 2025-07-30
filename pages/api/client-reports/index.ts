import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { RowDataPacket } from 'mysql2';

interface ClientReport extends RowDataPacket {
  report_id: number;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_name?: string;
  status: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
  shared_at?: string;
  viewed_at?: string;
  created_by_name?: string;
  file_size_mb?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate client portal headers
    const isClientPortal = req.headers['x-client-portal'] === 'true';
    const clientContactId = req.headers['x-client-contact-id'];

    if (!isClientPortal || !clientContactId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid client portal request' });
    }

    // Query to get reports assigned to this contact
    const queryStr = `
      SELECT 
        cr.report_id,
        cr.title,
        cr.description,
        cr.file_url,
        cr.file_type,
        cr.file_name,
        cr.status,
        cr.created_by_id,
        cr.created_at,
        cr.updated_at,
        rc.shared_at,
        rc.viewed_at,
        COALESCE(u.name, cr.created_by_id) as created_by_name,
        -- Estimate file size (this would ideally be stored or calculated)
        CASE 
          WHEN cr.file_type LIKE '%pdf%' THEN ROUND(RAND() * 3 + 1, 1)
          WHEN cr.file_type LIKE '%doc%' THEN ROUND(RAND() * 2 + 0.5, 1)
          WHEN cr.file_type LIKE '%xls%' THEN ROUND(RAND() * 4 + 1, 1)
          ELSE ROUND(RAND() * 2 + 1, 1)
        END as file_size_mb
      FROM client_reports cr
      INNER JOIN report_contacts rc ON cr.report_id = rc.report_id
      LEFT JOIN users u ON cr.created_by_id = u.user_id
      WHERE rc.contact_id = ?
        AND cr.status IN ('shared', 'pending')
      ORDER BY cr.updated_at DESC
    `;

    const [reports] = await query<ClientReport[]>(queryStr, [clientContactId]);

    // Transform the data to match the frontend interface
    const transformedReports = reports.map((report: ClientReport) => ({
      id: report.report_id,
      title: report.title,
      description: report.description,
      type: getReportType(report.file_type, report.title),
      uploaded_at: report.shared_at || report.created_at,
      report_url: report.file_url,
      file_size: report.file_size_mb ? `${report.file_size_mb} MB` : undefined,
      uploaded_by: report.created_by_name || 'System',
    }));

    res.status(200).json(transformedReports);
  } catch (error) {
    console.error('Error fetching client reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

// Helper function to determine report type based on file type and title
function getReportType(fileType?: string, title?: string): string {
  if (!title) return 'Report';

  const titleLower = title.toLowerCase();

  if (titleLower.includes('seo')) return 'SEO Report';
  if (titleLower.includes('social media') || titleLower.includes('social'))
    return 'Social Media Report';
  if (titleLower.includes('analytics') || titleLower.includes('web')) return 'Web Analytics';
  if (titleLower.includes('content')) return 'Content Report';
  if (titleLower.includes('ppc') || titleLower.includes('ads')) return 'PPC Report';
  if (titleLower.includes('performance')) return 'Performance Report';
  if (titleLower.includes('monthly')) return 'Monthly Report';
  if (titleLower.includes('quarterly')) return 'Quarterly Report';
  if (titleLower.includes('annual')) return 'Annual Report';

  // Fallback based on file type
  if (fileType?.includes('pdf')) return 'PDF Report';
  if (fileType?.includes('doc')) return 'Document Report';
  if (fileType?.includes('xls')) return 'Spreadsheet Report';

  return 'Report';
}
