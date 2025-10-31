import type { NextApiRequest, NextApiResponse } from 'next';
import Sentiment from 'sentiment';

interface SearchRequestBody {
  keyword: string;
  url?: string;
  location: string;
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
  error?: string;
  totalResults?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { keyword, url, location, screenshotType } = req.body as SearchRequestBody;

  // Basic input validation
  if (!keyword || !location || !screenshotType) {
    return res.status(400).json({
      error: 'Invalid input: keyword, location, and screenshotType are required.',
    });
  }

  if (screenshotType === 'exact_url_match' && !url) {
    return res.status(400).json({ error: 'URL is required for Exact URL Match.' });
  }

  // Check if SERPAPI_KEY is configured
  if (!process.env.SERPAPI_KEY) {
    return res.status(500).json({
      error: 'SerpAPI key not configured. Please set SERPAPI_KEY environment variable.',
    });
  }

  try {
    console.log(`Searching for: ${keyword} with type: ${screenshotType}`);

    // Call SerpAPI for Google search results
    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'google');
    serpApiUrl.searchParams.set('q', keyword);
    serpApiUrl.searchParams.set('location', location);
    serpApiUrl.searchParams.set('api_key', process.env.SERPAPI_KEY);
    serpApiUrl.searchParams.set('num', '20'); // Get up to 20 results

    const response = await fetch(serpApiUrl.toString());

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    const organicResults: SerpApiResult[] = data.organic_results || [];
    console.log(`Found ${organicResults.length} organic search results`);

    if (organicResults.length === 0) {
      return res.status(404).json({ error: 'No search results found.' });
    }

    // Process results based on search type
    let matchedResults: SerpApiResult[] = [];

    if (screenshotType === 'exact_url_match') {
      // Extract domain from user-provided URL
      let userDomain: string;
      try {
        userDomain = new URL(url!).hostname.replace(/^www\./, '');
      } catch (error) {
        return res.status(400).json({ error: 'Invalid URL provided.' });
      }

      console.log(`Looking for domain match: ${userDomain}`);

      matchedResults = organicResults.filter((result, index) => {
        try {
          const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
          const isMatch = resultDomain === userDomain || resultDomain.endsWith('.' + userDomain);
          console.log(`Result ${index + 1}: ${resultDomain} vs ${userDomain} - Match: ${isMatch}`);
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
            `Result ${index + 1}: Sentiment score ${resultSentiment.score} - Negative: ${isNegative}`
          );
          console.log(`Snippet: ${result.snippet.substring(0, 100)}...`);
          return isNegative;
        }
        return false;
      });
    } else if (screenshotType === 'keyword_match') {
      // Look for specific keyword in snippets
      matchedResults = organicResults.filter((result, index) => {
        const keywordInSnippet =
          result.snippet?.toLowerCase().includes(keyword.toLowerCase()) || false;
        const keywordInTitle = result.title?.toLowerCase().includes(keyword.toLowerCase()) || false;
        const isMatch = keywordInSnippet || keywordInTitle;

        console.log(`Result ${index + 1}: Keyword match - ${isMatch}`);
        if (isMatch) {
          console.log(`Title: ${result.title}`);
          console.log(`Snippet: ${result.snippet?.substring(0, 100)}...`);
        }
        return isMatch;
      });
    }

    console.log(`Found ${matchedResults.length} matching results for ${screenshotType}`);

    if (matchedResults.length === 0) {
      return res.status(404).json({
        error: `No matching results found for ${screenshotType}`,
        results: organicResults, // Return all results for debugging
        totalResults: organicResults.length,
      });
    }

    return res.status(200).json({
      matchedResults,
      results: organicResults, // Include all results for reference
      totalResults: organicResults.length,
    });
  } catch (error) {
    console.error('Error while searching:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
}
