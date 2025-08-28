import React, { useState } from 'react';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ClientDropdown from './ClientDropdown';
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

export default function GeoChecker() {
  const [clientName, setClientName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dataSources = getAllDataSources().sort((a, b) => a.name.localeCompare(b.name));

  const handleClientChange = (newClientName: string) => {
    setClientName(newClientName);
    // Auto-populate keyword field with client name if keyword is empty
    if (!keyword.trim() && newClientName.trim()) {
      setKeyword(newClientName);
    }
  };

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
    if (!clientName.trim() || !keyword.trim() || selectedEngines.length === 0) {
      setError('Please fill in all fields and select at least one AI engine.');
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TrendingUpIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Analysis Results for &ldquo;{result.keyword}&rdquo; - {result.clientName}
              </Typography>
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
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 'medium',
                              maxWidth: '70%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
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
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}
                    >
                      {engineResult.summary}
                    </Typography>
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
    </Box>
  );
}
