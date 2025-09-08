import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  IconButton,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import ClientDropdown from './ClientDropdown';
import GeoPdfExport from './GeoPdfExport';
import { exportToPDF } from '../utils/pdfExporter';
import { formatSuperstarContent } from '../utils/formatSuperstarContent';
import useValidateUserToken from '../hooks/useValidateUserToken';
import {
  getAllDataSources,
  GeoAnalysisResult,
  TagFrequency,
  SourceInfo,
} from '../utils/ai-engines';
import axios from 'axios';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const BRAND_INTENT_CATEGORIES = [
  {
    value: 'general_overview',
    label: 'General Overview',
    prompt: 'What is [Brand Name]? Tell me about [Brand Name]',
  },
  { value: 'ownership', label: 'Ownership', prompt: 'Who owns [Brand Name]?' },
  {
    value: 'founding_history',
    label: 'Founding & History',
    prompt: "Who founded [Brand Name] and when? What's the story behind [Brand Name]?",
  },
  { value: 'leadership', label: 'Leadership', prompt: 'Who is the CEO of [Brand Name]?' },
  {
    value: 'reputation',
    label: 'Reputation',
    prompt: 'Is [Brand Name] trustworthy? What do people think of [Brand Name]?',
  },
  {
    value: 'product_service',
    label: 'Product / Service Details',
    prompt: 'What does [Brand Name] do? What products does [Brand Name] offer?',
  },
  {
    value: 'industry_context',
    label: 'Industry Context',
    prompt: 'How does [Brand Name] compare to [Competitor]? What makes [Brand Name] different?',
  },
  {
    value: 'news_controversy',
    label: 'News & Controversy',
    prompt:
      'Has [Brand Name] been in the news recently? What controversies has [Brand Name] been involved in?',
  },
  {
    value: 'reviews_opinion',
    label: 'Reviews / Public Opinion',
    prompt: 'What are people saying about [Brand Name]? Customer reviews for [Brand Name]?',
  },
  {
    value: 'funding_investors',
    label: 'Funding / Investors',
    prompt: 'Who has invested in [Brand Name]? Is [Brand Name] VC-backed?',
  },
  {
    value: 'employment_culture',
    label: 'Employment / Culture',
    prompt: "Is [Brand Name] a good company to work for? What's the culture at [Brand Name]?",
  },
  {
    value: 'legitimacy_scam',
    label: 'Legitimacy / Scam Check',
    prompt: 'Is [Brand Name] legit or a scam?',
  },
];

const INDIVIDUAL_INTENT_CATEGORIES = [
  { value: 'general_overview', label: 'General Overview', prompt: 'Who is [Full Name]?' },
  {
    value: 'background',
    label: 'Background',
    prompt: 'What is [Full Name] known for? What does [Full Name] do?',
  },
  {
    value: 'reputation',
    label: 'Reputation',
    prompt: 'Is [Full Name] trustworthy? What do people say about [Full Name]?',
  },
  {
    value: 'employment_leadership',
    label: 'Employment / Leadership',
    prompt: "What is [Full Name]'s role at [Company]? Is [Full Name] the CEO of [Company]?",
  },
  {
    value: 'notable_events',
    label: 'Notable Events',
    prompt: 'Has [Full Name] been in the news recently? What is [Full Name] best known for?',
  },
  {
    value: 'net_worth_influence',
    label: 'Net Worth / Influence',
    prompt: "What is [Full Name]'s net worth? How influential is [Full Name]?",
  },
  {
    value: 'social_media',
    label: 'Social Media Presence',
    prompt: 'Where can I find [Full Name] online?',
  },
  {
    value: 'education_credentials',
    label: 'Education / Credentials',
    prompt: "Where did [Full Name] go to school? What is [Full Name]'s background?",
  },
  {
    value: 'affiliation',
    label: 'Affiliation',
    prompt: 'Is [Full Name] affiliated with [Brand/Org]?',
  },
  {
    value: 'legal_controversy',
    label: 'Legal / Controversy',
    prompt: 'Has [Full Name] been involved in any controversies?',
  },
];

export default function GeoChecker() {
  const { token, user, isValidUser } = useValidateUserToken();
  const [clientName, setClientName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [analysisType, setAnalysisType] = useState<'brand' | 'individual'>('brand');
  const [intentCategory, setIntentCategory] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPDF = async () => {
    if (!pdfRef.current || !result) return;

    setPdfLoading(true);
    try {
      const filename = `GEO_Analysis_${keyword.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      await exportToPDF(pdfRef.current, filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const dataSources = getAllDataSources().sort((a, b) => a.name.localeCompare(b.name));

  const handleClientChange = (newClientName: string) => {
    setClientName(newClientName);
    // Auto-populate keyword field with client name if keyword is empty
    if (!keyword.trim() && newClientName.trim()) {
      setKeyword(newClientName);
    }
  };

  const generatePromptPreview = () => {
    if (!intentCategory || !keyword.trim()) return '';

    const categories =
      analysisType === 'brand' ? BRAND_INTENT_CATEGORIES : INDIVIDUAL_INTENT_CATEGORIES;
    const category = categories.find(cat => cat.value === intentCategory);

    if (!category) return '';

    let prompt = category.prompt;

    // Replace placeholders with actual keyword
    if (analysisType === 'brand') {
      prompt = prompt.replace(/\[Brand Name\]/g, keyword.trim());
      prompt = prompt.replace(/\[Competitor\]/g, 'competitors');
    } else {
      prompt = prompt.replace(/\[Full Name\]/g, keyword.trim());
      prompt = prompt.replace(/\[Company\]/g, 'their company');
      prompt = prompt.replace(/\[Brand\/Org\]/g, 'any organization');
    }

    // Add instruction for sources
    prompt += ' Include any links to sources.';

    return prompt;
  };

  // Update custom prompt when intent category or keyword changes
  React.useEffect(() => {
    setCustomPrompt(generatePromptPreview());
  }, [intentCategory, keyword, analysisType]);

  const handleEngineChange = (event: any) => {
    const value = event.target.value;
    if (value.includes('all')) {
      setSelectedEngines(
        value.includes('all') && selectedEngines.length !== dataSources.length
          ? dataSources.map(ds => ds.id)
          : []
      );
    } else {
      setSelectedEngines(typeof value === 'string' ? value.split(',').map(Number) : value);
    }
  };

  const handleAnalyze = async () => {
    if (!clientName.trim() || !keyword.trim() || !intentCategory || selectedEngines.length === 0) {
      setError(
        'Please fill in all fields, select an intent category, and select at least one AI engine.'
      );
      return;
    }

    if (!token) {
      setError('User authentication required. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/geo-analysis', {
        keyword: keyword.trim(),
        clientName: clientName.trim(),
        selectedEngineIds: selectedEngines,
        customPrompt: customPrompt.trim(),
        analysisType,
        intentCategory,
        userToken: token,
      });

      setResult(response.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'An error occurred during analysis');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#4caf50';
      case 'negative':
        return '#f44336';
      case 'mixed':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '👍';
      case 'negative':
        return '👎';
      case 'mixed':
        return '⚖️';
      default:
        return '😐';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        GEO Checker Tool
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Analysis Configuration
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <ClientDropdown
                value={clientName}
                onChange={handleClientChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Search Term/Keyword"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                fullWidth
                margin="normal"
                required
                placeholder="Enter keyword to analyze"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl component="fieldset" margin="normal">
                <FormLabel component="legend">Analysis Type</FormLabel>
                <RadioGroup
                  value={analysisType}
                  onChange={e => {
                    setAnalysisType(e.target.value as 'brand' | 'individual');
                    setIntentCategory(''); // Reset intent when changing type
                  }}
                  row
                >
                  <FormControlLabel value="brand" control={<Radio />} label="Brand" />
                  <FormControlLabel value="individual" control={<Radio />} label="Individual" />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Intent Category</InputLabel>
                <Select
                  value={intentCategory}
                  onChange={e => setIntentCategory(e.target.value)}
                  input={<OutlinedInput label="Intent Category" />}
                >
                  {(analysisType === 'brand'
                    ? BRAND_INTENT_CATEGORIES
                    : INDIVIDUAL_INTENT_CATEGORIES
                  ).map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Analysis Prompt"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={3}
                placeholder="Select an intent category above to generate a prompt, or write your own custom prompt"
                helperText="This prompt will be sent to all AI engines. It auto-updates when you change selections above, but you can edit it directly."
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>AI Engines</InputLabel>
                <Select
                  multiple
                  value={selectedEngines}
                  onChange={handleEngineChange}
                  input={<OutlinedInput label="AI Engines" />}
                  renderValue={selected => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.length === dataSources.length ? (
                        <Chip key="all" label="ALL ENGINES" size="small" />
                      ) : (
                        selected.map(value => {
                          const engine = dataSources.find(ds => ds.id === value);
                          return (
                            <Chip
                              key={value}
                              label={engine?.name || `Engine ${value}`}
                              size="small"
                            />
                          );
                        })
                      )}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  <MenuItem key="all" value="all">
                    <Checkbox
                      checked={selectedEngines.length === dataSources.length}
                      indeterminate={
                        selectedEngines.length > 0 && selectedEngines.length < dataSources.length
                      }
                    />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  <Divider />
                  {dataSources.map(engine => (
                    <MenuItem key={engine.id} value={engine.id}>
                      <Checkbox checked={selectedEngines.indexOf(engine.id) > -1} />
                      <ListItemText primary={`${engine.name} (${engine.model})`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleAnalyze}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Analyzing...' : 'Analyze Keyword'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Analysis Results for &ldquo;{result.keyword}&rdquo; - {result.clientName}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                onClick={handleExportPDF}
                disabled={pdfLoading}
                sx={{ ml: 2 }}
              >
                {pdfLoading ? 'Generating...' : 'Export PDF'}
              </Button>
            </Box>

            {/* Aggregated Insights */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Overall Sentiment */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    📊 Overall Sentiment
                  </Typography>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h2" sx={{ mb: 1 }}>
                      {getSentimentIcon(result.aggregatedInsights.overallSentiment)}
                    </Typography>
                    <Chip
                      label={result.aggregatedInsights.overallSentiment.toUpperCase()}
                      size="medium"
                      sx={{
                        backgroundColor: getSentimentColor(
                          result.aggregatedInsights.overallSentiment
                        ),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Breakdown by Engine:
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="success.main">
                      👍 Positive: {result.aggregatedInsights.sentimentBreakdown.positive.count}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      👎 Negative: {result.aggregatedInsights.sentimentBreakdown.negative.count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      😐 Neutral: {result.aggregatedInsights.sentimentBreakdown.neutral.count}
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      ⚖️ Mixed: {result.aggregatedInsights.sentimentBreakdown.mixed.count}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Top Tags */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    🏷️ Top Tags
                  </Typography>
                  {result.aggregatedInsights.topTags.length > 0 ? (
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {result.aggregatedInsights.topTags.map((tag, index) => (
                        <Box
                          key={index}
                          sx={{
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Chip
                            label={tag.tag}
                            size="small"
                            variant="outlined"
                            sx={{ maxWidth: '60%' }}
                          />
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {tag.count}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tag.engines.length} engine{tag.engines.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No common tags identified
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Sources */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    📚 Sources Mentioned
                  </Typography>
                  {result.aggregatedInsights.sources.length > 0 ? (
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {result.aggregatedInsights.sources.map((source, index) => (
                        <Box
                          key={index}
                          sx={{
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: source.excerpts ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (source.excerpts && source.excerpts.length > 0) {
                              setSelectedSource(source);
                              setSourceModalOpen(true);
                            }
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 'medium',
                              maxWidth: '70%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: source.excerpts ? 'primary.main' : 'text.primary',
                              textDecoration: source.excerpts ? 'underline' : 'none',
                            }}
                          >
                            {source.source}
                          </Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {source.count}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {source.engines.length} engine{source.engines.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No specific sources identified
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* URL Sources */}
            {result.aggregatedInsights.urlSources &&
              result.aggregatedInsights.urlSources.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    🔗 URLs Referenced by AI Engines
                  </Typography>
                  <Grid container spacing={2}>
                    {result.aggregatedInsights.urlSources.map((urlSource, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'grey.100' },
                            border: '1px solid',
                            borderColor: 'grey.300',
                          }}
                          onClick={() => {
                            setSelectedSource(urlSource);
                            setSourceModalOpen(true);
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: 'primary.main',
                              textDecoration: 'underline',
                              mb: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {urlSource.source}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Referenced by {urlSource.engines.join(', ')} ({urlSource.count} times)
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

            {/* Sentiment Highlights */}
            {(result.aggregatedInsights.mainSentimentHighlights.positive.length > 0 ||
              result.aggregatedInsights.mainSentimentHighlights.negative.length > 0) && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  💬 Sentiment Highlights
                </Typography>

                <Grid container spacing={2}>
                  {result.aggregatedInsights.mainSentimentHighlights.positive.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom color="success.main">
                        👍 Positive Insights:
                      </Typography>
                      {result.aggregatedInsights.mainSentimentHighlights.positive.map(
                        (highlight, index) => (
                          <Paper
                            key={index}
                            sx={{
                              p: 2,
                              mb: 1,
                              backgroundColor: 'success.light',
                              color: 'success.contrastText',
                            }}
                          >
                            <Typography variant="body2">&quot;{highlight}&quot;</Typography>
                          </Paper>
                        )
                      )}
                    </Grid>
                  )}

                  {result.aggregatedInsights.mainSentimentHighlights.negative.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom color="error.main">
                        👎 Areas for Attention:
                      </Typography>
                      {result.aggregatedInsights.mainSentimentHighlights.negative.map(
                        (highlight, index) => (
                          <Paper
                            key={index}
                            sx={{
                              p: 2,
                              mb: 1,
                              backgroundColor: 'error.light',
                              color: 'error.contrastText',
                            }}
                          >
                            <Typography variant="body2">&quot;{highlight}&quot;</Typography>
                          </Paper>
                        )
                      )}
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Summary and Themes */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                📋 Analysis Summary
              </Typography>

              {result.aggregatedInsights.keyThemes.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Key Themes Identified:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {result.aggregatedInsights.keyThemes.map((theme, index) => (
                      <Chip
                        key={index}
                        label={theme}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Summary:
                </Typography>
                {result.aggregatedInsights.commonInsights.map((insight, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                    • {insight}
                  </Typography>
                ))}
              </Box>

              {result.aggregatedInsights.recommendations.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Top Recommendations:
                  </Typography>
                  {result.aggregatedInsights.recommendations.slice(0, 3).map((rec, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      💡 {rec}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Individual Engine Results */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              🤖 Individual Engine Results
            </Typography>

            {result.results.map((engineResult, index) => (
              <Accordion
                key={index}
                sx={{ mb: 1, backgroundColor: 'background.paper', color: 'text.primary' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ flexGrow: 1, color: 'text.primary' }}>
                      {engineResult.engine} ({engineResult.model})
                    </Typography>
                    {engineResult.error ? (
                      <Chip label="ERROR" size="small" color="error" />
                    ) : (
                      <Chip label="SUCCESS" size="small" color="success" />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {engineResult.error ? (
                    <Alert severity="error">
                      Failed to get results from {engineResult.engine}: {engineResult.error}
                    </Alert>
                  ) : (
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', mb: 2 }}
                        dangerouslySetInnerHTML={{
                          __html: formatSuperstarContent(engineResult.summary, '').content,
                        }}
                      />

                      {engineResult.sources && engineResult.sources.length > 0 && (
                        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            🔗 Sources Referenced:
                          </Typography>
                          {engineResult.sources.map((source, idx) => (
                            <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                              •{' '}
                              <a
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2' }}
                              >
                                {source}
                              </a>
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Analysis completed at: {result.timestamp.toLocaleString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Hidden PDF Export Component */}
      {result && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={pdfRef}>
            <GeoPdfExport result={result} />
          </div>
        </div>
      )}

      {/* Source Excerpts Modal */}
      <Dialog
        open={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Source Excerpts: {selectedSource?.source}</DialogTitle>
        <DialogContent>
          {selectedSource?.excerpts && selectedSource.excerpts.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Referenced by: {selectedSource.engines.join(', ')}
              </Typography>
              {selectedSource.excerpts.map((fullText: string, index: number) => {
                // Highlight URLs in the full text
                let highlightedText = fullText;
                if (selectedSource.urls) {
                  selectedSource.urls.forEach((url: string) => {
                    const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    highlightedText = highlightedText.replace(
                      urlRegex,
                      `<mark style="background-color: yellow; padding: 2px 4px; border-radius: 3px;"><a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: underline;">${url}</a></mark>`
                    );
                  });
                }

                return (
                  <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block' }}
                    >
                      Engine: {selectedSource.engines[index] || 'Unknown'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        '& mark': {
                          backgroundColor: 'yellow',
                          padding: '2px 4px',
                          borderRadius: '3px',
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightedText }}
                    />
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No excerpts available for this source.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourceModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
