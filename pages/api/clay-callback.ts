import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

interface ClayCompanyCallbackPayload {
  request_id: string;
  callback_type: 'company';
  status: 'processing' | 'completed' | 'failed';
  processed_count?: number;
  total_count?: number;
  error_message?: string;
  company_data?: any;
}

interface ClayPersonCallbackPayload {
  request_id: string;
  callback_type: 'person';
  company_name: string;
  company_row_number: number;
  
  // Person details
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  linkedin_url?: string;
  job_title?: string;
  department?: string;
  clay_person_id?: string;
}

type ClayCallbackPayload = ClayCompanyCallbackPayload | ClayPersonCallbackPayload;

// Verify webhook authenticity (optional security measure)
const verifyWebhookSignature = (payload: string, signature: string): boolean => {
  const webhookSecret = process.env.CLAY_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Update company processing status in database
const updateCompanyProcessingStatus = async (data: ClayCompanyCallbackPayload) => {
  const connection = await pool.getConnection();
  
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    // Always update status and timestamp
    updateFields.push('status = ?', 'updated_at = NOW()');
    updateValues.push(data.status);
    
    // Set started_at when processing begins
    if (data.status === 'processing') {
      updateFields.push('started_at = NOW()');
    }
    
    // Set completed_at when company enrichment finished
    if (data.status === 'completed') {
      updateFields.push('completed_at = NOW()', 'people_search_status = ?');
      updateValues.push('in_progress'); // Start people search phase
    }
    
    if (data.status === 'failed') {
      updateFields.push('completed_at = NOW()');
    }
    
    // Update counts if provided
    if (data.processed_count !== undefined) {
      updateFields.push('companies_completed = ?');
      updateValues.push(data.processed_count);
    }
    
    if (data.total_count !== undefined) {
      updateFields.push('total_count = ?');
      updateValues.push(data.total_count);
    }
    
    // Store error message if failed
    if (data.error_message) {
      updateFields.push('error_message = ?');
      updateValues.push(data.error_message);
    }
    
    // Add request_id for WHERE clause
    updateValues.push(data.request_id);
    
    const sql = `
      UPDATE lead_enricher_processing_status 
      SET ${updateFields.join(', ')} 
      WHERE request_id = ?
    `;
    
    const [result] = await connection.execute(sql, updateValues);
    
    console.log(`Clay company callback processed for request_id: ${data.request_id}, status: ${data.status}`);
    return result;
    
  } finally {
    connection.release();
  }
};

// Add person result to database
const addPersonResult = async (data: ClayPersonCallbackPayload) => {
  const connection = await pool.getConnection();
  
  try {
    // Insert person record
    await connection.execute(
      `INSERT INTO lead_enricher_people_results 
       (request_id, company_name, company_row_number, first_name, last_name, full_name, 
        email, linkedin_url, job_title, department, clay_person_id, found_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data.request_id,
        data.company_name,
        data.company_row_number,
        data.first_name || null,
        data.last_name || null,
        data.full_name || null,
        data.email || null,
        data.linkedin_url || null,
        data.job_title || null,
        data.department || null,
        data.clay_person_id || null
      ]
    );

    // Update aggregated people stats
    await connection.execute(
      `UPDATE lead_enricher_processing_status 
       SET total_people_found = (
         SELECT COUNT(*) FROM lead_enricher_people_results 
         WHERE request_id = ?
       ),
       companies_with_people = (
         SELECT COUNT(DISTINCT company_row_number) FROM lead_enricher_people_results 
         WHERE request_id = ?
       ),
       companies_without_people = (
         SELECT total_count - (
           SELECT COUNT(DISTINCT company_row_number) FROM lead_enricher_people_results 
           WHERE request_id = ?
         ) FROM lead_enricher_processing_status WHERE request_id = ?
       ),
       updated_at = NOW()
       WHERE request_id = ?`,
      [data.request_id, data.request_id, data.request_id, data.request_id, data.request_id]
    );

    console.log(`Person added for request_id: ${data.request_id}, company: ${data.company_name}`);
    
  } finally {
    connection.release();
  }
};

// Auto-detect completion when all companies are processed
const checkAndUpdateCompletion = async (requestId: string) => {
  const connection = await pool.getConnection();
  
  try {
    // Check if all companies have been processed
    const [statusRows] = await connection.execute(
      `SELECT companies_completed, total_count, people_search_status FROM lead_enricher_processing_status WHERE request_id = ?`,
      [requestId]
    );
    
    if (statusRows && (statusRows as any[]).length > 0) {
      const status = (statusRows as any[])[0];
      
      // If all companies are done and we're not already marked as completed
      if (status.companies_completed >= status.total_count && status.people_search_status !== 'completed') {
        await connection.execute(
          `UPDATE lead_enricher_processing_status 
           SET people_search_status = 'completed', updated_at = NOW() 
           WHERE request_id = ?`,
          [requestId]
        );
        
        console.log(`Auto-completed people search for request_id: ${requestId} (${status.companies_completed}/${status.total_count} companies done)`);
      }
    }
    
  } finally {
    connection.release();
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Clay callback received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  console.log('Clay callback received:', req.body);

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.warn('Clay callback rejected - Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-clay-signature'] as string;
    
    // Verify webhook signature if secret is configured
    if (process.env.CLAY_WEBHOOK_SECRET) {
      if (!signature || !verifyWebhookSignature(payload, signature)) {
        console.warn('Clay webhook signature verification failed');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    
    const data: ClayCallbackPayload = req.body;
    
    // Validate required fields
    if (!data.request_id || !data.callback_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: request_id, callback_type' 
      });
    }

    // Route to appropriate handler based on callback type
    if (data.callback_type === 'company') {
      const companyData = data as ClayCompanyCallbackPayload;
      
      // Validate company callback
      if (!companyData.status) {
        return res.status(400).json({ error: 'Missing required field: status' });
      }
      
      const validStatuses = ['processing', 'completed', 'failed'];
      if (!validStatuses.includes(companyData.status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be: processing, completed, or failed' 
        });
      }
      
      await updateCompanyProcessingStatus(companyData);
      
      // Check if we should auto-complete after company status update
      if (companyData.status === 'completed') {
        await checkAndUpdateCompletion(companyData.request_id);
      }
      
      console.log('Company callback processed:', {
        request_id: companyData.request_id,
        status: companyData.status,
        processed_count: companyData.processed_count
      });
      
    } else if (data.callback_type === 'person') {
      const personData = data as ClayPersonCallbackPayload;
      
      // Validate person callback
      if (!personData.company_name || personData.company_row_number === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields: company_name, company_row_number' 
        });
      }
      
      await addPersonResult(personData);
      
      // Check if we should auto-complete after this person addition
      await checkAndUpdateCompletion(personData.request_id);
      
      console.log('Person callback processed:', {
        request_id: personData.request_id,
        company: personData.company_name,
        person: personData.full_name || `${personData.first_name} ${personData.last_name}`.trim()
      });
      
    } else {
      return res.status(400).json({ 
        error: 'Invalid callback_type. Must be: company or person' 
      });
    }
    
    // Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Callback processed successfully',
      request_id: data.request_id,
      callback_type: data.callback_type
    });
    
  } catch (error: any) {
    console.error('Error processing Clay callback:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}