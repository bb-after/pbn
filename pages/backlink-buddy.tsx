import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LayoutContainer from 'components/LayoutContainer';
import StyledHeader from 'components/StyledHeader';
import ClientDropdown from 'components/ClientDropdown';
import useValidateUserToken from 'hooks/useValidateUserToken';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useRouter } from 'next/router';

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

interface BacklinkFormData {
  urlType: 'existing' | 'custom';
  url: string;
  selectedArticleId: number | null;
  pbnCount: number;
  keywords: string[];
  clientName: string;
  clientId: number | null;
}

interface ArticlePreview {
  title: string;
  content: string;
  isEditing: boolean;
}

interface SuperstarArticle {
  id: number;
  title: string;
  url: string;
  domain: string;
  display: string;
}

const steps = ['Enter Details', 'Review Articles', 'Publish'];

export default function BacklinkBuddyPage() {
  const router = useRouter();
  const { isValidUser } = useValidateUserToken();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<BacklinkFormData>({
    urlType: 'existing',
    url: '',
    selectedArticleId: null,
    pbnCount: 1,
    keywords: [],
    clientName: '',
    clientId: null,
  });
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [articlePreviews, setArticlePreviews] = useState<ArticlePreview[]>([]);
  const [generating, setGenerating] = useState(false);
  const [superstarArticles, setSuperstarArticles] = useState<SuperstarArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<SuperstarArticle | null>(null);
  const [articleSearchInput, setArticleSearchInput] = useState('');

  // Fetch superstar articles when client changes
  useEffect(() => {
    if (formData.clientId) {
      fetchSuperstarArticles(formData.clientId);
      // Clear selected article when client changes
      setSelectedArticle(null);
      // Reset URL if in "existing" mode
      if (formData.urlType === 'existing') {
        setFormData(prev => ({
          ...prev,
          url: '',
          selectedArticleId: null,
        }));
      }
    } else {
      setSuperstarArticles([]);
      setSelectedArticle(null);
    }
  }, [formData.clientId]);

  // Update URL when selected article changes
  useEffect(() => {
    if (selectedArticle) {
      setFormData(prev => ({
        ...prev,
        url: selectedArticle.url,
        selectedArticleId: selectedArticle.id,
      }));
    }
  }, [selectedArticle]);

  // Handle URL type change
  const handleUrlTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrlType = e.target.value as 'existing' | 'custom';

    // Reset URL and selected article when switching types
    if (newUrlType === 'existing') {
      setFormData(prev => ({
        ...prev,
        urlType: newUrlType,
        url: selectedArticle?.url || '',
        selectedArticleId: selectedArticle?.id || null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        urlType: newUrlType,
        selectedArticleId: null,
      }));
    }
  };

  const fetchSuperstarArticles = async (clientId: number) => {
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
  };

  const handleAddKeyword = () => {
    if (currentKeyword.trim() && !formData.keywords.includes(currentKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, currentKeyword.trim()],
      }));
      setCurrentKeyword('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keywordToRemove),
    }));
  };

  // Validate form before proceeding
  const validateForm = (): boolean => {
    // Check client selection
    if (!formData.clientId) {
      setError('Please select a client');
      return false;
    }

    // Check URL based on type
    if (formData.urlType === 'existing' && !selectedArticle) {
      setError('Please select a Superstar article');
      return false;
    } else if (formData.urlType === 'custom' && (!formData.url || !formData.url.trim())) {
      setError('Please enter a valid URL');
      return false;
    }

    // Check keywords
    if (formData.keywords.length === 0) {
      setError('Please add at least one keyword');
      return false;
    }

    // All checks passed
    return true;
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate inputs using the new validation function
      if (!validateForm()) {
        return;
      }

      setError(null);
      setGenerating(true);

      try {
        // Generate article previews
        const previews = await Promise.all(
          Array(formData.pbnCount)
            .fill(null)
            .map(async () => {
              const response = await axios.post('/api/pbn-site-submissions/preview', {
                url: formData.url,
                keywords: formData.keywords,
                client: formData.clientName,
              });
              return {
                title: response.data.title || '',
                content: response.data.content || '',
                isEditing: false,
              };
            })
        );
        setArticlePreviews(previews);
        setActiveStep(prev => prev + 1);
      } catch (error: any) {
        console.error('Error generating previews:', error);
        setError(error.message || 'Failed to generate article previews');
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
      // Submit each article
      await Promise.all(
        articlePreviews.map(async article => {
          await axios.post('/api/pbn-site-submissions', {
            client: formData.clientName,
            clientId: formData.clientId,
            category: 'General',
            title: article.title,
            content: article.content,
            type: 'individual',
          });
        })
      );

      // Redirect to submissions page
      router.push('/pbn-site-submissions');
    } catch (error: any) {
      console.error('Error publishing articles:', error);
      setError(error.message || 'Failed to publish articles');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={3}>
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

            <FormControl component="fieldset">
              <FormLabel component="legend">URL Source</FormLabel>
              <RadioGroup
                row
                name="urlType"
                value={formData.urlType}
                onChange={handleUrlTypeChange}
              >
                <FormControlLabel
                  value="existing"
                  control={<Radio />}
                  label="Existing Superstar Article"
                />
                <FormControlLabel value="custom" control={<Radio />} label="Custom URL" />
              </RadioGroup>
            </FormControl>

            {formData.urlType === 'existing' ? (
              <Autocomplete
                id="superstar-article-select"
                options={superstarArticles}
                getOptionLabel={option => option.display}
                value={selectedArticle}
                onChange={(_, newValue) => setSelectedArticle(newValue)}
                onInputChange={(_, newInputValue) => {
                  setArticleSearchInput(newInputValue);
                  if (formData.clientId) {
                    fetchSuperstarArticles(formData.clientId);
                  }
                }}
                loading={loadingArticles}
                loadingText="Loading articles..."
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Select Superstar Article"
                    variant="outlined"
                    fullWidth
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingArticles ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                disabled={!formData.clientId}
                noOptionsText={formData.clientId ? 'No articles found' : 'Select a client first'}
              />
            ) : (
              <TextField
                label="Custom URL to Backlink"
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                fullWidth
                required
                type="url"
                placeholder="https://example.com/page-to-link-to"
              />
            )}

            <TextField
              label="Number of PBN Articles"
              value={formData.pbnCount}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  pbnCount: Math.min(Math.max(1, parseInt(e.target.value) || 1), 5),
                }))
              }
              type="number"
              inputProps={{ min: 1, max: 5 }}
              fullWidth
              required
            />

            <Box>
              <TextField
                label="Add Keywords"
                value={currentKeyword}
                onChange={e => setCurrentKeyword(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                fullWidth
                placeholder="Enter keyword and press Enter or Add"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleAddKeyword} edge="end">
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.keywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    onDelete={() => handleRemoveKeyword(keyword)}
                    color="primary"
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            {articlePreviews.map((article, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
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
                          mb: 6, // Add margin to account for Quill toolbar
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
                </CardActions>
              </Card>
            ))}
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="body1">
              Ready to publish {articlePreviews.length} articles with backlinks to {formData.url}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keywords used: {formData.keywords.join(', ')}
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
              <Typography variant="h4" component="h1" sx={{ mb: 3, textAlign: 'center' }}>
                Backlink Buddy
              </Typography>
              <Box sx={{ height: 120, width: 'auto', position: 'relative', mb: 2 }}>
                <img
                  src="/images/backlink-buddy-logo.png"
                  alt="Backlink Buddy Logo"
                  style={{ height: '100%', maxWidth: '300px', objectFit: 'contain' }}
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
