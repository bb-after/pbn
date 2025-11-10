import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Paper,
  Chip,
  Divider,
  InputAdornment,
  Tooltip,
  Badge,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DownloadIcon from '@mui/icons-material/Download';
import CodeIcon from '@mui/icons-material/Code';
import SaveIcon from '@mui/icons-material/Save';

// Modern Lucide Icons for enhanced UI
import {
  Brain,
  Camera,
  Search,
  Target,
  Globe,
  Sparkles,
  Zap,
  Settings,
  FileText,
  Users,
  Activity,
  TrendingUp,
  Shield,
  ExternalLink,
  Plus,
  X,
  Eye,
  Download,
  Save,
  RefreshCw,
  Edit3,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Map,
  Filter,
  ImageIcon,
  Video,
  Newspaper,
  ShoppingBag,
  Languages,
  MapPin,
  Link,
  Hash,
  Bookmark,
  Code2,
  Palette,
  MousePointer,
  Layers,
} from 'lucide-react';
import { IntercomLayout, ToastProvider, IntercomCard, IntercomButton } from '../components/ui';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import useValidateUserToken from '../hooks/useValidateUserToken';
import ClientDropdown from '../components/ClientDropdown';
import Image from 'next/image';
import googleDomainsData from '../google-domains.json';
import html2canvas from 'html2canvas';
import {
  RESULT_CONTAINER_CLASS,
  EXCLUDED_CONTAINER_WRAPPER_CLASS,
} from '../utils/stillbrook/highlighting';

interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
}

interface SearchResult {
  searchType: any;
  noMatches: any;
  results?: SerpApiResult[];
  matchedResults?: SerpApiResult[];
  htmlPreview?: string;
  page2HtmlPreview?: string;
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
  // { value: 'lcl', name: 'Local', description: 'Google Local API' },
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

// Reusable URL input component
interface URLInputSectionProps {
  title: string;
  urls: string[];
  setUrls: (urls: string[]) => void;
  addUrlField: () => void;
  removeUrlField: (index: number) => void;
  color?: 'error' | 'success';
}

function URLInputSection({
  title,
  urls,
  setUrls,
  addUrlField,
  removeUrlField,
  color = 'error',
}: URLInputSectionProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAdd = () => {
    addUrlField();
    // Focus the newly added input after it mounts
    setTimeout(() => {
      const newIndex = urls.length; // new input will be at current length
      const el = inputRefs.current[newIndex];
      if (el) {
        el.focus();
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {}
      }
    }, 0);
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{ color: color === 'error' ? 'error.main' : 'success.main' }}
        >
          {title}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{
            ml: 2,
            borderColor: color === 'error' ? 'error.main' : 'success.main',
            color: color === 'error' ? 'error.main' : 'success.main',
          }}
        >
          Add URL
        </Button>
      </Box>

      {urls.map((urlValue, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            label={`URL ${index + 1}`}
            value={urlValue}
            onChange={e => {
              const newUrls = [...urls];
              newUrls[index] = e.target.value;
              setUrls(newUrls);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            inputRef={el => {
              inputRefs.current[index] = el;
            }}
            fullWidth
            variant="outlined"
            placeholder="https://example.com"
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: color === 'error' ? 'error.main' : 'success.main',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: color === 'error' ? 'error.main' : 'success.main',
              },
            }}
          />
          {urls.length > 1 && (
            <IconButton onClick={() => removeUrlField(index)} sx={{ ml: 1, color: 'error.main' }}>
              <RemoveIcon />
            </IconButton>
          )}
        </Box>
      ))}

      <Typography variant="body2" color="text.secondary">
        Add multiple URLs to highlight any search results that match these domains.
      </Typography>
    </Box>
  );
}

// Reusable keyword input component
interface KeywordInputSectionProps {
  title: string;
  keywords: string[];
  setKeywords: (keywords: string[]) => void;
  addKeywordField: () => void;
  removeKeywordField: (index: number) => void;
  color?: 'error' | 'success';
}

function KeywordInputSection({
  title,
  keywords,
  setKeywords,
  addKeywordField,
  removeKeywordField,
  color = 'error',
}: KeywordInputSectionProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAdd = () => {
    addKeywordField();
    // Focus the newly added input after it mounts
    setTimeout(() => {
      const newIndex = keywords.length; // new input will be at current length
      const el = inputRefs.current[newIndex];
      if (el) {
        el.focus();
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {}
      }
    }, 0);
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{ color: color === 'error' ? 'error.main' : 'success.main' }}
        >
          {title}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{
            ml: 2,
            borderColor: color === 'error' ? 'error.main' : 'success.main',
            color: color === 'error' ? 'error.main' : 'success.main',
          }}
        >
          Add Keyword
        </Button>
      </Box>

      {keywords.map((keywordValue, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            label={`Keyword ${index + 1}`}
            value={keywordValue}
            onChange={e => {
              const newKeywords = [...keywords];
              newKeywords[index] = e.target.value;
              setKeywords(newKeywords);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            inputRef={el => {
              inputRefs.current[index] = el;
            }}
            fullWidth
            variant="outlined"
            placeholder="Enter keyword or phrase"
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: color === 'error' ? 'error.main' : 'success.main',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: color === 'error' ? 'error.main' : 'success.main',
              },
            }}
          />
          {keywords.length > 1 && (
            <IconButton
              onClick={() => removeKeywordField(index)}
              sx={{ ml: 1, color: 'error.main' }}
            >
              <RemoveIcon />
            </IconButton>
          )}
        </Box>
      ))}

      <Typography variant="body2" color="text.secondary">
        Add keywords to search for in titles and snippets. Separate multiple keywords.
      </Typography>
    </Box>
  );
}

function StillbrookContent() {
  const { isValidUser, token } = useValidateUserToken();
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [location, setLocation] = useState('');
  const [googleDomain, setGoogleDomain] = useState('google.com');
  const [language, setLanguage] = useState('en');
  const [searchType, setSearchType] = useState('');
  const [screenshotType, setScreenshotType] = useState('exact_url_match'); // Keep for backwards compatibility

  // Individual highlight type states
  const [enableNegativeUrls, setEnableNegativeUrls] = useState(false);
  const [enableNegativeSentiment, setEnableNegativeSentiment] = useState(false);
  const [enableNegativeKeywords, setEnableNegativeKeywords] = useState(false);
  const [enablePositiveUrls, setEnablePositiveUrls] = useState(false);
  const [enablePositiveSentiment, setEnablePositiveSentiment] = useState(false);
  const [enablePositiveKeywords, setEnablePositiveKeywords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showLogoOverlay, setShowLogoOverlay] = useState(true);
  const [animateToHeader, setAnimateToHeader] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'generating' | 'results'>('form');
  const [lastFormData, setLastFormData] = useState<any>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);

  // Positive highlight state variables
  const [positiveUrls, setPositiveUrls] = useState<string[]>(['']);
  const [positiveKeywords, setPositiveKeywords] = useState<string[]>(['']);

  // Save search modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isSavingSearch, setIsSavingSearch] = useState(false);

  // Loaded search state (when coming from saved searches page)
  const [isLoadedSearch, setIsLoadedSearch] = useState(false);
  const [loadedSearchName, setLoadedSearchName] = useState('');
  const [loadedSearchId, setLoadedSearchId] = useState<string | null>(null);
  const [originalSearchData, setOriginalSearchData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUpdatingSearch, setIsUpdatingSearch] = useState(false);
  const [showUpdateOptions, setShowUpdateOptions] = useState(false);
  const [includePage2, setIncludePage2] = useState(false);

  // Interactive highlighting state
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  // Sort Google domains alphabetically by country name, with google.com first
  const sortedGoogleDomains = googleDomainsData.sort((a: GoogleDomain, b: GoogleDomain) => {
    if (a.domain === 'google.com') return -1;
    if (b.domain === 'google.com') return 1;
    return a.country_name.localeCompare(b.country_name);
  });

  // Clear fields when highlight options are disabled
  useEffect(() => {
    if (!enableNegativeUrls) {
      setUrl('');
      setUrls(['']);
    }
  }, [enableNegativeUrls]);

  useEffect(() => {
    if (!enableNegativeKeywords) {
      setKeywords(['']);
    }
  }, [enableNegativeKeywords]);

  useEffect(() => {
    if (!enablePositiveUrls) {
      setPositiveUrls(['']);
    }
  }, [enablePositiveUrls]);

  useEffect(() => {
    if (!enablePositiveKeywords) {
      setPositiveKeywords(['']);
    }
  }, [enablePositiveKeywords]);

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

  // Load saved search effect
  useEffect(() => {
    const loadSearchId = router.query.loadSearch as string;

    if (loadSearchId && token && !isLoadedSearch) {
      loadSavedSearch(loadSearchId);
    }
  }, [router.query, token, isLoadedSearch]);

  const loadSavedSearch = async (searchId: string) => {
    try {
      const response = await fetch('/api/saved-searches', {
        headers: {
          ...(token ? { 'x-auth-token': token } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load saved searches');
      }

      const searches = await response.json();
      const targetSearch = searches.find((s: any) => s.id.toString() === searchId);

      if (!targetSearch) {
        setError('Saved search not found');
        return;
      }

      // Populate form with saved search data
      setKeyword(targetSearch.search_query || '');
      setSearchType(targetSearch.search_type || '');
      setLocation(targetSearch.location || '');
      setLanguage(targetSearch.language || 'en');
      setGoogleDomain(targetSearch.google_domain || 'google.com');

      // Set URLs and keywords
      setUrls(targetSearch.urls && targetSearch.urls.length > 0 ? targetSearch.urls : ['']);
      setKeywords(
        targetSearch.keywords && targetSearch.keywords.length > 0 ? targetSearch.keywords : ['']
      );
      setPositiveUrls(
        targetSearch.positive_urls && targetSearch.positive_urls.length > 0
          ? targetSearch.positive_urls
          : ['']
      );
      setPositiveKeywords(
        targetSearch.positive_keywords && targetSearch.positive_keywords.length > 0
          ? targetSearch.positive_keywords
          : ['']
      );

      // Set highlight options
      setEnableNegativeUrls(targetSearch.enable_negative_urls || false);
      setEnableNegativeSentiment(targetSearch.enable_negative_sentiment || false);
      setEnableNegativeKeywords(targetSearch.enable_negative_keywords || false);
      setEnablePositiveUrls(targetSearch.enable_positive_urls || false);
      setEnablePositiveSentiment(targetSearch.enable_positive_sentiment || false);
      setEnablePositiveKeywords(targetSearch.enable_positive_keywords || false);
      setIncludePage2(targetSearch.include_page2 || false);

      // Set loaded search info
      setIsLoadedSearch(true);
      setLoadedSearchName(targetSearch.search_name || '');
      setLoadedSearchId(searchId);
      setOriginalSearchData(targetSearch);
      setHasUnsavedChanges(false);

      console.log('Loaded saved search:', targetSearch.search_name);
    } catch (err: any) {
      console.error('Failed to load saved search:', err);
      setError('Failed to load saved search: ' + (err.message || 'Unknown error'));
    }
  };

  // Function to detect if current form state differs from original loaded search
  const detectChanges = () => {
    if (!originalSearchData) return false;

    const currentData = {
      search_query: keyword,
      search_type: searchType,
      location,
      language,
      google_domain: googleDomain,
      urls: urls.filter(u => u.trim() !== ''),
      keywords: keywords.filter(k => k.trim() !== ''),
      positive_urls: positiveUrls.filter(u => u.trim() !== ''),
      positive_keywords: positiveKeywords.filter(k => k.trim() !== ''),
      include_page2: includePage2,
      enable_negative_urls: enableNegativeUrls,
      enable_negative_sentiment: enableNegativeSentiment,
      enable_negative_keywords: enableNegativeKeywords,
      enable_positive_urls: enablePositiveUrls,
      enable_positive_sentiment: enablePositiveSentiment,
      enable_positive_keywords: enablePositiveKeywords,
    };

    const originalData = {
      search_query: originalSearchData.search_query,
      search_type: originalSearchData.search_type || '',
      location: originalSearchData.location || '',
      language: originalSearchData.language || 'en',
      google_domain: originalSearchData.google_domain || 'google.com',
      urls: originalSearchData.urls || [],
      keywords: originalSearchData.keywords || [],
      positive_urls: originalSearchData.positive_urls || [],
      positive_keywords: originalSearchData.positive_keywords || [],
      include_page2: originalSearchData.include_page2 || false,
      enable_negative_urls: originalSearchData.enable_negative_urls || false,
      enable_negative_sentiment: originalSearchData.enable_negative_sentiment || false,
      enable_negative_keywords: originalSearchData.enable_negative_keywords || false,
      enable_positive_urls: originalSearchData.enable_positive_urls || false,
      enable_positive_sentiment: originalSearchData.enable_positive_sentiment || false,
      enable_positive_keywords: originalSearchData.enable_positive_keywords || false,
    };

    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  };

  // Effect to detect changes
  useEffect(() => {
    if (isLoadedSearch && originalSearchData) {
      const hasChanges = detectChanges();
      setHasUnsavedChanges(hasChanges);
    }
  }, [
    keyword,
    searchType,
    location,
    language,
    googleDomain,
    urls,
    keywords,
    positiveUrls,
    positiveKeywords,
    includePage2,
    enableNegativeUrls,
    enableNegativeSentiment,
    enableNegativeKeywords,
    enablePositiveUrls,
    enablePositiveSentiment,
    enablePositiveKeywords,
    isLoadedSearch,
    originalSearchData,
  ]);

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
      positiveUrls: positiveUrls.filter(u => u.trim() !== ''),
      positiveKeywords: positiveKeywords.filter(k => k.trim() !== ''),
      location,
      googleDomain,
      language,
      searchType,
      screenshotType: 'combined', // New combined approach
      savedSearchId: loadedSearchId, // Include saved search ID for analytics
      includePage2, // Include page 2 option
      // Include highlight options
      enableNegativeUrls,
      enableNegativeSentiment,
      enableNegativeKeywords,
      enablePositiveUrls,
      enablePositiveSentiment,
      enablePositiveKeywords,
    };
    setLastFormData(formData);

    console.log('Form data being submitted:', formData);
    console.log('Include Page 2 setting:', includePage2);

    // Validate that at least one highlight option is selected
    const hasAnyHighlight =
      enableNegativeUrls ||
      enableNegativeSentiment ||
      enableNegativeKeywords ||
      enablePositiveUrls ||
      enablePositiveSentiment ||
      enablePositiveKeywords;

    if (!hasAnyHighlight) {
      setError('Please select at least one highlight option.');
      setLoading(false);
      setCurrentStep('form');
      return;
    }

    // Validate required inputs for enabled options
    if (enableNegativeUrls) {
      const validUrls = urls.filter(u => u.trim() !== '');
      if (validUrls.length === 0 && !url.trim()) {
        setError('At least one URL is required when "Highlight Specific URLs (Red)" is enabled.');
        setLoading(false);
        setCurrentStep('form');
        return;
      }
    }

    if (enableNegativeKeywords) {
      const validKeywords = keywords.filter(k => k.trim() !== '');
      if (validKeywords.length === 0) {
        setError(
          'At least one keyword is required when "Highlight Specific Keywords (Red)" is enabled.'
        );
        setLoading(false);
        setCurrentStep('form');
        return;
      }
    }

    if (enablePositiveUrls) {
      const validPositiveUrls = positiveUrls.filter(u => u.trim() !== '');
      if (validPositiveUrls.length === 0) {
        setError('At least one URL is required when "Highlight Specific URLs (Green)" is enabled.');
        setLoading(false);
        setCurrentStep('form');
        return;
      }
    }

    if (enablePositiveKeywords) {
      const validPositiveKeywords = positiveKeywords.filter(k => k.trim() !== '');
      if (validPositiveKeywords.length === 0) {
        setError(
          'At least one keyword is required when "Highlight Specific Keywords (Green)" is enabled.'
        );
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
      setResult({ error: errorMessage, searchType: undefined, noMatches: undefined });
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
      // Debug: Log all available iframes
      const allIframes = document.querySelectorAll('iframe');
      console.log(
        '🔍 Available iframes for download:',
        Array.from(allIframes).map(iframe => ({
          title: iframe.title,
          id: iframe.id,
          src: iframe.src,
          className: iframe.className,
          hasContentDocument: !!iframe.contentDocument,
        }))
      );

      // Check if we have dual page layout
      const page1Iframe = document.querySelector(
        'iframe[title="Page 1 Search Results"]'
      ) as HTMLIFrameElement;
      const page2Iframe = document.querySelector(
        'iframe[title="Page 2 Search Results"]'
      ) as HTMLIFrameElement;
      const hasDualPages = page1Iframe && page2Iframe && result.page2HtmlPreview;

      console.log('📄 Page layout detected:', {
        hasDualPages,
        page1: !!page1Iframe,
        page2: !!page2Iframe,
        hasPage2Data: !!result.page2HtmlPreview,
      });

      if (hasDualPages) {
        // Handle dual page download
        await handleDualPageDownload(page1Iframe, page2Iframe);
      } else {
        // Handle single page download
        await handleSinglePageDownload();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSinglePageDownload = async () => {
    // Get the iframe element - try multiple selectors
    let iframe = document.querySelector('#html-preview iframe') as HTMLIFrameElement;

    if (!iframe) {
      // Try alternative selectors
      iframe = document.querySelector('iframe[title*="Search Results"]') as HTMLIFrameElement;
    }

    if (!iframe) {
      // Try any iframe as fallback
      iframe = document.querySelector('iframe') as HTMLIFrameElement;
    }

    console.log('🖼️ Selected single iframe for download:', {
      iframe: !!iframe,
      contentDocument: !!iframe?.contentDocument,
      title: iframe?.title,
      id: iframe?.id,
    });

    if (!iframe || !iframe.contentDocument) {
      throw new Error(
        'Preview iframe not found or not accessible. Check console logs for available iframes.'
      );
    }

    const canvas = await processIframeToCanvas(iframe);
    downloadCanvas(canvas, 'stillbrook-results');
  };

  const handleDualPageDownload = async (
    page1Iframe: HTMLIFrameElement,
    page2Iframe: HTMLIFrameElement
  ) => {
    console.log('🔄 Processing dual page download...');

    // Process both iframes to canvas
    const [page1Canvas, page2Canvas] = await Promise.all([
      processIframeToCanvas(page1Iframe, 'Page 1'),
      processIframeToCanvas(page2Iframe, 'Page 2'),
    ]);

    // Create combined canvas
    const combinedCanvas = document.createElement('canvas');
    const ctx = combinedCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Calculate dimensions
    const padding = 20;
    const headerHeight = 50;
    const maxWidth = Math.max(page1Canvas.width, page2Canvas.width);
    const totalHeight =
      headerHeight + page1Canvas.height + padding + headerHeight + page2Canvas.height + padding;

    combinedCanvas.width = maxWidth + padding * 2;
    combinedCanvas.height = totalHeight;

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

    // Add Page 1 header and content
    ctx.fillStyle = '#1a73e8';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📄 Page 1 Results (1-10)', combinedCanvas.width / 2, 35);

    const page1Y = headerHeight + padding;
    const page1X = (combinedCanvas.width - page1Canvas.width) / 2;
    ctx.drawImage(page1Canvas, page1X, page1Y);

    // Add Page 2 header and content
    const page2HeaderY = page1Y + page1Canvas.height + padding + 35;
    ctx.fillStyle = '#34a853';
    ctx.fillText('📄 Page 2 Results (11-20)', combinedCanvas.width / 2, page2HeaderY);

    const page2Y = page2HeaderY + padding;
    const page2X = (combinedCanvas.width - page2Canvas.width) / 2;
    ctx.drawImage(page2Canvas, page2X, page2Y);

    console.log('✅ Combined dual page canvas created');
    downloadCanvas(combinedCanvas, 'stillbrook-pages-1-and-2');
  };

  const processIframeToCanvas = async (
    iframe: HTMLIFrameElement,
    pageLabel?: string
  ): Promise<HTMLCanvasElement> => {
    if (!iframe.contentDocument) {
      throw new Error(`${pageLabel || 'Iframe'} content not accessible`);
    }

    const iframeDocument = iframe.contentDocument;
    const iframeBody = iframeDocument.body;

    if (!iframeBody) {
      throw new Error(`${pageLabel || 'Iframe'} content not loaded`);
    }

    // Pre-process all images to data URLs within the iframe
    const images = iframeDocument.querySelectorAll('img');
    console.log(`Found ${images.length} images to convert for ${pageLabel || 'page'}...`);

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
          console.log(`Successfully converted ${pageLabel || 'page'} image ${index + 1}`);
        }
      }
    });

    await Promise.all(imagePromises);
    console.log(`Finished converting all images for ${pageLabel || 'page'}`);

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate screenshot of the iframe content
    const canvas = await html2canvas(iframeBody, {
      allowTaint: false,
      useCORS: false,
      scale: 2,
      width: iframeBody.scrollWidth,
      height: iframeBody.scrollHeight,
      backgroundColor: '#ffffff',
      logging: false,
    });

    console.log(`✅ Canvas created for ${pageLabel || 'page'}: ${canvas.width}x${canvas.height}`);
    return canvas;
  };

  const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}-${keyword.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      },
      'image/png',
      0.95
    );
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

  const handleDownloadPage = (htmlContent: string, pageType: 'page-1' | 'page-2') => {
    const pageTitle = pageType === 'page-1' ? 'Page 1' : 'Page 2';
    const htmlDocument = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stillbrook ${pageTitle} Results - ${keyword}</title>
        <meta charset="utf-8">
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    const blob = new Blob([htmlDocument], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stillbrook-${pageType}-${keyword.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadPageImage = async (pageType: 'page-1' | 'page-2') => {
    if (!result) return;

    setIsGeneratingImage(true);
    try {
      const iframeSelector =
        pageType === 'page-1'
          ? 'iframe[title="Page 1 Search Results"]'
          : 'iframe[title="Page 2 Search Results"]';

      const iframe = document.querySelector(iframeSelector) as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) {
        throw new Error(`${pageType} iframe not found or not accessible`);
      }

      const iframeDocument = iframe.contentDocument;
      const iframeBody = iframeDocument.body;
      if (!iframeBody) {
        throw new Error(`${pageType} iframe content not loaded`);
      }

      // Pre-process images similar to the original function
      const images = iframeDocument.querySelectorAll('img');
      console.log(`Found ${images.length} images to convert for ${pageType}...`);

      const imagePromises = Array.from(images).map(async (img, index) => {
        try {
          if (!img.src || img.src.startsWith('data:')) return;

          if (
            img.src.includes('transparent.gif') ||
            img.src.includes('pixel.gif') ||
            img.src.includes('spacer.gif')
          ) {
            const betterSrc =
              img.getAttribute('data-src') ||
              img.getAttribute('data-lazy-src') ||
              img.getAttribute('data-original');
            if (betterSrc && betterSrc.startsWith('http')) {
              img.src = betterSrc;
            } else {
              return;
            }
          }

          const dataURL = await convertImageToDataURL(img.src);
          if (dataURL && dataURL !== img.src) {
            img.src = dataURL;
            console.log(`Successfully converted ${pageType} image ${index + 1}`);
          }
        } catch (error) {
          console.warn(`Failed to convert ${pageType} image ${index + 1}:`, error);
        }
      });

      await Promise.all(imagePromises);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate screenshot
      const canvas = await html2canvas(iframeBody, {
        allowTaint: false,
        useCORS: false,
        scale: 2,
        width: iframeBody.scrollWidth,
        height: iframeBody.scrollHeight,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Download the image
      canvas.toBlob(
        blob => {
          if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `stillbrook-${pageType}-${keyword.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
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
      console.error(`Error generating ${pageType} image:`, error);
      setError(`Failed to generate ${pageType} image. Please try again.`);
    } finally {
      setIsGeneratingImage(false);
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

  // Positive highlight helper functions
  const addPositiveUrlField = () => {
    setPositiveUrls([...positiveUrls, '']);
  };

  const removePositiveUrlField = (index: number) => {
    if (positiveUrls.length > 1) {
      const newUrls = positiveUrls.filter((_, i) => i !== index);
      setPositiveUrls(newUrls);
    }
  };

  const addPositiveKeywordField = () => {
    setPositiveKeywords([...positiveKeywords, '']);
  };

  const removePositiveKeywordField = (index: number) => {
    if (positiveKeywords.length > 1) {
      const newKeywords = positiveKeywords.filter((_, i) => i !== index);
      setPositiveKeywords(newKeywords);
    }
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim() || !selectedClientId) {
      setError('Please provide a search name and select a client.');
      return;
    }

    setIsSavingSearch(true);
    try {
      const searchData = {
        searchName: searchName.trim(),
        clientId: selectedClientId,
        searchQuery: keyword,
        searchType,
        urls: urls.filter(u => u.trim() !== ''),
        keywords: keywords.filter(k => k.trim() !== ''),
        positiveUrls: positiveUrls.filter(u => u.trim() !== ''),
        positiveKeywords: positiveKeywords.filter(k => k.trim() !== ''),
        location,
        language,
        country: googleDomain?.split('.').pop() || 'us',
        googleDomain,
        enableNegativeUrls,
        enableNegativeSentiment,
        enableNegativeKeywords,
        enablePositiveUrls,
        enablePositiveSentiment,
        enablePositiveKeywords,
        includePage2,
      };

      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-auth-token': token } : {}),
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save search');
      }

      // Reset modal state
      setShowSaveModal(false);
      setSearchName('');
      setSelectedClient('');
      setSelectedClientId(null);
      setError(null);

      // Show success message (you could use a toast notification here)
      alert('Search saved successfully!');
    } catch (err: any) {
      console.error('Failed to save search:', err);
      setError(err.message || 'Failed to save search');
    } finally {
      setIsSavingSearch(false);
    }
  };

  const handleOpenSaveModal = () => {
    // Validate that the form has the minimum required data
    if (!keyword.trim()) {
      setError('Please enter a search term before saving.');
      return;
    }

    const hasAnyHighlight =
      enableNegativeUrls ||
      enableNegativeSentiment ||
      enableNegativeKeywords ||
      enablePositiveUrls ||
      enablePositiveSentiment ||
      enablePositiveKeywords;

    if (!hasAnyHighlight) {
      setError('Please select at least one highlight option before saving.');
      return;
    }

    setError(null);
    setShowSaveModal(true);
  };

  const handleUpdateSearch = async () => {
    if (!loadedSearchId || !originalSearchData) {
      setError('No search to update');
      return;
    }

    setIsUpdatingSearch(true);
    try {
      const searchData = {
        searchName: loadedSearchName,
        clientId: originalSearchData.client_id,
        searchQuery: keyword,
        searchType,
        urls: urls.filter(u => u.trim() !== ''),
        keywords: keywords.filter(k => k.trim() !== ''),
        positiveUrls: positiveUrls.filter(u => u.trim() !== ''),
        positiveKeywords: positiveKeywords.filter(k => k.trim() !== ''),
        location,
        language,
        country: googleDomain?.split('.').pop() || 'us',
        googleDomain,
        enableNegativeUrls,
        enableNegativeSentiment,
        enableNegativeKeywords,
        enablePositiveUrls,
        enablePositiveSentiment,
        enablePositiveKeywords,
        includePage2,
      };

      const response = await fetch(`/api/saved-searches?id=${loadedSearchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-auth-token': token } : {}),
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update search');
      }

      // Update the original search data to reflect the new state
      setOriginalSearchData({
        ...originalSearchData,
        search_query: keyword,
        search_type: searchType,
        urls: urls.filter(u => u.trim() !== ''),
        keywords: keywords.filter(k => k.trim() !== ''),
        positive_urls: positiveUrls.filter(u => u.trim() !== ''),
        positive_keywords: positiveKeywords.filter(k => k.trim() !== ''),
        location,
        language,
        country: googleDomain?.split('.').pop() || 'us',
        google_domain: googleDomain,
        enable_negative_urls: enableNegativeUrls,
        enable_negative_sentiment: enableNegativeSentiment,
        enable_negative_keywords: enableNegativeKeywords,
        enable_positive_urls: enablePositiveUrls,
        enable_positive_sentiment: enablePositiveSentiment,
        enable_positive_keywords: enablePositiveKeywords,
      });

      setHasUnsavedChanges(false);
      setShowUpdateOptions(false);
      setError(null);

      alert('Search updated successfully!');
    } catch (err: any) {
      console.error('Failed to update search:', err);
      setError(err.message || 'Failed to update search');
    } finally {
      setIsUpdatingSearch(false);
    }
  };

  // Interactive highlighting functions
  const setupInteractiveHighlighting = (iframe: HTMLIFrameElement) => {
    console.log('🎨 Setting up interactive highlighting...', { iframe, interactiveMode });

    if (!iframe.contentDocument) {
      console.log('❌ No contentDocument found in iframe');
      return;
    }

    const doc = iframe.contentDocument;
    console.log('📄 Got iframe document:', doc);

    // First, clean up any existing controls
    const existingControls = doc.querySelectorAll('.stillbrook-controls');
    console.log(`🧹 Cleaning up ${existingControls.length} existing controls`);
    existingControls.forEach(control => control.remove());

    const elements = Array.from(
      doc.querySelectorAll(`div.${RESULT_CONTAINER_CLASS}`) as NodeListOf<HTMLElement>
    ).filter(el => !el.closest(`.${EXCLUDED_CONTAINER_WRAPPER_CLASS}`));
    console.log(
      `🎯 Found ${elements.length} elements with class ${RESULT_CONTAINER_CLASS} eligible for interaction`
    );

    if (elements.length === 0) {
      console.log(
        `⚠️ No elements with class ${RESULT_CONTAINER_CLASS} found! Checking for any divs...`
      );
      const allDivs = doc.querySelectorAll('div');
      console.log(`📦 Found ${allDivs.length} total div elements in iframe`);

      // Let's check the first few divs to see their attributes
      Array.from(allDivs)
        .slice(0, 5)
        .forEach((div, index) => {
          console.log(`🔍 Div ${index}:`, {
            className: div.className,
            attributes: Array.from(div.attributes).map(attr => `${attr.name}="${attr.value}"`),
            innerHTML: div.innerHTML.substring(0, 100) + '...',
          });
        });
    }

    elements.forEach((element, index) => {
      const el = element as HTMLElement;
      if (!el.textContent?.trim()) {
        return;
      }
      console.log(`✨ Processing element ${index}:`, {
        tagName: el.tagName,
        className: el.className,
        hasTargetClass: el.classList.contains(RESULT_CONTAINER_CLASS),
        innerHTML: el.innerHTML.substring(0, 100) + '...',
      });

      // Add styles for hoverable elements
      if (!el.style.position || el.style.position === 'static') {
        el.style.position = 'relative';
      }
      el.style.transition = 'all 0.2s ease';

      // Inject hover styles and controls directly into the iframe
      el.style.cursor = 'pointer';

      // Add a visible indicator that this element is interactive
      //el.style.boxShadow = 'inset 0 0 0 1px rgba(33, 150, 243, 0.3)';
      // el.style.backgroundColor = 'rgba(33, 150, 243, 0.05)';

      console.log(`🎨 Applied styles to element ${index}`);

      // Create permanent control overlay for each element
      const overlay = doc.createElement('div');
      overlay.className = 'stillbrook-controls';
      overlay.style.cssText = `
        position: absolute;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        display: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        pointer-events: auto;
      `;

      const hasNegativeHighlight = el.classList.contains('negative-result-highlight');
      const hasPositiveHighlight = el.classList.contains('positive-result-highlight');

      console.log(`🏷️ Element ${index} highlight status:`, {
        hasNegativeHighlight,
        hasPositiveHighlight,
      });

      if (hasNegativeHighlight || hasPositiveHighlight) {
        // Show remove button
        const removeBtn = doc.createElement('button');
        removeBtn.textContent = '✕ Remove';
        removeBtn.style.cssText = `
          background: #ff4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          pointer-events: auto;
        `;
        removeBtn.onclick = e => {
          console.log(`🗑️ Remove button clicked for element ${index}`);
          e.stopPropagation();
          removeHighlight(el);
          // Refresh the controls
          setTimeout(() => setupInteractiveHighlighting(iframe), 100);
        };
        overlay.appendChild(removeBtn);
        console.log(`➖ Added remove button to element ${index}`);
      } else {
        // Show add positive/negative buttons
        const addPositiveBtn = doc.createElement('button');
        addPositiveBtn.textContent = '+ Good';
        addPositiveBtn.style.cssText = `
          background: #22c55e;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          pointer-events: auto;
        `;
        addPositiveBtn.onclick = e => {
          console.log(`✅ Positive button clicked for element ${index}`);
          e.stopPropagation();
          addHighlight(el, 'positive');
          // Refresh the controls
          setTimeout(() => setupInteractiveHighlighting(iframe), 100);
        };

        const addNegativeBtn = doc.createElement('button');
        addNegativeBtn.textContent = '+ Bad';
        addNegativeBtn.style.cssText = `
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          pointer-events: auto;
        `;
        addNegativeBtn.onclick = e => {
          console.log(`❌ Negative button clicked for element ${index}`);
          e.stopPropagation();
          addHighlight(el, 'negative');
          // Refresh the controls
          setTimeout(() => setupInteractiveHighlighting(iframe), 100);
        };

        overlay.appendChild(addPositiveBtn);
        overlay.appendChild(addNegativeBtn);
        console.log(`➕ Added positive/negative buttons to element ${index}`);
      }

      el.appendChild(overlay);
      console.log(`📌 Appended overlay to element ${index}`);

      // Add hover events directly in the iframe context
      el.addEventListener('mouseenter', () => {
        console.log(`🐭 Mouse entered element ${index}`, { interactiveMode });
        if (!interactiveMode) return;
        el.style.boxShadow = 'inset 0 0 0 2px #2196f3';
        el.style.opacity = '0.8';
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        console.log(`👁️ Showing overlay for element ${index}`);
      });

      const hideOverlayIfNotHovered = () => {
        if (el.matches(':hover') || overlay.matches(':hover')) {
          return;
        }
        const hasHighlight =
          el.classList.contains('negative-result-highlight') ||
          el.classList.contains('positive-result-highlight');
        if (!hasHighlight) {
          el.style.boxShadow = '';
        } else {
          el.style.boxShadow = el.style.boxShadow.replace('inset 0 0 0 2px #2196f3', '');
        }
        el.style.opacity = '';
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        console.log(`👁️ Hiding overlay for element ${index}`);
      };

      el.addEventListener('mouseleave', () => {
        console.log(`🐭 Mouse left element ${index}`, { interactiveMode });
        if (!interactiveMode) return;
        setTimeout(hideOverlayIfNotHovered, 50);
      });

      overlay.addEventListener('mouseleave', () => {
        if (!interactiveMode) return;
        setTimeout(hideOverlayIfNotHovered, 50);
      });

      overlay.addEventListener('mouseenter', () => {
        if (!interactiveMode) return;
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
      });

      console.log(`🎉 Completed setup for element ${index}`);
    });

    console.log('✨ Interactive highlighting setup complete!');
  };

  const addHighlight = (element: HTMLElement, type: 'positive' | 'negative') => {
    const target = element.closest<HTMLElement>(`div.${RESULT_CONTAINER_CLASS}`) ?? element;
    const className =
      type === 'positive' ? 'positive-result-highlight' : 'negative-result-highlight';

    target.classList.remove(
      type === 'positive' ? 'negative-result-highlight' : 'positive-result-highlight'
    );
    target.classList.add(className);
  };

  const removeHighlight = (element: HTMLElement) => {
    const target = element.closest<HTMLElement>(`div.${RESULT_CONTAINER_CLASS}`) ?? element;
    target.classList.remove('positive-result-highlight', 'negative-result-highlight');
    target.style.border = '';
    target.style.boxShadow = ''; //inset 0 0 0 1px rgba(33, 150, 243, 0.3)';
  };

  const cleanupInteractiveMode = () => {
    console.log('🧹 Cleaning up interactive mode...');
    // Remove hover styles and controls from all elements
    const iframes = document.querySelectorAll(
      'iframe[title*="Search Results"]'
    ) as NodeListOf<HTMLIFrameElement>;
    iframes.forEach(iframe => {
      if (iframe.contentDocument) {
        const elements = Array.from(
          iframe.contentDocument.querySelectorAll(
            `div.${RESULT_CONTAINER_CLASS}`
          ) as NodeListOf<HTMLElement>
        ).filter(el => !el.closest(`.${EXCLUDED_CONTAINER_WRAPPER_CLASS}`));
        console.log(`🧽 Cleaning ${elements.length} elements in iframe`);
        elements.forEach(el => {
          // Remove interactive styles
          el.style.cursor = '';

          // Remove control overlays
          const controls = el.querySelectorAll('.stillbrook-controls');
          controls.forEach(control => control.remove());

          // Reset box shadows and background for non-highlighted elements
          const hasHighlight =
            el.classList.contains('negative-result-highlight') ||
            el.classList.contains('positive-result-highlight');
          if (!hasHighlight) {
            el.style.boxShadow = '';
            el.style.backgroundColor = '';
          }
        });
      }
    });
    console.log('✨ Cleanup complete');
  };

  const toggleInteractiveMode = () => {
    const newMode = !interactiveMode;
    console.log(`🎛️ Toggling interactive mode: ${interactiveMode} -> ${newMode}`);
    setInteractiveMode(newMode);

    if (newMode) {
      console.log('🔍 Looking for Search Results iframes...');
      // Setup interactive highlighting on all iframes
      const iframes = document.querySelectorAll(
        'iframe[title*="Search Results"]'
      ) as NodeListOf<HTMLIFrameElement>;
      console.log(`📺 Found ${iframes.length} Search Results iframes`);

      if (iframes.length === 0) {
        console.log('⚠️ No Search Results iframes found! Looking for all iframes...');
        const allIframes = document.querySelectorAll('iframe') as NodeListOf<HTMLIFrameElement>;
        console.log(
          `📺 Found ${allIframes.length} total iframes:`,
          Array.from(allIframes).map(iframe => ({
            title: iframe.title,
            src: iframe.src,
            id: iframe.id,
            className: iframe.className,
          }))
        );
      }

      iframes.forEach((iframe, index) => {
        console.log(`📺 Processing iframe ${index}:`, {
          title: iframe.title,
          contentDocument: !!iframe.contentDocument,
        });
        if (iframe.contentDocument) {
          setupInteractiveHighlighting(iframe);
        } else {
          console.log(`⏳ Iframe ${index} not loaded yet, adding load listener`);
          // Wait for iframe to load
          iframe.addEventListener('load', () => {
            console.log(`✅ Iframe ${index} loaded, setting up highlighting`);
            setupInteractiveHighlighting(iframe);
          });
        }
      });
    } else {
      console.log('🧹 Cleaning up interactive mode');
      setHoveredElement(null);
      cleanupInteractiveMode();
    }
  };

  // Effect to setup interactive highlighting when results are loaded
  useEffect(() => {
    if (interactiveMode && result && result.htmlPreview) {
      setTimeout(() => {
        const iframes = document.querySelectorAll(
          'iframe[title*="Search Results"]'
        ) as NodeListOf<HTMLIFrameElement>;
        iframes.forEach(iframe => {
          setupInteractiveHighlighting(iframe);
        });
      }, 1000); // Wait for iframe content to load
    }
  }, [interactiveMode, result]);

  const handleSaveAsNew = () => {
    // Reset loaded search state and show save modal
    setIsLoadedSearch(false);
    setLoadedSearchId(null);
    setOriginalSearchData(null);
    setHasUnsavedChanges(false);
    handleOpenSaveModal();
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
            Agentic Insight
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
      title="Agentic Insight"
      breadcrumbs={[{ label: 'Advanced Tools' }, { label: 'Agentic Insight' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Stack spacing={3}>
            {/* Enhanced Logo Header Section */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                p: 3,
                border: '2px solid',
                borderColor: alpha('#667eea', 0.15),
                borderRadius: 3,
                bgcolor: alpha('#f8fafc', 0.5),
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha('#667eea', 0.1),
                  color: '#667eea',
                  width: 56,
                  height: 56,
                  opacity: showLogoOverlay ? 0 : 1,
                  transition: 'opacity 1s ease-in-out 0.5s',
                }}
              >
                <Camera size={28} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  🤖 Intelligent SERP Screenshot Generator
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate AI-enhanced screenshots of Google search results with advanced targeting
                  and analysis
                </Typography>
              </Box>
            </Box>

            {renderStepIndicator()}

            {error && currentStep === 'form' && (
              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  border: '2px solid',
                  borderColor: alpha('#ef4444', 0.3),
                  bgcolor: alpha('#fef2f2', 0.5),
                  borderRadius: 2,
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', width: 32, height: 32 }}
                  >
                    <Shield size={16} />
                  </Avatar>
                  <Typography color="error" sx={{ fontWeight: 500 }}>
                    {error}
                  </Typography>
                </Box>
              </Paper>
            )}

            {currentStep === 'form' && (
              <Box component="form" onSubmit={handleSubmit}>
                {isLoadedSearch && (
                  <Alert severity={hasUnsavedChanges ? 'warning' : 'info'}>
                    {hasUnsavedChanges ? (
                      <>
                        <strong>Modified search:</strong> &quot;{loadedSearchName}&quot;
                        <br />
                        <small>You have unsaved changes to this search.</small>
                      </>
                    ) : (
                      <>
                        Running saved search: <strong>&quot;{loadedSearchName}&quot;</strong>
                        <br />
                        <small>
                          You can modify the parameters below before running the search.
                        </small>
                      </>
                    )}
                  </Alert>
                )}
                {/* Enhanced Search Configuration Section */}
                <Paper
                  sx={{
                    p: 4,
                    border: '2px solid',
                    borderColor: alpha('#667eea', 0.15),
                    borderRadius: 3,
                    bgcolor: alpha('#f8fafc', 0.5),
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Avatar
                      sx={{
                        bgcolor: alpha('#667eea', 0.1),
                        color: '#667eea',
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Search size={20} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        🔍 Search Configuration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure your intelligent Google search parameters
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Search Query"
                      type="text"
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      required
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} color="#667eea" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'white',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            bgcolor: alpha('#667eea', 0.02),
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#667eea', 0.5),
                            },
                          },
                          '&.Mui-focused': {
                            bgcolor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        },
                        '& .MuiInputLabel-root': {
                          fontWeight: 500,
                          '&.Mui-focused': {
                            color: '#667eea',
                          },
                        },
                      }}
                    />

                    <FormControl fullWidth>
                      <InputLabel sx={{ fontWeight: 600 }}>Geographic Domain</InputLabel>
                      <Select
                        value={googleDomain}
                        label="Geographic Domain"
                        onChange={e => setGoogleDomain(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            <Globe size={18} color="#667eea" />
                          </InputAdornment>
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#667eea', 0.5),
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        }}
                      >
                        {sortedGoogleDomains.map((domain: GoogleDomain) => (
                          <MenuItem key={domain.domain} value={domain.domain}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar
                                sx={{
                                  bgcolor: alpha('#667eea', 0.1),
                                  color: '#667eea',
                                  width: 20,
                                  height: 20,
                                }}
                              >
                                <MapPin size={10} />
                              </Avatar>
                              <span>
                                {domain.domain} - {domain.country_name}
                              </span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel sx={{ fontWeight: 600 }}>Search Language</InputLabel>
                      <Select
                        value={language}
                        label="Search Language"
                        onChange={e => setLanguage(e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            <Languages size={18} color="#8b5cf6" />
                          </InputAdornment>
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#8b5cf6', 0.5),
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#8b5cf6',
                              borderWidth: 2,
                            },
                          },
                        }}
                      >
                        {GOOGLE_LANGUAGES.map((lang: GoogleLanguage) => (
                          <MenuItem key={lang.code} value={lang.code}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar
                                sx={{
                                  bgcolor: alpha('#8b5cf6', 0.1),
                                  color: '#8b5cf6',
                                  width: 20,
                                  height: 20,
                                }}
                              >
                                <Languages size={10} />
                              </Avatar>
                              <span>
                                {lang.name} ({lang.code})
                              </span>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel shrink sx={{ fontWeight: 600 }}>
                        Search Type
                      </InputLabel>
                      <Select
                        value={searchType}
                        label="Search Type"
                        onChange={e => setSearchType(e.target.value)}
                        displayEmpty
                        startAdornment={
                          <InputAdornment position="start">
                            <Filter size={18} color="#f59e0b" />
                          </InputAdornment>
                        }
                        renderValue={selected => {
                          const type = SEARCH_TYPES.find((t: SearchType) => t.value === selected);
                          return type
                            ? `${type.name} - ${type.description}`
                            : 'Web Search - Regular Google Search';
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            bgcolor: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: alpha('#f59e0b', 0.5),
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#f59e0b',
                              borderWidth: 2,
                            },
                          },
                        }}
                      >
                        {SEARCH_TYPES.map((type: SearchType) => {
                          const getIcon = (value: string) => {
                            switch (value) {
                              case '':
                                return <Search size={14} />;
                              case 'isch':
                                return <ImageIcon size={14} />;
                              case 'vid':
                                return <Video size={14} />;
                              case 'nws':
                                return <Newspaper size={14} />;
                              case 'shop':
                                return <ShoppingBag size={14} />;
                              default:
                                return <Search size={14} />;
                            }
                          };

                          return (
                            <MenuItem key={type.value} value={type.value}>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Avatar
                                  sx={{
                                    bgcolor: alpha('#f59e0b', 0.1),
                                    color: '#f59e0b',
                                    width: 20,
                                    height: 20,
                                  }}
                                >
                                  {getIcon(type.value)}
                                </Avatar>
                                <span>
                                  {type.name} - {type.description}
                                </span>
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </Stack>
                </Paper>

                {/* Enhanced Highlight Configuration Section */}
                <Paper
                  sx={{
                    p: 4,
                    border: '2px solid',
                    borderColor: alpha('#f59e0b', 0.15),
                    borderRadius: 3,
                    bgcolor:
                      'linear-gradient(135deg, rgba(245, 158, 11, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Avatar
                      sx={{
                        bgcolor: alpha('#f59e0b', 0.1),
                        color: '#f59e0b',
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Palette size={20} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        🎨 AI Highlight Intelligence
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure intelligent highlighting for comprehensive SERP analysis with
                        AI-powered insights
                      </Typography>
                    </Box>
                  </Box>

                  {/* Enhanced Negative Highlights Section */}
                  <Box
                    sx={{
                      mb: 3,
                      p: 3,
                      border: '2px solid',
                      borderColor: alpha('#ef4444', 0.2),
                      borderRadius: 2,
                      bgcolor:
                        'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)',
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 4,
                        height: '100%',
                        bgcolor: '#ef4444',
                        borderRadius: '2px 0 0 2px',
                      },
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                      🔴 Negative Highlights (Red)
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enableNegativeUrls}
                          onChange={e => setEnableNegativeUrls(e.target.checked)}
                        />
                      }
                      label="Highlight Specific URLs (Red)"
                      sx={{ mb: 1 }}
                    />
                    <br />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enableNegativeSentiment}
                          onChange={e => setEnableNegativeSentiment(e.target.checked)}
                        />
                      }
                      label="Highlight Negative Sentiment (Red)"
                      sx={{ mb: 1 }}
                    />
                    <br />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enableNegativeKeywords}
                          onChange={e => setEnableNegativeKeywords(e.target.checked)}
                        />
                      }
                      label="Highlight Specific Keywords (Red)"
                    />
                  </Box>

                  {/* Negative URL Input */}
                  {enableNegativeUrls && (
                    <URLInputSection
                      title="URLs to Highlight (Red)"
                      urls={urls}
                      setUrls={setUrls}
                      addUrlField={addUrlField}
                      removeUrlField={removeUrlField}
                      color="error"
                    />
                  )}

                  {/* Negative Keyword Input */}
                  {enableNegativeKeywords && (
                    <KeywordInputSection
                      title="Keywords to Highlight (Red)"
                      keywords={keywords}
                      setKeywords={setKeywords}
                      addKeywordField={addKeywordField}
                      removeKeywordField={removeKeywordField}
                      color="error"
                    />
                  )}

                  {/* Positive Highlights Section */}
                  <Box
                    sx={{
                      mb: 4,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'success.light',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                      🟢 Positive Highlights (Green)
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enablePositiveUrls}
                          onChange={e => setEnablePositiveUrls(e.target.checked)}
                        />
                      }
                      label="Highlight Specific URLs (Green)"
                      sx={{ mb: 1 }}
                    />
                    <br />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enablePositiveSentiment}
                          onChange={e => setEnablePositiveSentiment(e.target.checked)}
                        />
                      }
                      label="Highlight Positive Sentiment (Green)"
                      sx={{ mb: 1 }}
                    />
                    <br />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enablePositiveKeywords}
                          onChange={e => setEnablePositiveKeywords(e.target.checked)}
                        />
                      }
                      label="Highlight Specific Keywords (Green)"
                    />
                  </Box>

                  {/* Positive URL Input */}
                  {enablePositiveUrls && (
                    <URLInputSection
                      title="URLs to Highlight (Green)"
                      urls={positiveUrls}
                      setUrls={setPositiveUrls}
                      addUrlField={addPositiveUrlField}
                      removeUrlField={removePositiveUrlField}
                      color="success"
                    />
                  )}

                  {/* Positive Keyword Input */}
                  {enablePositiveKeywords && (
                    <KeywordInputSection
                      title="Keywords to Highlight (Green)"
                      keywords={positiveKeywords}
                      setKeywords={setPositiveKeywords}
                      addKeywordField={addPositiveKeywordField}
                      removeKeywordField={removePositiveKeywordField}
                      color="success"
                    />
                  )}
                </Paper>

                {/* Enhanced Geographic Location Section */}
                <Paper
                  sx={{
                    p: 3,
                    border: '2px solid',
                    borderColor: alpha('#10b981', 0.15),
                    borderRadius: 2,
                    bgcolor: alpha('#f0fdf4', 0.5),
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar
                      sx={{
                        bgcolor: alpha('#10b981', 0.1),
                        color: '#10b981',
                        width: 32,
                        height: 32,
                      }}
                    >
                      <MapPin size={16} />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      🗺️ Geographic Targeting
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    label="Geographic Location (Optional)"
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. New York, NY or London, UK"
                    variant="outlined"
                    helperText="Examples: 'New York, NY', 'London, UK', 'Los Angeles, California'"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Map size={18} color="#10b981" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'white',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha('#10b981', 0.5),
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#10b981',
                          borderWidth: 2,
                        },
                      },
                    }}
                  />
                </Paper>

                {/* Enhanced Options Section */}
                <Paper
                  sx={{
                    p: 3,
                    border: '2px solid',
                    borderColor: alpha('#8b5cf6', 0.15),
                    borderRadius: 2,
                    bgcolor: alpha('#faf5ff', 0.5),
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar
                      sx={{
                        bgcolor: alpha('#8b5cf6', 0.1),
                        color: '#8b5cf6',
                        width: 32,
                        height: 32,
                      }}
                    >
                      <Settings size={16} />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      ⚙️ Advanced Options
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includePage2}
                        onChange={e => setIncludePage2(e.target.checked)}
                        sx={{
                          color: '#8b5cf6',
                          '&.Mui-checked': {
                            color: '#8b5cf6',
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Include Page 2 Results
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          More comprehensive analysis with extended SERP data
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                {/* Enhanced Action Section */}
                <Paper
                  sx={{
                    p: 4,
                    border: '2px solid',
                    borderColor: alpha('#667eea', 0.2),
                    borderRadius: 3,
                    bgcolor:
                      'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 1) 100%)',
                    textAlign: 'center',
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={3}>
                    <Avatar
                      sx={{
                        bgcolor: alpha('#667eea', 0.1),
                        color: '#667eea',
                        width: 40,
                        height: 40,
                      }}
                    >
                      <Zap size={20} />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Launch AI Analysis
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                    <IntercomButton
                      variant="primary"
                      type="submit"
                      disabled={loading}
                      startIcon={
                        loading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Brain size={18} />
                        )
                      }
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        minWidth: 160,
                        py: 1.5,
                      }}
                    >
                      {loading ? 'AI Processing...' : 'Generate Screenshot'}
                    </IntercomButton>

                    {/* Show different buttons based on loaded search state and changes */}
                    {!isLoadedSearch && (
                      <IntercomButton
                        variant="secondary"
                        startIcon={<Bookmark size={18} />}
                        onClick={handleOpenSaveModal}
                        disabled={loading}
                        sx={{
                          borderColor: alpha('#10b981', 0.3),
                          color: '#10b981',
                          '&:hover': {
                            bgcolor: alpha('#10b981', 0.1),
                            borderColor: '#10b981',
                          },
                        }}
                      >
                        Save Search
                      </IntercomButton>
                    )}

                    {isLoadedSearch && !hasUnsavedChanges && (
                      <IntercomButton
                        variant="secondary"
                        onClick={() => router.push('/my-saved-searches')}
                        disabled={loading}
                        startIcon={<ArrowLeft size={18} />}
                        sx={{
                          color: '#6b7280',
                          borderColor: alpha('#6b7280', 0.3),
                          '&:hover': {
                            bgcolor: alpha('#6b7280', 0.1),
                          },
                        }}
                      >
                        Back to Saved Searches
                      </IntercomButton>
                    )}
                  </Stack>
                </Paper>

                {isLoadedSearch && hasUnsavedChanges && !showUpdateOptions && (
                  <IntercomButton
                    variant="secondary"
                    onClick={() => setShowUpdateOptions(true)}
                    disabled={loading}
                  >
                    Save Changes
                  </IntercomButton>
                )}

                {isLoadedSearch && hasUnsavedChanges && showUpdateOptions && (
                  <>
                    <IntercomButton
                      variant="primary"
                      onClick={handleUpdateSearch}
                      disabled={loading || isUpdatingSearch}
                    >
                      {isUpdatingSearch ? 'Updating...' : 'Update Search'}
                    </IntercomButton>
                    <IntercomButton
                      variant="secondary"
                      leftIcon={<BookmarkAddIcon />}
                      onClick={handleSaveAsNew}
                      disabled={loading || isUpdatingSearch}
                    >
                      Save as New Search
                    </IntercomButton>
                    <IntercomButton
                      variant="ghost"
                      onClick={() => setShowUpdateOptions(false)}
                      disabled={loading || isUpdatingSearch}
                    >
                      Cancel
                    </IntercomButton>
                  </>
                )}
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
                    <Alert
                      severity={
                        result.matchedResults?.length
                          ? 'success'
                          : result.noMatches
                            ? 'error'
                            : 'warning'
                      }
                    >
                      {result.matchedResults?.length
                        ? `Found ${result.matchedResults.length} matching results`
                        : result.noMatches
                          ? `No ${result.searchType?.replace('_', ' ')} matches found${result.totalResults ? ` in ${result.totalResults} search results` : ''}, but generated screenshot of all results`
                          : 'No matching results found, but generated screenshot of all results'}
                      {result.totalResults && !result.noMatches
                        ? ` out of ${result.totalResults} total results`
                        : ''}
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

                        {/* Action Buttons */}
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 2,
                            mb: 3,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-start',
                          }}
                        >
                          {/* Run Another Search */}
                          <Button
                            variant="outlined"
                            onClick={handleRunAnotherSearch}
                            startIcon={<RefreshIcon />}
                            sx={{
                              borderRadius: 1,
                              textTransform: 'none',
                              fontWeight: 500,
                            }}
                          >
                            New Search
                          </Button>

                          {/* Interactive Mode Toggle */}
                          <Button
                            variant={interactiveMode ? 'contained' : 'outlined'}
                            onClick={toggleInteractiveMode}
                            startIcon={interactiveMode ? <EditOffIcon /> : <EditIcon />}
                            sx={{
                              borderRadius: 1,
                              textTransform: 'none',
                              fontWeight: 500,
                            }}
                          >
                            {interactiveMode ? 'Done' : 'Edit'}
                          </Button>

                          {/* Download PNG */}
                          <Button
                            variant="contained"
                            onClick={handleDownloadImage}
                            disabled={isGeneratingImage}
                            startIcon={
                              isGeneratingImage ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <DownloadIcon />
                              )
                            }
                            sx={{
                              borderRadius: 1,
                              textTransform: 'none',
                              fontWeight: 500,
                            }}
                          >
                            {isGeneratingImage ? 'Generating...' : 'Download PNG'}
                          </Button>

                          {/* Download HTML */}
                          <Button
                            variant="outlined"
                            onClick={handleDownloadHTML}
                            startIcon={<CodeIcon />}
                            sx={{
                              borderRadius: 1,
                              textTransform: 'none',
                              fontWeight: 500,
                            }}
                          >
                            Download HTML
                          </Button>

                          {/* Save Search */}
                          <Button
                            variant="outlined"
                            onClick={() => setShowSaveModal(true)}
                            startIcon={<SaveIcon />}
                            sx={{
                              borderRadius: 1,
                              textTransform: 'none',
                              fontWeight: 500,
                            }}
                          >
                            Save Search
                          </Button>
                        </Box>

                        {/* Interactive Mode Status Message */}
                        {interactiveMode && (
                          <Box
                            sx={{
                              mb: 3,
                              p: 1.5,
                              // backgroundColor: '#fff3cd',
                              border: '1px solid #ffeaa7',
                              borderRadius: 1,
                              textAlign: 'center',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: '#856404',
                              }}
                            >
                              💡 <strong>Edit Mode Active:</strong> Hover over search results below
                              to add green (good) or red (bad) highlighting
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </IntercomCard>

                    {/* HTML Preview with Read-Only Styling */}
                    {result.page2HtmlPreview ? (
                      // Side-by-side layout for page 1 and page 2
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 2,
                          '& *': {
                            pointerEvents: interactiveMode ? 'auto !important' : 'none !important',
                            userSelect: interactiveMode ? 'auto !important' : 'none !important',
                          },
                          '& iframe': {
                            pointerEvents: 'auto !important', // Allow iframe interactions
                          },
                        }}
                      >
                        {/* Page 1 */}
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{ mb: 2, color: '#1a73e8', textAlign: 'center' }}
                          >
                            📄 Page 1 Results (1-10)
                          </Typography>
                          <Box
                            sx={{
                              border: '2px solid #1a73e8',
                              borderRadius: 2,
                              overflow: 'hidden',
                              backgroundColor: '#fff',
                            }}
                          >
                            <iframe
                              srcDoc={result.htmlPreview}
                              style={{
                                width: '100%',
                                height: '500px',
                                border: 'none',
                                pointerEvents: 'auto',
                                display: 'block',
                                overflow: 'auto',
                              }}
                              sandbox="allow-same-origin allow-scripts"
                              title="Page 1 Search Results"
                              loading="lazy"
                              scrolling="auto"
                            />
                          </Box>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IntercomButton
                              variant="ghost"
                              size="small"
                              onClick={() => handleDownloadPage(result.htmlPreview!, 'page-1')}
                            >
                              📁 Download Page 1 HTML
                            </IntercomButton>
                            <IntercomButton
                              variant="ghost"
                              size="small"
                              onClick={() => handleDownloadPageImage('page-1')}
                            >
                              📷 Download Page 1 PNG
                            </IntercomButton>
                          </Box>
                        </Box>

                        {/* Page 2 */}
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{ mb: 2, color: '#34a853', textAlign: 'center' }}
                          >
                            📄 Page 2 Results (11-20)
                          </Typography>
                          <Box
                            sx={{
                              border: '2px solid #34a853',
                              borderRadius: 2,
                              overflow: 'hidden',
                              backgroundColor: '#fff',
                            }}
                          >
                            <iframe
                              srcDoc={result.page2HtmlPreview}
                              style={{
                                width: '100%',
                                height: '500px',
                                border: 'none',
                                pointerEvents: 'auto',
                                display: 'block',
                                overflow: 'auto',
                              }}
                              sandbox="allow-same-origin allow-scripts"
                              title="Page 2 Search Results"
                              loading="lazy"
                              scrolling="auto"
                            />
                          </Box>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IntercomButton
                              variant="ghost"
                              size="small"
                              onClick={() => handleDownloadPage(result.page2HtmlPreview!, 'page-2')}
                            >
                              📁 Download Page 2 HTML
                            </IntercomButton>
                            <IntercomButton
                              variant="ghost"
                              size="small"
                              onClick={() => handleDownloadPageImage('page-2')}
                            >
                              📷 Download Page 2 PNG
                            </IntercomButton>
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      // Single page layout
                      <Box
                        sx={{
                          border: '1px solid #ddd',
                          borderRadius: 2,
                          overflow: 'hidden',
                          maxHeight: '600px',
                          overflowY: 'auto',
                          position: 'relative',
                          backgroundColor: '#ffffff !important',
                          '& *': {
                            pointerEvents: interactiveMode ? 'auto !important' : 'none !important',
                            userSelect: interactiveMode ? 'auto !important' : 'none !important',
                          },
                          '& iframe': {
                            pointerEvents: 'auto !important',
                          },
                          '& a': {
                            cursor: interactiveMode ? 'pointer !important' : 'default !important',
                            textDecoration: interactiveMode
                              ? 'underline !important'
                              : 'none !important',
                          },
                          '& button, & input, & select, & textarea': {
                            cursor: interactiveMode ? 'pointer !important' : 'default !important',
                          },
                        }}
                        title={
                          interactiveMode
                            ? 'Interactive mode - hover over search results to highlight'
                            : 'Preview only - links and interactions are disabled for cleaner screenshots'
                        }
                      >
                        <Box
                          id="html-preview"
                          sx={{
                            border: '1px solid #ddd',
                            borderRadius: 2,
                            overflow: 'hidden',
                            maxHeight: '600px',
                            overflowY: 'auto',
                            position: 'relative',
                            backgroundColor: '#fff',
                            pointerEvents: 'auto',
                          }}
                        >
                          <iframe
                            srcDoc={result.htmlPreview}
                            style={{
                              width: '100%',
                              height: '600px',
                              border: 'none',
                              borderRadius: '4px',
                              pointerEvents: 'auto',
                              display: 'block',
                              overflow: 'auto',
                            }}
                            sandbox="allow-same-origin allow-scripts"
                            title="Search Results Preview"
                            loading="lazy"
                            scrolling="auto"
                          />
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

      {/* Save Search Modal */}
      <Dialog open={showSaveModal} onClose={() => setShowSaveModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Stillbrook Search</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Search Name"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="Enter a name for this Stillbrook search"
              required
            />
            <ClientDropdown
              value={selectedClient}
              onChange={setSelectedClient}
              onClientIdChange={setSelectedClientId}
              fullWidth
              required
              label="Select Client"
            />
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Search Parameters Summary:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Search Term: {keyword || 'Not specified'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Domain: {googleDomain || 'google.com'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Language: {language || 'en'}
              </Typography>
              {location && (
                <Typography variant="body2" color="text.secondary">
                  • Location: {location}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                • Negative Highlights:{' '}
                {[
                  enableNegativeUrls && 'URLs',
                  enableNegativeSentiment && 'Sentiment',
                  enableNegativeKeywords && 'Keywords',
                ]
                  .filter(Boolean)
                  .join(', ') || 'None'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Positive Highlights:{' '}
                {[
                  enablePositiveUrls && 'URLs',
                  enablePositiveSentiment && 'Sentiment',
                  enablePositiveKeywords && 'Keywords',
                ]
                  .filter(Boolean)
                  .join(', ') || 'None'}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveModal(false)}>Cancel</Button>
          <Button
            onClick={handleSaveSearch}
            disabled={isSavingSearch || !searchName.trim() || !selectedClientId}
            variant="contained"
          >
            {isSavingSearch ? 'Saving...' : 'Save Stillbrook Search'}
          </Button>
        </DialogActions>
      </Dialog>
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
