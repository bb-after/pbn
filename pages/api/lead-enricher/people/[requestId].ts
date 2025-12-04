import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from 'lib/db';
import { validateUserToken } from '../../validate-user-token';

interface PersonResult {
  id: number;
  company_name: string;
  company_row_number: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  linkedin_url?: string;
  job_title?: string;
  department?: string;
  found_at: string;
}

interface CompanySummary {
  company_name: string;
  company_row_number: number;
  people_count: number;
  people: PersonResult[];
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
  const { groupBy = 'company' } = req.query; // 'company' or 'flat'

  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing requestId' });
  }

  try {
    // Verify user has access to this submission
    const [submissionRows] = await query(`
      SELECT upls.user_id
      FROM lead_enricher_processing_status leps
      LEFT JOIN user_partial_list_submissions upls ON leps.submission_id = upls.id
      WHERE leps.request_id = ?
    `, [requestId]);

    if (!submissionRows || (submissionRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Processing status not found' });
    }

    const submission = (submissionRows as any[])[0];
    if (submission.user_id !== userInfo.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all people results for this request
    const [peopleRows] = await query(`
      SELECT 
        id,
        company_name,
        company_row_number,
        first_name,
        last_name,
        full_name,
        email,
        linkedin_url,
        job_title,
        department,
        found_at
      FROM lead_enricher_people_results
      WHERE request_id = ?
      ORDER BY company_row_number ASC, found_at ASC
    `, [requestId]);

    const people = peopleRows as PersonResult[];

    if (groupBy === 'company') {
      // Group by company
      const companiesMap = new Map<string, CompanySummary>();
      
      people.forEach(person => {
        const key = `${person.company_name}-${person.company_row_number}`;
        if (!companiesMap.has(key)) {
          companiesMap.set(key, {
            company_name: person.company_name,
            company_row_number: person.company_row_number,
            people_count: 0,
            people: []
          });
        }
        
        const company = companiesMap.get(key)!;
        company.people.push(person);
        company.people_count = company.people.length;
      });

      const companies = Array.from(companiesMap.values());
      
      return res.status(200).json({
        request_id: requestId,
        total_people: people.length,
        total_companies_with_people: companies.length,
        companies: companies
      });
      
    } else {
      // Flat list
      return res.status(200).json({
        request_id: requestId,
        total_people: people.length,
        people: people
      });
    }

  } catch (error) {
    console.error('Error fetching people results:', error);
    return res.status(500).json({ error: 'Failed to fetch people results' });
  }
}