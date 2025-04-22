import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  IconButton,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';

// Define approval request interface
interface ApprovalRequest {
  request_id: number;
  client_id: number;
  client_name: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by_id: string | null;
  published_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  approvals_count: number;
  total_contacts: number;
  versions: Array<{
    version_id: number;
    version_number: number;
    file_url: string;
    comments: string | null;
    created_at: string;
  }> | null;
}

export default function ClientApprovalPage() {
  const router = useRouter();
  const { isValidUser, isLoading } = useValidateUserToken();

  // Get error param from URL if present
  const { error: errorParam } = router.query;

  // State for data and loading
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters and tabs
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<number | string>('all');
  const [clients, setClients] = useState<{ client_id: number; client_name: string }[]>([]);

  // State for toast notification
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Set error message and toast based on URL parameter
  useEffect(() => {
    if (errorParam === 'request_not_found') {
      const message = 'The requested content could not be found or has been removed.';
      setError(message);
      setToastMessage(message);
      setToastOpen(true);
    }
  }, [errorParam]);

  // Load approval requests on mount
  useEffect(() => {
    if (isValidUser) {
      fetchApprovalRequests();
      fetchClients();
    }
  }, [isValidUser]);

  // Fetch all approval requests
  const fetchApprovalRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/approval-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      setError('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all clients for filtering
  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle creating a new approval request
  const handleCreateRequest = () => {
    router.push('/client-approval/upload');
  };

  // Handle viewing a request
  const handleViewRequest = (requestId: number) => {
    router.push(`/client-approval/requests/${requestId}`);
  };

  // Calculate filtered requests based on current filters
  const getFilteredRequests = () => {
    return requests.filter(request => {
      // Filter by search term (title or client name)
      const matchesSearch =
        searchTerm === '' ||
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.client_name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by status
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      // Filter by client
      const matchesClient = clientFilter === 'all' || request.client_id === clientFilter;

      // Filter by archived status based on tab
      const matchesArchived = tabValue === 0 ? !request.is_archived : request.is_archived;

      return matchesSearch && matchesStatus && matchesClient && matchesArchived;
    });
  };

  // Get the filtered requests
  const filteredRequests = getFilteredRequests();

  // Generate status chip with appropriate color
  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';

    switch (status) {
      case 'pending':
        color = 'warning';
        break;
      case 'approved':
        color = 'success';
        break;
      case 'rejected':
        color = 'error';
        break;
    }

    return (
      <Chip label={status.charAt(0).toUpperCase() + status.slice(1)} color={color} size="small" />
    );
  };

  // Handle closing the toast
  const handleCloseToast = () => {
    setToastOpen(false);

    // Clear the error parameter from the URL
    if (errorParam) {
      const { pathname } = router;
      router.replace(pathname, undefined, { shallow: true });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

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
      <Container maxWidth="lg">
        <Box my={4}>
          <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
            <Grid item>
              <Typography variant="h4" gutterBottom>
                Client Approval Requests
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateRequest}
              >
                New Request
              </Button>
            </Grid>
          </Grid>

          <Box my={3}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="approval request tabs">
              <Tab label="Active Requests" />
              <Tab label="Archived Requests" />
            </Tabs>
          </Box>

          {/* Filters */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search by title or client"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Client"
                  value={clientFilter}
                  onChange={e => setClientFilter(Number(e.target.value) || e.target.value)}
                >
                  <MenuItem value="all">All Clients</MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.client_id} value={client.client_id}>
                      {client.client_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchApprovalRequests}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Content */}
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : filteredRequests.length === 0 ? (
            <Alert severity="info">
              {tabValue === 0
                ? 'No active approval requests found. Create a new request to get started.'
                : 'No archived approval requests found.'}
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredRequests.map(request => (
                <Grid item xs={12} md={6} lg={4} key={request.request_id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                          {request.title}
                        </Typography>
                        {getStatusChip(request.status)}
                      </Box>

                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Client: {request.client_name}
                      </Typography>

                      <Box mt={1}>
                        <Chip
                          size="small"
                          label={`${request.approvals_count}/${request.total_contacts} Approved`}
                          color={
                            request.approvals_count === request.total_contacts
                              ? 'success'
                              : 'default'
                          }
                          sx={{ mr: 1 }}
                        />

                        <Chip
                          size="small"
                          label={`Version ${request.versions?.[0]?.version_number || 1}`}
                          color="info"
                        />
                      </Box>

                      {request.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {request.description}
                        </Typography>
                      )}

                      {request.published_url && (
                        <Box mt={2}>
                          <Typography variant="body2" color="primary">
                            Published at: {new URL(request.published_url).hostname}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>

                    <Divider />

                    <CardActions>
                      <Button size="small" onClick={() => handleViewRequest(request.request_id)}>
                        View Details
                      </Button>
                      <Box flexGrow={1} />
                      <Typography variant="caption" color="textSecondary">
                        {new Date(request.created_at).toLocaleDateString()}
                      </Typography>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>

      {/* Toast Notification */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity="warning" sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </LayoutContainer>
  );
}
