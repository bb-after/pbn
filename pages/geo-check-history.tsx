import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Pagination,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IntercomLayout, IntercomCard, ToastProvider } from '../components/ui';
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import axios from 'axios';

export default function GeoCheckHistoryPage() {
  return (
    <ToastProvider>
      <GeoCheckHistory />
    </ToastProvider>
  );
}

interface GeoCheckResult {
  id: number;
  keyword: string;
  analysis_type: string;
  intent_category: string;
  custom_prompt?: string;
  selected_engine_ids: number[];
  results: any[];
  aggregated_insights: any;
  timestamp: string;
  created_at: string;
}

function GeoCheckHistory() {
  const { token } = useValidateUserToken();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeoCheckResult[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 25, offset: 0, hasMore: false });
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    keyword: '',
    analysisType: '',
    intentCategory: '',
  });

  const loadResults = async (newOffset = 0) => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        userToken: token,
        limit: pagination.limit.toString(),
        offset: newOffset.toString(),
      });

      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.analysisType) params.append('analysisType', filters.analysisType);
      if (filters.intentCategory) params.append('intentCategory', filters.intentCategory);

      const response = await axios.get(`/api/geo-check-results?${params}`);

      if (response.data.success) {
        setResults(response.data.results);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load geo check results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [token]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    loadResults(0);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset }));
    loadResults(newOffset);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      case 'mixed':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (!token) return <UnauthorizedAccess />;

  return (
    <IntercomLayout
      title="GEO Check History"
      breadcrumbs={[{ label: 'GEO' }, { label: 'Check History' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Your GEO Analysis History
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            View and analyze all your previous GEO checks. Results are stored from both manual
            analyses and external API calls.
          </Alert>

          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Search & Filter
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Keyword"
                    value={filters.keyword}
                    onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                    placeholder="Search by keyword"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Analysis Type</InputLabel>
                    <Select
                      value={filters.analysisType}
                      label="Analysis Type"
                      onChange={e =>
                        setFilters(prev => ({ ...prev, analysisType: e.target.value }))
                      }
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="brand">Brand</MenuItem>
                      <MenuItem value="individual">Individual</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Intent Category"
                    value={filters.intentCategory}
                    onChange={e =>
                      setFilters(prev => ({ ...prev, intentCategory: e.target.value }))
                    }
                    placeholder="e.g., general_overview"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button variant="contained" fullWidth onClick={handleSearch} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : 'Search'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length === 0 && !loading && (
            <Alert severity="info">
              No geo check results found. Try adjusting your search criteria or run a new analysis.
            </Alert>
          )}

          {results.map(result => (
            <Accordion
              key={result.id}
              expanded={expandedResult === result.id}
              onChange={(_, isExpanded) => setExpandedResult(isExpanded ? result.id : null)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    mr: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6">{result.keyword}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip label={result.analysis_type} size="small" />
                      <Chip label={result.intent_category} size="small" variant="outlined" />
                      <Chip
                        label={result.aggregated_insights?.overallSentiment || 'neutral'}
                        size="small"
                        color={getSentimentColor(result.aggregated_insights?.overallSentiment)}
                      />
                      <Chip
                        label={`${result.results?.length || 0} engines`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(result.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Analysis Details */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Analysis Details
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Keyword:</strong> {result.keyword}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Type:</strong> {result.analysis_type}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Category:</strong> {result.intent_category}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Engines Used:</strong> {result.selected_engine_ids?.join(', ')}
                      </Typography>
                      {result.custom_prompt && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Custom Prompt:</strong>
                          <br />
                          <Box
                            component="span"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              backgroundColor: 'grey.100',
                              p: 1,
                              borderRadius: 1,
                              display: 'block',
                              mt: 0.5,
                            }}
                          >
                            {result.custom_prompt}
                          </Box>
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* Aggregated Insights */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Key Insights
                    </Typography>
                    {result.aggregated_insights && (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Overall Sentiment:</strong>{' '}
                          <Chip
                            label={result.aggregated_insights.overallSentiment}
                            size="small"
                            color={getSentimentColor(result.aggregated_insights.overallSentiment)}
                          />
                        </Typography>

                        {result.aggregated_insights.topTags?.length > 0 && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Top Tags:</strong>{' '}
                            {result.aggregated_insights.topTags
                              .slice(0, 3)
                              .map((tag: any) => tag.tag)
                              .join(', ')}
                          </Typography>
                        )}

                        {result.aggregated_insights.keyThemes?.length > 0 && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Key Themes:</strong>{' '}
                            {result.aggregated_insights.keyThemes.slice(0, 3).join(', ')}
                          </Typography>
                        )}

                        {result.aggregated_insights.commonInsights?.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Summary:</strong>
                            </Typography>
                            {result.aggregated_insights.commonInsights
                              .slice(0, 2)
                              .map((insight: string, idx: number) => (
                                <Typography key={idx} variant="body2" sx={{ ml: 1 }}>
                                  • {insight}
                                </Typography>
                              ))}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Grid>

                  {/* Individual Engine Results */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Engine Results
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Engine</TableCell>
                            <TableCell>Model</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Summary Preview</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.results?.map((engineResult: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{engineResult.engine}</TableCell>
                              <TableCell>{engineResult.model}</TableCell>
                              <TableCell>
                                <Chip
                                  label={engineResult.error ? 'Error' : 'Success'}
                                  size="small"
                                  color={engineResult.error ? 'error' : 'success'}
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: '300px' }}>
                                {engineResult.error ? (
                                  <Typography variant="body2" color="error">
                                    {engineResult.error}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2">
                                    {engineResult.summary?.substring(0, 150) +
                                      (engineResult.summary?.length > 150 ? '...' : '')}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={Math.ceil(pagination.total / pagination.limit)}
                page={Math.floor(pagination.offset / pagination.limit) + 1}
                onChange={handlePageChange}
                disabled={loading}
              />
            </Box>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}
