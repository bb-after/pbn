import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  InputAdornment,
  IconButton,
  Stack,
  Alert,
  Stepper,
  Step,
  StepLabel,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import LayoutContainer from 'components/LayoutContainer';
import StyledHeader from 'components/StyledHeader';
import ClientDropdown from 'components/ClientDropdown';
import useValidateUserToken from 'hooks/useValidateUserToken';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useRouter } from 'next/router';
import RefreshIcon from '@mui/icons-material/Refresh';
import Image from 'next/image';

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
const steps = ['Enter Details', 'Review Articles', 'Publish'];

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

export default function BacklinkBuddyPage() {
  const router = useRouter();
  const { isValidUser, token } = useValidateUserToken();
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
          <Stack spacing={4}>
            <ClientDropdown
              value={formData.clientName}
              onChange={newValue => setFormData(prev => ({ ...prev, clientName: newValue }))}
              onClientIdChange={newClientId => {
                setFormData(prev => ({ ...prev, clientId: newClientId }));
                setLoadingArticles(true); // Show loading immediately on client change
              }}
              fullWidth
              required
              margin="normal"
              variant="outlined"
            />

            <Typography variant="h6" gutterBottom>
              Articles ({formData.articles.length})
            </Typography>

            {formData.articles.map((article, articleIndex) => (
              <Card key={article.id} variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1">Article {articleIndex + 1}</Typography>
                    <Box>
                      {articleIndex > 0 && (
                        <FormControl component="fieldset" size="small" sx={{ mr: 2 }}>
                          <RadioGroup
                            row
                            value={article.useDefaultBacklinks ? 'default' : 'custom'}
                            onChange={() => toggleUseDefaultBacklinks(article.id)}
                          >
                            <FormControlLabel
                              value="default"
                              control={<Radio size="small" />}
                              label="Use Article 1 Backlinks"
                            />
                            <FormControlLabel
                              value="custom"
                              control={<Radio size="small" />}
                              label="Set Custom Backlinks"
                            />
                          </RadioGroup>
                        </FormControl>
                      )}

                      <IconButton
                        color="error"
                        onClick={() => handleRemoveArticle(article.id)}
                        disabled={formData.articles.length <= 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {showBacklinksWarning === article.id && (
                    <Alert
                      severity="warning"
                      sx={{ mb: 2 }}
                      action={
                        <>
                          <Button
                            color="inherit"
                            size="small"
                            onClick={() => setShowBacklinksWarning(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            color="warning"
                            size="small"
                            onClick={() => applyBacklinksToggle(article.id)}
                          >
                            Continue
                          </Button>
                        </>
                      }
                    >
                      Switching to Article 1 backlinks will remove your custom backlinks. Are you
                      sure?
                    </Alert>
                  )}

                  {/* Only show backlinks editor for Article 1 or for articles with custom backlinks */}
                  {(articleIndex === 0 || !article.useDefaultBacklinks) && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Backlinks ({article.backlinks.length}/{MAX_BACKLINKS_PER_ARTICLE})
                      </Typography>

                      {article.backlinks.map((backlink, backlinkIndex) => (
                        <Box
                          key={backlinkIndex}
                          sx={{
                            p: 2,
                            mb: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 2,
                            }}
                          >
                            <Typography variant="subtitle2">
                              Backlink {backlinkIndex + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveBacklink(article.id, backlinkIndex)}
                              disabled={article.backlinks.length <= 1}
                              title="Remove backlink"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          <Stack spacing={2}>
                            <TextField
                              label="Keyword"
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
                            />

                            <FormControl component="fieldset" size="small">
                              <FormLabel component="legend">URL Source</FormLabel>
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
                              >
                                <FormControlLabel
                                  value="existing"
                                  control={<Radio size="small" />}
                                  label="Existing Superstar Article"
                                />
                                <FormControlLabel
                                  value="custom"
                                  control={<Radio size="small" />}
                                  label="Custom URL"
                                />
                              </RadioGroup>
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
                                  formData.clientId ? 'No articles found' : 'Select a client first'
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
                                      endAdornment: (
                                        <>
                                          {loadingArticles ? (
                                            <CircularProgress color="inherit" size={20} />
                                          ) : null}
                                          {params.InputProps.endAdornment}
                                        </>
                                      ),
                                    }}
                                  />
                                )}
                                disabled={!formData.clientId}
                              />
                            ) : (
                              <TextField
                                label="Custom URL"
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
                              />
                            )}
                          </Stack>
                        </Box>
                      ))}

                      {article.backlinks.length < MAX_BACKLINKS_PER_ARTICLE && (
                        <Button
                          variant="outlined"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddBacklink(article.id)}
                          sx={{ mt: 1 }}
                        >
                          Add Backlink
                        </Button>
                      )}
                    </>
                  )}

                  {articleIndex > 0 && article.useDefaultBacklinks && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Using Backlinks from Article 1:
                      </Typography>
                      <List dense disablePadding>
                        {getDefaultBacklinks().map((backlink, idx) => (
                          <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={`${backlink.keyword} → ${backlink.url}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddArticle}
              >
                Add Another Article
              </Button>
            </Box>
          </Stack>
        );

      case 1:
        return (
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
                        <div dangerouslySetInnerHTML={{ __html: article.content }} />
                      </Box>
                    </>
                  )}
                </CardContent>
                <CardActions>
                  <Button startIcon={<EditIcon />} onClick={() => handleArticleEdit(index)}>
                    {article.isEditing ? 'Save Changes' : 'Edit Article'}
                  </Button>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={() => handleRegenerateArticle(article.articleId)}
                    disabled={regeneratingArticles[article.articleId]}
                    color="secondary"
                  >
                    {regeneratingArticles[article.articleId] ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1">
                You&apos;re about to publish {articlePreviews.length} article
                {articlePreviews.length > 1 ? 's' : ''} with backlinks.
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
              Click &quot;Publish Articles&quot; to submit these articles to your PBN sites.
            </Typography>
          </Stack>
        );

      default:
        return null;
    }
  };

  if (!isValidUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6">Unauthorized access. Please log in.</Typography>
      </Box>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {!isValidUser ? (
          <Alert severity="warning">
            You need to be logged in to use this tool. Please log in and try again.
          </Alert>
        ) : (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Box sx={{ height: 200, width: 'auto', position: 'relative', mb: 2 }}>
                <Image
                  src="/images/backlink-buddy-logo.png"
                  alt="Backlink Buddy Logo"
                  width={400}
                  height={200}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Box>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {renderStepContent()}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack} disabled={activeStep === 0 || generating || submitting}>
                Back
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePublish}
                  disabled={submitting}
                >
                  {submitting ? 'Publishing...' : 'Publish Articles'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={generating || submitting}
                >
                  {generating ? 'Generating Articles...' : 'Next'}
                </Button>
              )}
            </Box>
          </Paper>
        )}
      </Container>
    </LayoutContainer>
  );
}
