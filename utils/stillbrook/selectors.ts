export interface HighlightSelectors {
  containerClass: string;
  linkClass: string;
  dataAttributes?: string[]; // Additional data attributes to target
  additionalClasses?: string[]; // Additional CSS classes to target
}

export const DEFAULT_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'MjjYud',
  linkClass: 'zReHs',
  dataAttributes: ['data-news-doc-id'], // Support for news doc IDs
  additionalClasses: ['b2Rnsc'], // Additional classes like qR29te
};

export const NEWS_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'SoaBEf',
  linkClass: 'WlydOe',
  dataAttributes: ['data-news-doc-id'], // Support for news doc IDs
  additionalClasses: ['qR29te'], // Additional classes like qR29te
};

export const IMAGE_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'WghbWd',
  linkClass: 'zReHs',
  dataAttributes: ['data-attrid="images universal"'], // Support for images universal
  additionalClasses: [],
};

export const EXCLUDED_CONTAINER_WRAPPER_CLASS = 'ULSxyf';

const SEARCH_TYPE_HIGHLIGHT_SELECTORS: Record<string, HighlightSelectors> = {
  nws: NEWS_HIGHLIGHT_SELECTORS,
  isch: IMAGE_HIGHLIGHT_SELECTORS,
};

export function getHighlightSelectors(searchType?: string): HighlightSelectors {
  console.log('getHighlightdSelectors', searchType);
  console.log('SEARCH_TYPE_HIGHLIGHT_SELECTORS', SEARCH_TYPE_HIGHLIGHT_SELECTORS);
  if (searchType && SEARCH_TYPE_HIGHLIGHT_SELECTORS[searchType]) {
    console.log('SEARCH_TYPE_HIGHLIGHT_SELECTORS[searchType]', SEARCH_TYPE_HIGHLIGHT_SELECTORS[searchType]);
    return SEARCH_TYPE_HIGHLIGHT_SELECTORS[searchType];
  }

  return DEFAULT_HIGHLIGHT_SELECTORS;
}

