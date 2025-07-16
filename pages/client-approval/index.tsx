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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewModule as CardViewIcon,
  ViewList as TableViewIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

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
  const { isValidUser, isLoading, user } = useValidateUserToken();
  const { admin: isAdminMode } = router.query;

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Get error param from URL if present
  const { error: errorParam } = router.query;

  // State for data and loading
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for view mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // State for filters and tabs
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<number | string>('all');
  const [clients, setClients] = useState<{ client_id: number; client_name: string }[]>([]);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // State for toast notification
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Page title reflecting the mode
  const pageTitle =
    isAdminMode && isAdmin ? 'Admin: All Approval Requests' : 'Client Approval Requests';

  // Set error message and toast based on URL parameter
  useEffect(() => {
    if (errorParam === 'request_not_found') {
      const message = 'The requested content could not be found or has been removed.';
      setError(message);
      setToastMessage(message);
      setToastOpen(true);
    }
  }, [errorParam]);

  // Redirect non-admin users trying to access admin mode
  useEffect(() => {
    if (isAdminMode && !isAdmin && !isLoading && isValidUser) {
      router.push('/client-approval');
    }
  }, [isAdminMode, isAdmin, isLoading, isValidUser, router]);

  // Load approval requests on mount
  useEffect(() => {
    if (isValidUser) {
      fetchApprovalRequests();
      fetchClients();
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [isValidUser, isAdmin]);

  // Only refetch when tab changes
  useEffect(() => {
    if (isValidUser) {
      fetchApprovalRequests();
    }
  }, [tabValue]);

  // Helper to determine tab types
  const isPendingTab = tabValue === 0;
  const isApprovedTab = tabValue === 1;
  const isPublishedTab = tabValue === 2;

  // Handle view mode change
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'cards' | 'table'
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Fetch all approval requests
  const fetchApprovalRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Build query parameters
      let url = '/api/approval-requests';
      const params = new URLSearchParams();

      // Only add admin=true param if user is admin and in admin mode
      if (isAdmin && isAdminMode) {
        params.append('admin', 'true');
      }

      // Add user_id filter if an admin has selected a specific user
      if (isAdmin && userFilter !== 'all') {
        params.append('user_id', userFilter);
      }

      // Add client filter if selected
      if (clientFilter !== 'all') {
        params.append('client_id', clientFilter.toString());
      }

      // Add tab-based filters
      if (isPendingTab) {
        params.append('status', 'pending');
      } else if (isApprovedTab) {
        params.append('status', 'approved');
        params.append('published', 'false');
      } else if (isPublishedTab) {
        params.append('status', 'approved');
        params.append('published', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching approval requests with URL:', url);
      console.log('Current filter state:', { userFilter, clientFilter, statusFilter });

      const response = await axios.get(url, {
        headers: {
          'x-auth-token': token,
        },
      });

      console.log('API Response status:', response.status);
      console.log('Received approval requests:', response.data.length, 'items');

      // If we have data, log the first item to see its structure
      if (response.data && response.data.length > 0) {
        console.log('First request item:', {
          id: response.data[0].request_id,
          title: response.data[0].title,
          created_by_id: response.data[0].created_by_id,
          status: response.data[0].status,
        });
      } else {
        console.log('No requests returned from API');
      }

      // Clear the requests array first to avoid any stale data
      setRequests([]);

      // Then set the new data
      setTimeout(() => {
        setRequests(response.data);
      }, 0);
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
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      const response = await axios.get('/api/clients', {
        headers: {
          'x-auth-token': token,
        },
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Fetch all users for admin filtering
  const fetchUsers = async () => {
    if (!isAdmin) return;

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      const response = await axios.get('/api/users', {
        headers: {
          'x-auth-token': token,
        },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  // Get the filtered requests (only filter by search term, backend handles tab filtering)
  const filteredRequests = requests.filter(request => {
    return (
      searchTerm === '' ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Generate status chip with appropriate color
  const getStatusChip = (request: ApprovalRequest) => {
    if (request.is_archived) {
      return (
        <Chip
          label="Archived"
          color="default"
          size="small"
          sx={{ bgcolor: 'grey.400', color: 'white' }}
        />
      );
    }
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';
    switch (request.status) {
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
      <Chip
        label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        color={color}
        size="small"
      />
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

  // Add a specific handler for when the user filter changes
  const handleUserFilterChange = (value: string) => {
    console.log('User filter changed to:', value);

    // Reset other filters for clarity when switching users
    setSearchTerm('');

    // Set the state and immediately call fetch with the new value
    setUserFilter(value);

    // Immediately fetch the updated data with the new value - bypass state
    fetchApprovalRequestsWithFilter(value);
  };

  // New function that ensures we use the correct filter value
  const fetchApprovalRequestsWithFilter = (currentUserFilter: string) => {
    setLoading(true);
    setError(null);

    // Use the passed value instead of relying on state
    console.log('Fetching approval requests with explicit user filter:', currentUserFilter);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Build query parameters
      let url = '/api/approval-requests';
      const params = new URLSearchParams();

      // Only add admin=true param if user is admin and in admin mode
      if (isAdmin && isAdminMode) {
        params.append('admin', 'true');
      }

      // Add user_id filter if an admin has selected a specific user
      // Use the passed value, not the state
      if (isAdmin && currentUserFilter !== 'all') {
        params.append('user_id', currentUserFilter);
      }

      // Add client filter if selected
      if (clientFilter !== 'all') {
        params.append('client_id', clientFilter.toString());
      }

      // Add tab-based filters
      if (isPendingTab) {
        params.append('status', 'pending');
      } else if (isApprovedTab) {
        params.append('status', 'approved');
        params.append('published', 'false');
      } else if (isPublishedTab) {
        params.append('status', 'approved');
        params.append('published', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching approval requests with URL:', url);
      console.log('Current filter state:', {
        userFilter: currentUserFilter,
        clientFilter,
        statusFilter,
      });

      axios
        .get(url, {
          headers: {
            'x-auth-token': token,
          },
        })
        .then(response => {
          console.log('API Response status:', response.status);
          console.log('Received approval requests:', response.data.length, 'items');

          // If we have data, log the first item to see its structure
          if (response.data && response.data.length > 0) {
            console.log('First request item:', {
              id: response.data[0].request_id,
              title: response.data[0].title,
              created_by_id: response.data[0].created_by_id,
              status: response.data[0].status,
            });
          } else {
            console.log('No requests returned from API');
          }

          // Update state with the response data
          setRequests(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching approval requests:', error);
          setError('Failed to load approval requests');
          setLoading(false);
        });
    } catch (error) {
      console.error('Error preparing approval requests fetch:', error);
      setError('Failed to prepare approval requests fetch');
      setLoading(false);
    }
  };

  // Add a handler for when the client filter changes
  const handleClientFilterChange = (value: string | number) => {
    console.log('Client filter changed to:', value);

    // Reset search term for clarity
    setSearchTerm('');

    // Set the state
    setClientFilter(value);

    // Immediately fetch the updated data with the new value - bypass state
    fetchApprovalRequestsWithClient(value.toString());
  };

  // Add a handler for when the status filter changes
  const handleStatusFilterChange = (value: string) => {
    console.log('Status filter changed to:', value);

    // Reset search term for clarity
    setSearchTerm('');

    // Set the state
    setStatusFilter(value);

    // Immediately fetch the updated data with the new value - bypass state
    fetchApprovalRequestsWithStatus(value);
  };

  // Function to fetch with client filter explicit value
  const fetchApprovalRequestsWithClient = (currentClientFilter: string | number) => {
    setLoading(true);
    setError(null);

    const clientFilterStr = currentClientFilter.toString();
    console.log('Fetching approval requests with explicit client filter:', clientFilterStr);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Build query parameters
      let url = '/api/approval-requests';
      const params = new URLSearchParams();

      // Only add admin=true param if user is admin and in admin mode
      if (isAdmin && isAdminMode) {
        params.append('admin', 'true');
      }

      // Add user_id filter if an admin has selected a specific user
      if (isAdmin && userFilter !== 'all') {
        params.append('user_id', userFilter);
      }

      // Add client filter if selected - use passed value
      if (clientFilterStr !== 'all') {
        params.append('client_id', clientFilterStr);
      }

      // Add tab-based filters
      if (isPendingTab) {
        params.append('status', 'pending');
      } else if (isApprovedTab) {
        params.append('status', 'approved');
        params.append('published', 'false');
      } else if (isPublishedTab) {
        params.append('status', 'approved');
        params.append('published', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching approval requests with URL:', url);
      console.log('Current filter state:', {
        userFilter,
        clientFilter: clientFilterStr,
        statusFilter,
      });

      axios
        .get(url, {
          headers: {
            'x-auth-token': token,
          },
        })
        .then(response => {
          console.log('API Response status:', response.status);
          console.log('Received approval requests:', response.data.length, 'items');
          setRequests(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching approval requests:', error);
          setError('Failed to load approval requests');
          setLoading(false);
        });
    } catch (error) {
      console.error('Error preparing approval requests fetch:', error);
      setError('Failed to prepare approval requests fetch');
      setLoading(false);
    }
  };

  // Function to fetch with status filter explicit value
  const fetchApprovalRequestsWithStatus = (currentStatusFilter: string) => {
    setLoading(true);
    setError(null);

    console.log('Fetching approval requests with explicit status filter:', currentStatusFilter);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Build query parameters
      let url = '/api/approval-requests';
      const params = new URLSearchParams();

      // Only add admin=true param if user is admin and in admin mode
      if (isAdmin && isAdminMode) {
        params.append('admin', 'true');
      }

      // Add user_id filter if an admin has selected a specific user
      if (isAdmin && userFilter !== 'all') {
        params.append('user_id', userFilter);
      }

      // Add client filter if selected
      if (clientFilter !== 'all') {
        params.append('client_id', clientFilter.toString());
      }

      // Add tab-based filters
      if (isPendingTab) {
        params.append('status', 'pending');
      } else if (isApprovedTab) {
        params.append('status', 'approved');
        params.append('published', 'false');
      } else if (isPublishedTab) {
        params.append('status', 'approved');
        params.append('published', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching approval requests with URL:', url);
      console.log('Current filter state:', {
        userFilter,
        clientFilter,
        statusFilter: currentStatusFilter,
      });

      axios
        .get(url, {
          headers: {
            'x-auth-token': token,
          },
        })
        .then(response => {
          console.log('API Response status:', response.status);
          console.log('Received approval requests:', response.data.length, 'items');
          setRequests(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching approval requests:', error);
          setError('Failed to load approval requests');
          setLoading(false);
        });
    } catch (error) {
      console.error('Error preparing approval requests fetch:', error);
      setError('Failed to prepare approval requests fetch');
      setLoading(false);
    }
  };

  // Table component for requests
  const RequestsTable = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Approvals</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Published URL</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredRequests.map(request => (
            <TableRow key={request.request_id} hover sx={{ cursor: 'pointer' }}>
              <TableCell onClick={() => handleViewRequest(request.request_id)}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {request.title}
                </Typography>
                {request.description && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      mt: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {request.description}
                  </Typography>
                )}
              </TableCell>
              <TableCell onClick={() => handleViewRequest(request.request_id)}>
                {request.client_name}
              </TableCell>
              <TableCell onClick={() => handleViewRequest(request.request_id)}>
                {getStatusChip(request)}
              </TableCell>
              <TableCell onClick={() => handleViewRequest(request.request_id)}>
                <Chip
                  size="small"
                  label={`${request.approvals_count}/${request.total_contacts}`}
                  color={request.approvals_count === request.total_contacts ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell onClick={() => handleViewRequest(request.request_id)}>
                <Typography variant="body2">
                  {new Date(request.created_at).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell>
                {request.published_url ? (
                  <Box display="flex" alignItems="center">
                    <LinkIcon color="primary" sx={{ mr: 0.5, fontSize: 16 }} />
                    <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                      {new URL(request.published_url).hostname}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Not published
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewRequest(request.request_id)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Cards component for requests
  const RequestsCards = () => (
    <Grid container spacing={3}>
      {filteredRequests.map(request => (
        <Grid item xs={12} md={6} lg={4} key={request.request_id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
            onClick={() => handleViewRequest(request.request_id)}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                  {request.title}
                </Typography>
                {getStatusChip(request)}
              </Box>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Client: {request.client_name}
              </Typography>

              <Box mt={1}>
                <Chip
                  size="small"
                  label={`${request.approvals_count}/${request.total_contacts} Approved`}
                  color={request.approvals_count === request.total_contacts ? 'success' : 'default'}
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
              <Button
                size="small"
                onClick={e => {
                  e.stopPropagation(); // Prevent card click from triggering
                  handleViewRequest(request.request_id);
                }}
              >
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
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="lg">
        <Box my={4}>
          <Grid container justifyContent="space-between" alignItems="center" spacing={2}>
            <Grid item>
              <Typography variant="h4" gutterBottom>
                {pageTitle}
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
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="approval request tabs">
                <Tab label="Pending Approval" />
                <Tab label="Approved Content" />
                <Tab label="Published Content" />
              </Tabs>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="table">
                  <TableViewIcon />
                </ToggleButton>
                <ToggleButton value="cards">
                  <CardViewIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
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
                  onChange={e => {
                    // Get the value directly from the event
                    const value = e.target.value;
                    console.log('Status filter changed directly from event:', value);
                    // Call handler with the value from the event
                    handleStatusFilterChange(value);
                  }}
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
                  onChange={e => {
                    // Get the value directly from the event
                    const value = Number(e.target.value) || e.target.value;
                    console.log('Client filter changed directly from event:', value);
                    // Call handler with the value from the event
                    handleClientFilterChange(value);
                  }}
                >
                  <MenuItem value="all">All Clients</MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.client_id} value={client.client_id}>
                      {client.client_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {users.length > 0 && (
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="User"
                    value={userFilter}
                    onChange={e => {
                      // Get the value directly from the event
                      const value = e.target.value;
                      console.log('User filter changed directly from event:', value);
                      // Call handler with the value from the event
                      handleUserFilterChange(value);
                    }}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
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
              {userFilter !== 'all' ? (
                <span>
                  No approval requests found for the selected user. The user may not have created
                  any requests or they might all be {tabValue === 0 ? 'archived' : 'active'}.
                </span>
              ) : isPendingTab ? (
                'No pending approval requests found. Create a new request to get started.'
              ) : isApprovedTab ? (
                'No approved content found.'
              ) : (
                'No published content found.'
              )}
            </Alert>
          ) : viewMode === 'table' ? (
            <RequestsTable />
          ) : (
            <RequestsCards />
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
