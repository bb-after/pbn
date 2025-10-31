import axios from 'axios';
import { ahrefsApiKey } from '../config';

export interface AhrefsAIResponse {
  query: string;
  response_text: string;
  source: string; // e.g., 'chatgpt', 'perplexity', 'gemini', 'copilot'
  position: number;
  mention_type: string;
  mention_context: string;
  date: string;
  url?: string;
  traffic_value?: number;
  search_volume?: number;
}

export interface AhrefsBrandRadarResult {
  responses: AhrefsAIResponse[];
  total_responses: number;
  keyword_coverage: string[];
  ai_visibility_score?: number;
}

/**
 * Fetch AI responses from Ahrefs Brand Radar API
 * This searches for mentions of the keyword/brand across AI platforms
 */
export async function fetchAhrefsAIResponses(
  keyword: string,
  options: {
    limit?: number;
    sources?: string[]; // ['chatgpt', 'perplexity', 'gemini', 'copilot']
    dateFrom?: string; // YYYY-MM-DD format
    dateTo?: string; // YYYY-MM-DD format
    country?: string; // ISO country code, default 'US'
  } = {}
): Promise<AhrefsBrandRadarResult | null> {
  try {
    if (!ahrefsApiKey) {
      console.warn('AHREFS_API_KEY not configured - skipping Ahrefs Brand Radar data');
      return null;
    }

    const {
      limit = 100,
      sources = ['chatgpt', 'perplexity', 'gemini', 'copilot'],
      dateFrom,
      dateTo,
      country = 'US',
    } = options;

    console.log('Fetching Ahrefs Brand Radar data for keyword:', keyword);

    // Build query parameters - try different parameter formats
    const baseParams = {
      target: keyword,
      limit,
      country,
    };

    // Try different variations of the select parameter
    const paramVariations = [
      {
        ...baseParams,
        select: 'query,response_text,source,position,mention_type,mention_context,date,url,traffic_value,search_volume',
      },
      {
        ...baseParams,
        select: 'all', // Sometimes APIs accept 'all' for all fields
      },
      {
        ...baseParams,
        fields: 'query,response_text,source,position,mention_type,mention_context,date,url,traffic_value,search_volume', // alternative to select
      },
      {
        ...baseParams,
        // No select parameter - see if it's optional
      }
    ];


    // Try different endpoint and parameter combinations
    const possibleEndpoints = [
      'https://api.ahrefs.com/v3/brand-radar/ai-responses',
      'https://api.ahrefs.com/v3/brand-radar/ai_responses',
      'https://apiv2.ahrefs.com/brand-radar/ai-responses'  // fallback to v2
    ];

    let response;
    let lastError;
    let successfulConfig;
    
    // Try each endpoint with each parameter variation
    for (const endpoint of possibleEndpoints) {
      for (let i = 0; i < paramVariations.length; i++) {
        const testParams = { ...paramVariations[i] };
        
        // Add conditional parameters to each variation
        if (sources?.length > 0) {
          (testParams as any).sources = sources.join(',');
        }
        if (dateFrom) {
          (testParams as any).date_from = dateFrom;
        }
        if (dateTo) {
          (testParams as any).date_to = dateTo;
        }
        
        try {
          console.log(`Trying endpoint: ${endpoint} with param variation ${i + 1}`);
          console.log('Params:', testParams);
          
          response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${ahrefsApiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            params: testParams,
            timeout: 30000, // 30 second timeout
          });
          
          console.log(`Success with endpoint: ${endpoint} and param variation ${i + 1}`);
          successfulConfig = { endpoint, params: testParams };
          break; // Success, exit the inner loop
        } catch (endpointError) {
          lastError = endpointError;
          const status = axios.isAxiosError(endpointError) ? endpointError.response?.status : 'unknown';
          const errorData = axios.isAxiosError(endpointError) ? endpointError.response?.data : 'unknown';
          console.log(`Failed with endpoint ${endpoint} variation ${i + 1} (${status}):`, errorData);
          continue; // Try next variation
        }
      }
      
      if (response) {
        break; // Success, exit the outer loop
      }
    }

    if (!response) {
      console.error('All endpoint and parameter combinations failed. Last error:', lastError);
      throw lastError; // Throw the last error if all combinations failed
    }

    if (!response.data) {
      console.warn('No data returned from Ahrefs Brand Radar API');
      return null;
    }

    const data = response.data;
    console.log(
      `Ahrefs Brand Radar found ${data.responses?.length || 0} AI responses for "${keyword}"`
    );

    return {
      responses: data.responses || [],
      total_responses: data.total_responses || 0,
      keyword_coverage: data.keyword_coverage || [],
      ai_visibility_score: data.ai_visibility_score,
    };
  } catch (error) {
    console.error('Error fetching Ahrefs Brand Radar data:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('Ahrefs API authentication failed - check AHREFS_API_KEY');
      } else if (error.response?.status === 403) {
        console.error('Ahrefs API access forbidden - Enterprise plan may be required');
      } else if (error.response?.status === 429) {
        console.error('Ahrefs API rate limit exceeded');
      } else if (error.response?.status === 400) {
        console.error('Ahrefs API bad request error:', error.response?.data);
        console.error('This usually indicates incorrect parameters or missing required fields');
      } else {
        console.error('Ahrefs API error:', error.response?.status, error.response?.data);
      }
    }

    // Return null instead of throwing to not break the main analysis
    return null;
  }
}

/**
 * Format Ahrefs data for integration with geo-analysis results
 */
export function formatAhrefsDataForGeoAnalysis(
  ahrefsData: AhrefsBrandRadarResult
): {
  aiMentions: {
    source: string;
    mentions: number;
    sample_responses: string[];
    urls: string[];
  }[];
  totalAIMentions: number;
  aiVisibilityInsights: string[];
} {
  if (!ahrefsData || !ahrefsData.responses) {
    return {
      aiMentions: [],
      totalAIMentions: 0,
      aiVisibilityInsights: [],
    };
  }

  // Group responses by source
  const mentionsBySource: Record<string, AhrefsAIResponse[]> = {};
  ahrefsData.responses.forEach(response => {
    if (!mentionsBySource[response.source]) {
      mentionsBySource[response.source] = [];
    }
    mentionsBySource[response.source].push(response);
  });

  // Format for integration
  const aiMentions = Object.entries(mentionsBySource).map(([source, responses]) => ({
    source: source.charAt(0).toUpperCase() + source.slice(1),
    mentions: responses.length,
    sample_responses: responses
      .slice(0, 3)
      .map(r => r.response_text)
      .filter(text => text && text.length > 0),
    urls: responses
      .map(r => r.url)
      .filter(url => url)
      .slice(0, 5) as string[],
  }));

  // Generate insights
  const insights: string[] = [];
  const totalMentions = ahrefsData.responses.length;

  if (totalMentions > 0) {
    insights.push(`Found ${totalMentions} mentions across AI platforms`);

    const topSource = aiMentions.reduce((max, current) =>
      current.mentions > max.mentions ? current : max
    );
    if (topSource.mentions > 0) {
      insights.push(`Most mentioned on ${topSource.source} (${topSource.mentions} mentions)`);
    }

    if (ahrefsData.ai_visibility_score) {
      insights.push(`AI visibility score: ${ahrefsData.ai_visibility_score}/100`);
    }

    const sourcesCount = aiMentions.length;
    if (sourcesCount > 1) {
      insights.push(`Visible across ${sourcesCount} different AI platforms`);
    }
  } else {
    insights.push('No recent mentions found in AI platforms');
    insights.push('Consider improving content strategy for AI visibility');
  }

  return {
    aiMentions,
    totalAIMentions: totalMentions,
    aiVisibilityInsights: insights,
  };
}