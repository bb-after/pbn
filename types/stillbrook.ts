export interface SearchRequestBody {
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
  savedSearchId?: string;
  includePage2?: boolean;
  enableNegativeUrls?: boolean;
  enableNegativeSentiment?: boolean;
  enableNegativeKeywords?: boolean;
  enablePositiveUrls?: boolean;
  enablePositiveSentiment?: boolean;
  enablePositiveKeywords?: boolean;
}

import { SerpApiResult } from '../utils/stillbrook/highlighting';

export interface SearchResponse {
  results?: SerpApiResult[];
  matchedResults?: SerpApiResult[];
  htmlPreview?: string;
  page2HtmlPreview?: string;
  error?: string;
  totalResults?: number;
  searchType: any;
  noMatches: any;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
}

