import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';
import { validateUserToken } from './validate-user-token';

interface User {
  id: number;
  username: string;
  email: string;
}

interface SavedSearchRequest {
  searchName: string;
  clientId: number;
  searchQuery: string;
  searchType?: string;
  urls?: string[];
  keywords?: string[];
  positiveUrls?: string[];
  positiveKeywords?: string[];
  location?: string;
  language?: string;
  country?: string;
  googleDomain?: string;
  enableNegativeUrls?: boolean;
  enableNegativeSentiment?: boolean;
  enableNegativeKeywords?: boolean;
  enablePositiveUrls?: boolean;
  enablePositiveSentiment?: boolean;
  enablePositiveKeywords?: boolean;
  includePage2?: boolean;
}

interface SavedSearchResponse {
  id: number;
  user_id: number;
  client_id: number;
  client_name: string;
  search_name: string;
  search_query: string;
  search_type?: string;
  urls?: string[];
  keywords?: string[];
  positive_urls?: string[];
  positive_keywords?: string[];
  location?: string;
  language?: string;
  country?: string;
  google_domain?: string;
  enable_negative_urls: boolean;
  enable_negative_sentiment: boolean;
  enable_negative_keywords: boolean;
  enable_positive_urls: boolean;
  enable_positive_sentiment: boolean;
  enable_positive_keywords: boolean;
  include_page2: boolean;
  created_at: string;
  updated_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await validateUserToken(req);
  if (!user.isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    // Create a new saved search
    const {
      searchName,
      clientId,
      searchQuery,
      searchType,
      urls,
      keywords,
      positiveUrls,
      positiveKeywords,
      location,
      language,
      country,
      googleDomain,
      enableNegativeUrls,
      enableNegativeSentiment,
      enableNegativeKeywords,
      enablePositiveUrls,
      enablePositiveSentiment,
      enablePositiveKeywords,
      includePage2,
    } = req.body as SavedSearchRequest;

    // Validate required fields
    if (!searchName || !clientId || !searchQuery) {
      return res.status(400).json({ error: 'Search name, client ID, and search query are required' });
    }

    try {
      // Check if search name already exists for this user
      const [existing] = await query(
        'SELECT id FROM saved_stillbrook_searches WHERE user_id = ? AND search_name = ?',
        [user.user_id, searchName]
      );
      
      if ((existing as any[]).length > 0) {
        return res.status(409).json({ error: 'A search with this name already exists' });
      }

      // Verify the client exists and belongs to the user (or is accessible)
      const [clientCheck] = await query(
        'SELECT client_id FROM clients WHERE client_id = ? AND is_active = 1',
        [clientId]
      );
      
      if ((clientCheck as any[]).length === 0) {
        return res.status(400).json({ error: 'Invalid or inactive client' });
      }

      // Insert the saved search
      const sql = `
        INSERT INTO saved_stillbrook_searches (
          user_id, client_id, search_name, search_query, search_type,
          urls, keywords, positive_urls, positive_keywords,
          location, language, country, google_domain,
          enable_negative_urls, enable_negative_sentiment, enable_negative_keywords,
          enable_positive_urls, enable_positive_sentiment, enable_positive_keywords,
          include_page2
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        user.user_id,
        clientId,
        searchName,
        searchQuery,
        searchType || '',
        urls ? JSON.stringify(urls) : null,
        keywords ? JSON.stringify(keywords) : null,
        positiveUrls ? JSON.stringify(positiveUrls) : null,
        positiveKeywords ? JSON.stringify(positiveKeywords) : null,
        location || '',
        language || 'en',
        country || 'us',
        googleDomain || 'google.com',
        enableNegativeUrls || false,
        enableNegativeSentiment || false,
        enableNegativeKeywords || false,
        enablePositiveUrls || false,
        enablePositiveSentiment || false,
        enablePositiveKeywords || false,
        includePage2 || false,
      ];

      const [result] = await query(sql, params);
      const insertResult = result as any;

      res.status(201).json({
        id: insertResult.insertId,
        message: 'Search saved successfully'
      });
    } catch (error) {
      console.error('Error saving search:', error);
      res.status(500).json({ error: 'Failed to save search' });
    }
  } else if (req.method === 'GET') {
    // Get saved searches for the user
    const { clientId } = req.query;
    
    try {
      let sql = `
        SELECT 
          s.*,
          c.client_name
        FROM saved_stillbrook_searches s
        JOIN clients c ON s.client_id = c.client_id
        WHERE s.user_id = ?
      `;
      let params: any[] = [user.user_id];

      // Filter by client if specified
      if (clientId && clientId !== 'all') {
        sql += ' AND s.client_id = ?';
        params.push(parseInt(clientId as string));
      }

      sql += ' ORDER BY s.updated_at DESC';

      const [rows] = await query(sql, params);
      const searches = (rows as any[]).map(row => {
        const safeJsonParse = (jsonString: any) => {
          if (!jsonString || jsonString === null || jsonString === undefined) {
            return [];
          }
          if (typeof jsonString !== 'string') {
            return Array.isArray(jsonString) ? jsonString : [];
          }
          if (jsonString.trim() === '' || jsonString === 'null') {
            return [];
          }
          try {
            return JSON.parse(jsonString);
          } catch (error) {
            console.error('JSON parse error for:', jsonString, error);
            return [];
          }
        };

        return {
          ...row,
          urls: safeJsonParse(row.urls),
          keywords: safeJsonParse(row.keywords),
          positive_urls: safeJsonParse(row.positive_urls),
          positive_keywords: safeJsonParse(row.positive_keywords),
        };
      });

      res.status(200).json(searches);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
  } else if (req.method === 'PUT') {
    // Update an existing saved search
    const { id } = req.query;
    const {
      searchName,
      clientId,
      searchQuery,
      searchType,
      urls,
      keywords,
      positiveUrls,
      positiveKeywords,
      location,
      language,
      country,
      googleDomain,
      enableNegativeUrls,
      enableNegativeSentiment,
      enableNegativeKeywords,
      enablePositiveUrls,
      enablePositiveSentiment,
      enablePositiveKeywords,
      includePage2,
    } = req.body as SavedSearchRequest;

    if (!id) {
      return res.status(400).json({ error: 'Search ID is required' });
    }

    // Validate required fields
    if (!searchName || !clientId || !searchQuery) {
      return res.status(400).json({ error: 'Search name, client ID, and search query are required' });
    }

    try {
      // Verify the search belongs to the user
      const [existing] = await query(
        'SELECT id FROM saved_stillbrook_searches WHERE id = ? AND user_id = ?',
        [id, user.user_id]
      );
      
      if ((existing as any[]).length === 0) {
        return res.status(404).json({ error: 'Search not found or access denied' });
      }

      // Check if the new search name conflicts with another search (excluding current one)
      const [nameCheck] = await query(
        'SELECT id FROM saved_stillbrook_searches WHERE user_id = ? AND search_name = ? AND id != ?',
        [user.user_id, searchName, id]
      );
      
      if ((nameCheck as any[]).length > 0) {
        return res.status(409).json({ error: 'A search with this name already exists' });
      }

      // Verify the client exists and is active
      const [clientCheck] = await query(
        'SELECT client_id FROM clients WHERE client_id = ? AND is_active = 1',
        [clientId]
      );
      
      if ((clientCheck as any[]).length === 0) {
        return res.status(400).json({ error: 'Invalid or inactive client' });
      }

      // Update the saved search
      const sql = `
        UPDATE saved_stillbrook_searches SET
          client_id = ?, search_name = ?, search_query = ?, search_type = ?,
          urls = ?, keywords = ?, positive_urls = ?, positive_keywords = ?,
          location = ?, language = ?, country = ?, google_domain = ?,
          enable_negative_urls = ?, enable_negative_sentiment = ?, enable_negative_keywords = ?,
          enable_positive_urls = ?, enable_positive_sentiment = ?, enable_positive_keywords = ?,
          include_page2 = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;

      const params = [
        clientId,
        searchName,
        searchQuery,
        searchType || '',
        urls ? JSON.stringify(urls) : null,
        keywords ? JSON.stringify(keywords) : null,
        positiveUrls ? JSON.stringify(positiveUrls) : null,
        positiveKeywords ? JSON.stringify(positiveKeywords) : null,
        location || '',
        language || 'en',
        country || 'us',
        googleDomain || 'google.com',
        enableNegativeUrls || false,
        enableNegativeSentiment || false,
        enableNegativeKeywords || false,
        enablePositiveUrls || false,
        enablePositiveSentiment || false,
        enablePositiveKeywords || false,
        includePage2 || false,
        id,
        user.user_id,
      ];

      await query(sql, params);

      res.status(200).json({
        id: parseInt(id as string),
        message: 'Search updated successfully'
      });
    } catch (error) {
      console.error('Error updating search:', error);
      res.status(500).json({ error: 'Failed to update search' });
    }
  } else if (req.method === 'DELETE') {
    // Delete a saved search
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Search ID is required' });
    }

    try {
      // Verify the search belongs to the user
      const [existing] = await query(
        'SELECT id FROM saved_stillbrook_searches WHERE id = ? AND user_id = ?',
        [id, user.user_id]
      );
      
      if ((existing as any[]).length === 0) {
        return res.status(404).json({ error: 'Search not found or access denied' });
      }

      await query('DELETE FROM saved_stillbrook_searches WHERE id = ? AND user_id = ?', [id, user.user_id]);
      
      res.status(200).json({ message: 'Search deleted successfully' });
    } catch (error) {
      console.error('Error deleting search:', error);
      res.status(500).json({ error: 'Failed to delete search' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}