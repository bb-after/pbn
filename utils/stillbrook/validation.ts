import { SearchRequestBody } from '../../types/stillbrook';

export function validateSearchInputs(request: SearchRequestBody) {
  const {
    keyword,
    screenshotType,
    url,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
  } = request;

  if (!keyword || !screenshotType) {
    return 'Invalid input: keyword and screenshotType are required.';
  }

  if (screenshotType === 'exact_url_match' && !url && (!urls || urls.length === 0)) {
    return 'URL or URLs are required for Exact URL Match.';
  }

  if (screenshotType === 'positive_url_match' && (!positiveUrls || positiveUrls.length === 0)) {
    return 'URLs are required for Positive URL Match.';
  }

  if (screenshotType === 'keyword_match' && (!keywords || keywords.length === 0)) {
    return 'Keywords are required for Keyword Match.';
  }

  if (screenshotType === 'positive_keyword_match' && (!positiveKeywords || positiveKeywords.length === 0)) {
    return 'Keywords are required for Positive Keyword Match.';
  }

  return null;
}







