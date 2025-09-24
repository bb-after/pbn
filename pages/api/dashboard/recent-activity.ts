import { NextApiRequest, NextApiResponse } from 'next';
import { query } from 'lib/db';
import { validateUserToken } from '../validate-user-token';

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const htmlEntities: { [key: string]: string } = {
    '&#8211;': '–', // en dash
    '&#8212;': '—', // em dash
    '&#8217;': "'", // right single quotation mark
    '&#8220;': '"', // left double quotation mark
    '&#8221;': '"', // right double quotation mark
    '&#8230;': '…', // horizontal ellipsis
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  let decodedText = text || '';

  // Replace HTML entities
  for (const [entity, character] of Object.entries(htmlEntities)) {
    decodedText = decodedText.replace(new RegExp(entity, 'g'), character);
  }

  // Handle numeric entities (&#123;)
  decodedText = decodedText.replace(/&#(\d+);/g, (match, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });

  // Handle hex entities (&#x123;)
  decodedText = decodedText.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return decodedText;
}

interface RecentActivity {
  id: string;
  type: 'approval' | 'report' | 'pbn' | 'superstar';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  url?: string;
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

  // Get pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const recentActivity: RecentActivity[] = [];

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get more approval requests to have enough for pagination
    const [approvalRequests] = (await query(
      `
      SELECT 
        ar.request_id,
        ar.title,
        ar.status,
        ar.created_at,
        c.client_name
      FROM client_approval_requests ar
      JOIN clients c ON ar.client_id = c.client_id
      WHERE ar.created_by_id = ? 
        AND ar.is_archived = 0
      ORDER BY ar.created_at DESC
      LIMIT 10
    `,
      [userInfo.user_id]
    )) as any[];

    approvalRequests.forEach(
      (request: {
        request_id: any;
        title: any;
        client_name: any;
        created_at: string | Date;
        status: any;
      }) => {
        recentActivity.push({
          id: `approval-${request.request_id}`,
          type: 'approval',
          title: decodeHtmlEntities(request.title),
          description: `Approval request for ${decodeHtmlEntities(request.client_name)}`,
          timestamp: formatTimeAgo(request.created_at),
          status: request.status,
        });
      }
    );

    // Get recent reports by the user
    const [reports] = (await query(
      `
      SELECT 
        cr.report_id,
        cr.title,
        cr.status,
        cr.created_at,
        c.client_name
      FROM client_reports cr
      JOIN clients c ON cr.client_id = c.client_id
      WHERE cr.created_by_id = ?
      ORDER BY cr.created_at DESC
      LIMIT 10
    `,
      [userInfo.user_id]
    )) as any[];

    reports.forEach(
      (report: {
        report_id: any;
        title: any;
        client_name: any;
        created_at: string | Date;
        status: any;
      }) => {
        recentActivity.push({
          id: `report-${report.report_id}`,
          type: 'report',
          title: decodeHtmlEntities(report.title),
          description: `Report shared with ${decodeHtmlEntities(report.client_name)}`,
          timestamp: formatTimeAgo(report.created_at),
          status: report.status,
        });
      }
    );

    // Get recent PBN submissions (user-specific if user_token matches)
    const [pbnSubmissions] = (await query(
      `
      SELECT 
        pss.id,
        pss.title,
        pss.created,
        pss.client_name,
        ps.domain
      FROM pbn_site_submissions pss
      LEFT JOIN pbn_sites ps ON pss.pbn_site_id = ps.id
      JOIN users u ON pss.user_token = u.user_token
      WHERE u.id = ? 
        AND pss.deleted_at IS NULL
      ORDER BY pss.created DESC
      LIMIT 10
    `,
      [userInfo.user_id]
    )) as any[];

    pbnSubmissions.forEach(
      (submission: { id: any; title: any; domain: any; created: string | Date }) => {
        recentActivity.push({
          id: `pbn-${submission.id}`,
          type: 'pbn',
          title: decodeHtmlEntities(submission.title || 'PBN Article Published'),
          description: `Article submitted to ${decodeHtmlEntities(submission.domain || 'PBN site')}`,
          timestamp: formatTimeAgo(submission.created),
          status: 'published',
        });
      }
    );

    // Get recent superstar submissions (user-specific if user_token matches)
    const [superstarSubmissions] = (await query(
      `
      SELECT 
        sss.id,
        sss.title,
        sss.created,
        sss.client_name,
        ss.domain
      FROM superstar_site_submissions sss
      LEFT JOIN superstar_sites ss ON sss.superstar_site_id = ss.id
      JOIN users u ON sss.user_token = u.user_token
      WHERE u.id = ? 
        AND sss.deleted_at IS NULL
      ORDER BY sss.created DESC
      LIMIT 10
    `,
      [userInfo.user_id]
    )) as any[];

    superstarSubmissions.forEach(
      (submission: { id: any; title: any; domain: any; created: string | Date }) => {
        recentActivity.push({
          id: `superstar-${submission.id}`,
          type: 'superstar',
          title: decodeHtmlEntities(submission.title || 'Superstar Article Published'),
          description: `Article published on ${decodeHtmlEntities(submission.domain || 'superstar site')}`,
          timestamp: formatTimeAgo(submission.created),
          status: 'active',
        });
      }
    );

    // Get recent automated PBN submissions (where user_token is null)
    const [automatedPbnSubmissions] = (await query(`
      SELECT 
        pss.id,
        pss.title,
        pss.created,
        pss.client_name,
        pss.submission_response as published_url,
        ps.domain
      FROM pbn_site_submissions pss
      LEFT JOIN pbn_sites ps ON pss.pbn_site_id = ps.id
      WHERE pss.user_token IS NULL
        AND pss.deleted_at IS NULL
        AND pss.submission_response IS NOT NULL
      ORDER BY pss.created DESC
      LIMIT 10
    `)) as any[];

    console.log('Found automated PBN submissions:', automatedPbnSubmissions.length);

    automatedPbnSubmissions.forEach(
      (submission: {
        id: any;
        title: any;
        domain: any;
        created: string | Date;
        published_url: string;
      }) => {
        recentActivity.push({
          id: `auto-pbn-${submission.id}`,
          type: 'pbn',
          title: decodeHtmlEntities(submission.title || 'Automated PBN Article Published'),
          description: `Automated article submitted to ${decodeHtmlEntities(submission.domain || 'PBN site')}`,
          timestamp: formatTimeAgo(submission.created),
          status: 'automated',
          url: submission.published_url,
        });
      }
    );

    // Get recent automated superstar submissions (where user_token is null)
    const [automatedSuperstarSubmissions] = (await query(`
      SELECT 
        sss.id,
        sss.title,
        sss.created,
        sss.client_name,
        sss.submission_response as published_url,
        ss.domain
      FROM superstar_site_submissions sss
      LEFT JOIN superstar_sites ss ON sss.superstar_site_id = ss.id
      WHERE sss.user_token IS NULL
        AND sss.deleted_at IS NULL
        AND sss.submission_response IS NOT NULL
      ORDER BY sss.created DESC
      LIMIT 10
    `)) as any[];

    console.log('Found automated superstar submissions:', automatedSuperstarSubmissions.length);

    automatedSuperstarSubmissions.forEach(
      (submission: {
        id: any;
        title: any;
        domain: any;
        created: string | Date;
        published_url: string;
      }) => {
        recentActivity.push({
          id: `auto-superstar-${submission.id}`,
          type: 'superstar',
          title: decodeHtmlEntities(submission.title || 'Automated Superstar Article Published'),
          description: `Automated article published on ${decodeHtmlEntities(submission.domain || 'superstar site')}`,
          timestamp: formatTimeAgo(submission.created),
          status: 'automated',
          url: submission.published_url,
        });
      }
    );

    // Add actual timestamp to each activity for proper sorting
    const activitiesWithTimestamp = recentActivity.map(activity => {
      let actualTimestamp: Date;

      // Extract the original timestamp based on activity type
      if (activity.type === 'approval') {
        const request = approvalRequests.find(
          (r: { request_id: any }) => `approval-${r.request_id}` === activity.id
        );
        actualTimestamp = new Date(request?.created_at || Date.now());
      } else if (activity.type === 'report') {
        const report = reports.find(
          (r: { report_id: any }) => `report-${r.report_id}` === activity.id
        );
        actualTimestamp = new Date(report?.created_at || Date.now());
      } else if (activity.id.startsWith('pbn-')) {
        const submission = pbnSubmissions.find((s: { id: any }) => `pbn-${s.id}` === activity.id);
        actualTimestamp = new Date(submission?.created || Date.now());
      } else if (activity.id.startsWith('superstar-')) {
        const submission = superstarSubmissions.find(
          (s: { id: any }) => `superstar-${s.id}` === activity.id
        );
        actualTimestamp = new Date(submission?.created || Date.now());
      } else if (activity.id.startsWith('auto-pbn-')) {
        const submission = automatedPbnSubmissions.find(
          (s: { id: any }) => `auto-pbn-${s.id}` === activity.id
        );
        actualTimestamp = new Date(submission?.created || Date.now());
      } else if (activity.id.startsWith('auto-superstar-')) {
        const submission = automatedSuperstarSubmissions.find(
          (s: { id: any }) => `auto-superstar-${s.id}` === activity.id
        );
        actualTimestamp = new Date(submission?.created || Date.now());
      } else {
        actualTimestamp = new Date();
      }

      return {
        ...activity,
        actualTimestamp: actualTimestamp,
      };
    });
    activitiesWithTimestamp.sort(
      (a, b) => b.actualTimestamp.getTime() - a.actualTimestamp.getTime()
    );

    console.log('Total recent activity items before pagination:', activitiesWithTimestamp.length);

    // Apply pagination
    const startIndex = offset;
    const endIndex = startIndex + limit;
    const paginatedActivities = activitiesWithTimestamp.slice(startIndex, endIndex);

    // Remove the actualTimestamp before sending response
    const finalActivities = paginatedActivities.map(({ actualTimestamp, ...activity }) => activity);

    console.log(
      `Page ${page}: Returning ${finalActivities.length} activities (${startIndex}-${endIndex})`
    );

    return res.status(200).json(finalActivities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
}
