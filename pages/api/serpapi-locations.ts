import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

export interface LocationResult {
  id: string;
  google_id: number;
  google_parent_id: number;
  name: string;
  canonical_name: string;
  country_code: string;
  target_type: string;
  reach: number;
  gps?: [number, number];
  keys: string[];
  deprecated_by_google?: boolean;
}

export interface LocationsResponse {
  locations: LocationResult[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocationsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ locations: [], error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ locations: [], error: 'Query parameter "q" is required' });
  }

  const searchQuery = q.trim().toLowerCase();
  
  if (searchQuery.length < 2) {
    return res.status(400).json({ locations: [], error: 'Query must be at least 2 characters long' });
  }

  try {
    console.log(`Searching locations for query: "${searchQuery}"`);
    
    // Use multiple search strategies for better matching
    const searchPattern = `%${searchQuery}%`;
    const wordPattern = searchQuery.split(' ').map(word => `%${word}%`);
    
    const sql = `
      SELECT 
        id, google_id, google_parent_id, name, canonical_name,
        country_code, target_type, reach, 
        gps_longitude, gps_latitude, location_keys, deprecated_by_google
      FROM serpapi_locations 
      WHERE deprecated_by_google = FALSE
      AND (
        LOWER(name) LIKE ? OR
        LOWER(canonical_name) LIKE ? OR
        LOWER(location_keys) LIKE ?
        ${wordPattern.length > 1 ? `OR (${wordPattern.map(() => 'LOWER(canonical_name) LIKE ?').join(' AND ')})` : ''}
      )
      ORDER BY 
        CASE 
          WHEN LOWER(name) = ? THEN 1
          WHEN LOWER(name) LIKE ? THEN 2
          WHEN LOWER(canonical_name) LIKE ? THEN 3
          ELSE 4
        END,
        reach DESC,
        name ASC
      LIMIT 10
    `;
    
    const params = [
      searchPattern, // name LIKE
      searchPattern, // canonical_name LIKE  
      searchPattern, // keys LIKE
      ...wordPattern, // multi-word AND matching
      searchQuery, // exact name match (highest priority)
      `${searchQuery}%`, // name starts with query
      `%${searchQuery}%` // canonical_name contains query
    ];
    
    const rows = await query(sql, params);
    
    // Handle nested array structure - rows is typically [data, metadata]
    const dataRows = Array.isArray(rows[0]) ? rows[0] : rows;
    
    console.log('Raw query result:', { 
      rowsLength: rows.length, 
      firstElement: rows[0] ? typeof rows[0] : 'undefined',
      dataRowsLength: dataRows.length 
    });
    
    // Convert database rows to LocationResult format
    const locations: LocationResult[] = (dataRows as any[]).map(row => {
      // Add safety checks for required fields
      if (!row.id || !row.name || !row.canonical_name) {
        console.warn('Skipping row with missing required fields:', row);
        return null;
      }

      return {
        id: String(row.id),
        google_id: Number(row.google_id) || 0,
        google_parent_id: Number(row.google_parent_id) || 0,
        name: String(row.name),
        canonical_name: String(row.canonical_name),
        country_code: String(row.country_code || ''),
        target_type: String(row.target_type || ''),
        reach: Number(row.reach) || 0,
        gps: row.gps_longitude && row.gps_latitude ? [Number(row.gps_longitude), Number(row.gps_latitude)] : undefined,
        keys: row.location_keys ? String(row.location_keys).split('|') : [],
        deprecated_by_google: !!row.deprecated_by_google,
      };
    }).filter(Boolean) as LocationResult[]; // Remove null entries

    console.log(`Found ${locations.length} locations for "${searchQuery}" from local database`);

    return res.status(200).json({ locations });
  } catch (error) {
    console.error('Error searching locations in database:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      searchQuery,
    });
    return res.status(500).json({ 
      locations: [], 
      error: error instanceof Error ? error.message : 'Failed to search locations' 
    });
  }
}