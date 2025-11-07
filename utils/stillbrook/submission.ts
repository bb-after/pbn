import { query } from '../../lib/db';

export interface StillbrookSubmission {
  user_id: number | null;
  username?: string;
  email?: string;
  search_query: string;
  search_type: string;
  saved_stillbrook_search_id?: number | null;
  urls?: string[];
  keywords?: string[];
  positive_urls?: string[];
  positive_keywords?: string[];
  location?: string;
  language?: string;
  country?: string;
  matched_results_count: number;
  status: 'success' | 'error' | 'no_results';
  error_message?: string;
  serpapi_search_id?: string;
  raw_html_url?: string;
  has_highlighted_content: boolean;
  processing_time_ms: number;
}

// Helper function to create submission object
export function createSubmission(
  user_id: number | null,
  username: string | null,
  email: string | null,
  keyword: string,
  screenshotType: string,
  savedSearchId?: string,
  urls?: string[],
  keywords?: string[],
  positiveUrls?: string[],
  positiveKeywords?: string[],
  location?: string,
  language?: string,
  country?: string,
  matchedResultsCount: number = 0,
  status: 'success' | 'error' | 'no_results' = 'success',
  errorMessage?: string,
  serpApiSearchId?: string,
  rawHtmlUrl?: string,
  hasHighlightedContent: boolean = false,
  processingTimeMs: number = 0
): StillbrookSubmission {
  return {
    user_id: user_id,
    username: username || undefined,
    email: email || undefined,
    search_query: keyword,
    search_type: screenshotType,
    saved_stillbrook_search_id: savedSearchId ? parseInt(savedSearchId) : null,
    urls: urls,
    keywords: keywords,
    positive_urls: positiveUrls,
    positive_keywords: positiveKeywords,
    location: location || 'New York',
    language: language || 'en',
    country: country || 'us',
    matched_results_count: matchedResultsCount,
    status: status,
    error_message: errorMessage,
    serpapi_search_id: serpApiSearchId,
    raw_html_url: rawHtmlUrl,
    has_highlighted_content: hasHighlightedContent,
    processing_time_ms: processingTimeMs
  };
}

// Helper function to log submission to database
export async function logStillbrookSubmission(submission: StillbrookSubmission): Promise<void> {
  try {
    const sql = `
      INSERT INTO stillbrook_submissions (
        user_id, username, email, search_query, search_type, saved_stillbrook_search_id,
        urls, keywords, positive_urls, positive_keywords, location, language, country, 
        matched_results_count, status, error_message, serpapi_search_id, 
        raw_html_url, has_highlighted_content, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      submission.user_id,
      submission.username,
      submission.email,
      submission.search_query,
      submission.search_type,
      submission.saved_stillbrook_search_id,
      submission.urls ? JSON.stringify(submission.urls) : null,
      submission.keywords ? JSON.stringify(submission.keywords) : null,
      submission.positive_urls ? JSON.stringify(submission.positive_urls) : null,
      submission.positive_keywords ? JSON.stringify(submission.positive_keywords) : null,
      submission.location,
      submission.language,
      submission.country,
      submission.matched_results_count,
      submission.status,
      submission.error_message,
      submission.serpapi_search_id,
      submission.raw_html_url,
      submission.has_highlighted_content,
      submission.processing_time_ms
    ];

    await query(sql, params);
    console.log(`Logged Stillbrook submission for user ${submission.user_id}`);
  } catch (error) {
    console.error('Failed to log Stillbrook submission:', error);
    // Don't throw - we don't want logging failures to break the main functionality
  }
}