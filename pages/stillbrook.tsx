import { useState, useEffect } from 'react';
import {
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Typography,
  Box,
  Stack,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { IntercomLayout, ToastProvider, IntercomCard, IntercomButton } from '../components/ui';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import useValidateUserToken from '../hooks/useValidateUserToken';
import Image from 'next/image';
import googleDomainsData from '../google-domains.json';
import html2canvas from 'html2canvas';

interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
}

interface SearchResult {
  results?: SerpApiResult[];
  matchedResults?: SerpApiResult[];
  htmlPreview?: string;
  error?: string;
  totalResults?: number;
  // Legacy support
  screenshot?: string;
}

interface GoogleDomain {
  domain: string;
  language_code: string;
  country_code: string;
  country_name: string;
}

interface GoogleLanguage {
  code: string;
  name: string;
}

interface SearchType {
  value: string;
  name: string;
  description: string;
}

// Google search types using tbm parameter
const SEARCH_TYPES: SearchType[] = [
  { value: '', name: 'Web Search', description: 'Regular Google Search' },
  { value: 'isch', name: 'Images', description: 'Google Images API' },
  { value: 'lcl', name: 'Local', description: 'Google Local API' },
  { value: 'vid', name: 'Videos', description: 'Google Videos API' },
  { value: 'nws', name: 'News', description: 'Google News API' },
  { value: 'shop', name: 'Shopping', description: 'Google Shopping API' },
];

// Common Google search languages
const GOOGLE_LANGUAGES: GoogleLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-tw', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'he', name: 'Hebrew' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'et', name: 'Estonian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'el', name: 'Greek' },
];

function StillbrookContent() {
  const { isValidUser, token } = useValidateUserToken();
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [location, setLocation] = useState('');
  const [googleDomain, setGoogleDomain] = useState('google.com');
  const [language, setLanguage] = useState('en');
  const [searchType, setSearchType] = useState('');
  const [screenshotType, setScreenshotType] = useState('exact_url_match');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showLogoOverlay, setShowLogoOverlay] = useState(true);
  const [animateToHeader, setAnimateToHeader] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'generating' | 'results'>('form');
  const [lastFormData, setLastFormData] = useState<any>(null);

  // Sort Google domains alphabetically by country name, with google.com first
  const sortedGoogleDomains = googleDomainsData.sort((a: GoogleDomain, b: GoogleDomain) => {
    if (a.domain === 'google.com') return -1;
    if (b.domain === 'google.com') return 1;
    return a.country_name.localeCompare(b.country_name);
  });

  // Clear URL and keyword fields when they're not needed
  useEffect(() => {
    if (screenshotType === 'exact_url_match') {
      setKeywords(['']);
    } else if (screenshotType === 'keyword_match') {
      setUrl('');
      setUrls(['']);
    } else {
      setUrl('');
      setUrls(['']);
      setKeywords(['']);
    }
  }, [screenshotType]);

  // Logo animation effect
  useEffect(() => {
    const animateTimer = setTimeout(() => {
      setAnimateToHeader(true);
    }, 2000); // Show centered logo for 2 seconds

    const hideOverlayTimer = setTimeout(() => {
      setShowLogoOverlay(false);
    }, 3000); // Hide overlay after animation completes

    return () => {
      clearTimeout(animateTimer);
      clearTimeout(hideOverlayTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Reset previous results and move to generating step
    setResult(null);
    setCurrentStep('generating');

    // Store form data for potential resubmission
    const formData = {
      keyword,
      url,
      urls: urls.filter(u => u.trim() !== ''),
      keywords: keywords.filter(k => k.trim() !== ''),
      location,
      googleDomain,
      language,
      searchType,
      screenshotType,
    };
    setLastFormData(formData);

    // Validate URLs/keywords if needed
    if (screenshotType === 'exact_url_match') {
      const validUrls = urls.filter(u => u.trim() !== '');
      if (validUrls.length === 0 && !url.trim()) {
        setError('At least one URL is required for Exact URL Match.');
        setLoading(false);
        setCurrentStep('form');
        return;
      }
    } else if (screenshotType === 'keyword_match') {
      const validKeywords = keywords.filter(k => k.trim() !== '');
      if (validKeywords.length === 0) {
        setError('At least one keyword is required for Keyword Match.');
        setLoading(false);
        setCurrentStep('form');
        return;
      }
    }

    try {
      // Add a small delay to avoid rapid successive requests
      await new Promise(resolve => setTimeout(resolve, 100));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch('/api/stillbrook-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-auth-token': token } : {}),
        },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Request failed');
      }
      setResult(data);
      setCurrentStep('results');
    } catch (err: any) {
      console.error('Search request failed:', err);
      const errorMessage =
        err.name === 'AbortError'
          ? 'Request timed out. Please try again.'
          : err.message || 'Something went wrong';
      setError(errorMessage);
      setResult({ error: errorMessage });
      setCurrentStep('results'); // Show results even with error
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = () => {
    if (result && result.htmlPreview) {
      // Create HTML file for download
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stillbrook Search Results - ${keyword}</title>
          <meta charset="utf-8">
        </head>
        <body>
          ${result.htmlPreview}
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stillbrook-results-${keyword.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const convertImageToDataURL = async (imgSrc: string): Promise<string> => {
    return new Promise(resolve => {
      try {
        // Skip if it's already a data URL
        if (imgSrc.startsWith('data:')) {
          resolve(imgSrc);
          return;
        }

        // Skip placeholder GIFs
        if (
          imgSrc.includes(
            'data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
          )
        ) {
          console.log('Skipping placeholder GIF');
          resolve('');
          return;
        }

        // Try to fetch through our proxy first
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imgSrc)}`;

        const img = document.createElement('img') as HTMLImageElement;
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
          console.warn('Image load timeout:', imgSrc);
          resolve('');
        }, 5000); // 5 second timeout

        img.onload = function () {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = img.naturalWidth || img.width || 100;
            canvas.height = img.naturalHeight || img.height || 100;

            if (ctx && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(img, 0, 0);
              const dataURL = canvas.toDataURL('image/png', 0.8);
              console.log(
                `Successfully converted image: ${imgSrc.substring(0, 50)}... (${canvas.width}x${canvas.height})`
              );
              resolve(dataURL);
            } else {
              console.warn('Invalid canvas dimensions for image:', imgSrc);
              resolve('');
            }
          } catch (e) {
            console.warn('Failed to convert image to canvas:', e, imgSrc);
            resolve('');
          }
        };

        img.onerror = function () {
          clearTimeout(timeout);
          console.warn('Failed to load image:', imgSrc);
          resolve('');
        };

        img.src = proxyUrl;
      } catch (e) {
        console.warn('Error processing image:', e, imgSrc);
        resolve('');
      }
    });
  };

  const handleDownloadImage = async () => {
    if (!result || !result.htmlPreview) return;

    setIsGeneratingImage(true);
    try {
      // Get the HTML preview element
      const previewElement = document.getElementById('html-preview');
      if (!previewElement) {
        throw new Error('Preview element not found');
      }

      // Pre-process all images to data URLs
      const images = previewElement.querySelectorAll('img');
      console.log(`Found ${images.length} images to convert to data URLs...`);

      const imagePromises = Array.from(images).map(async (img, index) => {
        if (img.src) {
          // Skip if it's already a data URL or placeholder
          if (img.src.startsWith('data:')) {
            if (img.src.includes('R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')) {
              // This is a placeholder GIF, try to find a better src in data attributes
              const betterSrc =
                img.getAttribute('data-src') ||
                img.getAttribute('data-lazy-src') ||
                img.getAttribute('data-original');
              if (betterSrc && betterSrc.startsWith('http')) {
                console.log(`Found better src in data attribute: ${betterSrc}`);
                img.src = betterSrc;
              } else {
                return;
              }
            } else {
              return;
            }
          }

          const dataURL = await convertImageToDataURL(img.src);
          if (dataURL && dataURL !== img.src) {
            img.src = dataURL;
            console.log(`Successfully converted image ${index + 1}`);
          }
        }
      });

      await Promise.all(imagePromises);
      console.log('Finished converting all images');

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate screenshot
      const canvas = await html2canvas(previewElement, {
        allowTaint: false,
        useCORS: false,
        scale: 2,
        width: previewElement.scrollWidth,
        height: previewElement.scrollHeight,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Download the image
      canvas.toBlob(
        blob => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `stillbrook-results-${keyword.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }
        },
        'image/png',
        0.95
      );
    } catch (error) {
      console.error('Error generating image:', error);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownload = () => {
    if (result && result.screenshot) {
      // Legacy screenshot download
      const link = document.createElement('a');
      link.href = result.screenshot;
      link.download = 'screenshot.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRunAnotherSearch = () => {
    // Go back to form step with previous data intact
    setCurrentStep('form');
    setError(null);
    setResult(null);
    setLoading(false);
    setIsGeneratingImage(false);
    // Form data is already populated from previous submission
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'form', label: 'Search Form', number: 1 },
      { key: 'generating', label: 'Generating', number: 2 },
      { key: 'results', label: 'Results', number: 3 },
    ];

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted =
            (step.key === 'form' && ['generating', 'results'].includes(currentStep)) ||
            (step.key === 'generating' && currentStep === 'results');

          return (
            <Box key={step.key} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: isActive
                    ? 'primary.main'
                    : isCompleted
                      ? 'success.main'
                      : 'grey.300',
                  color: isActive || isCompleted ? 'white' : 'grey.600',
                  transition: 'all 0.3s ease',
                }}
              >
                {isCompleted ? '✓' : step.number}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  ml: 1,
                  color: isActive ? 'primary.main' : isCompleted ? 'success.main' : 'grey.600',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {step.label}
              </Typography>
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    width: 40,
                    height: 2,
                    mx: 2,
                    backgroundColor: isCompleted ? 'success.main' : 'grey.300',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      setUrls(newUrls);
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addKeywordField = () => {
    setKeywords([...keywords, '']);
  };

  const removeKeywordField = (index: number) => {
    if (keywords.length > 1) {
      const newKeywords = keywords.filter((_, i) => i !== index);
      setKeywords(newKeywords);
    }
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  // Logo animation overlay
  if (showLogoOverlay) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: animateToHeader
            ? 'logoMoveToHeader 1s ease-in-out forwards'
            : 'logoFadeIn 0.5s ease-out',
          '@keyframes logoFadeIn': {
            '0%': {
              opacity: 0,
              transform: 'scale(0.8)',
            },
            '100%': {
              opacity: 1,
              transform: 'scale(1)',
            },
          },
          '@keyframes logoMoveToHeader': {
            '0%': {
              opacity: 1,
              transform: 'scale(1) translate(0, 0)',
            },
            '100%': {
              opacity: 0,
              transform: 'scale(0.2) translate(-350px, -250px)',
            },
          },
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            animation: animateToHeader
              ? 'logoContentOut 1s ease-in-out forwards'
              : 'logoContentIn 0.5s ease-out 0.2s both',
            '@keyframes logoContentIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(20px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
            '@keyframes logoContentOut': {
              '0%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
              '100%': {
                opacity: 0,
                transform: 'translateY(-30px)',
              },
            },
          }}
        >
          <Image
            src="/stillbrook-logo.png"
            alt="Stillbrook Logo"
            width={200}
            height={200}
            style={{
              maxWidth: '100%',
              height: 'auto',
              marginBottom: '16px',
            }}
          />
          <Typography
            variant="h4"
            sx={{
              color: '#333',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Stillbrook
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#666',
              marginTop: 1,
              fontWeight: 300,
            }}
          >
            Screenshot Generator
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <IntercomLayout
      title="Stillbrook - Screenshot Generator"
      breadcrumbs={[{ label: 'Stillbrook' }]}
    >
      <IntercomCard>
        <Box
          p={3}
          sx={{
            animation: 'formFadeIn 1s ease-out',
            '@keyframes formFadeIn': {
              '0%': {
                opacity: 0,
                transform: 'translateY(30px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Image
                src="/stillbrook-logo.png"
                alt="Stillbrook Logo"
                width={40}
                height={40}
                style={{
                  opacity: showLogoOverlay ? 0 : 1,
                  transition: 'opacity 1s ease-in-out 0.5s',
                }}
              />
              <Box>
                <Typography variant="h5" gutterBottom sx={{ mb: 0.5 }}>
                  Stillbrook - Screenshot Generator
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate a screenshot of Google results based on keyword and criteria.
                </Typography>
              </Box>
            </Box>

            {renderStepIndicator()}

            {error && currentStep === 'form' && <Alert severity="error">{error}</Alert>}

            {currentStep === 'form' && (
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Search Term"
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    required
                  />

                  <FormControl fullWidth>
                    <InputLabel>Google Domain</InputLabel>
                    <Select
                      value={googleDomain}
                      label="Google Domain"
                      onChange={e => setGoogleDomain(e.target.value)}
                    >
                      {sortedGoogleDomains.map((domain: GoogleDomain) => (
                        <MenuItem key={domain.domain} value={domain.domain}>
                          {domain.domain} - {domain.country_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Search Language</InputLabel>
                    <Select
                      value={language}
                      label="Search Language"
                      onChange={e => setLanguage(e.target.value)}
                    >
                      {GOOGLE_LANGUAGES.map((lang: GoogleLanguage) => (
                        <MenuItem key={lang.code} value={lang.code}>
                          {lang.name} ({lang.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel shrink>Search Type</InputLabel>
                    <Select
                      value={searchType}
                      label="Search Type"
                      onChange={e => setSearchType(e.target.value)}
                      displayEmpty
                      renderValue={selected => {
                        const type = SEARCH_TYPES.find((t: SearchType) => t.value === selected);
                        return type
                          ? `${type.name} - ${type.description}`
                          : 'Web Search - Regular Google Search';
                      }}
                    >
                      {SEARCH_TYPES.map((type: SearchType) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.name} - {type.description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl component="fieldset">
                    <FormLabel component="legend">Screenshot Type</FormLabel>
                    <RadioGroup
                      aria-label="screenshot-type"
                      name="screenshotType"
                      value={screenshotType}
                      onChange={e => setScreenshotType(e.target.value)}
                    >
                      <FormControlLabel
                        value="exact_url_match"
                        control={<Radio />}
                        label="Exact URL Match"
                      />
                      <FormControlLabel
                        value="negative_sentiment"
                        control={<Radio />}
                        label="Negative Sentiment"
                      />
                      <FormControlLabel
                        value="keyword_match"
                        control={<Radio />}
                        label="Specific Keyword Match"
                      />
                    </RadioGroup>
                  </FormControl>

                  {screenshotType === 'exact_url_match' && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          URLs to Match
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={addUrlField}
                          sx={{ ml: 2 }}
                        >
                          Add URL
                        </Button>
                      </Box>

                      {urls.map((urlValue, index) => (
                        <Box
                          key={index}
                          sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
                        >
                          <TextField
                            fullWidth
                            label={`URL ${index + 1}`}
                            type="url"
                            value={urlValue}
                            onChange={e => updateUrl(index, e.target.value)}
                            required={index === 0}
                            variant="outlined"
                            placeholder="https://example.com"
                          />
                          {urls.length > 1 && (
                            <IconButton
                              color="error"
                              onClick={() => removeUrlField(index)}
                              aria-label="Remove URL"
                            >
                              <RemoveIcon />
                            </IconButton>
                          )}
                        </Box>
                      ))}

                      <Typography variant="caption" color="text.secondary">
                        Add multiple URLs to highlight any search results that match these domains.
                      </Typography>
                    </Box>
                  )}

                  {screenshotType === 'keyword_match' && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          Keywords to Match
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={addKeywordField}
                          sx={{ ml: 2 }}
                        >
                          Add Keyword
                        </Button>
                      </Box>

                      {keywords.map((keywordValue, index) => (
                        <Box
                          key={index}
                          sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
                        >
                          <TextField
                            fullWidth
                            label={`Keyword ${index + 1}`}
                            type="text"
                            value={keywordValue}
                            onChange={e => updateKeyword(index, e.target.value)}
                            required={index === 0}
                            variant="outlined"
                            placeholder="e.g. corruption, investigation, scandal"
                          />
                          {keywords.length > 1 && (
                            <IconButton
                              color="error"
                              onClick={() => removeKeywordField(index)}
                              aria-label="Remove Keyword"
                            >
                              <RemoveIcon />
                            </IconButton>
                          )}
                        </Box>
                      ))}

                      <Typography variant="caption" color="text.secondary">
                        Add multiple keywords to highlight search results containing these specific
                        terms.
                      </Typography>
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    label="Geographic Location (Optional)"
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    variant="outlined"
                    placeholder="e.g., New York, NY"
                    helperText={
                      <Box component="span">
                        Examples: &quot;New York, NY&quot;, &quot;London, UK&quot;, &quot;Los
                        Angeles, California&quot;, &quot;Toronto, Canada&quot;, &quot;Sydney,
                        Australia&quot;
                        <br />
                        <strong>Popular formats:</strong> &quot;City, State&quot;, &quot;City,
                        Country&quot;, &quot;State, Country&quot;
                      </Box>
                    }
                  />

                  <Box>
                    <IntercomButton variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Processing...' : 'Submit'}
                    </IntercomButton>
                  </Box>
                </Stack>
              </Box>
            )}

            {currentStep === 'generating' && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Generating Your Screenshot...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Searching Google and processing results for: <strong>{keyword}</strong>
                </Typography>
                <Box sx={{ mt: 2, px: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    This may take a few moments as we fetch and render the search results.
                  </Typography>
                </Box>
              </Box>
            )}

            {currentStep === 'results' && result && (
              <Box mt={2}>
                {result.error ? (
                  <Alert severity="error">{result.error}</Alert>
                ) : result.htmlPreview ? (
                  <Stack spacing={3}>
                    {/* Results Summary */}
                    <Alert severity={result.matchedResults?.length ? 'success' : 'warning'}>
                      {result.matchedResults?.length
                        ? `Found ${result.matchedResults.length} matching results`
                        : 'No matching results found, but generated screenshot of all results'}
                      {result.totalResults ? ` out of ${result.totalResults} total results` : ''}
                    </Alert>

                    {/* Download CTA Section - Above the fold */}
                    <IntercomCard>
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          📸 Your Screenshot is Ready!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Download your screenshot or HTML version below. The preview is read-only
                          to ensure clean screenshots.
                        </Typography>

                        {/* Primary Download Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                          <IntercomButton
                            variant="primary"
                            leftIcon={
                              isGeneratingImage ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <SaveAltIcon />
                              )
                            }
                            onClick={handleDownloadImage}
                            disabled={isGeneratingImage}
                            sx={{ minWidth: '160px' }}
                          >
                            {isGeneratingImage ? 'Generating...' : 'Download PNG'}
                          </IntercomButton>
                          <IntercomButton
                            variant="secondary"
                            leftIcon={<SaveAltIcon />}
                            onClick={handleDownloadHTML}
                            sx={{ minWidth: '160px' }}
                          >
                            Download HTML
                          </IntercomButton>
                        </Box>

                        {/* Run Another Search Button */}
                        <Box sx={{ borderTop: '1px solid #eee', pt: 2 }}>
                          <IntercomButton
                            variant="secondary"
                            onClick={handleRunAnotherSearch}
                            sx={{ width: '100%' }}
                          >
                            🔄 Run Another Search
                          </IntercomButton>
                        </Box>
                      </Stack>
                    </IntercomCard>

                    {/* HTML Preview with Read-Only Overlay */}
                    <Box
                      sx={{
                        position: 'relative',
                        border: '1px solid #ddd',
                        borderRadius: 2,
                        overflow: 'hidden',
                        maxHeight: '600px',
                        overflowY: 'auto',
                      }}
                    >
                      {/* Transparent overlay to make it read-only */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'transparent',
                          zIndex: 10,
                          cursor: 'default',
                        }}
                        title="Preview only - links are disabled for cleaner screenshots"
                      />
                      <Box id="html-preview">
                        <div dangerouslySetInnerHTML={{ __html: result.htmlPreview }} />
                      </Box>
                    </Box>

                    {/* Debug Info (if needed) */}
                    {result.matchedResults && result.matchedResults.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="h6" gutterBottom>
                          Raw Result Data ({result.matchedResults.length} results):
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            backgroundColor: '#f5f5f5',
                            padding: 2,
                            borderRadius: 1,
                            fontSize: '12px',
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: '1px solid #ddd',
                          }}
                        >
                          {JSON.stringify(result.matchedResults, null, 2)}
                        </Box>
                      </Box>
                    )}
                  </Stack>
                ) : result.screenshot ? (
                  // Legacy screenshot support
                  <Stack spacing={2}>
                    <Image
                      src={result.screenshot}
                      alt="Google search result"
                      width={800}
                      height={600}
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                    <Box>
                      <IntercomButton
                        variant="secondary"
                        leftIcon={<SaveAltIcon />}
                        onClick={handleDownload}
                      >
                        Download Image
                      </IntercomButton>
                    </Box>
                  </Stack>
                ) : null}
              </Box>
            )}

            {currentStep === 'results' && result && result.error && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  {result.error}
                </Alert>
                <IntercomButton variant="primary" onClick={handleRunAnotherSearch}>
                  🔄 Try Another Search
                </IntercomButton>
              </Box>
            )}
          </Stack>
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function StillbrookPage() {
  return (
    <ToastProvider>
      <StillbrookContent />
    </ToastProvider>
  );
}
