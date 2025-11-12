import { Box, Typography, Chip } from '@mui/material';

interface SearchCriteriaDisplayProps {
  searchQuery: string;
  searchType?: string;
  urls?: string[];
  keywords?: string[];
  positiveUrls?: string[];
  positiveKeywords?: string[];
  location?: string;
  language?: string;
  googleDomain?: string;
  enableNegativeUrls: boolean;
  enableNegativeSentiment: boolean;
  enableNegativeKeywords: boolean;
  enablePositiveUrls: boolean;
  enablePositiveSentiment: boolean;
  enablePositiveKeywords: boolean;
}

const SearchCriteriaDisplay = ({
  searchQuery,
  searchType,
  urls = [],
  keywords = [],
  positiveUrls = [],
  positiveKeywords = [],
  location,
  language,
  googleDomain,
  enableNegativeUrls,
  enableNegativeSentiment,
  enableNegativeKeywords,
  enablePositiveUrls,
  enablePositiveSentiment,
  enablePositiveKeywords,
}: SearchCriteriaDisplayProps) => {
  const getHighlightChips = () => {
    const negativeHighlights = [];
    const positiveHighlights = [];

    if (enableNegativeUrls) negativeHighlights.push('URLs');
    if (enableNegativeSentiment) negativeHighlights.push('Sentiment');
    if (enableNegativeKeywords) negativeHighlights.push('Keywords');

    if (enablePositiveUrls) positiveHighlights.push('URLs');
    if (enablePositiveSentiment) positiveHighlights.push('Sentiment');
    if (enablePositiveKeywords) positiveHighlights.push('Keywords');

    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        {negativeHighlights.map(highlight => (
          <Chip
            key={`neg-${highlight}`}
            label={`🔴 ${highlight}`}
            size="small"
            variant="outlined"
            color="error"
          />
        ))}
        {positiveHighlights.map(highlight => (
          <Chip
            key={`pos-${highlight}`}
            label={`🟢 ${highlight}`}
            size="small"
            variant="outlined"
            color="success"
          />
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        🔍 Search Criteria
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Query:</strong> &quot;{searchQuery}&quot;
        </Typography>

        {searchType && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Search Type:</strong>{' '}
            {searchType === 'isch'
              ? 'Images'
              : searchType === 'nws'
                ? 'News'
                : searchType === 'shop'
                  ? 'Shopping'
                  : 'Web'}
          </Typography>
        )}

        {location && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Location:</strong> {location}
          </Typography>
        )}

        {language && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Language:</strong> {language}
          </Typography>
        )}

        {googleDomain && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Google Domain:</strong> {googleDomain}
          </Typography>
        )}

        {/* Show negative search criteria */}
        {urls && urls.filter(url => url.trim()).length > 0 && (
          <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
            🔴 <strong>Negative URLs:</strong> {urls.filter(url => url.trim()).join(', ')}
          </Typography>
        )}

        {keywords && keywords.filter(keyword => keyword.trim()).length > 0 && (
          <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
            🔴 <strong>Negative Keywords:</strong>{' '}
            {keywords.filter(keyword => keyword.trim()).join(', ')}
          </Typography>
        )}

        {/* Show positive search criteria */}
        {positiveUrls && positiveUrls.filter(url => url.trim()).length > 0 && (
          <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
            🟢 <strong>Positive URLs:</strong> {positiveUrls.filter(url => url.trim()).join(', ')}
          </Typography>
        )}

        {positiveKeywords && positiveKeywords.filter(keyword => keyword.trim()).length > 0 && (
          <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
            🟢 <strong>Positive Keywords:</strong>{' '}
            {positiveKeywords.filter(keyword => keyword.trim()).join(', ')}
          </Typography>
        )}
      </Box>

      {getHighlightChips()}
    </Box>
  );
};

export default SearchCriteriaDisplay;
