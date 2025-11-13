import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Alert,
  CircularProgress,
} from '@mui/material';
// Using native HTML date inputs instead of MUI X DatePicker to avoid module resolution issues
import axios from 'axios';
import { IntercomLayout } from '../components/ui';
import useAuth from '../hooks/useAuth';
import ClientDropdown from '../components/ClientDropdown';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import { formatSuperstarContent } from '../utils/formatSuperstarContent';

interface AnalysisHistory {
  id: number;
  client_name: string;
  keyword: string;
  analysis_type: string;
  intent_category: string;
  custom_prompt: string;
  results: any[];
  aggregated_insights: any;
  selected_engine_ids: number[];
  timestamp: string;
  created_at: string;
  user_id?: number;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function GeoAnalysisHistory() {
  const { token, user, isValidUser, isLoading } = useAuth('/login');
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistory | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  // Filters
  const [filters, setFilters] = useState({
    client_name: '',
    keyword: '',
    analysis_type: '',
    intent_category: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
  });

  const fetchAnalyses = async (page = 1) => {
    if (!token) {
      setError('User authentication required. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * pagination.limit;
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
        userToken: token,
      });

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'start_date' || key === 'end_date') {
            params.append(key, (value as Date).toISOString());
          } else {
            params.append(key, value as string);
          }
        }
      });

      const response = await axios.get(`/api/geo-analysis-history?${params}`);
      setAnalyses(response.data.analyses);
      setPagination(prev => ({ ...prev, ...response.data.pagination, offset }));
    } catch (err) {
      setError('Failed to fetch analysis history');
      console.error('Error fetching analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch analyses after authentication is loaded and user is valid
    if (!isLoading && isValidUser && token) {
      fetchAnalyses();
    }
  }, [isLoading, isValidUser, token]);

  const handleSearch = () => {
    fetchAnalyses(1);
  };

  const handleClearFilters = () => {
    setFilters({
      client_name: '',
      keyword: '',
      analysis_type: '',
      intent_category: '',
      start_date: null,
      end_date: null,
    });
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    fetchAnalyses(page);
  };

  const handleViewDetails = (analysis: AnalysisHistory) => {
    setSelectedAnalysis(analysis);
    setDetailModalOpen(true);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <IntercomLayout title="GEO Analysis History">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      </IntercomLayout>
    );
  }

  // Show unauthorized access if not authenticated
  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="GEO Analysis History"
      breadcrumbs={[{ label: 'GEO' }, { label: 'GEO History' }]}
    >
      <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
        {user?.role === 'admin' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Admin View:</strong> You can see all GEO analyses from all users. Regular users
            only see their own analyses.
          </Alert>
        )}
        {/* Filters */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filter Results
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <ClientDropdown
                  value={filters.client_name}
                  onChange={clientName =>
                    setFilters(prev => ({ ...prev, client_name: clientName }))
                  }
                  fullWidth
                  label="Filter by Client"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  label="Keyword"
                  value={filters.keyword}
                  onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Analysis Type</InputLabel>
                  <Select
                    value={filters.analysis_type}
                    onChange={e => setFilters(prev => ({ ...prev, analysis_type: e.target.value }))}
                    label="Analysis Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="brand">Brand</MenuItem>
                    <MenuItem value="individual">Individual</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={filters.start_date ? filters.start_date.toISOString().split('T')[0] : ''}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      start_date: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  label="End Date"
                  type="date"
                  value={filters.end_date ? filters.end_date.toISOString().split('T')[0] : ''}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      end_date: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={9} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button variant="contained" onClick={handleSearch} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Search'}
                </Button>
                <Button variant="outlined" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Results Table */}
        <Card>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6">Analysis Results ({pagination.total} total)</Typography>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    {user?.role === 'admin' && <TableCell>User</TableCell>}
                    <TableCell>Engines</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyses.map(analysis => (
                    <TableRow key={analysis.id} hover>
                      <TableCell>{analysis.client_name}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {analysis.keyword}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={analysis.analysis_type}
                          size="small"
                          color={analysis.analysis_type === 'brand' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {analysis.intent_category
                            .split('_')
                            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                            .join(' ')}
                        </Typography>
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            User ID: {analysis.user_id}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2">
                          {analysis.selected_engine_ids.length} engines
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ minWidth: 120 }}>
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {new Date(analysis.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewDetails(analysis)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Analysis Details: {selectedAnalysis?.keyword} ({selectedAnalysis?.client_name})
          </DialogTitle>
          <DialogContent>
            {selectedAnalysis && (
              <Box>
                {/* Analysis Summary */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Analysis Type:</Typography>
                    <Chip label={selectedAnalysis.analysis_type} size="small" />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Intent Category:</Typography>
                    <Typography variant="body2">{selectedAnalysis.intent_category}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Custom Prompt:</Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      {selectedAnalysis.custom_prompt}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Individual Results */}
                <Typography variant="h6" gutterBottom>
                  Engine Results
                </Typography>
                {selectedAnalysis.results.map((result: any, index: number) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {result.engine} ({result.model})
                    </Typography>
                    {result.error ? (
                      <Alert severity="error">{result.error}</Alert>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{
                          __html: formatSuperstarContent(result.summary, '').content,
                        }}
                      />
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </IntercomLayout>
  );
}
