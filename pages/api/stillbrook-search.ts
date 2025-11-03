import type { NextApiRequest, NextApiResponse } from 'next';
import Sentiment from 'sentiment';
import puppeteer from 'puppeteer';
import { query } from '../../lib/db';

interface SearchRequestBody {
  keyword: string;
  url?: string;
  urls?: string[];
  keywords?: string[];
  positiveUrls?: string[];
  positiveKeywords?: string[];
  location?: string;
  googleDomain?: string;
  language?: string;
  searchType?: string;
  screenshotType: string;
  savedSearchId?: string; // Optional saved search ID for analytics
  // New highlight options
  enableNegativeUrls?: boolean;
  enableNegativeSentiment?: boolean;
  enableNegativeKeywords?: boolean;
  enablePositiveUrls?: boolean;
  enablePositiveSentiment?: boolean;
  enablePositiveKeywords?: boolean;
}

interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
}

interface SearchResponse {
  searchType: any;
  noMatches: any;
  results?: SerpApiResult[];
  matchedResults?: SerpApiResult[];
  htmlPreview?: string;
  error?: string;
  totalResults?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface StillbrookSubmission {
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

// Helper function to extract user from database using token
async function getUserFromRequest(req: NextApiRequest): Promise<User | null> {
  try {
    const token = req.headers['x-auth-token'] as string ||
                  req.cookies?.auth_token ||
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token found in request');
      return null;
    }

    // Query database to get user info from token
    const [rows] = await query('SELECT id, name, email FROM users WHERE user_token = ?', [token]);
    const users = rows as any[];
    
    if (users.length === 0) {
      console.log('No user found for token');
      return null;
    }

    return {
      id: users[0].id, // Keep as numeric ID
      username: users[0].name || 'unknown',
      email: users[0].email || 'unknown@example.com'
    };
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
}

// Helper function to create submission object
function createSubmission(
  user: User | null,
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
    user_id: user?.id || null,
    username: user?.username,
    email: user?.email,
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
async function logStillbrookSubmission(submission: StillbrookSubmission): Promise<void> {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', searchType: undefined, noMatches: undefined });
  }

  const {
    keyword,
    url,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    location,
    googleDomain,
    language,
    searchType,
    screenshotType,
    savedSearchId,
    enableNegativeUrls,
    enableNegativeSentiment,
    enableNegativeKeywords,
    enablePositiveUrls,
    enablePositiveSentiment,
    enablePositiveKeywords,
  } = req.body as SearchRequestBody;
  
  // Extract country from googleDomain or use default
  const country = googleDomain?.split('.').pop() || 'us';

  // Basic input validation
  if (!keyword || !screenshotType) {
    return res.status(400).json({
      error: 'Invalid input: keyword and screenshotType are required.',
      searchType: undefined,
      noMatches: undefined
    });
  }

  if (screenshotType === 'exact_url_match' && !url && (!urls || urls.length === 0)) {
    return res.status(400).json({ error: 'URL or URLs are required for Exact URL Match.', searchType: undefined, noMatches: undefined });
  }

  if (screenshotType === 'positive_url_match' && (!positiveUrls || positiveUrls.length === 0)) {
    return res.status(400).json({ error: 'URLs are required for Positive URL Match.', searchType: undefined, noMatches: undefined });
  }

  if (screenshotType === 'keyword_match' && (!keywords || keywords.length === 0)) {
    return res.status(400).json({ error: 'Keywords are required for Keyword Match.', searchType: undefined, noMatches: undefined });
  }

  if (screenshotType === 'positive_keyword_match' && (!positiveKeywords || positiveKeywords.length === 0)) {
    return res.status(400).json({ error: 'Keywords are required for Positive Keyword Match.', searchType: undefined, noMatches: undefined });
  }

  // Extract user information and start timing
  const startTime = Date.now();
  const user = await getUserFromRequest(req);
  
  // Check if SERPAPI_KEY is configured
  if (!process.env.SERP_API_KEY) {
    return res.status(500).json({
      error: 'SerpAPI key not configured. Please set SERPAPI_KEY environment variable.',
      searchType: undefined,
      noMatches: undefined
    });
  }

  try {
    console.log(
      `Searching for: "${keyword}"${location ? ` in ${location}` : ''}${googleDomain ? ` on ${googleDomain}` : ''}${language ? ` (${language})` : ''}${searchType ? ` [${searchType}]` : ''} with type: ${screenshotType}`
    );

    // Get country code from google domain for gl parameter
    let countryCode = 'us'; // Default to US
    if (googleDomain && googleDomain !== 'google.com') {
      // Import google domains data to get country code
      const googleDomainsData = require('../../google-domains.json');
      const domainData = googleDomainsData.find((d: any) => d.domain === googleDomain);
      if (domainData) {
        countryCode = domainData.country_code;
      }
    }

    // Call SerpAPI for Google search results
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'google');
    serpApiUrl.searchParams.set('q', keyword); // Use original keyword, don't modify it
    if (location) {
      serpApiUrl.searchParams.set('location', location);
    }
    serpApiUrl.searchParams.set('gl', countryCode); // Set country for consistent results
    if (googleDomain) {
      serpApiUrl.searchParams.set('google_domain', googleDomain);
    }
    serpApiUrl.searchParams.set('hl', language || 'en'); // Set language (default to English)
    if (searchType) {
      serpApiUrl.searchParams.set('tbm', searchType); // Set search type (images, videos, news, etc.)
    }
    serpApiUrl.searchParams.set('api_key', process.env.SERP_API_KEY);
    serpApiUrl.searchParams.set('num', '20'); // Get up to 20 results

    const response = await fetch(serpApiUrl.toString());

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('lets see some results', data);

    // Extract search metadata for logging
    const serpApiSearchId = data.search_metadata?.id;
    const rawHtmlUrl = data.search_metadata?.raw_html_file;

    if (data.error) {
      const processingTime = Date.now() - startTime;
      const submission = createSubmission(
        user, keyword, screenshotType, savedSearchId, urls, keywords, positiveUrls, positiveKeywords,
        location, language, country, 0, 'error', `SerpAPI error: ${data.error}`, 
        serpApiSearchId, rawHtmlUrl, false, processingTime
      );
      await logStillbrookSubmission(submission);
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    // Handle different result types based on search type
    let organicResults: SerpApiResult[] = [];

    if (searchType === 'nws' && data.news_results) {
      // For news search, convert news_results to our format
      organicResults = data.news_results.map((newsResult: any, index: number) => ({
        position: newsResult.position || index + 1,
        title: newsResult.title || '',
        link: newsResult.link || '',
        snippet: newsResult.snippet || '',
        displayed_link: newsResult.source || '',
      }));
      console.log(`Found ${organicResults.length} news search results`);
    } else if (searchType === 'isch' && data.images_results) {
      // For image search, convert images_results to our format
      organicResults = data.images_results.map((imageResult: any, index: number) => ({
        position: imageResult.position || index + 1,
        title: imageResult.title || '',
        link: imageResult.link || imageResult.original || '',
        snippet: imageResult.snippet || '',
        displayed_link: imageResult.source || '',
      }));
      console.log(`Found ${organicResults.length} image search results`);
    } else if (searchType === 'vid' && data.video_results) {
      // For video search, convert video_results to our format
      organicResults = data.video_results.map((videoResult: any, index: number) => ({
        position: videoResult.position || index + 1,
        title: videoResult.title || '',
        link: videoResult.link || '',
        snippet: videoResult.snippet || '',
        displayed_link: videoResult.displayed_link || '',
      }));
      console.log(`Found ${organicResults.length} video search results`);
    } else if (searchType === 'shop' && data.shopping_results) {
      // For shopping search, convert shopping_results to our format
      organicResults = data.shopping_results.map((shopResult: any, index: number) => ({
        position: shopResult.position || index + 1,
        title: shopResult.title || '',
        link: shopResult.link || '',
        snippet: shopResult.snippet || shopResult.price || '',
        displayed_link: shopResult.source || '',
      }));
      console.log(`Found ${organicResults.length} shopping search results`);
    } else {
      // For regular search, use organic_results
      organicResults = data.organic_results || [];
      console.log(`Found ${organicResults.length} organic search results`);
    }

    if (organicResults.length === 0) {
      const processingTime = Date.now() - startTime;
      const submission = createSubmission(
        user, keyword, screenshotType, savedSearchId, urls, keywords, positiveUrls, positiveKeywords,
        location, language, country, 0, 'no_results', 'No search results found', 
        serpApiSearchId, rawHtmlUrl, false, processingTime
      );
      await logStillbrookSubmission(submission);
      return res.status(404).json({
        error: 'No search results found.',
        searchType: undefined,
        noMatches: undefined
      });
    }

    // Process results with combined positive and negative highlighting
    let negativeMatches: SerpApiResult[] = [];
    let positiveMatches: SerpApiResult[] = [];
    let allMatches: SerpApiResult[] = [];
    
    console.log('Processing results for combined highlighting...');
    console.log('Organic results count:', organicResults.length);

    // Process negative URL matches
    if (enableNegativeUrls) {
      const urlsToMatch = urls && urls.length > 0 ? urls : url ? [url] : [];
      const userDomains: string[] = [];

      for (const urlToMatch of urlsToMatch) {
        try {
          const domain = new URL(urlToMatch).hostname.replace(/^www\./, '');
          userDomains.push(domain);
        } catch (error) {
          return res.status(400).json({
            error: `Invalid URL provided: ${urlToMatch}`,
            searchType: undefined,
            noMatches: undefined
          });
        }
      }

      console.log(`Looking for negative domain matches: ${userDomains.join(', ')}`);

      const urlMatches = organicResults.filter((result, index) => {
        try {
          const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
          const isMatch = userDomains.some(
            userDomain => resultDomain === userDomain || resultDomain.endsWith('.' + userDomain)
          );
          console.log(
            `Result ${index + 1}: ${resultDomain} vs [${userDomains.join(', ')}] - Negative Match: ${isMatch}`
          );
          return isMatch;
        } catch (e) {
          console.log(`Error parsing URL: ${result.link}`, e);
          return false;
        }
      });
      
      negativeMatches = [...negativeMatches, ...urlMatches];
    }

    // Process negative sentiment matches
    if (enableNegativeSentiment) {
      const sentiment = new Sentiment();

      const sentimentMatches = organicResults.filter((result, index) => {
        const textToAnalyze = result.snippet || result.title;
        if (textToAnalyze) {
          const resultSentiment = sentiment.analyze(textToAnalyze);
          const isNegative = resultSentiment.score < 0;
          console.log(
            `Result ${index + 1}: "${result.title}" - Sentiment: ${resultSentiment.score} (${isNegative ? 'NEGATIVE' : 'positive/neutral'}) - Analyzed: ${result.snippet ? 'snippet' : 'title'}`
          );
          if (isNegative) {
            console.log(`  Text: ${textToAnalyze.substring(0, 150)}...`);
          }
          return isNegative;
        }
        return false;
      });

      negativeMatches = [...negativeMatches, ...sentimentMatches];
    }

    // Process negative keyword matches
    if (enableNegativeKeywords) {
      const keywordsToMatch = keywords && keywords.length > 0 ? keywords : [];

      if (keywordsToMatch.length > 0) {
        console.log(`Looking for negative keyword matches: ${keywordsToMatch.join(', ')}`);

        const keywordMatches = organicResults.filter((result, index) => {
          const resultText = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();

          const matchedKeywords = keywordsToMatch.filter(kw =>
            resultText.includes(kw.toLowerCase())
          );

          const isMatch = matchedKeywords.length > 0;

          console.log(`Result ${index + 1}: "${result.title}" - Negative Keywords match: ${isMatch}`);
          if (isMatch) {
            console.log(`  Matched negative keywords: ${matchedKeywords.join(', ')}`);
            console.log(`  Snippet: ${result.snippet?.substring(0, 150)}...`);
          }
          return isMatch;
        });

        negativeMatches = [...negativeMatches, ...keywordMatches];
      }
    }

    // Process positive URL matches
    if (enablePositiveUrls) {
      const urlsToMatch = positiveUrls && positiveUrls.length > 0 ? positiveUrls : [];
      const userDomains: string[] = [];

      for (const urlToMatch of urlsToMatch) {
        try {
          const domain = new URL(urlToMatch).hostname.replace(/^www\./, '');
          userDomains.push(domain);
        } catch (error) {
          return res.status(400).json({
            error: `Invalid positive URL provided: ${urlToMatch}`,
            searchType: undefined,
            noMatches: undefined
          });
        }
      }

      console.log(`Looking for positive domain matches: ${userDomains.join(', ')}`);

      const urlMatches = organicResults.filter((result, index) => {
        try {
          const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
          const isMatch = userDomains.some(
            userDomain => resultDomain === userDomain || resultDomain.endsWith('.' + userDomain)
          );
          console.log(
            `Result ${index + 1}: ${resultDomain} vs [${userDomains.join(', ')}] - Positive Match: ${isMatch}`
          );
          return isMatch;
        } catch (e) {
          console.log(`Error parsing URL: ${result.link}`, e);
          return false;
        }
      });

      positiveMatches = [...positiveMatches, ...urlMatches];
    }

    // Process positive sentiment matches
    if (enablePositiveSentiment) {
      const sentiment = new Sentiment();

      const sentimentMatches = organicResults.filter((result, index) => {
        const textToAnalyze = result.snippet || result.title;
        if (textToAnalyze) {
          const resultSentiment = sentiment.analyze(textToAnalyze);
          const isPositive = resultSentiment.score > 0;
          console.log(
            `Result ${index + 1}: "${result.title}" - Sentiment: ${resultSentiment.score} (${isPositive ? 'POSITIVE' : 'negative/neutral'}) - Analyzed: ${result.snippet ? 'snippet' : 'title'}`
          );
          if (isPositive) {
            console.log(`  Text: ${textToAnalyze.substring(0, 150)}...`);
          }
          return isPositive;
        }
        return false;
      });

      positiveMatches = [...positiveMatches, ...sentimentMatches];
    }

    // Process positive keyword matches
    if (enablePositiveKeywords) {
      const keywordsToMatch = positiveKeywords && positiveKeywords.length > 0 ? positiveKeywords : [];

      if (keywordsToMatch.length > 0) {
        console.log(`Looking for positive keyword matches: ${keywordsToMatch.join(', ')}`);

        const keywordMatches = organicResults.filter((result, index) => {
          const resultText = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();

          const matchedKeywords = keywordsToMatch.filter(kw =>
            resultText.includes(kw.toLowerCase())
          );

          const isMatch = matchedKeywords.length > 0;

          console.log(`Result ${index + 1}: "${result.title}" - Positive Keywords match: ${isMatch}`);
          if (isMatch) {
            console.log(`  Matched positive keywords: ${matchedKeywords.join(', ')}`);
            console.log(`  Snippet: ${result.snippet?.substring(0, 150)}...`);
          }
          return isMatch;
        });

        positiveMatches = [...positiveMatches, ...keywordMatches];
      }
    }

    // Remove duplicates and combine all matches
    const uniqueNegativeMatches = negativeMatches.filter((result, index, array) => 
      index === array.findIndex(r => r.position === result.position)
    );
    const uniquePositiveMatches = positiveMatches.filter((result, index, array) => 
      index === array.findIndex(r => r.position === result.position)
    );
    
    allMatches = [...uniqueNegativeMatches, ...uniquePositiveMatches].filter((result, index, array) => 
      index === array.findIndex(r => r.position === result.position)
    );

    console.log(`Found ${uniqueNegativeMatches.length} negative matches`);
    console.log(`Found ${uniquePositiveMatches.length} positive matches`);
    console.log(`Total unique matches: ${allMatches.length}`);

    // Use SerpAPI's raw HTML file directly - no complex highlighting needed since we use Google operators
    let htmlPreview = '';
    if (data.search_metadata && data.search_metadata.raw_html_file) {
      console.log('Raw HTML file available:', data.search_metadata.raw_html_file);

      try {
        // Fetch the raw HTML from SerpAPI - use it as-is since Google already filtered results
        const htmlResponse = await fetch(data.search_metadata.raw_html_file);
        if (htmlResponse.ok) {
          const rawHtml = await htmlResponse.text();
          console.log('Successfully fetched raw HTML, length:', rawHtml.length);

          // Use headless browser to render HTML with JavaScript execution for proper image loading
          const renderedHtml = await renderHtmlWithBrowser(data.search_metadata.raw_html_file);
          const isImageSearch = searchType === 'isch';
          htmlPreview = addCombinedHighlighting(renderedHtml, uniqueNegativeMatches, uniquePositiveMatches, isImageSearch, searchType);
        } else {
          console.error('Failed to fetch raw HTML:', htmlResponse.status);
          // Fallback to custom generated preview
          const negativeMatchedIds = new Set(uniqueNegativeMatches.map(result => result.position));
          const positiveMatchedIds = new Set(uniquePositiveMatches.map(result => result.position));
          const isImageSearch = searchType === 'isch';
          htmlPreview = generateCombinedPagePreview(
            organicResults,
            negativeMatchedIds,
            positiveMatchedIds,
            keyword,
            isImageSearch
          );
        }
      } catch (error) {
        console.error('Error fetching raw HTML:', error);
        // Fallback to custom generated preview
        const negativeMatchedIds = new Set(uniqueNegativeMatches.map(result => result.position));
        const positiveMatchedIds = new Set(uniquePositiveMatches.map(result => result.position));
        const isImageSearch = searchType === 'isch';
        htmlPreview = generateCombinedPagePreview(organicResults, negativeMatchedIds, positiveMatchedIds, keyword, isImageSearch);
      }
    } else {
      console.log('No raw HTML file available, using custom preview');
      // Fallback to custom generated preview
      const negativeMatchedIds = new Set(uniqueNegativeMatches.map(result => result.position));
      const positiveMatchedIds = new Set(uniquePositiveMatches.map(result => result.position));
      const isImageSearch = searchType === 'isch';
      htmlPreview = generateCombinedPagePreview(organicResults, negativeMatchedIds, positiveMatchedIds, keyword, isImageSearch);
    }

    if (allMatches.length === 0) {
      const processingTime = Date.now() - startTime;
      const submission = createSubmission(
        user, keyword, screenshotType, savedSearchId, urls, keywords, positiveUrls, positiveKeywords,
        location, language, country, 0, 'no_results', 'No matching results found', 
        serpApiSearchId, rawHtmlUrl, true, processingTime
      );
      await logStillbrookSubmission(submission);
      
      // Return 200 with results but indicate no matches found
      return res.status(200).json({
        matchedResults: [], // Empty matched results
        results: organicResults, // Return all results for reference
        totalResults: organicResults.length,
        htmlPreview: generateCombinedPagePreview(organicResults, new Set(), new Set(), keyword, searchType === 'isch'),
        noMatches: true, // Flag to indicate no matches were found
        searchType: 'combined', // Include search type for frontend messaging
      });
    }

    // Log successful submission
    const processingTime = Date.now() - startTime;
    const submission = createSubmission(
      user, keyword, screenshotType, savedSearchId, urls, keywords, positiveUrls, positiveKeywords,
      location, language, country, allMatches.length, 'success', undefined, 
      serpApiSearchId, rawHtmlUrl, true, processingTime
    );
    await logStillbrookSubmission(submission);

    return res.status(200).json({
      matchedResults: allMatches,
      results: organicResults, // Include all results for reference
      totalResults: organicResults.length,
      htmlPreview,
      searchType: undefined,
      noMatches: undefined
    });
  } catch (error) {
    console.error('Error while searching:', error);
    
    // Log error submission
    const processingTime = Date.now() - startTime;
    const submission = createSubmission(
      user, keyword, screenshotType, savedSearchId, urls, keywords, positiveUrls, positiveKeywords,
      location, language, country, 0, 'error', error instanceof Error ? error.message : 'Internal Server Error', 
      undefined, undefined, false, processingTime
    );
    await logStillbrookSubmission(submission);
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal Server Error',
      searchType: undefined,
      noMatches: undefined
    });
  }
}

async function renderHtmlWithBrowser(rawHtmlUrl: string): Promise<string> {
  console.log('Starting headless browser to render HTML with JavaScript execution...');

  let browser;
  try {
    // Launch headless browser with settings optimized for image loading
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const page = await browser.newPage();

    // Set a reasonable viewport
    await page.setViewport({
      width: 1280,
      height: 800,
    });

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log(`Navigating to: ${rawHtmlUrl}`);

    // Navigate to the raw HTML file URL
    await page.goto(rawHtmlUrl, {
      waitUntil: 'networkidle0', // Wait until no network requests for 500ms
      timeout: 30000, // 30 second timeout
    });

    // Wait longer for images to load on production (increased from 5s to 8s)
    await new Promise<void>(resolve => setTimeout(resolve, 8000));
    
    // For Google Images, try to trigger any lazy loading by scrolling
    if (rawHtmlUrl.includes('tbm=isch') || rawHtmlUrl.includes('google') && rawHtmlUrl.includes('images')) {
      console.log('Detected Google Images search, scrolling to load images...');
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if(totalHeight >= scrollHeight){
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      // Wait longer after scrolling for images to fully load (increased from 2s to 4s)
      await new Promise<void>(resolve => setTimeout(resolve, 4000));
    }

    // Get the fully rendered HTML after JavaScript execution
    const renderedHtml = await page.content();

    console.log(`Successfully rendered HTML with JavaScript. Length: ${renderedHtml.length}`);

    // Debug: Check how many images have real URLs vs placeholders
    const images = renderedHtml.match(/<img[^>]*>/gi) || [];
    let realImageCount = 0;
    let placeholderCount = 0;

    images.forEach(imgTag => {
      const srcMatch = imgTag.match(/src="([^"]*)"/);
      const src = srcMatch ? srcMatch[1] : '';
      if (src.startsWith('http')) {
        realImageCount++;
      } else if (src.includes('data:image/gif;base64')) {
        placeholderCount++;
      }
    });

    console.log(
      `Rendered HTML has ${realImageCount} real images and ${placeholderCount} placeholders`
    );

    return renderedHtml;
  } catch (error) {
    console.error('Error rendering HTML with browser:', error);

    // Fallback: fetch the raw HTML without JavaScript execution
    console.log('Falling back to raw HTML without JavaScript...');
    try {
      const response = await fetch(rawHtmlUrl);
      if (response.ok) {
        const fallbackHtml = await response.text();
        console.log('Fallback HTML fetched successfully');
        return fallbackHtml;
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }

    throw new Error('Both browser rendering and fallback failed');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function addCleanHighlighting(
  rawHtml: string,
  matchedResults: SerpApiResult[],
  searchType: string,
  isImageSearch: boolean = false,
  searchTypeParam?: string
): string {
  const getHighlightColor = (searchType: string) => {
    switch (searchType) {
      // Negative highlighting - RED
      case 'exact_url_match':
        return '#f44336'; // Red
      case 'negative_sentiment':
        return '#f44336'; // Red
      case 'keyword_match':
        return '#f44336'; // Red
      // Positive highlighting - GREEN
      case 'positive_url_match':
        return '#4caf50'; // Green
      case 'positive_sentiment':
        return '#4caf50'; // Green
      case 'positive_keyword_match':
        return '#4caf50'; // Green
      default:
        return '#f44336'; // Red (default to red for negative results)
    }
  };

  const color = getHighlightColor(searchType);
  console.log('Adding highlighting for', matchedResults.length, 'matched results');

  let highlightedHtml = rawHtml;

  if (matchedResults.length === 0) {
    return highlightedHtml; // No matches to highlight
  }

  // Fix duplicate body tag issue by ensuring clean HTML structure
  if (highlightedHtml.includes('<body') && highlightedHtml.includes('<body')) {
    // Remove any duplicate body tags that might have been added
    const bodyMatches = highlightedHtml.match(/<body[^>]*>/gi);
    if (bodyMatches && bodyMatches.length > 1) {
      console.log('Fixing duplicate body tags');
      highlightedHtml = highlightedHtml.replace(/<body[^>]*><body/gi, '<body');
    }
  }

  // Add clean CSS without modifying body structure
  const customCSS = `
    <style>
      .match-result-highlight {
        border: 3px solid ${color} !important;
        border-radius: 8px !important;
        padding: 8px !important;
        margin: 8px 0 !important;
        background: rgba(255, 235, 59, 0.05) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      }
      .match-indicator {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: ${color} !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: bold !important;
        z-index: 999999 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      }
    </style>
  `;

  // Add CSS to head
  if (highlightedHtml.includes('</head>')) {
    highlightedHtml = highlightedHtml.replace('</head>', `${customCSS}</head>`);
  }

  // Add match indicator
  const matchIndicator = `<div class="match-indicator">${matchedResults.length} ${searchType.replace('_', ' ').toUpperCase()} MATCH${matchedResults.length !== 1 ? 'ES' : ''}</div>`;

  // Find a safe place to insert the indicator (after body opening tag)
  const bodyTagMatch = highlightedHtml.match(/<body[^>]*>/i);
  if (bodyTagMatch) {
    const insertAfter = highlightedHtml.indexOf(bodyTagMatch[0]) + bodyTagMatch[0].length;
    highlightedHtml =
      highlightedHtml.slice(0, insertAfter) + matchIndicator + highlightedHtml.slice(insertAfter);
  }

  // Handle different search types for highlighting
  if (isImageSearch) {
    matchedResults.forEach((result, index) => {
      try {
        console.log(`Adding image highlight for result ${index + 1}: ${result.link}`);
        
        // For Google Images, we need to find image containers and data attributes
        const imageUrl = result.link;
        const escapedImageUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const patterns = [
          new RegExp(`(<img[^>]*src="[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi'),
          new RegExp(`(<img[^>]*data-src="[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi'),
          new RegExp(`(<div[^>]*data-[^>]*"[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi'),
          new RegExp(`(<[^>]*[^>]*"[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi')
        ];
        
        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, (match) => {
              highlightAdded = true;
              console.log(`Added image highlight style to result ${index + 1}`);
              return `<div class="match-result-highlight" style="border: 3px solid ${color} !important; border-radius: 8px !important; padding: 8px !important; margin: 8px !important; background: rgba(255, 235, 59, 0.05) !important; display: inline-block !important;">${match}</div>`;
            });
          }
        });
        
        if (!highlightAdded) {
          console.log(`Could not find image element to highlight for result ${index + 1}: ${imageUrl}`);
        }
      } catch (error) {
        console.error(`Error highlighting image result ${index + 1}:`, error);
      }
    });
  } else if (searchTypeParam === 'shop') {
    // Handle Google Shopping highlighting
    matchedResults.forEach((result, index) => {
      try {
        console.log(`Adding shopping highlight for result ${index + 1}: "${result.title}"`);
        
        // For Google Shopping, target the specific container structure
        const titleText = result.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Debug: Check if the title text appears anywhere in the HTML
        const titleExists = highlightedHtml.includes(result.title);
        console.log(`Title "${result.title}" exists in HTML: ${titleExists}`);
        
        if (!titleExists) {
          // Try to find similar text or partial matches
          const titleWords = result.title.split(' ').filter(word => word.length > 3);
          const foundWords = titleWords.filter(word => highlightedHtml.toLowerCase().includes(word.toLowerCase()));
          console.log(`Found ${foundWords.length}/${titleWords.length} words from title in HTML:`, foundWords);
        }
        
        const patterns = [
          // Target the main shopping item container (li with class containing I8iMf)
          new RegExp(`(<li[^>]*class="[^"]*I8iMf[^"]*"[^>]*>[\s\S]*?${titleText}[\s\S]*?</li>)`, 'gi'),
          // Target any div with classes containing shopping-related patterns and the title
          new RegExp(`(<div[^>]*class="[^"]*(?:MtXiu|gkQHve|SsM98d|RmEs5b)[^"]*"[^>]*>[\s\S]*?${titleText}[\s\S]*?</div>)`, 'gi'),
          // Target title divs with flexible class matching
          new RegExp(`(<div[^>]*class="[^"]*gkQHve[^"]*"[^>]*>[\s\S]*?${titleText}[\s\S]*?</div>)`, 'gi'),
          // Target any shopping result container div (broader pattern)
          new RegExp(`(<div[^>]*data-[^>]*>[\s\S]*?${titleText}[\s\S]*?</div>)`, 'gi'),
          // Fallback: any element containing the exact title text
          new RegExp(`(<[^>]*>[^<]*${titleText}[^<]*<\/[^>]*>)`, 'gi')
        ];
        
        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, (match) => {
              highlightAdded = true;
              console.log(`Added shopping highlight style to result ${index + 1} with pattern`);
              // For shopping results, wrap the entire container
              return `<div class="match-result-highlight" style="border: 3px solid ${color} !important; border-radius: 8px !important; padding: 8px !important; margin: 8px !important; background: rgba(255, 235, 59, 0.05) !important; display: block !important;">${match}</div>`;
            });
          }
        });
        
        if (!highlightAdded) {
          console.log(`Could not find shopping element to highlight for result ${index + 1}: "${result.title}"`);
          console.log(`Trying fallback patterns for title: "${titleText}"`);
          
          // More aggressive fallback: target any text node containing the title
          const fallbackPatterns = [
            // Target text content within any tag
            new RegExp(`(>[^<]*${titleText}[^<]*<)`, 'gi'),
            // Target partial title matches (useful for truncated titles)
            new RegExp(`(>[^<]*${titleText.substring(0, Math.min(20, titleText.length))}[^<]*<)`, 'gi'),
            // Target the title with word boundaries (more flexible)
            new RegExp(`(>[^<]*\\b${titleText}\\b[^<]*<)`, 'gi')
          ];
          
          for (const fallbackPattern of fallbackPatterns) {
            if (!highlightAdded) {
              highlightedHtml = highlightedHtml.replace(fallbackPattern, (match) => {
                highlightAdded = true;
                console.log(`Added fallback shopping highlight for result ${index + 1} using pattern`);
                return match.replace('>', ' style="background: rgba(255, 235, 59, 0.3) !important; border: 2px solid ' + color + ' !important; padding: 4px !important; border-radius: 4px !important;">'); 
              });
            }
          }
          
          if (!highlightAdded) {
            console.log(`All fallback patterns failed for result ${index + 1}. Title: "${result.title}"`);
          }
        }
      } catch (error) {
        console.error(`Error highlighting shopping result ${index + 1}:`, error);
      }
    });
  } else {
    // Original logic for regular search results
    matchedResults.forEach((result, index) => {
      try {
        console.log(`Adding border highlight for result ${index + 1}: ${result.link}`);

        // Find all links that match this result's URL
        const escapedLink = result.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkPattern = new RegExp(`(<a[^>]*href="[^"]*${escapedLink}[^"]*"[^>]*>)`, 'gi');

        let highlightAdded = false;
        highlightedHtml = highlightedHtml.replace(linkPattern, match => {
          if (!highlightAdded) {
            // Add highlighting to the link element itself for now
            const highlightedLink = match.replace(
              '<a ',
              '<a style="display: block; border: 3px solid ' +
                color +
                ' !important; border-radius: 8px !important; padding: 8px !important; margin: 8px 0 !important; background: rgba(255, 235, 59, 0.05) !important;" '
            );
            highlightAdded = true;
            console.log(`Added highlight style to result ${index + 1}`);
            return highlightedLink;
          }
          return match;
        });

        if (!highlightAdded) {
          console.log(`Could not find link to highlight for result ${index + 1}`);
        }
      } catch (e) {
        console.error('Error processing result URL:', e);
      }
    });
  }

  return highlightedHtml;
}

function generateFullPagePreview(
  allResults: SerpApiResult[],
  matchedPositions: Set<number>,
  searchType: string,
  keyword: string,
  isImageSearch: boolean = false
): string {
  const highlightKeyword = (text: string, keyword: string) => {
    if (!text) return '';
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(
      regex,
      '<mark style="background-color: #ffeb3b; padding: 2px 4px; border-radius: 2px;">$1</mark>'
    );
  };

  const getHighlightColor = (searchType: string) => {
    switch (searchType) {
      // Negative highlighting - RED
      case 'exact_url_match':
        return '#f44336'; // Red
      case 'negative_sentiment':
        return '#f44336'; // Red
      case 'keyword_match':
        return '#f44336'; // Red
      // Positive highlighting - GREEN
      case 'positive_url_match':
        return '#4caf50'; // Green
      case 'positive_sentiment':
        return '#4caf50'; // Green
      case 'positive_keyword_match':
        return '#4caf50'; // Green
      default:
        return '#f44336'; // Red (default to red for negative results)
    }
  };

  const color = getHighlightColor(searchType);

  if (!allResults || allResults.length === 0) {
    return `
      <div style="font-family: arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: white;">
        <p style="text-align: center; color: #70757a; font-size: 14px;">No results found</p>
      </div>
    `;
  }

  const resultsHtml = allResults
    .map((result, index) => {
      const isMatched = matchedPositions.has(result.position);
      const highlightStyle = isMatched
        ? `
      border: 3px solid ${color}; 
      border-radius: 8px; 
      padding: 12px;
      margin: 16px 0;
      background: rgba(255, 235, 59, 0.05);
    `
        : `
      padding: 12px 0;
      margin: 16px 0;
    `;

      // Image search layout
      if (isImageSearch) {
        // Use a proxy or fallback approach for images
        const imageUrl = result.link;
        const fallbackImageUrl = `data:image/svg+xml;charset=UTF-8,%3csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='%23f0f0f0'/%3e%3ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='14' fill='%23666' text-anchor='middle' dominant-baseline='middle'%3eImage%3c/text%3e%3c/svg%3e`;
        
        return `
        <div style="${highlightStyle} display: inline-block; width: 200px; margin: 8px; vertical-align: top;">
          <div style="position: relative; width: 100%; height: 200px; background: #f0f0f0; border-radius: 4px; overflow: hidden; ${isMatched ? 'border: 3px solid ' + color + ' !important;' : 'border: 1px solid #e0e0e0;'}">
            <img src="${imageUrl}" 
                 alt="${result.title || 'Image'}"
                 style="
                   width: 100%; 
                   height: 100%; 
                   object-fit: cover;
                   display: block;
                 "
                 onload="this.style.opacity='1';"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                 crossorigin="anonymous">
            <div style="
              display: none; 
              width: 100%; 
              height: 100%; 
              background: #f5f5f5; 
              align-items: center; 
              justify-content: center;
              color: #999;
              font-family: Arial, sans-serif;
              font-size: 12px;
              text-align: center;
              flex-direction: column;
            ">
              <div style="margin-bottom: 8px; font-size: 24px;">🖼️</div>
              <div>Image</div>
              <div>unavailable</div>
            </div>
          </div>
          <div style="padding: 8px 4px 0 4px;">
            <div style="color: #1a0dab; font-size: 12px; font-weight: 500; margin-bottom: 4px; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${result.title || 'Image'}
            </div>
            <div style="color: #006621; font-size: 11px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
              ${result.displayed_link || (result.link ? (() => { try { return new URL(result.link).hostname; } catch(e) { return 'Unknown source'; } })() : 'Unknown source')}
            </div>
          </div>
        </div>
        `;
      }

      // Regular search result layout
      return `
      <div style="${highlightStyle}">
        <h3 style="
          margin: 0 0 4px 0; 
          color: #1a0dab; 
          font-size: 20px; 
          font-weight: normal;
          line-height: 1.3;
        ">
          <a href="${result.link}" target="_blank" style="color: #1a0dab; text-decoration: none;">
            ${result.title}
          </a>
        </h3>
        
        <div style="color: #006621; font-size: 14px; margin-bottom: 4px;">
          ${result.displayed_link || new URL(result.link).hostname}
        </div>
        
        <div style="color: #545454; font-size: 14px; line-height: 1.4;">
          ${result.snippet || ''}
        </div>
      </div>
    `;
    })
    .join('');

  return `
    <div style="font-family: arial, sans-serif; padding: 15px; ${isImageSearch ? 'max-width: 1200px;' : 'max-width: 600px;'} margin: 0 auto; background: white;">
      <div style="margin-bottom: 25px;">
        <div style="color: #70757a; font-size: 13px; margin-bottom: 25px;">
          About ${allResults.length.toLocaleString()} results
        </div>
        <div style="${isImageSearch ? 'display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start;' : ''}">
          ${resultsHtml}
        </div>
      </div>
    </div>
  `;
}

// New combined highlighting function for both positive and negative matches
function addCombinedHighlighting(
  rawHtml: string,
  negativeMatches: SerpApiResult[],
  positiveMatches: SerpApiResult[],
  isImageSearch: boolean = false,
  searchTypeParam?: string
): string {
  console.log(`Adding combined highlighting for ${negativeMatches.length} negative and ${positiveMatches.length} positive matches`);

  let highlightedHtml = rawHtml;

  // Fix duplicate body tag issue by ensuring clean HTML structure
  if (highlightedHtml.includes('<body') && highlightedHtml.includes('<body')) {
    const bodyMatches = highlightedHtml.match(/<body[^>]*>/gi);
    if (bodyMatches && bodyMatches.length > 1) {
      console.log('Fixing duplicate body tags');
      highlightedHtml = highlightedHtml.replace(/<body[^>]*><body/gi, '<body');
    }
  }

  // Add CSS for both red and green highlights
  const css = `
    <style>
      .negative-result-highlight {
        border: 3px solid #f44336 !important;
        border-radius: 8px !important;
        padding: 8px !important;
        margin: 8px 0 !important;
        background: rgba(244, 67, 54, 0.05) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      }
      .positive-result-highlight {
        border: 3px solid #4caf50 !important;
        border-radius: 8px !important;
        padding: 8px !important;
        margin: 8px 0 !important;
        background: rgba(76, 175, 80, 0.05) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      }
    </style>
  `;

  // Insert CSS before the closing </head> tag or at the beginning
  if (highlightedHtml.includes('</head>')) {
    highlightedHtml = highlightedHtml.replace('</head>', css + '</head>');
  } else {
    highlightedHtml = css + highlightedHtml;
  }

  // Apply negative highlighting (RED)
  if (negativeMatches.length > 0) {
    console.log('Applying negative (red) highlighting...');
    highlightedHtml = applyHighlighting(highlightedHtml, negativeMatches, '#f44336', 'negative-result-highlight', isImageSearch, searchTypeParam);
  }

  // Apply positive highlighting (GREEN) 
  if (positiveMatches.length > 0) {
    console.log('Applying positive (green) highlighting...');
    highlightedHtml = applyHighlighting(highlightedHtml, positiveMatches, '#4caf50', 'positive-result-highlight', isImageSearch, searchTypeParam);
  }

  return highlightedHtml;
}

// Helper function to apply highlighting for a specific set of matches
function applyHighlighting(
  html: string,
  matches: SerpApiResult[],
  color: string,
  className: string,
  isImageSearch: boolean,
  searchTypeParam?: string
): string {
  let highlightedHtml = html;

  if (searchTypeParam === 'isch') {
    // Handle Google Images highlighting
    matches.forEach((result, index) => {
      try {
        console.log(`Adding image highlight for result ${index + 1}: ${result.title}`);
        
        const titleText = result.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const patterns = [
          new RegExp(`(<img[^>]*alt="[^"]*${titleText}[^"]*"[^>]*>)`, 'gi'),
          new RegExp(`(<div[^>]*>[^<]*${titleText}[^<]*</div>)`, 'gi')
        ];
        
        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, (match) => {
              highlightAdded = true;
              console.log(`Added image highlight style to result ${index + 1}`);
              return `<div class="${className}" style="border: 3px solid ${color} !important; border-radius: 8px !important; padding: 8px !important; margin: 8px !important; background: rgba(255, 235, 59, 0.05) !important; display: inline-block !important;">${match}</div>`;
            });
          }
        });
      } catch (error) {
        console.error(`Error highlighting image result ${index + 1}:`, error);
      }
    });
  } else if (searchTypeParam === 'shop') {
    // Handle Google Shopping highlighting
    matches.forEach((result, index) => {
      try {
        console.log(`Adding shopping highlight for result ${index + 1}: "${result.title}"`);
        
        const titleText = result.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const patterns = [
          new RegExp(`(<li[^>]*class="[^"]*I8iMf[^"]*"[^>]*>[\\s\\S]*?${titleText}[\\s\\S]*?</li>)`, 'gi'),
          new RegExp(`(<div[^>]*class="[^"]*(?:MtXiu|gkQHve|SsM98d|RmEs5b)[^"]*"[^>]*>[\\s\\S]*?${titleText}[\\s\\S]*?</div>)`, 'gi'),
        ];
        
        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, (match) => {
              highlightAdded = true;
              console.log(`Added shopping highlight style to result ${index + 1}`);
              return `<div class="${className}" style="border: 3px solid ${color} !important; border-radius: 8px !important; padding: 8px !important; margin: 8px !important; background: rgba(255, 235, 59, 0.05) !important; display: block !important;">${match}</div>`;
            });
          }
        });
      } catch (error) {
        console.error(`Error highlighting shopping result ${index + 1}:`, error);
      }
    });
  } else {
    // Handle regular search result highlighting
    matches.forEach((result, index) => {
      try {
        console.log(`Adding border highlight for result ${index + 1}: ${result.link}`);

        const escapedLink = result.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linkPattern = new RegExp(`(<a[^>]*href="[^"]*${escapedLink}[^"]*"[^>]*>)`, 'gi');

        let highlightAdded = false;
        highlightedHtml = highlightedHtml.replace(linkPattern, match => {
          if (!highlightAdded) {
            const highlightedLink = match.replace(
              '<a ',
              '<a style="display: block; border: 3px solid ' +
                color +
                ' !important; border-radius: 8px !important; padding: 8px !important; margin: 8px 0 !important; background: rgba(255, 235, 59, 0.05) !important;" '
            );
            highlightAdded = true;
            console.log(`Added highlight style to result ${index + 1}`);
            return highlightedLink;
          }
          return match;
        });
      } catch (e) {
        console.error('Error processing result URL:', e);
      }
    });
  }

  return highlightedHtml;
}

// New combined page preview generator
function generateCombinedPagePreview(
  allResults: SerpApiResult[],
  negativeMatchedPositions: Set<number>,
  positiveMatchedPositions: Set<number>,
  keyword: string,
  isImageSearch: boolean = false
): string {
  const highlightKeyword = (text: string, keyword: string) => {
    if (!text) return '';
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(
      regex,
      '<mark style="background-color: #ffeb3b; padding: 2px 4px; border-radius: 2px;">$1</mark>'
    );
  };

  if (!allResults || allResults.length === 0) {
    return `
      <div style="font-family: arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: white;">
        <p style="text-align: center; color: #70757a; font-size: 14px;">No results found</p>
      </div>
    `;
  }

  const resultsHtml = allResults
    .map((result, index) => {
      const isNegativeMatch = negativeMatchedPositions.has(result.position);
      const isPositiveMatch = positiveMatchedPositions.has(result.position);
      
      let highlightStyle = '';
      if (isNegativeMatch) {
        highlightStyle = 'border: 3px solid #f44336; border-radius: 8px; padding: 12px; margin: 16px 0; background: rgba(244, 67, 54, 0.05);';
      } else if (isPositiveMatch) {
        highlightStyle = 'border: 3px solid #4caf50; border-radius: 8px; padding: 12px; margin: 16px 0; background: rgba(76, 175, 80, 0.05);';
      } else {
        highlightStyle = 'margin: 16px 0;';
      }

      if (isImageSearch && result.title) {
        // For image search results, create image tiles
        const imageUrl = `https://via.placeholder.com/300x200/f0f0f0/666?text=${encodeURIComponent(result.title.substring(0, 20))}`;
        
        return `
        <div style="${highlightStyle} display: inline-block; width: 200px; margin: 8px; vertical-align: top;">
          <div style="position: relative; width: 100%; height: 200px; background: #f0f0f0; border-radius: 4px; overflow: hidden; ${isNegativeMatch ? 'border: 3px solid #f44336 !important;' : isPositiveMatch ? 'border: 3px solid #4caf50 !important;' : 'border: 1px solid #e0e0e0;'}">
            <img src="${imageUrl}" 
                 alt="${result.title || 'Image'}"
                 style="width: 100%; height: 100%; object-fit: cover; display: block;">
          </div>
          <div style="padding: 8px 4px; font-size: 12px; line-height: 1.3; color: #202124;">
            ${highlightKeyword(result.title || '', keyword)}
          </div>
        </div>
      `;
      }

      // Regular search result format
      return `
      <div style="${highlightStyle}">
        <div style="margin-bottom: 4px;">
          <div style="font-size: 14px; line-height: 1.3;">
            <a href="${result.link}" style="color: #1a0dab; text-decoration: none; font-size: 20px; font-weight: normal; line-height: 1.3; display: block; margin-bottom: 3px;">
              ${highlightKeyword(result.title, keyword)}
            </a>
          </div>
          <div style="font-size: 14px; color: #006621; margin-bottom: 3px;">
            ${result.displayed_link || new URL(result.link).hostname}
          </div>
        </div>
        <div style="font-size: 14px; color: #4d5156; line-height: 1.58; max-width: 600px;">
          ${highlightKeyword(result.snippet || '', keyword)}
        </div>
      </div>
    `;
    })
    .join('');

  return `
    <div style="font-family: arial, sans-serif; padding: 15px; ${isImageSearch ? 'max-width: 1200px;' : 'max-width: 600px;'} margin: 0 auto; background: white;">
      <div style="margin-bottom: 25px;">
        <div style="color: #70757a; font-size: 13px; margin-bottom: 25px;">
          About ${allResults.length.toLocaleString()} results
        </div>
        <div style="${isImageSearch ? 'display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start;' : ''}">
          ${resultsHtml}
        </div>
      </div>
    </div>
  `;
}
