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

interface SearchPageResult {
  organicResults: SerpApiResult[];
  rawHtmlUrl?: string;
  serpApiSearchId?: string;
}

const sentimentAnalyzer = new Sentiment();
const NEGATIVE_SENTIMENT_THRESHOLD = -2;
const POSITIVE_SENTIMENT_THRESHOLD = 2;

export async function runSearch({ user, request, startTime }: RunSearchParams): Promise<RunSearchResult> {
  console.log('Running search for:', request);
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

  let primaryPage: SearchPageResult;
  try {
    primaryPage = await fetchSearchPage({
      keyword,
      location,
      googleDomain,
      language,
      searchType,
      countryCode,
    });
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

  const additionalPages: SearchPageResult[] = [];
  if (includePage2) {
    try {
      const page2 = await fetchSearchPage({
        keyword,
        location,
        googleDomain,
        language,
        searchType,
        countryCode,
        startPage: 1,
      });
      additionalPages.push(page2);
    } catch (error) {
      console.warn('Error fetching page 2 results:', error);
    }
  }

  const organicResults = primaryPage.organicResults;
  const combinedOrganicResults = mergeOrganicResults([primaryPage, ...additionalPages]);
  const serpApiSearchId = primaryPage.serpApiSearchId;
  const rawHtmlUrl = primaryPage.rawHtmlUrl;
  const totalResultsCount = combinedOrganicResults.length;

  if (totalResultsCount === 0) {
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
    organicResults: combinedOrganicResults,
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
    const highlightOptions = {
      negativeKeywords: enableNegativeKeywords ? keywords : [],
      positiveKeywords: enablePositiveKeywords ? positiveKeywords : [],
    };
    const page1NegativeMatches = filterMatchesForResults(uniqueNegativeMatches, organicResults);
    const page1PositiveMatches = filterMatchesForResults(uniquePositiveMatches, organicResults);

    if (rawHtmlUrl) {
      const renderedHtml = await renderHtmlWithBrowser(rawHtmlUrl, { searchType });
      htmlPreview = addCombinedHighlighting(
        renderedHtml,
        page1NegativeMatches,
        page1PositiveMatches,
        isImageSearch,
        searchType,
        highlightOptions
      );
    }

    if (includePage2 && additionalPages.length > 0) {
      const [page2] = additionalPages;
      if (page2?.rawHtmlUrl) {
        const page2RenderedHtml = await renderHtmlWithBrowser(page2.rawHtmlUrl, { searchType });
        const page2NegativeMatches = filterMatchesForResults(uniqueNegativeMatches, page2.organicResults);
        const page2PositiveMatches = filterMatchesForResults(uniquePositiveMatches, page2.organicResults);

        page2HtmlPreview = addCombinedHighlighting(
          page2RenderedHtml,
          page2NegativeMatches,
          page2PositiveMatches,
          isImageSearch,
          searchType,
          highlightOptions
        );
      }
    }
  } catch (error) {
    console.warn('Error generating HTML preview:', error);
  }

  if (!htmlPreview) {
    const page1NegativeMatches = filterMatchesForResults(uniqueNegativeMatches, organicResults);
    const page1PositiveMatches = filterMatchesForResults(uniquePositiveMatches, organicResults);
    const negativeMatchedIds = new Set(page1NegativeMatches.map(result => result.position));
    const positiveMatchedIds = new Set(page1PositiveMatches.map(result => result.position));
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
        totalResults: totalResultsCount,
        htmlPreview,
        page2HtmlPreview: includePage2 ? page2HtmlPreview || undefined : undefined,
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
      totalResults: totalResultsCount,
      htmlPreview,
      page2HtmlPreview: includePage2 ? page2HtmlPreview : undefined,
      searchType: undefined,
      noMatches: undefined,
    },
    auditEntry,
  };
}

async function fetchSearchPage(params: {
  keyword: string;
  location?: string;
  googleDomain?: string;
  language?: string;
  searchType?: string;
  countryCode: string;
  startPage?: number;
}): Promise<SearchPageResult> {
  const { results, searchMetadata } = await fetchSerpResults(params);

  return {
    organicResults: results,
    rawHtmlUrl: searchMetadata?.rawHtmlUrl,
    serpApiSearchId: searchMetadata?.id,
  };
}

function mergeOrganicResults(pages: SearchPageResult[]): SerpApiResult[] {
  return pages.reduce<SerpApiResult[]>((accumulator, page) => {
    if (page && Array.isArray(page.organicResults) && page.organicResults.length > 0) {
      accumulator.push(...page.organicResults);
    }
    return accumulator;
  }, []);
}

function filterMatchesForResults(
  matches: SerpApiResult[],
  results: SerpApiResult[]
): SerpApiResult[] {
  if (!matches.length || !results.length) {
    return [];
  }

  const linkSet = new Set(results.map(result => result.link).filter(Boolean));
  const positionSet = new Set(
    results
      .map(result => result.position)
      .filter(position => typeof position === 'number' && Number.isFinite(position))
  );

  return matches.filter(match => {
    if (match.link && linkSet.has(match.link)) {
      return true;
    }

    if (typeof match.position === 'number' && Number.isFinite(match.position)) {
      return positionSet.has(match.position);
    }

    return false;
  });
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
      const { domain: normalizedDomain, error } = extractNormalizedDomain(urlToMatch);
      if (normalizedDomain) {
        userDomains.push(normalizedDomain);
      } else {
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
      return resultSentiment.score <= NEGATIVE_SENTIMENT_THRESHOLD;
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
      const { domain: normalizedDomain, error } = extractNormalizedDomain(urlToMatch);
      if (normalizedDomain) {
        userDomains.push(normalizedDomain);
      } else {
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
      return resultSentiment.score >= POSITIVE_SENTIMENT_THRESHOLD;
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

  const uniqueNegativeMatches = dedupeByLinkOrPosition(negativeMatches);
  const uniquePositiveMatches = dedupeByLinkOrPosition(positiveMatches);
  const allMatches = dedupeByLinkOrPosition([...uniqueNegativeMatches, ...uniquePositiveMatches]);

  return {
    uniqueNegativeMatches,
    uniquePositiveMatches,
    allMatches,
  };
}

function extractNormalizedDomain(urlLike: string | undefined): {
  domain: string | null;
  error?: Error;
} {
  if (!urlLike) {
    return { domain: null };
  }

  const trimmed = urlLike.trim();
  if (!trimmed) {
    return { domain: null };
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed);
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`;

  try {
    const hostname = new URL(candidate).hostname.replace(/^www\./, '');
    if (hostname && hostname.includes('.')) {
      return { domain: hostname };
    }

    return { domain: null, error: new TypeError('Invalid URL') };
  } catch (error) {
    return { domain: null, error: error as Error };
  }
}

function dedupeByLinkOrPosition(results: SerpApiResult[]): SerpApiResult[] {
  const seen = new Set<string>();

  return results.filter(result => {
    const linkKey = result.link ? `link:${result.link}` : null;
    const positionKey =
      typeof result.position === 'number' && Number.isFinite(result.position)
        ? `position:${result.position}`
        : null;
    const fallbackKey = `title:${result.title ?? ''}|snippet:${result.snippet ?? ''}`;
    const key = linkKey ?? positionKey ?? fallbackKey;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

