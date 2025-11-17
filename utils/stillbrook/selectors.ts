export interface HighlightSelectors {
  containerClass: string;
  linkClass: string;
  dataAttributes?: string[]; // Additional data attributes to target
  additionalClasses?: string[]; // Additional CSS classes to target
}

export const DEFAULT_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'MjjYud',
  linkClass: 'zReHs',
  dataAttributes: ['data-rpos'], // Regular Google search results
  additionalClasses: ['b2Rnsc', 'related-question-pair'], // Additional classes like qR29te
};

export const NEWS_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'SoaBEf',
  linkClass: 'WlydOe',
  dataAttributes: ['data-news-doc-id'], // Support for news doc IDs
  additionalClasses: ['qR29te', 'related-question-pair'], // Additional classes like qR29te
};

export const IMAGE_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'WghbWd',
  linkClass: 'zReHs',
  dataAttributes: ['data-ref-docid'], // Support for images universal
  additionalClasses: [],
};

export const VIDEO_HIGHLIGHT_SELECTORS: HighlightSelectors = {
  containerClass: 'pKB8Bc',
  linkClass: 'pKB8Bc',
  dataAttributes: [''], // Support for news doc IDs
  additionalClasses: ['pKB8Bc'], // Additional classes like qR29te
};

export const EXCLUDED_CONTAINER_WRAPPER_CLASS = 'ULSxyf';

const SEARCH_TYPE_HIGHLIGHT_SELECTORS: Record<string, HighlightSelectors> = {
  nws: NEWS_HIGHLIGHT_SELECTORS,
  isch: IMAGE_HIGHLIGHT_SELECTORS,
  vid: VIDEO_HIGHLIGHT_SELECTORS,
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

