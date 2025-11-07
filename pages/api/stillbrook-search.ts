import type { NextApiRequest, NextApiResponse } from 'next';
import { validateUserToken } from './validate-user-token';
import { createSubmission, logStillbrookSubmission } from '../../utils/stillbrook/submission';
import { runSearch } from '../../services/stillbrookService';
import { AuthenticatedUser, SearchRequestBody, SearchResponse } from '../../types/stillbrook';
import { validateSearchInputs } from '../../utils/stillbrook/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', searchType: undefined, noMatches: undefined });
  }

  const {
    keyword,
    url,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    location,
    googleDomain,
    language,
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
  } = req.body as SearchRequestBody;
  
  // Extract country from googleDomain or use default
  const country = googleDomain?.split('.').pop() || 'us';

  const validationError = validateSearchInputs({
    keyword,
    url,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    location,
    googleDomain,
    language,
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
  });

  if (validationError) {
    return res.status(400).json({
      error: validationError,
      searchType: undefined,
      noMatches: undefined,
    });
  }

  const startTime = Date.now();
  const user = await validateUserToken(req);

  if (!user.isValid || !user.user_id) {
    return res.status(401).json({ error: 'Unauthorized', searchType: undefined, noMatches: undefined });
  }

  console.log(
    `Searching for: "${keyword}"${location ? ` in ${location}` : ''}${googleDomain ? ` on ${googleDomain}` : ''}${language ? ` (${language})` : ''}${searchType ? ` [${searchType}]` : ''} with type: ${screenshotType}`
  );

  let countryCode = 'us';
  if (googleDomain && googleDomain !== 'google.com') {
    const googleDomainsData = require('../../google-domains.json');
    const domainData = googleDomainsData.find((d: any) => d.domain === googleDomain);
    if (domainData) {
      countryCode = domainData.country_code;
    }
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.user_id,
    username: user.username,
    email: user.email,
  };

  const requestPayload = {
    keyword,
    url,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    location,
    googleDomain,
    language,
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
  };

  try {
    debugger;
    const result = await runSearch({
      user: authenticatedUser,
      request: requestPayload,
      startTime,
    });

    await logStillbrookSubmission(result.auditEntry);
    return res.status(result.statusCode).json(result.response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const processingTime = Date.now() - startTime;
    const auditEntry = createSubmission(
      authenticatedUser.id,
      authenticatedUser.username,
      authenticatedUser.email,
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
      'error',
      message,
      undefined,
      undefined,
      false,
      processingTime
    );
    await logStillbrookSubmission(auditEntry);

    return res.status(500).json({
      error: message,
      searchType: undefined,
      noMatches: undefined,
    });
  }
}
