import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Divider,
  Chip,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack,
  Paper,
  InputAdornment,
  alpha,
  Fade,
  Grow,
  Tooltip,
  Badge,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import debounce from 'lodash/debounce';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  IntercomLayout,
  ThemeProvider,
  ToastProvider,
  IntercomCard,
  IntercomButton,
} from '../components/ui';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import { Link as LinkIcon, Create as CreateIcon } from '@mui/icons-material';

// Modern Lucide Icons for AI-focused design
import {
  Brain,
  Compass,
  Target,
  Users,
  Globe,
  Building2,
  MapPin,
  Search,
  Sparkles,
  FileText,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Activity,
  Filter,
  Zap,
  TrendingUp,
  Shield,
  Layers,
  Map,
  Eye,
  Send,
  RotateCcw,
} from 'lucide-react';

// Types for our data
interface Industry {
  industry_id: number;
  industry_name: string;
  blog_count?: number;
}

interface Region {
  region_id: number;
  region_name: string;
  region_type: string;
  parent_region_id: number | null;
  blog_count?: number;
  sub_regions?: Region[];
}

interface Topic {
  topic_id: number;
  topic_title: string;
  blog_count: number;
}

interface Blog {
  id: number;
  domain: string;
  blog_id?: number;
  blog_url?: string;
  post_count?: number;
}

interface Client {
  client_id: number;
  client_name: string;
}

// Enhanced step configuration with icons
const STEPS = [
  { label: 'Client Selection', icon: Users },
  { label: 'Content Strategy', icon: Brain },
  { label: 'Target Configuration', icon: Target },
  { label: 'Blog Discovery', icon: Compass },
];

function ContentCompassPage() {
  const router = useRouter();
  const { isValidUser, isLoading: isAuthLoading } = useValidateUserToken();

  // State for current step
  const [activeStep, setActiveStep] = useState(0);

  // State for our data
  const [clients, setClients] = useState<Client[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);

  // Content filter state
  const [contentFilter, setContentFilter] = useState<'all' | 'with' | 'without'>('all');
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);

  // State for selected values
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [articleType, setArticleType] = useState<'specific' | 'general' | ''>('');
  const [selectedTopic, setSelectedTopic] = useState<number | ''>('');
  const [selectedTargetType, setSelectedTargetType] = useState<'industry' | 'region'>('industry');
  const [selectedIndustry, setSelectedIndustry] = useState<number | ''>('');
  const [selectedRegion, setSelectedRegion] = useState<number | ''>('');

  // Loading states
  const [loadingClientNames, setLoadingClientNames] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingIndustries, setLoadingIndustries] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);

  // Client name search input state
  const [clientNameSearch, setClientNameSearch] = useState<string>('');

  // Fetch client names on initial load
  useEffect(() => {
    fetchClientNames();
  }, []);

  // Fetch client names when search changes
  const debouncedFetchClientNames = useCallback(
    debounce((search: string) => {
      fetchClientNames(search);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedFetchClientNames(clientNameSearch);
  }, [clientNameSearch, debouncedFetchClientNames]);

  // Fetch topics when client is selected and specific article type is chosen
  useEffect(() => {
    if (selectedClientName && articleType === 'specific') {
      fetchTopics();
    }
  }, [selectedClientName, articleType]);

  // Fetch industries and regions when client is selected and general article type is chosen
  useEffect(() => {
    if (selectedClientName && articleType === 'general') {
      fetchIndustries();
      fetchRegions();
    }
  }, [selectedClientName, articleType]);

  // Fetch blogs based on the selected criteria
  useEffect(() => {
    if (articleType === 'specific' && selectedTopic !== '') {
      fetchBlogsByTopic(selectedTopic as number);
    } else if (articleType === 'general') {
      if (selectedTargetType === 'industry' && selectedIndustry !== '') {
        fetchBlogsByIndustry(selectedIndustry as number);
      } else if (selectedTargetType === 'region' && selectedRegion !== '') {
        fetchBlogsByRegion(selectedRegion as number);
      }
    }
  }, [articleType, selectedTopic, selectedTargetType, selectedIndustry, selectedRegion]);

  // Add effect to filter blogs
  useEffect(() => {
    if (!blogs) return;

    let result = [...blogs];

    if (contentFilter === 'with') {
      result = result.filter(blog => blog.post_count && blog.post_count > 0);
    } else if (contentFilter === 'without') {
      result = result.filter(blog => !blog.post_count || blog.post_count === 0);
    }

    setFilteredBlogs(result);
  }, [blogs, contentFilter]);

  // Functions to fetch data
  const fetchClientNames = async (search?: string) => {
    try {
      setLoadingClientNames(true);
      setError(null);
      const url = `/api/client-names${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const response = await axios.get(url);
      setClients(response.data);
    } catch (err) {
      console.error('Failed to fetch client names:', err);
      setError('Failed to load client names. Please try again later.');
    } finally {
      setLoadingClientNames(false);
    }
  };

  const fetchTopics = async () => {
    try {
      setLoadingTopics(true);
      setError(null);
      // Fetch all topics with blog count
      const response = await axios.get('/api/article-topics');
      setTopics(response.data);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setError('Failed to load topics. Please try again later.');
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      setLoadingIndustries(true);
      setError(null);
      // Fetch industries with blog count
      const response = await axios.get('/api/industries?with_count=true');
      setIndustries(response.data);
    } catch (err) {
      console.error('Failed to fetch industries:', err);
      setError('Failed to load industries. Please try again later.');
    } finally {
      setLoadingIndustries(false);
    }
  };

  const fetchRegions = async () => {
    try {
      setLoadingRegions(true);
      setError(null);
      // Fetch regions with blog count and hierarchical structure
      const response = await axios.get('/api/geo-regions?with_count=true&with_hierarchy=true');
      setRegions(response.data);
    } catch (err) {
      console.error('Failed to fetch regions:', err);
      setError('Failed to load regions. Please try again later.');
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchBlogsByTopic = async (topicId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(
        `/api/blogs?topic_id=${topicId}${selectedClientId ? `&client_id=${selectedClientId}` : ''}`
      );
      setBlogs(response.data);
    } catch (err) {
      console.error('Failed to fetch blogs by topic:', err);
      setError('Failed to load blogs. Please try again later.');
    } finally {
      setLoadingBlogs(false);
    }
  };

  const fetchBlogsByIndustry = async (industryId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(
        `/api/blogs?industry_id=${industryId}${selectedClientId ? `&client_id=${selectedClientId}` : ''}`
      );
      setBlogs(response.data);
    } catch (err) {
      console.error('Failed to fetch blogs by industry:', err);
      setError('Failed to load blogs. Please try again later.');
    } finally {
      setLoadingBlogs(false);
    }
  };

  const fetchBlogsByRegion = async (regionId: number) => {
    try {
      setLoadingBlogs(true);
      setError(null);
      const response = await axios.get(
        `/api/blogs?region_id=${regionId}${selectedClientId ? `&client_id=${selectedClientId}` : ''}`
      );
      setBlogs(response.data);
    } catch (err) {
      console.error('Failed to fetch blogs by region:', err);
      setError('Failed to load blogs. Please try again later.');
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  // Handle reset
  const handleReset = () => {
    setActiveStep(0);
    setSelectedClientName(null);
    setSelectedClientId(null);
    setArticleType('specific');
    setSelectedTopic('');
    setSelectedTargetType('industry');
    setSelectedIndustry('');
    setSelectedRegion('');
    setBlogs([]);
  };

  // Handle client name selection
  const handleClientNameChange = (_event: React.SyntheticEvent, newValue: Client | null) => {
    setSelectedClientName(newValue ? newValue.client_name : null);
    setSelectedClientId(newValue ? newValue.client_id : null);
    if (newValue) {
      setActiveStep(1); // Move to article type step automatically
    }
  };

  // Handle client name input change
  const handleClientNameInputChange = (_event: React.SyntheticEvent, newInputValue: string) => {
    setClientNameSearch(newInputValue);
  };

  // Handle article type selection
  const handleArticleTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newArticleType: 'specific' | 'general'
  ) => {
    // Always proceed when a button is clicked, even if it's the same value
    if (newArticleType !== null) {
      // Always set the article type, even if it's the same
      setArticleType(newArticleType);

      // Reset selections if the article type is changing
      if (newArticleType !== articleType) {
        setSelectedTopic('');
        setSelectedTargetType('industry');
        setSelectedIndustry('');
        setSelectedRegion('');
      }

      // Always move to the next step
      setActiveStep(2);
    }
  };

  // Handle topic selection
  const handleTopicChange = (topicId: number) => {
    setSelectedTopic(topicId);
    setActiveStep(3); // Move to blogs step automatically
  };

  // Handle target type selection (industry vs region)
  const handleTargetTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTargetType: 'industry' | 'region'
  ) => {
    if (newTargetType !== null) {
      // Always set the target type, even if it's the same
      setSelectedTargetType(newTargetType);

      // Reset selections
      setSelectedIndustry('');
      setSelectedRegion('');
    }
  };

  // Handle industry selection
  const handleIndustryChange = (event: SelectChangeEvent<number>) => {
    setSelectedIndustry(event.target.value as number);
    setActiveStep(3); // Move to blogs step automatically
  };

  // Handle region selection
  const handleRegionChange = (event: SelectChangeEvent<number>) => {
    setSelectedRegion(event.target.value as number);
    setActiveStep(3); // Move to blogs step automatically
  };

  // Handle blog selection - Visit Blog
  const handleBlogClick = (blog: Blog) => {
    // Open blog URL in a new tab/window
    if (blog.blog_url) {
      window.open(blog.blog_url, '_blank');
    }
  };

  // Handle Submit Post click - Navigate to superstar-form
  const handleSubmitPostClick = (blog: Blog) => {
    // Determine what parameters to pass based on the selected options
    let queryParams = new URLSearchParams();

    // Always send blog info
    queryParams.append('blogId', blog.id.toString());
    if (blog.domain) {
      queryParams.append('blogName', blog.domain);
    }

    // Always add client name first in the query string (important for form pre-population)
    if (selectedClientName) {
      // Use the client parameter since that's what superstar-form expects
      queryParams.append('client', selectedClientName);

      // Also add client ID if available
      if (selectedClientId) {
        queryParams.append('clientId', selectedClientId.toString());
      }
    }

    // Add topic if specific article
    if (articleType === 'specific' && selectedTopic) {
      const selectedTopicObj = topics.find(t => t.topic_id === selectedTopic);
      if (selectedTopicObj) {
        queryParams.append('topic', selectedTopicObj.topic_title);
      }
    }

    // Add industry or region if general article
    if (articleType === 'general') {
      if (selectedTargetType === 'industry' && selectedIndustry) {
        const selectedIndustryObj = industries.find(i => i.industry_id === selectedIndustry);
        if (selectedIndustryObj) {
          queryParams.append('industry', selectedIndustryObj.industry_name);
        }
      } else if (selectedTargetType === 'region' && selectedRegion) {
        const findRegionById = (regionId: number, regionsList: Region[]): Region | undefined => {
          for (const region of regionsList) {
            if (region.region_id === regionId) {
              return region;
            }
            if (region.sub_regions) {
              const subRegionMatch = findRegionById(regionId, region.sub_regions);
              if (subRegionMatch) {
                return subRegionMatch;
              }
            }
          }
          return undefined;
        };

        const selectedRegionObj = findRegionById(selectedRegion as number, regions);
        if (selectedRegionObj) {
          queryParams.append('region', selectedRegionObj.region_name);
        }
      }
    }

    // Navigate to the form page
    router.push(`/superstar-form?${queryParams.toString()}`);
  };

  // Render the client name selection step with modern AI-focused design
  const renderClientNameStep = () => (
    <Card
      sx={{
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
        <Box display="flex" alignItems="center" gap={3} mb={4}>
          <Avatar sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 56, height: 56 }}>
            <Users size={28} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Client Selection & Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose your target client for intelligent content placement
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            border: '2px solid',
            borderColor: alpha('#667eea', 0.15),
            borderRadius: 2,
            bgcolor: alpha('#f8fafc', 0.5),
            mb: 3,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Search size={18} color="#667eea" />
            Client Search & Selection
          </Typography>

          <Autocomplete
            value={clients.find(c => c.client_name === selectedClientName) || null}
            onChange={handleClientNameChange}
            inputValue={clientNameSearch}
            onInputChange={handleClientNameInputChange}
            options={clients}
            getOptionLabel={option => option.client_name}
            loading={loadingClientNames}
            renderInput={params => (
              <TextField
                {...params}
                label="Search and Select Client"
                variant="outlined"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Users size={18} color="#667eea" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <React.Fragment>
                      {loadingClientNames ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
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
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  p: 2,
                  '&:hover': {
                    bgcolor: alpha('#667eea', 0.08),
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 32, height: 32 }}
                  >
                    <Building2 size={16} />
                  </Avatar>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {option.client_name}
                  </Typography>
                </Box>
              </Box>
            )}
          />

          {clients.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Found {clients.length} available client{clients.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {selectedClientName && (
          <Fade in={!!selectedClientName}>
            <Paper
              sx={{
                p: 3,
                border: '2px solid',
                borderColor: alpha('#10b981', 0.2),
                bgcolor: alpha('#10b981', 0.02),
                borderRadius: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar
                  sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', width: 40, height: 40 }}
                >
                  <CheckCircle size={20} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#10b981' }}>
                    Client Selected: {selectedClientName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready to proceed to content strategy configuration
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Fade>
        )}
      </CardContent>
    </Card>
  );

  // Render the article type selection step with modern design
  const renderArticleTypeStep = () => (
    <Card
      sx={{
        border: '2px solid',
        borderColor: alpha('#667eea', 0.2),
        borderRadius: 3,
        background:
          'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 1) 100%)',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={3} mb={4}>
          <Avatar sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', width: 56, height: 56 }}>
            <Brain size={28} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Content Strategy Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose your content targeting approach for {selectedClientName}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            border: '2px solid',
            borderColor: alpha('#667eea', 0.15),
            borderRadius: 2,
            bgcolor: alpha('#f8fafc', 0.5),
            mb: 4,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Target size={18} color="#667eea" />
            Strategy Selection
          </Typography>

          <Grid container spacing={3}>
            {/* Specific Article Card */}
            <Grid item xs={12} md={6}>
              <Paper
                onClick={() =>
                  handleArticleTypeChange({} as React.MouseEvent<HTMLElement>, 'specific')
                }
                sx={{
                  p: 4,
                  cursor: 'pointer',
                  border: '3px solid',
                  borderColor: articleType === 'specific' ? '#667eea' : alpha('#e5e7eb', 0.5),
                  borderRadius: 3,
                  bgcolor:
                    articleType === 'specific'
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(255, 255, 255, 1) 100%)'
                      : 'white',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#667eea',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px -8px ${alpha('#667eea', 0.2)}`,
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Avatar
                    sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 48, height: 48 }}
                  >
                    <FileText size={24} />
                  </Avatar>
                  {articleType === 'specific' && (
                    <Avatar sx={{ bgcolor: '#10b981', color: 'white', width: 24, height: 24 }}>
                      <CheckCircle size={14} />
                    </Avatar>
                  )}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  🎯 Targeted Article Topics
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Find blogs that match specific article topic ideas with AI-powered content
                  matching
                </Typography>
                <Chip
                  label="Precision Targeting"
                  size="small"
                  sx={{
                    bgcolor: alpha('#667eea', 0.1),
                    color: '#667eea',
                    fontWeight: 600,
                  }}
                />
              </Paper>
            </Grid>

            {/* General Article Card */}
            <Grid item xs={12} md={6}>
              <Paper
                onClick={() =>
                  handleArticleTypeChange({} as React.MouseEvent<HTMLElement>, 'general')
                }
                sx={{
                  p: 4,
                  cursor: 'pointer',
                  border: '3px solid',
                  borderColor: articleType === 'general' ? '#667eea' : alpha('#e5e7eb', 0.5),
                  borderRadius: 3,
                  bgcolor:
                    articleType === 'general'
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(255, 255, 255, 1) 100%)'
                      : 'white',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#667eea',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px -8px ${alpha('#667eea', 0.2)}`,
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Avatar
                    sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', width: 48, height: 48 }}
                  >
                    <Globe size={24} />
                  </Avatar>
                  {articleType === 'general' && (
                    <Avatar sx={{ bgcolor: '#10b981', color: 'white', width: 24, height: 24 }}>
                      <CheckCircle size={14} />
                    </Avatar>
                  )}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  🌍 Geographic & Industry
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Discover blogs by industry sector or geographic location with intelligent
                  filtering
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label="Industry Focus"
                    size="small"
                    sx={{
                      bgcolor: alpha('#8b5cf6', 0.1),
                      color: '#8b5cf6',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label="Geo Targeting"
                    size="small"
                    sx={{
                      bgcolor: alpha('#10b981', 0.1),
                      color: '#10b981',
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <IntercomButton
            onClick={handleBack}
            variant="secondary"
            startIcon={<ArrowLeft size={18} />}
            sx={{
              color: '#6b7280',
              borderColor: alpha('#6b7280', 0.3),
              '&:hover': {
                bgcolor: alpha('#6b7280', 0.1),
              },
            }}
          >
            Back to Client Selection
          </IntercomButton>

          {articleType && (
            <Fade in={!!articleType}>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircle size={20} color="#10b981" />
                <Typography variant="body2" color="#10b981" sx={{ fontWeight: 600 }}>
                  {articleType === 'specific' ? 'Targeted Topics' : 'Geographic & Industry'}{' '}
                  strategy selected
                </Typography>
              </Box>
            </Fade>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // Render the target selection step with modern card wrapper
  const renderTargetStep = () => {
    return (
      <Card
        sx={{
          border: '2px solid',
          borderColor: alpha('#667eea', 0.2),
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 1) 100%)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={3} mb={4}>
            <Avatar
              sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b', width: 56, height: 56 }}
            >
              <Target size={28} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Target Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fine-tune your content discovery strategy for {selectedClientName}
              </Typography>
            </Box>
          </Box>

          {articleType === 'specific' ? renderTopicSelection() : renderGeneralArticleTargets()}

          <Box display="flex" justifyContent="flex-start" mt={4}>
            <IntercomButton
              onClick={handleBack}
              variant="secondary"
              startIcon={<ArrowLeft size={18} />}
              sx={{
                color: '#6b7280',
                borderColor: alpha('#6b7280', 0.3),
                '&:hover': {
                  bgcolor: alpha('#6b7280', 0.1),
                },
              }}
            >
              Back to Strategy
            </IntercomButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render specific article topic selection with modern design
  const renderTopicSelection = () => (
    <Box>
      <Box
        sx={{
          p: 3,
          border: '2px solid',
          borderColor: alpha('#667eea', 0.2),
          borderRadius: 3,
          bgcolor:
            'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)',
          mb: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Avatar sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 40, height: 40 }}>
            <FileText size={20} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🎯 Article Topic Selection
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose from AI-curated article topics with intelligent blog matching
            </Typography>
          </Box>
        </Box>
      </Box>

      {loadingTopics ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: alpha('#667eea', 0.2),
          }}
        >
          <CircularProgress sx={{ color: '#667eea', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading intelligent topic recommendations...
          </Typography>
        </Paper>
      ) : topics.length > 0 ? (
        <Box>
          <Box mb={3}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Available Topics ({topics.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click any topic to discover matching blogs with intelligent content analysis
            </Typography>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              border: '2px solid',
              borderColor: alpha('#667eea', 0.15),
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Table aria-label="topics table">
              <TableHead
                sx={{
                  bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                <TableRow>
                  <TableCell
                    width="65%"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      borderBottom: 'none',
                    }}
                  >
                    📝 Topic & Description
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      borderBottom: 'none',
                    }}
                  >
                    📊 Available Blogs
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      borderBottom: 'none',
                    }}
                  >
                    ⚙️ Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Sort topics by ID ascending */}
                {[...topics]
                  .sort((a, b) => a.topic_id - b.topic_id)
                  .map((topic, index) => (
                    <TableRow
                      key={topic.topic_id}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor:
                          selectedTopic === topic.topic_id
                            ? alpha('#667eea', 0.1)
                            : index % 2 === 0
                              ? alpha('#f8fafc', 0.5)
                              : 'white',
                        borderLeft:
                          selectedTopic === topic.topic_id
                            ? '4px solid #667eea'
                            : '4px solid transparent',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor:
                            selectedTopic === topic.topic_id
                              ? alpha('#667eea', 0.15)
                              : alpha('#667eea', 0.05),
                          transform: 'translateX(4px)',
                          boxShadow: `inset 4px 0 0 ${alpha('#667eea', 0.5)}`,
                        },
                      }}
                      onClick={() => handleTopicChange(topic.topic_id)}
                    >
                      <TableCell
                        sx={{ py: 2.5, borderBottom: `1px solid ${alpha('#e5e7eb', 0.5)}` }}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar
                            sx={{
                              bgcolor:
                                selectedTopic === topic.topic_id
                                  ? '#667eea'
                                  : alpha('#667eea', 0.1),
                              color: selectedTopic === topic.topic_id ? 'white' : '#667eea',
                              width: 32,
                              height: 32,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {topic.topic_id}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: selectedTopic === topic.topic_id ? 700 : 500,
                                color:
                                  selectedTopic === topic.topic_id ? '#667eea' : 'text.primary',
                              }}
                            >
                              {topic.topic_title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Topic ID #{topic.topic_id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ py: 2.5, borderBottom: `1px solid ${alpha('#e5e7eb', 0.5)}` }}
                      >
                        <Chip
                          label={topic.blog_count}
                          sx={{
                            bgcolor:
                              topic.blog_count > 0 ? alpha('#10b981', 0.1) : alpha('#6b7280', 0.1),
                            color: topic.blog_count > 0 ? '#10b981' : '#6b7280',
                            fontWeight: 600,
                            minWidth: 45,
                          }}
                          icon={<Activity size={14} />}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ py: 2.5, borderBottom: `1px solid ${alpha('#e5e7eb', 0.5)}` }}
                      >
                        <IntercomButton
                          variant={selectedTopic === topic.topic_id ? 'primary' : 'secondary'}
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            handleTopicChange(topic.topic_id);
                          }}
                          startIcon={
                            selectedTopic === topic.topic_id ? (
                              <CheckCircle size={16} />
                            ) : (
                              <Target size={16} />
                            )
                          }
                          sx={{
                            minWidth: 100,
                            ...(selectedTopic === topic.topic_id && {
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            }),
                          }}
                        >
                          {selectedTopic === topic.topic_id ? 'Selected' : 'Select'}
                        </IntercomButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: alpha('#ef4444', 0.2),
            bgcolor: alpha('#fef2f2', 0.5),
            borderRadius: 2,
          }}
        >
          <Avatar
            sx={{
              bgcolor: alpha('#ef4444', 0.1),
              color: '#ef4444',
              width: 48,
              height: 48,
              mx: 'auto',
              mb: 2,
            }}
          >
            <Search size={24} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            No Topics Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No topic recommendations found. Please try again later or contact support.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  // Render general article target selection (industry or region) with modern design
  const renderGeneralArticleTargets = () => (
    <Box>
      <Box
        sx={{
          p: 3,
          border: '2px solid',
          borderColor: alpha('#667eea', 0.2),
          borderRadius: 3,
          bgcolor:
            'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)',
          mb: 4,
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', width: 40, height: 40 }}>
            <Globe size={20} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🌍 Geographic & Industry Targeting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select your preferred targeting method for intelligent blog discovery
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper
              onClick={() =>
                handleTargetTypeChange({} as React.MouseEvent<HTMLElement>, 'industry')
              }
              sx={{
                p: 3,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selectedTargetType === 'industry' ? '#667eea' : alpha('#e5e7eb', 0.5),
                bgcolor: selectedTargetType === 'industry' ? alpha('#667eea', 0.05) : 'white',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#667eea',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.2)}`,
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar
                  sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 36, height: 36 }}
                >
                  <Building2 size={18} />
                </Avatar>
                {selectedTargetType === 'industry' && (
                  <Avatar sx={{ bgcolor: '#10b981', color: 'white', width: 20, height: 20 }}>
                    <CheckCircle size={12} />
                  </Avatar>
                )}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                🏢 Industry Targeting
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Target blogs by specific industry sectors with AI-powered matching
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              onClick={() => handleTargetTypeChange({} as React.MouseEvent<HTMLElement>, 'region')}
              sx={{
                p: 3,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selectedTargetType === 'region' ? '#667eea' : alpha('#e5e7eb', 0.5),
                bgcolor: selectedTargetType === 'region' ? alpha('#667eea', 0.05) : 'white',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#667eea',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.2)}`,
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar
                  sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', width: 36, height: 36 }}
                >
                  <MapPin size={18} />
                </Avatar>
                {selectedTargetType === 'region' && (
                  <Avatar sx={{ bgcolor: '#10b981', color: 'white', width: 20, height: 20 }}>
                    <CheckCircle size={12} />
                  </Avatar>
                )}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                🗺️ Geographic Targeting
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Discover blogs by geographic location with intelligent regional analysis
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {selectedTargetType === 'industry' ? (
        <Paper
          sx={{
            p: 4,
            border: '2px solid',
            borderColor: alpha('#667eea', 0.15),
            borderRadius: 2,
            bgcolor: alpha('#f8fafc', 0.5),
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar
              sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 32, height: 32 }}
            >
              <Building2 size={16} />
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Industry Sector Selection
            </Typography>
          </Box>

          {loadingIndustries ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <CircularProgress sx={{ color: '#667eea', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading industry data with AI analysis...
              </Typography>
            </Box>
          ) : (
            <FormControl fullWidth variant="outlined">
              <InputLabel sx={{ fontWeight: 600 }}>Select Industry Sector</InputLabel>
              <Select
                value={selectedIndustry}
                onChange={handleIndustryChange}
                label="Select Industry Sector"
                startAdornment={
                  <InputAdornment position="start">
                    <Building2 size={18} color="#667eea" />
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
                <MenuItem value="">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Search size={16} color="#6b7280" />
                    <em>Choose an industry sector...</em>
                  </Box>
                </MenuItem>
                {industries.map(industry => (
                  <MenuItem key={industry.industry_id} value={industry.industry_id}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            bgcolor: alpha('#667eea', 0.1),
                            color: '#667eea',
                            width: 24,
                            height: 24,
                          }}
                        >
                          <Building2 size={12} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {industry.industry_name}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${industry.blog_count || 0} blogs`}
                        size="small"
                        sx={{
                          bgcolor: alpha('#10b981', 0.1),
                          color: '#10b981',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Paper>
      ) : (
        <Paper
          sx={{
            p: 4,
            border: '2px solid',
            borderColor: alpha('#8b5cf6', 0.15),
            borderRadius: 2,
            bgcolor: alpha('#f8fafc', 0.5),
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar
              sx={{ bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', width: 32, height: 32 }}
            >
              <MapPin size={16} />
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Geographic Region Selection
            </Typography>
          </Box>

          {loadingRegions ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <CircularProgress sx={{ color: '#8b5cf6', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading regional data with geographic intelligence...
              </Typography>
            </Box>
          ) : (
            <FormControl fullWidth variant="outlined">
              <InputLabel sx={{ fontWeight: 600 }}>Select Geographic Region</InputLabel>
              <Select
                value={selectedRegion}
                onChange={handleRegionChange}
                label="Select Geographic Region"
                startAdornment={
                  <InputAdornment position="start">
                    <Map size={18} color="#8b5cf6" />
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
                <MenuItem value="">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Search size={16} color="#6b7280" />
                    <em>Choose a geographic region...</em>
                  </Box>
                </MenuItem>

                {/* Render regions grouped by parent */}
                {regions.map(continent => [
                  <MenuItem
                    key={continent.region_id}
                    value={continent.region_id}
                    sx={{ fontWeight: 700 }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            bgcolor: alpha('#8b5cf6', 0.1),
                            color: '#8b5cf6',
                            width: 24,
                            height: 24,
                          }}
                        >
                          <Globe size={12} />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {continent.region_name}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${continent.blog_count || 0} blogs`}
                        size="small"
                        sx={{
                          bgcolor: alpha('#8b5cf6', 0.1),
                          color: '#8b5cf6',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </MenuItem>,

                  continent.sub_regions &&
                    continent.sub_regions.map(country => (
                      <MenuItem key={country.region_id} value={country.region_id} sx={{ pl: 2 }}>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          width="100%"
                        >
                          <Box display="flex" alignItems="center" gap={2}>
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                justifyContent: 'center',
                              }}
                            >
                              <MapPin size={14} color="#6b7280" />
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, pl: 2 }}>
                              {country.region_name}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${country.blog_count || 0} blogs`}
                            size="small"
                            sx={{
                              bgcolor: alpha('#10b981', 0.1),
                              color: '#10b981',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </MenuItem>
                    )),
                ])}
              </Select>
            </FormControl>
          )}
        </Paper>
      )}
    </Box>
  );

  // Render the blogs display step
  const renderBlogsStep = () => {
    // Prepare the heading based on selections made
    let heading = '';
    if (articleType === 'specific' && selectedTopic) {
      const selectedTopicObj = topics.find(t => t.topic_id === selectedTopic);
      heading = `Available Blogs for ${selectedClientName} - "#${selectedTopic} - ${
        selectedTopicObj?.topic_title || 'Selected Topic'
      }"`;
    } else if (articleType === 'general') {
      if (selectedTargetType === 'industry' && selectedIndustry) {
        const selectedIndustryObj = industries.find(i => i.industry_id === selectedIndustry);
        heading = `Available Blogs for ${selectedClientName} in #${selectedIndustry} - ${
          selectedIndustryObj?.industry_name || 'Selected Industry'
        }`;
      } else if (selectedTargetType === 'region' && selectedRegion) {
        const findRegionById = (regionId: number, regionsList: Region[]): Region | undefined => {
          for (const region of regionsList) {
            if (region.region_id === regionId) {
              return region;
            }
            if (region.sub_regions) {
              const subRegionMatch = findRegionById(regionId, region.sub_regions);
              if (subRegionMatch) {
                return subRegionMatch;
              }
            }
          }
          return undefined;
        };

        const selectedRegionObj = findRegionById(selectedRegion as number, regions);
        heading = `Available Blogs for ${selectedClientName} in #${selectedRegion} - ${
          selectedRegionObj?.region_name || 'Selected Region'
        }`;
      }
    }

    return (
      <Card
        sx={{
          border: '2px solid',
          borderColor: alpha('#667eea', 0.2),
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 1) 100%)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={3} mb={4}>
            <Avatar
              sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', width: 56, height: 56 }}
            >
              <Compass size={28} />
            </Avatar>
            <Box flex={1}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Blog Discovery Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {heading}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
              p: 3,
              border: '2px solid',
              borderColor: alpha('#667eea', 0.15),
              borderRadius: 2,
              bgcolor: alpha('#f8fafc', 0.5),
            }}
          >
            <IntercomButton
              onClick={handleBack}
              variant="secondary"
              startIcon={<ArrowLeft size={18} />}
              sx={{
                color: '#6b7280',
                borderColor: alpha('#6b7280', 0.3),
                '&:hover': {
                  bgcolor: alpha('#6b7280', 0.1),
                },
              }}
            >
              Back to Configuration
            </IntercomButton>

            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', width: 32, height: 32 }}
              >
                <Filter size={16} />
              </Avatar>
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel sx={{ fontWeight: 600 }}>Content Filter</InputLabel>
                <Select
                  value={contentFilter}
                  onChange={e => setContentFilter(e.target.value as 'all' | 'with' | 'without')}
                  label="Content Filter"
                  startAdornment={
                    <InputAdornment position="start">
                      <Filter size={16} color="#667eea" />
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
                  <MenuItem value="all">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        sx={{
                          bgcolor: alpha('#667eea', 0.1),
                          color: '#667eea',
                          width: 20,
                          height: 20,
                        }}
                      >
                        <Globe size={10} />
                      </Avatar>
                      <span>All Blogs ({blogs.length})</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="with">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        sx={{
                          bgcolor: alpha('#10b981', 0.1),
                          color: '#10b981',
                          width: 20,
                          height: 20,
                        }}
                      >
                        <CheckCircle size={10} />
                      </Avatar>
                      <span>
                        With Client Content (
                        {blogs.filter(blog => blog.post_count && blog.post_count > 0).length})
                      </span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="without">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        sx={{
                          bgcolor: alpha('#f59e0b', 0.1),
                          color: '#f59e0b',
                          width: 20,
                          height: 20,
                        }}
                      >
                        <Activity size={10} />
                      </Avatar>
                      <span>
                        Without Client Content (
                        {blogs.filter(blog => !blog.post_count || blog.post_count === 0).length})
                      </span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {loadingBlogs ? (
            <Paper
              sx={{
                p: 8,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: alpha('#667eea', 0.2),
                borderRadius: 3,
                bgcolor: alpha('#667eea', 0.01),
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha('#667eea', 0.1),
                  color: '#667eea',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Brain size={32} />
              </Avatar>
              <CircularProgress sx={{ color: '#667eea', mb: 3 }} size={40} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                AI Intelligence Processing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Discovering and analyzing optimal blog placements with advanced matching
                algorithms...
              </Typography>
            </Paper>
          ) : filteredBlogs.length > 0 ? (
            <Box>
              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  border: '2px solid',
                  borderColor: alpha('#10b981', 0.2),
                  bgcolor: alpha('#10b981', 0.02),
                  borderRadius: 2,
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', width: 40, height: 40 }}
                  >
                    <CheckCircle size={20} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>
                      ✨ Discovery Complete! Found {filteredBlogs.length} Matching Blogs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      AI-powered analysis identified optimal content placement opportunities
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Grid container spacing={3}>
                {filteredBlogs.map((blog, index) => (
                  <Grid item xs={12} sm={6} md={4} key={blog.id || blog.blog_id}>
                    <Grow in timeout={300 + index * 100}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          border: '2px solid',
                          borderColor: alpha('#667eea', 0.15),
                          borderRadius: 3,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#667eea',
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 35px -8px ${alpha('#667eea', 0.2)}`,
                          },
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <Avatar
                              sx={{
                                bgcolor: alpha('#667eea', 0.1),
                                color: '#667eea',
                                width: 32,
                                height: 32,
                              }}
                            >
                              <Globe size={16} />
                            </Avatar>
                            <Typography
                              variant="h6"
                              component="h3"
                              sx={{ fontWeight: 700, flex: 1 }}
                            >
                              {blog.domain}
                            </Typography>
                          </Box>

                          <Stack spacing={1} mt={2}>
                            {selectedClientName && (
                              <Chip
                                label={`Target: ${selectedClientName}`}
                                size="small"
                                sx={{
                                  bgcolor: alpha('#667eea', 0.1),
                                  color: '#667eea',
                                  fontWeight: 600,
                                  '& .MuiChip-label': {
                                    fontSize: '0.75rem',
                                  },
                                }}
                                icon={<Users size={12} />}
                              />
                            )}
                            <Chip
                              label={`${blog.post_count || 0} existing content`}
                              size="small"
                              sx={{
                                bgcolor:
                                  blog.post_count && blog.post_count > 0
                                    ? alpha('#10b981', 0.1)
                                    : alpha('#6b7280', 0.1),
                                color:
                                  blog.post_count && blog.post_count > 0 ? '#10b981' : '#6b7280',
                                fontWeight: 600,
                                '& .MuiChip-label': {
                                  fontSize: '0.75rem',
                                },
                              }}
                              icon={<FileText size={12} />}
                            />
                            <Chip
                              label="AI Optimized"
                              size="small"
                              sx={{
                                bgcolor: alpha('#f59e0b', 0.1),
                                color: '#f59e0b',
                                fontWeight: 600,
                                '& .MuiChip-label': {
                                  fontSize: '0.75rem',
                                },
                              }}
                              icon={<Sparkles size={12} />}
                            />
                          </Stack>
                        </CardContent>
                        <Divider />
                        <CardActions sx={{ p: 2, gap: 1 }}>
                          <IntercomButton
                            size="small"
                            variant="secondary"
                            onClick={() => window.open(`https://${blog.domain}`, '_blank')}
                            startIcon={<Eye size={16} />}
                            sx={{
                              flex: 1,
                              borderColor: alpha('#6b7280', 0.3),
                              color: '#6b7280',
                              '&:hover': {
                                bgcolor: alpha('#6b7280', 0.1),
                                borderColor: '#6b7280',
                              },
                            }}
                          >
                            Visit
                          </IntercomButton>
                          <IntercomButton
                            size="small"
                            variant="primary"
                            onClick={() => handleSubmitPostClick(blog)}
                            startIcon={<Send size={16} />}
                            sx={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                          >
                            Submit
                          </IntercomButton>
                        </CardActions>
                      </Card>
                    </Grow>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Paper
              sx={{
                p: 8,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: alpha('#f59e0b', 0.2),
                bgcolor: alpha('#fef3c7', 0.3),
                borderRadius: 3,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha('#f59e0b', 0.1),
                  color: '#f59e0b',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Search size={32} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                No Matching Blogs Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Our AI analysis couldn't find blogs matching your criteria. Try adjusting your
                filters or selection.
              </Typography>
              <IntercomButton
                variant="secondary"
                onClick={handleBack}
                startIcon={<ArrowLeft size={16} />}
              >
                Refine Selection
              </IntercomButton>
            </Paper>
          )}

          <Box
            display="flex"
            justifyContent="center"
            mt={6}
            pt={4}
            borderTop={`1px solid ${alpha('#e5e7eb', 0.5)}`}
          >
            <IntercomButton
              onClick={handleReset}
              variant="primary"
              startIcon={<RotateCcw size={18} />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                px: 4,
                py: 1.5,
              }}
            >
              Start New Discovery
            </IntercomButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Function to render the active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderClientNameStep();
      case 1:
        return renderArticleTypeStep();
      case 2:
        return renderTargetStep();
      case 3:
        return renderBlogsStep();
      default:
        return 'Unknown step';
    }
  };

  if (isAuthLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="Content Compass"
      breadcrumbs={[
        { label: 'Clients', icon: Users },
        { label: 'Content Compass', icon: Compass },
      ]}
    >
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1,
          },
        }}
      >
        <Box position="relative" zIndex={2}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={3} mb={3}>
            <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 64, height: 64 }}>
              <Compass size={32} />
            </Avatar>
            <Box textAlign="center">
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                Content Compass
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                AI-powered navigation to optimal content placements
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={4} justifyContent="center" mt={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Brain size={20} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Smart Targeting
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Target size={20} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Precision Matching
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Sparkles size={20} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                AI Optimization
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Enhanced Progress Stepper */}
      <Card sx={{ mb: 4, border: '2px solid', borderColor: alpha('#667eea', 0.15) }}>
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
                        width: 48,
                        height: 48,
                        bgcolor: isActive || isCompleted ? '#667eea' : alpha('#e5e7eb', 0.5),
                        color: isActive || isCompleted ? 'white' : '#6b7280',
                        transition: 'all 0.3s ease',
                        mb: 1,
                        border: isActive ? '3px solid white' : 'none',
                        boxShadow: isActive ? `0 8px 25px -8px ${alpha('#667eea', 0.4)}` : 'none',
                      }}
                    >
                      {isCompleted ? <CheckCircle size={24} /> : <StepIcon size={24} />}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isActive || isCompleted ? 600 : 400,
                        color: isActive || isCompleted ? 'primary.main' : 'text.secondary',
                        textAlign: 'center',
                        maxWidth: 90,
                        fontSize: '0.8rem',
                      }}
                    >
                      {step.label}
                    </Typography>
                  </Box>

                  {/* Connection line */}
                  {index < STEPS.length - 1 && (
                    <Box
                      sx={{
                        width: 80,
                        height: 3,
                        bgcolor: index < activeStep ? '#667eea' : alpha('#e5e7eb', 0.5),
                        transition: 'all 0.3s ease',
                        borderRadius: 2,
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

      {getStepContent(activeStep)}
    </IntercomLayout>
  );
}

export default function ContentCompass() {
  return (
    <ToastProvider>
      <ContentCompassPage />
    </ToastProvider>
  );
}
