import { SerpApiResult } from '../utils/stillbrook/highlighting';

interface SerpApiParams {
  keyword: string;
  location?: string;
  googleDomain?: string;
  language?: string;
  searchType?: string;
  countryCode?: string;
  startPage?: number;
}

interface SerpApiResponse {
  search_metadata?: {
    id?: string;
    raw_html_file?: string;
  };
  error?: string;
  organic_results?: SerpApiResult[];
  news_results?: any[];
  images_results?: any[];
  video_results?: any[];
  shopping_results?: any[];
}

export async function fetchSerpResults(params: SerpApiParams): Promise<{
  results: SerpApiResult[];
  searchMetadata?: {
    id?: string;
    rawHtmlUrl?: string;
  };
  error?: string;
}> {
  const {
    keyword,
    location,
    googleDomain,
    language = 'en',
    searchType,
    countryCode = 'us',
    startPage = 0
  } = params;

  // Check if SERPAPI_KEY is configured
  if (!process.env.SERP_API_KEY) {
    throw new Error('SerpAPI key not configured. Please set SERPAPI_KEY environment variable.');
  }

  // Construct SerpAPI URL
  const serpApiUrl = new URL('https://serpapi.com/search');
  serpApiUrl.searchParams.set('engine', 'google');
  serpApiUrl.searchParams.set('q', keyword);
  if (location) {
    serpApiUrl.searchParams.set('location', location);
  }
  serpApiUrl.searchParams.set('gl', countryCode);
  if (googleDomain) {
    serpApiUrl.searchParams.set('google_domain', googleDomain);
  }
  serpApiUrl.searchParams.set('hl', language);
  if (searchType) {
    serpApiUrl.searchParams.set('tbm', searchType);
  }
  serpApiUrl.searchParams.set('api_key', process.env.SERP_API_KEY!);
  serpApiUrl.searchParams.set('num', '10');
  
  if (startPage > 0) {
    serpApiUrl.searchParams.set('start', (startPage * 10).toString());
  }

  // Execute fetch
  const response = await fetch(serpApiUrl.toString());

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status} - ${response.statusText}`);
  }

  const data: SerpApiResponse = await response.json();

  // Check for API errors
  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  // Map responses to SerpApiResult[] based on search type
  const mappedResults = mapSerpResponseToResults(data, searchType);

  return {
    results: mappedResults,
    searchMetadata: {
      id: data.search_metadata?.id,
      rawHtmlUrl: data.search_metadata?.raw_html_file
    }
  };
}

function mapSerpResponseToResults(data: SerpApiResponse, searchType?: string): SerpApiResult[] {
  let results: SerpApiResult[] = [];

  if (searchType === 'nws' && data.news_results) {
    // Map news results
    results = data.news_results.map((newsResult: any, index: number) => ({
      position: newsResult.position || index + 1,
      title: newsResult.title || '',
      link: newsResult.link || '',
      snippet: newsResult.snippet || '',
      displayed_link: newsResult.source || '',
    }));
    console.log(`Found ${results.length} news search results`);
  } else if (searchType === 'isch' && data.images_results) {
    // Map image results
    results = data.images_results.map((imageResult: any, index: number) => ({
      position: imageResult.position || index + 1,
      title: imageResult.title || '',
      link: imageResult.link || imageResult.original || '',
      snippet: imageResult.snippet || '',
      displayed_link: imageResult.source || '',
    }));
    console.log(`Found ${results.length} image search results`);
  } else if (searchType === 'vid' && data.video_results) {
    // Map video results
    results = data.video_results.map((videoResult: any, index: number) => ({
      position: videoResult.position || index + 1,
      title: videoResult.title || '',
      link: videoResult.link || '',
      snippet: videoResult.snippet || '',
      displayed_link: videoResult.displayed_link || '',
    }));
    console.log(`Found ${results.length} video search results`);
  } else if (searchType === 'shop' && data.shopping_results) {
    // Map shopping results
    results = data.shopping_results.map((shopResult: any, index: number) => ({
      position: shopResult.position || index + 1,
      title: shopResult.title || '',
      link: shopResult.link || '',
      snippet: shopResult.snippet || shopResult.price || '',
      displayed_link: shopResult.source || '',
    }));
    console.log(`Found ${results.length} shopping search results`);
  } else {
    // Map organic results (default)
    results = data.organic_results || [];
    console.log(`Found ${results.length} organic search results`);
  }

  return results;
}