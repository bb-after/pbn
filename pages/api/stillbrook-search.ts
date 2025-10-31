import type { NextApiRequest, NextApiResponse } from 'next';
import Sentiment from 'sentiment';
import puppeteer from 'puppeteer';
import { query } from '../../lib/db';

interface SearchRequestBody {
  keyword: string;
  url?: string;
  urls?: string[];
  keywords?: string[];
  location?: string;
  googleDomain?: string;
  language?: string;
  searchType?: string;
  screenshotType: string;
}

interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
}

interface SearchResponse {
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
  urls?: string[];
  keywords?: string[];
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
  urls?: string[],
  keywords?: string[],
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
    urls: urls,
    keywords: keywords,
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
        user_id, username, email, search_query, search_type, urls, keywords,
        location, language, country, matched_results_count, status, error_message,
        serpapi_search_id, raw_html_url, has_highlighted_content, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      submission.user_id,
      submission.username,
      submission.email,
      submission.search_query,
      submission.search_type,
      submission.urls ? JSON.stringify(submission.urls) : null,
      submission.keywords ? JSON.stringify(submission.keywords) : null,
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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    keyword,
    url,
    urls,
    keywords,
    location,
    googleDomain,
    language,
    searchType,
    screenshotType,
  } = req.body as SearchRequestBody;
  
  // Extract country from googleDomain or use default
  const country = googleDomain?.split('.').pop() || 'us';

  // Basic input validation
  if (!keyword || !screenshotType) {
    return res.status(400).json({
      error: 'Invalid input: keyword and screenshotType are required.',
    });
  }

  if (screenshotType === 'exact_url_match' && !url && (!urls || urls.length === 0)) {
    return res.status(400).json({ error: 'URL or URLs are required for Exact URL Match.' });
  }

  // Extract user information and start timing
  const startTime = Date.now();
  const user = await getUserFromRequest(req);
  
  // Check if SERPAPI_KEY is configured
  if (!process.env.SERP_API_KEY) {
    return res.status(500).json({
      error: 'SerpAPI key not configured. Please set SERPAPI_KEY environment variable.',
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
        user, keyword, screenshotType, urls, keywords, location, language, country,
        0, 'error', `SerpAPI error: ${data.error}`, serpApiSearchId, rawHtmlUrl, false, processingTime
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
    } else {
      // For regular search, use organic_results
      organicResults = data.organic_results || [];
      console.log(`Found ${organicResults.length} organic search results`);
    }

    if (organicResults.length === 0) {
      const processingTime = Date.now() - startTime;
      const submission = createSubmission(
        user, keyword, screenshotType, urls, keywords, location, language, country,
        0, 'no_results', 'No search results found', serpApiSearchId, rawHtmlUrl, false, processingTime
      );
      await logStillbrookSubmission(submission);
      return res.status(404).json({ error: 'No search results found.' });
    }

    // Process results based on search type
    let matchedResults: SerpApiResult[] = [];
    console.log('ORGGG', organicResults);

    if (screenshotType === 'exact_url_match') {
      // Extract domains from user-provided URLs and find matches in search results
      const urlsToMatch = urls && urls.length > 0 ? urls : url ? [url] : [];
      const userDomains: string[] = [];

      for (const urlToMatch of urlsToMatch) {
        try {
          const domain = new URL(urlToMatch).hostname.replace(/^www\./, '');
          userDomains.push(domain);
        } catch (error) {
          return res.status(400).json({ error: `Invalid URL provided: ${urlToMatch}` });
        }
      }

      console.log(`Looking for domain matches: ${userDomains.join(', ')}`);

      matchedResults = organicResults.filter((result, index) => {
        try {
          const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
          const isMatch = userDomains.some(
            userDomain => resultDomain === userDomain || resultDomain.endsWith('.' + userDomain)
          );
          console.log(
            `Result ${index + 1}: ${resultDomain} vs [${userDomains.join(', ')}] - Match: ${isMatch}`
          );
          return isMatch;
        } catch (e) {
          console.log(`Error parsing URL: ${result.link}`, e);
          return false;
        }
      });
    } else if (screenshotType === 'negative_sentiment') {
      // Analyze sentiment of snippets
      const sentiment = new Sentiment();

      matchedResults = organicResults.filter((result, index) => {
        if (result.snippet) {
          const resultSentiment = sentiment.analyze(result.snippet);
          const isNegative = resultSentiment.score < 0;
          console.log(
            `Result ${index + 1}: "${result.title}" - Sentiment: ${resultSentiment.score} (${isNegative ? 'NEGATIVE' : 'positive/neutral'})`
          );
          if (isNegative) {
            console.log(`  Snippet: ${result.snippet.substring(0, 150)}...`);
          }
          return isNegative;
        }
        return false;
      });
    } else if (screenshotType === 'keyword_match') {
      // Look for specific keywords in snippets and titles
      const keywordsToMatch = keywords && keywords.length > 0 ? keywords : [];

      if (keywordsToMatch.length === 0) {
        console.log('No keywords provided for keyword match');
        matchedResults = [];
      } else {
        console.log(`Looking for keyword matches: ${keywordsToMatch.join(', ')}`);

        matchedResults = organicResults.filter((result, index) => {
          const resultText = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();

          const matchedKeywords = keywordsToMatch.filter(kw =>
            resultText.includes(kw.toLowerCase())
          );

          const isMatch = matchedKeywords.length > 0;

          console.log(`Result ${index + 1}: "${result.title}" - Keywords match: ${isMatch}`);
          if (isMatch) {
            console.log(`  Matched keywords: ${matchedKeywords.join(', ')}`);
            console.log(`  Snippet: ${result.snippet?.substring(0, 150)}...`);
          }
          return isMatch;
        });
      }
    }

    console.log(`Found ${matchedResults.length} matching results for ${screenshotType}`);

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
          htmlPreview = addCleanHighlighting(renderedHtml, matchedResults, screenshotType, isImageSearch);
        } else {
          console.error('Failed to fetch raw HTML:', htmlResponse.status);
          // Fallback to custom generated preview
          const matchedIds = new Set(matchedResults.map(result => result.position));
          const isImageSearch = searchType === 'isch';
          htmlPreview = generateFullPagePreview(
            organicResults,
            matchedIds,
            screenshotType,
            keyword,
            isImageSearch
          );
        }
      } catch (error) {
        console.error('Error fetching raw HTML:', error);
        // Fallback to custom generated preview
        const matchedIds = new Set(matchedResults.map(result => result.position));
        const isImageSearch = searchType === 'isch';
        htmlPreview = generateFullPagePreview(organicResults, matchedIds, screenshotType, keyword, isImageSearch);
      }
    } else {
      console.log('No raw HTML file available, using custom preview');
      // Fallback to custom generated preview
      const matchedIds = new Set(matchedResults.map(result => result.position));
      const isImageSearch = searchType === 'isch';
      htmlPreview = generateFullPagePreview(organicResults, matchedIds, screenshotType, keyword, isImageSearch);
    }

    if (matchedResults.length === 0) {
      const processingTime = Date.now() - startTime;
      const submission = createSubmission(
        user, keyword, screenshotType, urls, keywords, location, language, country,
        0, 'no_results', `No matching results found for ${screenshotType}`, serpApiSearchId, rawHtmlUrl, true, processingTime
      );
      await logStillbrookSubmission(submission);
      
      return res.status(404).json({
        error: `No matching results found for ${screenshotType}`,
        results: organicResults, // Return all results for debugging
        totalResults: organicResults.length,
        htmlPreview: generateFullPagePreview(organicResults, new Set(), 'no_matches', keyword, searchType === 'isch'),
      });
    }

    // Log successful submission
    const processingTime = Date.now() - startTime;
    const submission = createSubmission(
      user, keyword, screenshotType, urls, keywords, location, language, country,
      matchedResults.length, 'success', undefined, serpApiSearchId, rawHtmlUrl, true, processingTime
    );
    await logStillbrookSubmission(submission);

    return res.status(200).json({
      matchedResults,
      results: organicResults, // Include all results for reference
      totalResults: organicResults.length,
      htmlPreview,
    });
  } catch (error) {
    console.error('Error while searching:', error);
    
    // Log error submission
    const processingTime = Date.now() - startTime;
    const submission = createSubmission(
      user, keyword, screenshotType, urls, keywords, location, language, country,
      0, 'error', error instanceof Error ? error.message : 'Internal Server Error', undefined, undefined, false, processingTime
    );
    await logStillbrookSubmission(submission);
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}

async function renderHtmlWithBrowser(rawHtmlUrl: string): Promise<string> {
  console.log('Starting headless browser to render HTML with JavaScript execution...');

  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
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

    // Wait a bit more for any lazy loading to complete
    await new Promise<void>(resolve => setTimeout(resolve, 3000));

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
  isImageSearch: boolean = false
): string {
  const getHighlightColor = (searchType: string) => {
    switch (searchType) {
      case 'exact_url_match':
        return '#4caf50'; // Green
      case 'negative_sentiment':
        return '#f44336'; // Red
      case 'keyword_match':
        return '#ff9800'; // Orange
      default:
        return '#2196f3'; // Blue
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

  // Handle image search highlighting differently
  if (isImageSearch) {
    matchedResults.forEach((result, index) => {
      try {
        console.log(`Adding image highlight for result ${index + 1}: ${result.link}`);
        
        // For Google Images, we need to find image containers and data attributes
        // Google Images uses data-src attributes and specific container patterns
        const imageUrl = result.link;
        const escapedImageUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Look for various patterns that Google Images might use:
        // 1. Direct image src
        // 2. Data attributes like data-src, data-iurl
        // 3. Container divs that might wrap images
        const patterns = [
          // Image tags with src matching
          new RegExp(`(<img[^>]*src="[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi'),
          // Image tags with data-src matching  
          new RegExp(`(<img[^>]*data-src="[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi'),
          // Divs or containers that might contain this image URL in data attributes
          new RegExp(`(<div[^>]*data-[^>]*"[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi'),
          // Generic containers with the image URL in any attribute
          new RegExp(`(<[^>]*[^>]*"[^"]*${escapedImageUrl}[^"]*"[^>]*>)`, 'gi')
        ];
        
        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, (match) => {
              // Add a wrapper div with highlighting around the matched element
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
      case 'exact_url_match':
        return '#4caf50'; // Green
      case 'negative_sentiment':
        return '#f44336'; // Red
      case 'keyword_match':
        return '#ff9800'; // Orange
      default:
        return '#2196f3'; // Blue
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
        return `
        <div style="${highlightStyle} display: inline-block; width: 200px; margin: 8px;">
          <a href="${result.link}" target="_blank" style="text-decoration: none;">
            <img src="${result.link}" 
                 alt="${result.title || 'Image'}"
                 style="
                   width: 100%; 
                   height: 200px; 
                   object-fit: cover; 
                   border-radius: 4px;
                   ${isMatched ? 'border: 3px solid ' + color + ' !important;' : ''}
                 "
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="
              display: none; 
              width: 100%; 
              height: 200px; 
              background: #f0f0f0; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              color: #666;
              border-radius: 4px;
              ${isMatched ? 'border: 3px solid ' + color + ' !important;' : ''}
            ">
              Image unavailable
            </div>
          </a>
          <div style="padding: 8px 0;">
            <div style="color: #1a0dab; font-size: 13px; font-weight: 500; margin-bottom: 2px;">
              ${result.title || 'Image'}
            </div>
            <div style="color: #006621; font-size: 12px;">
              ${result.displayed_link || (result.link ? new URL(result.link).hostname : '')}
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
