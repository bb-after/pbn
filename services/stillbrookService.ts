import Sentiment from 'sentiment';
import { createSubmission, StillbrookSubmission } from '../utils/stillbrook/submission';
import {
  addCombinedHighlighting,
  generateCombinedPagePreview,
  SerpApiResult,
} from '../utils/stillbrook/highlighting';
import { fetchSerpResults } from './serpApiClient';
import { renderHtmlWithBrowser } from '../utils/stillbrook/html-renderer';
import { AuthenticatedUser, SearchRequestBody, SearchResponse } from '../types/stillbrook';

interface RunSearchParams {
  user: AuthenticatedUser;
  request: SearchRequestBody & {
    country: string;
    countryCode: string;
  };
  startTime: number;
}

interface RunSearchResult {
  statusCode: number;
  response: SearchResponse;
  auditEntry: StillbrookSubmission;
}

const sentimentAnalyzer = new Sentiment();

export async function runSearch({ user, request, startTime }: RunSearchParams): Promise<RunSearchResult> {
  console.log('Running search for:', request);
  debugger;
    const {
    keyword,
    url,
    urls = [],
    keywords = [],
    positiveUrls = [],
    positiveKeywords = [],
    location,
    googleDomain,
    language = 'en',
    searchType,
    screenshotType,
    savedSearchId,
    includePage2,
    enableNegativeUrls,
    enableNegativeSentiment,
    enableNegativeKeywords,
    enablePositiveUrls,
    enablePositiveSentiment,
    enablePositiveKeywords,
    country,
    countryCode,
  } = request;

  let organicResults: SerpApiResult[] = [];
  let serpApiSearchId: string | undefined;
  let rawHtmlUrl: string | undefined;

  try {
    const serpResult = await fetchSerpResults({
      keyword,
      location,
      googleDomain,
      language,
      searchType,
      countryCode,
    });

    organicResults = serpResult.results;
    serpApiSearchId = serpResult.searchMetadata?.id;
    rawHtmlUrl = serpResult.searchMetadata?.rawHtmlUrl;
  } catch (error) {
    return buildErrorResult(
      error,
      user,
      {
        keyword,
        screenshotType,
        savedSearchId,
        urls,
        keywords,
        positiveUrls,
        positiveKeywords,
        location,
        language,
        country,
      },
      startTime
    );
  }

  if (organicResults.length === 0) {
    const processingTime = Date.now() - startTime;
    const auditEntry = createSubmission(
      user.id,
      user.username,
      user.email,
      keyword,
      screenshotType,
      savedSearchId,
      urls,
      keywords,
      positiveUrls,
      positiveKeywords,
      location,
      language,
      country,
      0,
      'no_results',
      'No search results found',
      serpApiSearchId,
      rawHtmlUrl,
      false,
      processingTime
    );

    return {
      statusCode: 404,
      response: {
        error: 'No search results found.',
        searchType: undefined,
        noMatches: undefined,
      },
      auditEntry,
    };
  }

  const {
    uniqueNegativeMatches,
    uniquePositiveMatches,
    allMatches,
  } = processHighlightMatches({
    organicResults,
    url,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    enableNegativeUrls,
    enableNegativeSentiment,
    enableNegativeKeywords,
    enablePositiveUrls,
    enablePositiveSentiment,
    enablePositiveKeywords,
  });

  let htmlPreview = '';
  let page2HtmlPreview = '';

  try {
    const isImageSearch = searchType === 'isch';

    if (includePage2) {
      const page2Result = await fetchSerpResults({
        keyword,
        location,
        googleDomain,
        language,
        searchType,
        countryCode,
        startPage: 1,
      });

      if (page2Result.searchMetadata?.rawHtmlUrl) {
        const page2RenderedHtml = await renderHtmlWithBrowser(page2Result.searchMetadata.rawHtmlUrl);
        page2HtmlPreview = addCombinedHighlighting(
          page2RenderedHtml,
          uniqueNegativeMatches,
          uniquePositiveMatches,
          isImageSearch,
          searchType,
          {
            negativeKeywords: enableNegativeKeywords ? keywords : [],
            positiveKeywords: enablePositiveKeywords ? positiveKeywords : [],
          }
        );
      }
    }

    if (rawHtmlUrl) {
      const renderedHtml = await renderHtmlWithBrowser(rawHtmlUrl);
      htmlPreview = addCombinedHighlighting(
        renderedHtml,
        uniqueNegativeMatches,
        uniquePositiveMatches,
        searchType === 'isch',
        searchType,
        {
          negativeKeywords: enableNegativeKeywords ? keywords : [],
          positiveKeywords: enablePositiveKeywords ? positiveKeywords : [],
        }
      );
    }
  } catch (error) {
    console.warn('Error generating HTML preview:', error);
  }

  if (!htmlPreview) {
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

  const processingTime = Date.now() - startTime;

  if (allMatches.length === 0) {
    const auditEntry = createSubmission(
      user.id,
      user.username,
      user.email,
      keyword,
      screenshotType,
      savedSearchId,
      urls,
      keywords,
      positiveUrls,
      positiveKeywords,
      location,
      language,
      country,
      0,
      'no_results',
      'No matching results found',
      serpApiSearchId,
      rawHtmlUrl,
      true,
      processingTime
    );

    return {
      statusCode: 200,
      response: {
        matchedResults: [],
        results: organicResults,
        totalResults: organicResults.length,
        htmlPreview: generateCombinedPagePreview(
          organicResults,
          new Set(),
          new Set(),
          keyword,
          searchType === 'isch'
        ),
        page2HtmlPreview: includePage2 ? '' : undefined,
        noMatches: true,
        searchType: 'combined',
      },
      auditEntry,
    };
  }

  const auditEntry = createSubmission(
    user.id,
    user.username,
    user.email,
    keyword,
    screenshotType,
    savedSearchId,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    location,
    language,
    country,
    allMatches.length,
    'success',
    undefined,
    serpApiSearchId,
    rawHtmlUrl,
    true,
    processingTime
  );

  return {
    statusCode: 200,
    response: {
      matchedResults: allMatches,
      results: organicResults,
      totalResults: organicResults.length,
      htmlPreview,
      page2HtmlPreview: includePage2 ? page2HtmlPreview : undefined,
      searchType: undefined,
      noMatches: undefined,
    },
    auditEntry,
  };
}

function buildErrorResult(
  error: unknown,
  user: AuthenticatedUser,
  context: {
    keyword: string;
    screenshotType: string;
    savedSearchId?: string;
    urls?: string[];
    keywords?: string[];
    positiveUrls?: string[];
    positiveKeywords?: string[];
    location?: string;
    language?: string;
    country: string;
  },
  startTime: number
): RunSearchResult {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const processingTime = Date.now() - startTime;

  const auditEntry = createSubmission(
    user.id,
    user.username,
    user.email,
    context.keyword,
    context.screenshotType,
    context.savedSearchId,
    context.urls,
    context.keywords,
    context.positiveUrls,
    context.positiveKeywords,
    context.location,
    context.language,
    context.country,
    0,
    'error',
    message,
    undefined,
    undefined,
    false,
    processingTime
  );

  return {
    statusCode: 500,
    response: {
      error: message,
      searchType: undefined,
      noMatches: undefined,
    },
    auditEntry,
  };
}

interface HighlightMatchParams {
  organicResults: SerpApiResult[];
  url?: string;
  urls?: string[];
  keywords?: string[];
  positiveUrls?: string[];
  positiveKeywords?: string[];
  enableNegativeUrls?: boolean;
  enableNegativeSentiment?: boolean;
  enableNegativeKeywords?: boolean;
  enablePositiveUrls?: boolean;
  enablePositiveSentiment?: boolean;
  enablePositiveKeywords?: boolean;
}

export function processHighlightMatches(params: HighlightMatchParams) {
  const {
    organicResults,
    url,
    urls = [],
    keywords = [],
    positiveUrls = [],
    positiveKeywords = [],
    enableNegativeUrls,
    enableNegativeSentiment,
    enableNegativeKeywords,
    enablePositiveUrls,
    enablePositiveSentiment,
    enablePositiveKeywords,
  } = params;

  let negativeMatches: SerpApiResult[] = [];
  let positiveMatches: SerpApiResult[] = [];

  if (enableNegativeUrls) {
    const urlsToMatch = urls.length > 0 ? urls : url ? [url] : [];
    const userDomains: string[] = [];

    for (const urlToMatch of urlsToMatch) {
      try {
        const domain = new URL(urlToMatch).hostname.replace(/^www\./, '');
        userDomains.push(domain);
      } catch (error) {
        console.warn('Invalid URL provided:', urlToMatch, error);
      }
    }

    const urlMatches = organicResults.filter(result => {
      try {
        const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
        return userDomains.some(
          userDomain => resultDomain === userDomain || resultDomain.endsWith('.' + userDomain)
        );
      } catch (error) {
        console.log(`Error parsing URL: ${result.link}`, error);
        return false;
      }
    });

    negativeMatches = [...negativeMatches, ...urlMatches];
  }

  if (enableNegativeSentiment) {
    const sentimentMatches = organicResults.filter(result => {
      const textToAnalyze = result.snippet || result.title;
      if (!textToAnalyze) {
        return false;
      }
      const resultSentiment = sentimentAnalyzer.analyze(textToAnalyze);
      return resultSentiment.score < 0;
    });

    negativeMatches = [...negativeMatches, ...sentimentMatches];
  }

  if (enableNegativeKeywords && keywords.length > 0) {
    const keywordMatches = organicResults.filter(result => {
      const resultText = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
      return keywords.some(kw => resultText.includes(kw.toLowerCase()));
    });

    negativeMatches = [...negativeMatches, ...keywordMatches];
  }

  if (enablePositiveUrls && positiveUrls.length > 0) {
    const userDomains: string[] = [];

    for (const urlToMatch of positiveUrls) {
      try {
        const domain = new URL(urlToMatch).hostname.replace(/^www\./, '');
        userDomains.push(domain);
      } catch (error) {
        console.warn('Invalid positive URL provided:', urlToMatch, error);
      }
    }

    const urlMatches = organicResults.filter(result => {
      try {
        const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
        return userDomains.some(
          userDomain => resultDomain === userDomain || resultDomain.endsWith('.' + userDomain)
        );
      } catch (error) {
        console.log(`Error parsing URL: ${result.link}`, error);
        return false;
      }
    });

    positiveMatches = [...positiveMatches, ...urlMatches];
  }

  if (enablePositiveSentiment) {
    const sentimentMatches = organicResults.filter(result => {
      const textToAnalyze = result.snippet || result.title;
      if (!textToAnalyze) {
        return false;
      }
      const resultSentiment = sentimentAnalyzer.analyze(textToAnalyze);
      return resultSentiment.score > 0;
    });

    positiveMatches = [...positiveMatches, ...sentimentMatches];
  }

  if (enablePositiveKeywords && positiveKeywords.length > 0) {
    const keywordMatches = organicResults.filter(result => {
      const resultText = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
      return positiveKeywords.some(kw => resultText.includes(kw.toLowerCase()));
    });

    positiveMatches = [...positiveMatches, ...keywordMatches];
  }

  const uniqueNegativeMatches = dedupeByPosition(negativeMatches);
  const uniquePositiveMatches = dedupeByPosition(positiveMatches);
  const allMatches = dedupeByPosition([...uniqueNegativeMatches, ...uniquePositiveMatches]);

  return {
    uniqueNegativeMatches,
    uniquePositiveMatches,
    allMatches,
  };
}

function dedupeByPosition(results: SerpApiResult[]): SerpApiResult[] {
  return results.filter((result, index, array) => index === array.findIndex(r => r.position === result.position));
}

