import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from 'lib/db';
import { validateUserToken } from '../../validate-user-token';

interface ProcessingStatus {
  request_id: string;
  submission_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_count: number;
  total_count: number;
  progress_percentage: number;
  
  // Company processing
  companies_completed: number;
  company_progress_percentage: number;
  
  // People search
  people_search_status: 'not_started' | 'in_progress' | 'completed';
  total_people_found: number;
  companies_with_people: number;
  companies_without_people: number;
  
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Submission details
  submission_user_name?: string;
  submission_created_at?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Validate user authentication
  const userInfo = await validateUserToken(req);
  if (!userInfo.isValid || !userInfo.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { requestId } = req.query;

  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing requestId' });
  }

  try {
    // Get processing status with submission details
    const [rows] = await query(`
      SELECT 
        leps.request_id,
        leps.submission_id,
        leps.status,
        leps.processed_count,
        leps.total_count,
        leps.companies_completed,
        leps.people_search_status,
        leps.total_people_found,
        leps.companies_with_people,
        leps.companies_without_people,
        ROUND((leps.companies_completed / leps.total_count) * 100, 1) as company_progress_percentage,
        ROUND((leps.processed_count / leps.total_count) * 100, 1) as progress_percentage,
        leps.error_message,
        leps.started_at,
        leps.completed_at,
        leps.created_at,
        leps.updated_at,
        upls.user_id,
        upls.rows_submitted,
        upls.list_type,
        upls.created_at as submission_created_at,
        u.name as submission_user_name
      FROM lead_enricher_processing_status leps
      LEFT JOIN user_partial_list_submissions upls ON leps.submission_id = upls.id
      LEFT JOIN users u ON upls.user_id = u.id
      WHERE leps.request_id = ?
    `, [requestId]);

    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Processing status not found' });
    }

    const statusData = (rows as any[])[0];

    // Check if user has access to this submission
    if (statusData.user_id !== userInfo.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const response: ProcessingStatus = {
      request_id: statusData.request_id,
      submission_id: statusData.submission_id,
      status: statusData.status,
      processed_count: statusData.processed_count || 0,
      total_count: statusData.total_count,
      progress_percentage: statusData.progress_percentage || 0,
      
      // Company processing
      companies_completed: statusData.companies_completed || 0,
      company_progress_percentage: statusData.company_progress_percentage || 0,
      
      // People search
      people_search_status: statusData.people_search_status || 'not_started',
      total_people_found: statusData.total_people_found || 0,
      companies_with_people: statusData.companies_with_people || 0,
      companies_without_people: statusData.companies_without_people || 0,
      
      error_message: statusData.error_message,
      started_at: statusData.started_at,
      completed_at: statusData.completed_at,
      created_at: statusData.created_at,
      updated_at: statusData.updated_at,
      submission_user_name: statusData.submission_user_name,
      submission_created_at: statusData.submission_created_at
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching processing status:', error);
    return res.status(500).json({ error: 'Failed to fetch processing status' });
  }
}