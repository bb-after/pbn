import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Chip,
  InputAdornment,
  IconButton,
  Stack,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Autocomplete,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Avatar,
  LinearProgress,
  Fade,
  alpha,
  Grid,
  Paper,
  Grow,
  Tooltip,
} from '@mui/material';
import {
  IntercomLayout,
  ThemeProvider,
  ToastProvider,
  IntercomCard,
  IntercomButton,
} from '../components/ui';
import ClientDropdown from 'components/ClientDropdown';
import useAuth from '../hooks/useAuth';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useRouter } from 'next/router';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

// Modern Icons
import {
  Brain,
  ExternalLink,
  Target,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Globe,
  Settings,
  Shield,
  TrendingUp,
  FileText,
  Users,
  Activity,
  Award,
  Plus,
  X,
  Edit3,
  RefreshCw,
  Link as LinkIcon,
  Search,
  Wand2,
  Rocket,
} from 'lucide-react';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

// Quill editor configuration
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link'];

// Helper function to ensure all links open in new tabs
const processContentLinks = (content: string): string => {
  if (!content) return '';

  // Use DOMParser to safely parse the HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  // Find all links and add target="_blank" and rel="noopener noreferrer"
  doc.querySelectorAll('a').forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  return doc.body.innerHTML;
};

interface Backlink {
  urlType: 'existing' | 'custom';
  url: string;
  keyword: string;
  selectedArticleId: number | null;
}

interface ArticleData {
  id: string; // Unique identifier for each article
  backlinks: Backlink[];
  useDefaultBacklinks: boolean; // Whether to use Article 1's backlinks
}

interface BacklinkFormData {
  clientName: string;
  clientId: number | null;
  articles: ArticleData[];
}

interface ArticlePreview {
  title: string;
  content: string;
  isEditing: boolean;
  articleId: string; // To match with the original article
}

interface SuperstarArticle {
  id: number;
  title: string;
  url: string;
  domain: string;
  display: string;
}

const MAX_BACKLINKS_PER_ARTICLE = 4;
const STEPS = [
  { label: 'Link Strategy', icon: Settings },
  { label: 'Content Review', icon: FileText },
  { label: 'Launch Campaign', icon: Rocket },
];

// Helper function to create a new article
const createArticle = (isFirst: boolean = false): ArticleData => ({
  id: Date.now().toString(),
  backlinks: [createBacklink()],
  useDefaultBacklinks: !isFirst, // First article doesn't use default backlinks
});

// Helper function to create a new backlink
const createBacklink = (): Backlink => ({
  urlType: 'existing',
  url: '',
  keyword: '',
  selectedArticleId: null,
});

// Helper function to shuffle an array
const shuffleArray = <T extends unknown>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Modern Step Card Component
const StepCard = ({
  children,
  isActive,
  isCompleted,
}: {
  children: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
}) => (
  <Card
    sx={{
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isActive ? 'scale(1.02)' : 'scale(1)',
      border: '2px solid',
      borderColor: isActive ? '#667eea' : isCompleted ? '#10b981' : alpha('#e5e7eb', 0.5),
      background: isActive
        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
        : 'white',
      boxShadow: isActive
        ? `0 20px 25px -5px ${alpha('#667eea', 0.1)}`
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}
  >
    <CardContent sx={{ p: 4 }}>{children}</CardContent>
  </Card>
);

// AI Processing Animation Component
const AIProcessingAnimation = ({
  isProcessing,
  stage,
}: {
  isProcessing: boolean;
  stage: number;
}) => {
  if (!isProcessing) return null;

  const stages = [
    'Analyzing link opportunities...',
    'Optimizing anchor text distribution...',
    'Generating contextual content...',
    'Finalizing link integration...',
  ];

  return (
    <Fade in={isProcessing}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
          <Box display="flex" alignItems="center" gap={3} mb={3}>
            <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 56, height: 56 }}>
              <Brain size={28} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Autolink Intelligence Processing
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {stages[stage] || 'Optimizing your link strategy...'}
              </Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="indeterminate"
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha('#fff', 0.2),
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white',
                borderRadius: 4,
              },
            }}
          />
        </CardContent>
      </Card>
    </Fade>
  );
};

function BacklinkBuddyContent() {
  const router = useRouter();
  const { isValidUser, token } = useAuth('/login');
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<BacklinkFormData>({
    clientName: '',
    clientId: null,
    articles: [createArticle(true)], // First article is created with useDefaultBacklinks=false
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [articlePreviews, setArticlePreviews] = useState<ArticlePreview[]>([]);
  const [generating, setGenerating] = useState(false);
  const [superstarArticles, setSuperstarArticles] = useState<SuperstarArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<SuperstarArticle | null>(null);
  const [articleSearchInput, setArticleSearchInput] = useState('');
  const [copySourceArticleId, setCopySourceArticleId] = useState<string>('');
  const [showBacklinksWarning, setShowBacklinksWarning] = useState<string | null>(null);
  const [regeneratingArticles, setRegeneratingArticles] = useState<{ [key: string]: boolean }>({});

  const fetchSuperstarArticles = useCallback(
    async (clientId: number) => {
      setLoadingArticles(true);
      try {
        const response = await axios.get(
          `/api/superstar-articles/by-client?clientId=${clientId}&search=${articleSearchInput}`
        );
        setSuperstarArticles(response.data);
      } catch (error) {
        console.error('Error fetching superstar articles:', error);
        setSuperstarArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    },
    [articleSearchInput]
  );

  // Update dependency arrays in both useEffects
  useEffect(() => {
    if (formData.clientId) {
      fetchSuperstarArticles(formData.clientId);
    } else {
      setSuperstarArticles([]);
      setSelectedArticle(null);
    }
  }, [formData.clientId, fetchSuperstarArticles]);

  useEffect(() => {
    const hasExistingBacklinks = formData.articles.some(article =>
      article.backlinks.some(backlink => backlink.urlType === 'existing')
    );

    if (formData.clientId && hasExistingBacklinks) {
      fetchSuperstarArticles(formData.clientId);
    }
  }, [formData.clientId, formData.articles, fetchSuperstarArticles]);

  const handleAddArticle = () => {
    setFormData(prev => ({
      ...prev,
      articles: [...prev.articles, createArticle()], // New articles use default backlinks by default
    }));
  };

  const handleRemoveArticle = (articleId: string) => {
    if (formData.articles.length <= 1) {
      setError('You must have at least one article');
      return;
    }

    setFormData(prev => ({
      ...prev,
      articles: prev.articles.filter(article => article.id !== articleId),
    }));
  };

  const handleAddBacklink = (articleId: string) => {
    const article = formData.articles.find(a => a.id === articleId);
    if (!article || article.backlinks.length >= MAX_BACKLINKS_PER_ARTICLE) return;

    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map(a =>
        a.id === articleId ? { ...a, backlinks: [...a.backlinks, createBacklink()] } : a
      ),
    }));
  };

  const handleRemoveBacklink = (articleId: string, backlinkIndex: number) => {
    const article = formData.articles.find(a => a.id === articleId);
    if (!article || article.backlinks.length <= 1) return; // Keep at least one backlink

    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map(a =>
        a.id === articleId
          ? { ...a, backlinks: a.backlinks.filter((_, i) => i !== backlinkIndex) }
          : a
      ),
    }));
  };

  const handleUrlTypeChange = (
    articleId: string,
    backlinkIndex: number,
    newValue: 'existing' | 'custom'
  ) => {
    console.log('handleUrlTypeChange called with:', {
      articleId,
      backlinkIndex,
      newValue,
      currentBacklink: formData.articles.find(a => a.id === articleId)?.backlinks[backlinkIndex],
    });

    // If switching to existing, ensure we have articles loaded
    if (newValue === 'existing' && formData.clientId) {
      fetchSuperstarArticles(formData.clientId);
    }

    setFormData(prev => {
      const updatedData = {
        ...prev,
        articles: prev.articles.map(a =>
          a.id === articleId
            ? {
                ...a,
                backlinks: a.backlinks.map((b, i) =>
                  i === backlinkIndex
                    ? {
                        ...b,
                        urlType: newValue,
                        ...(newValue === 'custom' ? { url: '', selectedArticleId: null } : {}),
                      }
                    : b
                ),
              }
            : a
        ),
      };

      console.log('URL type change updated data:', {
        oldBacklink: prev.articles.find(a => a.id === articleId)?.backlinks[backlinkIndex],
        newBacklink: updatedData.articles.find(a => a.id === articleId)?.backlinks[backlinkIndex],
      });

      return updatedData;
    });
  };

  const handleBacklinkChange = (
    articleId: string,
    backlinkIndex: number,
    field: keyof Backlink,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map(a =>
        a.id === articleId
          ? {
              ...a,
              backlinks: a.backlinks.map((b, i) =>
                i === backlinkIndex ? { ...b, [field]: value } : b
              ),
            }
          : a
      ),
    }));
  };

  const handleArticleUrlSelection = (
    articleId: string,
    backlinkIndex: number,
    selectedSuperstarArticle: SuperstarArticle | null
  ) => {
    console.log('handleArticleUrlSelection called with:', {
      articleId,
      backlinkIndex,
      selectedSuperstarArticle,
    });

    setFormData(prev => {
      const updatedData = {
        ...prev,
        articles: prev.articles.map(a =>
          a.id === articleId
            ? {
                ...a,
                backlinks: a.backlinks.map((b, i) =>
                  i === backlinkIndex
                    ? {
                        ...b,
                        url: selectedSuperstarArticle?.url || '',
                        selectedArticleId: selectedSuperstarArticle?.id || null,
                        urlType: selectedSuperstarArticle ? 'existing' : b.urlType,
                      }
                    : b
                ),
              }
            : a
        ),
      };

      console.log('Updated form data:', {
        oldBacklink: prev.articles.find(a => a.id === articleId)?.backlinks[backlinkIndex],
        newBacklink: updatedData.articles.find(a => a.id === articleId)?.backlinks[backlinkIndex],
      });

      return updatedData;
    });
  };

  const handleCopyBacklinks = (targetArticleId: string, sourceArticleId: string) => {
    if (targetArticleId === sourceArticleId) return;

    const sourceArticle = formData.articles.find(a => a.id === sourceArticleId);
    if (!sourceArticle || !sourceArticle.backlinks.length) return;

    // Copy backlinks from source to target article
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map(a =>
        a.id === targetArticleId ? { ...a, backlinks: [...sourceArticle.backlinks] } : a
      ),
    }));

    setCopySourceArticleId(''); // Reset selection
  };

  const getDefaultBacklinks = (): Backlink[] => {
    const firstArticle = formData.articles[0];
    return firstArticle ? [...firstArticle.backlinks] : [];
  };

  const toggleUseDefaultBacklinks = (articleId: string) => {
    const article = formData.articles.find(a => a.id === articleId);
    if (!article) return;

    // If switching from custom to default backlinks and has custom backlinks defined, show warning
    if (!article.useDefaultBacklinks && hasCustomBacklinks(articleId)) {
      setShowBacklinksWarning(articleId);
      return;
    }

    applyBacklinksToggle(articleId);
  };

  const applyBacklinksToggle = (articleId: string) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map(a =>
        a.id === articleId
          ? {
              ...a,
              useDefaultBacklinks: !a.useDefaultBacklinks,
              // If switching to default, use first article's backlinks
              backlinks: !a.useDefaultBacklinks ? getDefaultBacklinks() : a.backlinks,
            }
          : a
      ),
    }));
    setShowBacklinksWarning(null);
  };

  const hasCustomBacklinks = (articleId: string): boolean => {
    const article = formData.articles.find(a => a.id === articleId);
    if (!article) return false;

    // Check if any backlink has data
    return article.backlinks.some(
      backlink => backlink.keyword || backlink.url || backlink.selectedArticleId
    );
  };

  // Validate form before proceeding
  const validateForm = (): boolean => {
    // Check client selection
    if (!formData.clientId) {
      setError('Please select a client');
      return false;
    }

    // Check first article's backlinks (they're used as default)
    const firstArticle = formData.articles[0];
    for (const backlink of firstArticle.backlinks) {
      // Check URL based on type
      if (backlink.urlType === 'existing' && !backlink.selectedArticleId) {
        setError('Please select a Superstar article for all backlinks in Article 1');
        return false;
      } else if (backlink.urlType === 'custom' && (!backlink.url || !backlink.url.trim())) {
        setError('Please enter a valid URL for all backlinks in Article 1');
        return false;
      }

      // Check keyword
      if (!backlink.keyword || !backlink.keyword.trim()) {
        setError('Please enter a keyword for all backlinks in Article 1');
        return false;
      }
    }

    // For other articles, only validate if they use custom backlinks
    for (let i = 1; i < formData.articles.length; i++) {
      const article = formData.articles[i];
      if (!article.useDefaultBacklinks) {
        for (const backlink of article.backlinks) {
          // Check URL based on type
          if (backlink.urlType === 'existing' && !backlink.selectedArticleId) {
            setError(`Please select a Superstar article for all backlinks in Article ${i + 1}`);
            return false;
          } else if (backlink.urlType === 'custom' && (!backlink.url || !backlink.url.trim())) {
            setError(`Please enter a valid URL for all backlinks in Article ${i + 1}`);
            return false;
          }

          // Check keyword
          if (!backlink.keyword || !backlink.keyword.trim()) {
            setError(`Please enter a keyword for all backlinks in Article ${i + 1}`);
            return false;
          }
        }
      }
    }

    // All checks passed
    return true;
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate inputs using the validation function
      if (!validateForm()) {
        return;
      }

      setError(null);
      setGenerating(true);

      try {
        // Generate article previews
        const previews = await Promise.all(
          formData.articles.map(async article => {
            // For articles using default backlinks, use the first article's backlinks
            const backlinksToUse = article.useDefaultBacklinks
              ? getDefaultBacklinks()
              : article.backlinks;

            // For the prompt, shuffle the backlinks to randomize their order
            const shuffledBacklinks = shuffleArray(backlinksToUse);

            // Extract the first backlink URL as the main URL (API requires a single URL)
            const mainUrl = shuffledBacklinks[0]?.url || '';

            // Extract keywords from backlinks
            const keywords = shuffledBacklinks.map(b => b.keyword);

            const response = await axios.post('/api/pbn-site-submissions/preview', {
              url: mainUrl,
              keywords: keywords,
              client: formData.clientName,
              backlinks: shuffledBacklinks.map(bl => ({
                url: bl.url,
                keyword: bl.keyword,
              })),
              randomizeOrder: true, // Signal to backend to randomize the order
            });

            return {
              title: response.data.title || '',
              content: response.data.content || '',
              isEditing: false,
              articleId: article.id,
            };
          })
        );
        setArticlePreviews(previews);

        // Log content generation activity
        try {
          await axios.post('/api/log-backlink-buddy', {
            userToken: token,
            clientId: formData.clientId,
            clientName: formData.clientName,
            actionType: 'content_generation',
            articleCount: formData.articles.length,
            details: {
              articleIds: formData.articles.map(a => a.id),
              backlinksCount: formData.articles.reduce(
                (sum, article) => sum + article.backlinks.length,
                0
              ),
            },
          });
        } catch (logError) {
          console.error('Error logging backlink buddy activity:', logError);
          // Continue with the process even if logging fails
        }

        setActiveStep(prev => prev + 1);
      } catch (error: any) {
        console.error('Error generating previews:', error);
        setError(
          error.response?.data?.message || error.message || 'Failed to generate article previews'
        );
      } finally {
        setGenerating(false);
      }
    } else if (activeStep === 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleArticleEdit = (index: number) => {
    setArticlePreviews(prev =>
      prev.map((article, i) => ({
        ...article,
        isEditing: i === index ? !article.isEditing : article.isEditing,
      }))
    );
  };

  const handleArticleUpdate = (index: number, field: 'title' | 'content', value: string) => {
    setArticlePreviews(prev =>
      prev.map((article, i) => (i === index ? { ...article, [field]: value } : article))
    );
  };

  const handlePublish = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Prepare articles data for bulk submission
      const articles = articlePreviews.map(article => {
        // Find the corresponding article data to get backlink info
        const articleData = formData.articles.find(a => a.id === article.articleId);
        const backlinks = articleData?.useDefaultBacklinks
          ? getDefaultBacklinks()
          : articleData?.backlinks || [];

        return {
          title: article.title,
          content: article.content,
          // Add backlinks as metadata for tracking
          backlinks: backlinks.map(b => ({
            url: b.url,
            keyword: b.keyword,
          })),
        };
      });

      // Use bulkPostToWordPress endpoint to submit all articles at once
      await axios.post('/api/bulkPostToWordPress', {
        articles,
        clientName: formData.clientName,
        clientId: formData.clientId,
        category: 'General',
        userToken: token, // Pass the actual user token instead of null
        source: 'backlink-buddy',
      });

      // Redirect to submissions page
      router.push('/pbn-site-submissions');
    } catch (error: any) {
      console.error('Error publishing articles:', error);
      setError(error.response?.data?.message || error.message || 'Failed to publish articles');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if an article has valid backlinks (for copy option)
  const hasValidBacklinks = (articleId: string): boolean => {
    const article = formData.articles.find(a => a.id === articleId);
    if (!article) return false;

    return article.backlinks.some(
      backlink =>
        (backlink.urlType === 'existing' && backlink.selectedArticleId) ||
        (backlink.urlType === 'custom' && backlink.url && backlink.keyword)
    );
  };

  // Get valid articles for backlink copying
  const getArticlesWithValidBacklinks = (): ArticleData[] => {
    return formData.articles.filter(article => hasValidBacklinks(article.id));
  };

  const handleRegenerateArticle = async (articleId: string) => {
    setRegeneratingArticles(prev => ({ ...prev, [articleId]: true }));
    setError(null);

    try {
      // Find the corresponding article data
      const articleData = formData.articles.find(a => a.id === articleId);
      if (!articleData) {
        throw new Error('Article data not found');
      }

      // Get the backlinks to use
      const backlinksToUse = articleData.useDefaultBacklinks
        ? getDefaultBacklinks()
        : articleData.backlinks;

      // For the prompt, shuffle the backlinks to randomize their order
      const shuffledBacklinks = shuffleArray(backlinksToUse);

      // Extract the first backlink URL as the main URL (API requires a single URL)
      const mainUrl = shuffledBacklinks[0]?.url || '';

      // Extract keywords from backlinks
      const keywords = shuffledBacklinks.map(b => b.keyword);

      const response = await axios.post('/api/pbn-site-submissions/preview', {
        url: mainUrl,
        keywords: keywords,
        client: formData.clientName,
        backlinks: shuffledBacklinks.map(bl => ({
          url: bl.url,
          keyword: bl.keyword,
        })),
        randomizeOrder: true,
      });

      // Update the article preview
      setArticlePreviews(prev =>
        prev.map(article =>
          article.articleId === articleId
            ? {
                ...article,
                title: response.data.title || '',
                content: response.data.content || '',
                isEditing: false,
              }
            : article
        )
      );

      // Log regenerate activity
      try {
        await axios.post('/api/log-backlink-buddy', {
          userToken: token,
          clientId: formData.clientId,
          clientName: formData.clientName,
          actionType: 'regenerate',
          articleCount: 1,
          details: {
            articleId: articleId,
            backlinksCount: backlinksToUse.length,
          },
        });
      } catch (logError) {
        console.error('Error logging backlink buddy regenerate activity:', logError);
        // Continue with the process even if logging fails
      }
    } catch (error: any) {
      console.error('Error regenerating article:', error);
      setError(error.response?.data?.message || error.message || 'Failed to regenerate article');
    } finally {
      setRegeneratingArticles(prev => ({ ...prev, [articleId]: false }));
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <StepCard isActive={true} isCompleted={false}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Avatar sx={{ bgcolor: '#667eea', width: 56, height: 56 }}>
                <Settings size={28} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Link Strategy Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Define your client, articles, and strategic link placements
                </Typography>
              </Box>
            </Box>

            <Stack spacing={4}>
              <Box>
                <Box
                  sx={{
                    p: 3,
                    border: '2px solid',
                    borderColor: alpha('#667eea', 0.2),
                    borderRadius: 3,
                    bgcolor:
                      'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)',
                    mb: 2,
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
                      <Users size={20} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Client & Project Configuration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Select your target client for intelligent link strategy
                      </Typography>
                    </Box>
                  </Box>
                  <ClientDropdown
                    value={formData.clientName}
                    onChange={newValue => setFormData(prev => ({ ...prev, clientName: newValue }))}
                    onClientIdChange={newClientId => {
                      setFormData(prev => ({ ...prev, clientId: newClientId }));
                      setLoadingArticles(true);
                    }}
                    fullWidth
                    required
                    margin="normal"
                    variant="outlined"
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
                        fontWeight: 600,
                        '&.Mui-focused': {
                          color: '#667eea',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* <Box
                sx={{
                  textAlign: 'center',
                  p: 4,
                  border: '2px solid',
                  borderColor: alpha('#667eea', 0.15),
                  borderRadius: 3,
                  bgcolor:
                    'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
                  mb: 4,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: alpha('#667eea', 0.1),
                    color: '#667eea',
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <FileText size={28} />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                  Content Strategy Configuration
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Define your content pieces and their strategic link placements
                </Typography>
                <Box display="flex" justifyContent="center" alignItems="center" gap={3}>
                  <Chip
                    label={`${formData.articles.length} Article${formData.articles.length !== 1 ? 's' : ''}`}
                    sx={{
                      bgcolor: alpha('#667eea', 0.1),
                      color: '#667eea',
                      fontWeight: 600,
                      '& .MuiChip-label': {
                        px: 2,
                      },
                    }}
                    icon={<Activity size={16} />}
                  />
                  <Chip
                    label={`${formData.articles.reduce((sum, article) => sum + article.backlinks.length, 0)} Strategic Links`}
                    sx={{
                      bgcolor: alpha('#10b981', 0.1),
                      color: '#10b981',
                      fontWeight: 600,
                      '& .MuiChip-label': {
                        px: 2,
                      },
                    }}
                    icon={<LinkIcon size={16} />}
                  />
                </Box>
              </Box> */}

              {formData.articles.map((article, articleIndex) => (
                <Card
                  key={article.id}
                  variant="outlined"
                  sx={{
                    mb: 3,
                    border: '2px solid',
                    borderColor: alpha('#667eea', 0.2),
                    borderRadius: 3,
                    background:
                      'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 1) 100%)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#667eea',
                      boxShadow: `0 8px 25px -8px ${alpha('#667eea', 0.2)}`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            bgcolor: alpha('#667eea', 0.1),
                            color: '#667eea',
                            width: 36,
                            height: 36,
                          }}
                        >
                          <FileText size={18} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Article {articleIndex + 1}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Content piece for link integration
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        {articleIndex > 0 && (
                          <Box
                            sx={{
                              mr: 2,
                              p: 2,
                              border: '2px solid',
                              borderColor: alpha('#667eea', 0.15),
                              borderRadius: 2,
                              bgcolor: alpha('#f8fafc', 0.7),
                              minWidth: 320,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: 'text.secondary',
                                mb: 1,
                                display: 'block',
                              }}
                            >
                              Link Configuration Strategy
                            </Typography>
                            <FormControl component="fieldset" size="small">
                              <RadioGroup
                                row
                                value={article.useDefaultBacklinks ? 'default' : 'custom'}
                                onChange={() => toggleUseDefaultBacklinks(article.id)}
                                sx={{
                                  '& .MuiFormControlLabel-root': {
                                    mr: 2,
                                    '& .MuiFormControlLabel-label': {
                                      fontSize: '0.8rem',
                                      fontWeight: 500,
                                    },
                                  },
                                  '& .MuiRadio-root': {
                                    color: alpha('#667eea', 0.7),
                                    '&.Mui-checked': {
                                      color: '#667eea',
                                    },
                                    '& .MuiSvgIcon-root': {
                                      fontSize: 18,
                                    },
                                  },
                                }}
                              >
                                <FormControlLabel
                                  value="default"
                                  control={<Radio size="small" />}
                                  label="🔄 Mirror Article 1"
                                />
                                <FormControlLabel
                                  value="custom"
                                  control={<Radio size="small" />}
                                  label="⚙️ Custom Strategy"
                                />
                              </RadioGroup>
                            </FormControl>
                          </Box>
                        )}

                        <Tooltip
                          title={
                            formData.articles.length <= 1
                              ? 'At least one article required'
                              : 'Remove this article'
                          }
                        >
                          <span>
                            <IconButton
                              onClick={() => handleRemoveArticle(article.id)}
                              disabled={formData.articles.length <= 1}
                              sx={{
                                color: alpha('#ef4444', 0.7),
                                border: `2px solid ${alpha('#ef4444', 0.2)}`,
                                borderRadius: 2,
                                '&:hover': {
                                  bgcolor: alpha('#ef4444', 0.1),
                                  borderColor: alpha('#ef4444', 0.4),
                                  color: '#ef4444',
                                },
                                '&.Mui-disabled': {
                                  color: alpha('#9ca3af', 0.5),
                                  borderColor: alpha('#9ca3af', 0.2),
                                },
                              }}
                            >
                              <X size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>

                    {showBacklinksWarning === article.id && (
                      <Alert
                        severity="warning"
                        sx={{
                          mb: 3,
                          border: '2px solid',
                          borderColor: alpha('#f59e0b', 0.3),
                          borderRadius: 2,
                          bgcolor: alpha('#fef3c7', 0.5),
                          '& .MuiAlert-icon': {
                            color: '#f59e0b',
                          },
                        }}
                        action={
                          <Stack direction="row" spacing={1}>
                            <IntercomButton
                              size="small"
                              variant="secondary"
                              onClick={() => setShowBacklinksWarning(null)}
                              sx={{
                                color: '#6b7280',
                                borderColor: alpha('#6b7280', 0.3),
                                '&:hover': {
                                  bgcolor: alpha('#6b7280', 0.1),
                                },
                              }}
                            >
                              Cancel
                            </IntercomButton>
                            <IntercomButton
                              size="small"
                              onClick={() => applyBacklinksToggle(article.id)}
                              sx={{
                                bgcolor: '#f59e0b',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#d97706',
                                },
                              }}
                            >
                              Continue
                            </IntercomButton>
                          </Stack>
                        }
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Shield size={16} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Switching to Article 1 backlinks will remove your custom backlinks. Are
                            you sure?
                          </Typography>
                        </Box>
                      </Alert>
                    )}

                    {/* Only show backlinks editor for Article 1 or for articles with custom backlinks */}
                    {(articleIndex === 0 || !article.useDefaultBacklinks) && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, mb: 2 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: alpha('#667eea', 0.1) }}>
                              <LinkIcon size={14} color="#667eea" />
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              Strategic Link Placement
                            </Typography>
                          </Box>
                          <Chip
                            label={`${article.backlinks.length}/${MAX_BACKLINKS_PER_ARTICLE}`}
                            size="small"
                            sx={{
                              bgcolor: alpha('#667eea', 0.1),
                              color: '#667eea',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        </Box>

                        {article.backlinks.map((backlink, backlinkIndex) => (
                          <Box
                            key={backlinkIndex}
                            sx={{
                              p: 3,
                              mb: 2,
                              border: '2px solid',
                              borderColor: alpha('#667eea', 0.15),
                              borderRadius: 2,
                              bgcolor: 'white',
                              position: 'relative',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                borderColor: alpha('#667eea', 0.3),
                                boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.15)}`,
                                transform: 'translateY(-1px)',
                              },
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: 4,
                                height: '100%',
                                bgcolor: '#667eea',
                                borderRadius: '2px 0 0 2px',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 3,
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={1.5}>
                                <Avatar
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    bgcolor: alpha('#667eea', 0.1),
                                    color: '#667eea',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {backlinkIndex + 1}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, color: 'text.primary' }}
                                  >
                                    Strategic Link {backlinkIndex + 1}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    AI-optimized placement
                                  </Typography>
                                </Box>
                              </Box>
                              <Tooltip
                                title={
                                  article.backlinks.length <= 1
                                    ? 'At least one backlink required'
                                    : 'Remove this backlink'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveBacklink(article.id, backlinkIndex)}
                                    disabled={article.backlinks.length <= 1}
                                    sx={{
                                      color: alpha('#ef4444', 0.7),
                                      '&:hover': {
                                        bgcolor: alpha('#ef4444', 0.1),
                                        color: '#ef4444',
                                      },
                                      '&.Mui-disabled': {
                                        color: alpha('#9ca3af', 0.5),
                                      },
                                    }}
                                  >
                                    <X size={16} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>

                            <Stack spacing={2}>
                              <TextField
                                label="Target Keyword"
                                value={backlink.keyword}
                                onChange={e =>
                                  handleBacklinkChange(
                                    article.id,
                                    backlinkIndex,
                                    'keyword',
                                    e.target.value
                                  )
                                }
                                fullWidth
                                required
                                size="small"
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
                                    bgcolor: alpha('#667eea', 0.02),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      bgcolor: alpha('#667eea', 0.05),
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

                              <FormControl component="fieldset" size="small">
                                <FormLabel
                                  component="legend"
                                  sx={{
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    mb: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  <LinkIcon size={16} color="#667eea" />
                                  Link Source Configuration
                                </FormLabel>
                                <Box
                                  sx={{
                                    border: '2px solid',
                                    borderColor: alpha('#667eea', 0.15),
                                    borderRadius: 2,
                                    p: 2,
                                    bgcolor: alpha('#f8fafc', 0.5),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      borderColor: alpha('#667eea', 0.3),
                                      bgcolor: alpha('#667eea', 0.02),
                                    },
                                  }}
                                >
                                  <RadioGroup
                                    row
                                    name={`urlType-${article.id}-${backlinkIndex}`}
                                    value={backlink.urlType}
                                    onChange={e =>
                                      handleUrlTypeChange(
                                        article.id,
                                        backlinkIndex,
                                        e.target.value as 'existing' | 'custom'
                                      )
                                    }
                                    sx={{
                                      '& .MuiFormControlLabel-root': {
                                        mr: 3,
                                        '& .MuiFormControlLabel-label': {
                                          fontWeight: 500,
                                          fontSize: '0.875rem',
                                        },
                                      },
                                      '& .MuiRadio-root': {
                                        color: alpha('#667eea', 0.7),
                                        '&.Mui-checked': {
                                          color: '#667eea',
                                        },
                                      },
                                    }}
                                  >
                                    <FormControlLabel
                                      value="existing"
                                      control={<Radio size="small" />}
                                      label="🎯 Existing Superstar Article"
                                    />
                                    <FormControlLabel
                                      value="custom"
                                      control={<Radio size="small" />}
                                      label="🔗 Custom URL"
                                    />
                                  </RadioGroup>
                                </Box>
                              </FormControl>

                              {backlink.urlType === 'existing' ? (
                                <Autocomplete
                                  key={`${article.id}-${backlinkIndex}-${backlink.urlType}`}
                                  id={`superstar-article-select-${article.id}-${backlinkIndex}`}
                                  options={superstarArticles}
                                  getOptionLabel={option => option.display || ''}
                                  isOptionEqualToValue={(option, value) => option.id === value.id}
                                  value={(() => {
                                    const value = backlink.selectedArticleId
                                      ? superstarArticles.find(
                                          a => a.id === backlink.selectedArticleId
                                        )
                                      : null;
                                    console.log('Autocomplete value calculation:', {
                                      articleId: article.id,
                                      backlinkIndex,
                                      selectedArticleId: backlink.selectedArticleId,
                                      foundValue: value,
                                      availableOptions: superstarArticles.length,
                                    });
                                    return value;
                                  })()}
                                  onChange={(_, newValue) => {
                                    console.log('Autocomplete onChange triggered:', {
                                      articleId: article.id,
                                      backlinkIndex,
                                      newValue,
                                    });
                                    handleArticleUrlSelection(article.id, backlinkIndex, newValue);
                                  }}
                                  onInputChange={(_, newInputValue, reason) => {
                                    console.log('Autocomplete onInputChange:', {
                                      articleId: article.id,
                                      backlinkIndex,
                                      newInputValue,
                                      reason,
                                    });
                                    if (reason === 'input') {
                                      setArticleSearchInput(newInputValue);
                                      if (formData.clientId) {
                                        fetchSuperstarArticles(formData.clientId);
                                      }
                                    }
                                  }}
                                  loading={loadingArticles}
                                  loadingText="Loading articles..."
                                  noOptionsText={
                                    formData.clientId
                                      ? 'No articles found'
                                      : 'Select a client first'
                                  }
                                  renderInput={params => (
                                    <TextField
                                      {...params}
                                      label="Select Superstar Article"
                                      variant="outlined"
                                      fullWidth
                                      required
                                      size="small"
                                      error={!formData.clientId}
                                      helperText={
                                        !formData.clientId ? 'Please select a client first' : ''
                                      }
                                      InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <Globe
                                              size={18}
                                              color={!formData.clientId ? '#d1d5db' : '#667eea'}
                                            />
                                          </InputAdornment>
                                        ),
                                        endAdornment: (
                                          <>
                                            {loadingArticles ? (
                                              <CircularProgress color="inherit" size={20} />
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                          </>
                                        ),
                                      }}
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          borderRadius: 2,
                                          bgcolor: !formData.clientId
                                            ? alpha('#f3f4f6', 0.5)
                                            : alpha('#667eea', 0.02),
                                          transition: 'all 0.3s ease',
                                          '&:hover': {
                                            bgcolor: !formData.clientId
                                              ? alpha('#f3f4f6', 0.7)
                                              : alpha('#667eea', 0.05),
                                            '& .MuiOutlinedInput-notchedOutline': {
                                              borderColor: !formData.clientId
                                                ? '#d1d5db'
                                                : alpha('#667eea', 0.5),
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
                                  )}
                                  disabled={!formData.clientId}
                                />
                              ) : (
                                <TextField
                                  label="Custom Link URL"
                                  value={backlink.url}
                                  onChange={e =>
                                    handleBacklinkChange(
                                      article.id,
                                      backlinkIndex,
                                      'url',
                                      e.target.value
                                    )
                                  }
                                  fullWidth
                                  required
                                  type="url"
                                  size="small"
                                  placeholder="https://example.com/page-to-link-to"
                                  variant="outlined"
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <ExternalLink size={18} color="#667eea" />
                                      </InputAdornment>
                                    ),
                                  }}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                      bgcolor: alpha('#667eea', 0.02),
                                      transition: 'all 0.3s ease',
                                      fontFamily: 'monospace',
                                      fontSize: '0.875rem',
                                      '&:hover': {
                                        bgcolor: alpha('#667eea', 0.05),
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
                                    '& input::placeholder': {
                                      color: alpha('#667eea', 0.6),
                                      opacity: 1,
                                    },
                                  }}
                                />
                              )}
                            </Stack>
                          </Box>
                        ))}

                        {article.backlinks.length < MAX_BACKLINKS_PER_ARTICLE && (
                          <Box
                            sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha('#e5e7eb', 0.5)}` }}
                          >
                            <IntercomButton
                              variant="secondary"
                              onClick={() => handleAddBacklink(article.id)}
                              startIcon={<Plus size={18} />}
                              sx={{
                                border: `2px dashed ${alpha('#667eea', 0.3)}`,
                                bgcolor: alpha('#667eea', 0.02),
                                color: '#667eea',
                                fontWeight: 600,
                                py: 1.5,
                                px: 3,
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  bgcolor: alpha('#667eea', 0.08),
                                  borderColor: '#667eea',
                                  transform: 'translateY(-1px)',
                                  boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.3)}`,
                                },
                              }}
                            >
                              Add Strategic Link ({article.backlinks.length}/
                              {MAX_BACKLINKS_PER_ARTICLE})
                            </IntercomButton>
                          </Box>
                        )}
                      </>
                    )}

                    {articleIndex > 0 && article.useDefaultBacklinks && (
                      <Box
                        sx={{
                          mt: 3,
                          p: 3,
                          border: '2px solid',
                          borderColor: alpha('#10b981', 0.2),
                          borderRadius: 2,
                          bgcolor:
                            'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)',
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 4,
                            height: '100%',
                            bgcolor: '#10b981',
                            borderRadius: '2px 0 0 2px',
                          },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: alpha('#10b981', 0.1) }}>
                            <RefreshCw size={14} color="#10b981" />
                          </Avatar>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, color: '#10b981' }}
                          >
                            Mirroring Article 1 Strategy
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          This article will use the same strategic link placements as your primary
                          article:
                        </Typography>
                        <Stack spacing={1}>
                          {getDefaultBacklinks().map((backlink, idx) => (
                            <Paper
                              key={idx}
                              sx={{
                                p: 2,
                                bgcolor: 'white',
                                border: `1px solid ${alpha('#10b981', 0.15)}`,
                                borderRadius: 1,
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={2}>
                                <Avatar
                                  sx={{
                                    width: 20,
                                    height: 20,
                                    bgcolor: alpha('#10b981', 0.1),
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {idx + 1}
                                </Avatar>
                                <Box flex={1}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {backlink.keyword}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontFamily: 'monospace' }}
                                  >
                                    → {backlink.url}
                                  </Typography>
                                </Box>
                                <LinkIcon size={14} color="#10b981" />
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Paper
                  sx={{
                    p: 4,
                    border: `2px dashed ${alpha('#667eea', 0.2)}`,
                    bgcolor: alpha('#667eea', 0.01),
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: alpha('#667eea', 0.4),
                      bgcolor: alpha('#667eea', 0.03),
                    },
                  }}
                >
                  <Box textAlign="center">
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: alpha('#667eea', 0.1),
                        color: '#667eea',
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <Plus size={24} />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Scale Your Content Strategy
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Create additional articles to maximize your link building impact
                    </Typography>
                    <IntercomButton
                      variant="primary"
                      onClick={handleAddArticle}
                      startIcon={<Plus size={18} />}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        px: 4,
                        py: 1.5,
                      }}
                    >
                      Add Content Article
                    </IntercomButton>
                  </Box>
                </Paper>
              </Box>
            </Stack>
          </StepCard>
        );

      case 1:
        return (
          <StepCard isActive={true} isCompleted={false}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Avatar sx={{ bgcolor: '#8b5cf6', width: 56, height: 56 }}>
                <FileText size={28} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Content Review & Optimization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review AI-generated articles with strategically placed backlinks
                </Typography>
              </Box>
            </Box>

            <Stack spacing={3}>
              {articlePreviews.map((article, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">Article {index + 1}</Typography>
                    </Box>

                    {article.isEditing ? (
                      <>
                        <TextField
                          fullWidth
                          label="Article Title"
                          value={article.title}
                          onChange={e => handleArticleUpdate(index, 'title', e.target.value)}
                          sx={{ mb: 2 }}
                        />
                        <Box
                          sx={{
                            '.ql-editor': {
                              minHeight: '200px',
                              fontSize: '1rem',
                              lineHeight: '1.5',
                            },
                            '.ql-container': {
                              fontSize: '1rem',
                              fontFamily: 'inherit',
                            },
                            mb: 6,
                          }}
                        >
                          <ReactQuill
                            value={article.content}
                            onChange={value => handleArticleUpdate(index, 'content', value)}
                            modules={quillModules}
                            formats={quillFormats}
                          />
                        </Box>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6" gutterBottom>
                          {article.title}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box
                          className="article-preview"
                          sx={{
                            '& > div': {
                              fontSize: '1rem',
                              lineHeight: '1.5',
                              '& p': { my: 2 },
                              '& ul, & ol': { my: 2, pl: 3 },
                              '& li': { mb: 1 },
                              '& h1, & h2, & h3': { my: 2 },
                              '& a': {
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              },
                            },
                          }}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: processContentLinks(article.content),
                            }}
                          />
                        </Box>
                      </>
                    )}
                  </CardContent>
                  <CardActions>
                    <IntercomButton
                      variant="secondary"
                      onClick={() => handleArticleEdit(index)}
                      startIcon={<Edit3 size={18} />}
                    >
                      {article.isEditing ? 'Save Changes' : 'Edit Article'}
                    </IntercomButton>
                    <IntercomButton
                      variant="secondary"
                      color="primary"
                      onClick={() => handleRegenerateArticle(article.articleId)}
                      disabled={regeneratingArticles[article.articleId]}
                      startIcon={<RefreshCw size={18} />}
                    >
                      {regeneratingArticles[article.articleId] ? 'Regenerating...' : 'Regenerate'}
                    </IntercomButton>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          </StepCard>
        );

      case 2:
        return (
          <StepCard isActive={true} isCompleted={false}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Avatar sx={{ bgcolor: '#10b981', width: 56, height: 56 }}>
                <Rocket size={28} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Launch Campaign
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deploy your intelligent link building campaign
                </Typography>
              </Box>
            </Box>

            <Stack spacing={3}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body1">
                  You&apos;re about to publish {articlePreviews.length} article
                  {articlePreviews.length > 1 ? 's' : ''} with strategically optimized backlinks.
                </Typography>
              </Alert>

              <Box sx={{ my: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Articles to publish:
                </Typography>
                <List>
                  {articlePreviews.map((article, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={article.title}
                        secondary={`Article ${index + 1}${
                          index < formData.articles.length &&
                          formData.articles[index].useDefaultBacklinks
                            ? ' (Using Article 1 Backlinks)'
                            : ''
                        }`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Click &quot;Launch Campaign&quot; to deploy your intelligent link building strategy.
              </Typography>
            </Stack>
          </StepCard>
        );

      default:
        return null;
    }
  };

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="Autolink Intelligence"
      breadcrumbs={[{ label: 'Advanced Tools' }, { label: 'Autolink' }]}
    >
      <AIProcessingAnimation isProcessing={generating} stage={0} />

      {/* Hero Section */}
      {/* <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box position="relative" zIndex={2}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            Intelligent Link Building
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
            Advanced automation for strategic backlink placement with AI-optimized anchor text
            distribution and contextual content generation.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Box display="flex" alignItems="center">
              <Target size={20} style={{ marginRight: 8 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Strategic Placement
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Zap size={20} style={{ marginRight: 8 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                AI-Powered Optimization
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Shield size={20} style={{ marginRight: 8 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Natural Link Patterns
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box> */}

      {/* Progress Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;

              return (
                <Box key={step.label} display="flex" alignItems="center">
                  <Box display="flex" flexDirection="column" alignItems="center" mx={2}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: isActive || isCompleted ? '#667eea' : alpha('#e5e7eb', 0.5),
                        color: isActive || isCompleted ? 'white' : '#6b7280',
                        transition: 'all 0.3s ease',
                        mb: 1,
                      }}
                    >
                      {isCompleted ? <CheckCircle size={20} /> : <StepIcon size={20} />}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isActive || isCompleted ? 600 : 400,
                        color: isActive || isCompleted ? 'primary.main' : 'text.secondary',
                        textAlign: 'center',
                        maxWidth: 80,
                      }}
                    >
                      {step.label}
                    </Typography>
                  </Box>

                  {/* Connection line */}
                  {index < STEPS.length - 1 && (
                    <Box
                      sx={{
                        width: 60,
                        height: 2,
                        bgcolor: index < activeStep ? '#667eea' : alpha('#e5e7eb', 0.5),
                        transition: 'all 0.3s ease',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {renderStepContent()}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <IntercomButton
          variant="secondary"
          onClick={handleBack}
          disabled={activeStep === 0 || generating || submitting}
          startIcon={<ArrowLeft size={18} />}
        >
          Back
        </IntercomButton>
        {activeStep === STEPS.length - 1 ? (
          <IntercomButton
            variant="primary"
            onClick={handlePublish}
            disabled={submitting}
            startIcon={submitting ? undefined : <Rocket size={18} />}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              minWidth: 160,
            }}
          >
            {submitting ? (
              <>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    sx={{ width: 20, height: 2, bgcolor: 'rgba(255,255,255,0.3)' }}
                    color="inherit"
                  />
                  Launching...
                </Box>
              </>
            ) : (
              'Launch Campaign'
            )}
          </IntercomButton>
        ) : (
          <IntercomButton
            variant="primary"
            onClick={handleNext}
            disabled={generating || submitting}
            endIcon={<ArrowRight size={18} />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {generating ? 'Processing...' : 'Continue'}
          </IntercomButton>
        )}
      </Box>
    </IntercomLayout>
  );
}

export default function BacklinkBuddyPage() {
  return (
    <ToastProvider>
      <BacklinkBuddyContent />
    </ToastProvider>
  );
}
