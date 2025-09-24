import { NextApiRequest, NextApiResponse } from 'next';
import { query } from 'lib/db';
import { validateUserToken } from '../validate-user-token';

interface DashboardStats {
  pendingApprovals: number;
  totalReports: number;
  activeClients: number;
  pbnSubmissions: number;
  superstarSites: number;
  userPbnSubmissions: number;
  userSuperstarSubmissions: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Validate user token
  const userInfo = await validateUserToken(req);

  if (!userInfo.isValid || !userInfo.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats: DashboardStats = {
      pendingApprovals: 0,
      totalReports: 0,
      activeClients: 0,
      pbnSubmissions: 0,
      superstarSites: 0,
      userPbnSubmissions: 0,
      userSuperstarSubmissions: 0,
    };

    // 1. Get pending approvals for the user
    const [pendingApprovalsResult] = await query(
      `
      SELECT COUNT(*) as count
      FROM client_approval_requests ar
      WHERE ar.created_by_id = ? 
        AND ar.status = 'pending'
        AND ar.is_archived = 0
    `,
      [userInfo.user_id]
    );
    stats.pendingApprovals = (pendingApprovalsResult as any)[0].count || 0;

    // 2. Get total reports for the user
    const [totalReportsResult] = await query(
      `
      SELECT COUNT(*) as count
      FROM client_reports cr
      WHERE cr.created_by_id = ?
    `,
      [userInfo.user_id]
    );
    stats.totalReports = (totalReportsResult as any)[0].count || 0;

    // 3. Get active clients count (total across system)
    const [activeClientsResult] = await query(`
      SELECT COUNT(*) as count
      FROM clients c
      WHERE c.is_active = 1
    `);
    stats.activeClients = (activeClientsResult as any)[0].count || 0;
    console.log('Found active clients:', activeClientsResult);
    // 4. Get total PBN submissions (total across system)
    const [pbnSubmissionsResult] = await query(`
      SELECT COUNT(*) as count
      FROM pbn_site_submissions pss
      WHERE pss.deleted_at IS NULL
    `);
    stats.pbnSubmissions = (pbnSubmissionsResult as any)[0].count || 0;

    // 5. Get total superstar sites (total across system)
    const [superstarSitesResult] = await query(`
      SELECT COUNT(*) as count
      FROM superstar_sites ss
      WHERE ss.active = 1 OR ss.active IS NULL
    `);
    console.log('Found superstar sites:', superstarSitesResult);
    stats.superstarSites = (superstarSitesResult as any)[0].count || 0;

    // 6. Get user-specific PBN submissions
    const [userPbnSubmissionsResult] = await query(
      `
      SELECT COUNT(*) as count
      FROM pbn_site_submissions pss
      JOIN users u ON pss.user_token = u.user_token
      WHERE u.id = ?
        AND pss.deleted_at IS NULL
    `,
      [userInfo.user_id]
    );
    stats.userPbnSubmissions = (userPbnSubmissionsResult as any)[0].count || 0;

    // 7. Get user-specific superstar submissions
    const [userSuperstarSubmissionsResult] = await query(
      `
      SELECT COUNT(*) as count
      FROM superstar_site_submissions sss
      JOIN users u ON sss.user_token = u.user_token
      WHERE u.id = ?
        AND sss.deleted_at IS NULL
    `,
      [userInfo.user_id]
    );
    stats.userSuperstarSubmissions = (userSuperstarSubmissionsResult as any)[0].count || 0;

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}
