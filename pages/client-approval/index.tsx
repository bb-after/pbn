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
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Link as LinkIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import { useRouter } from 'next/router';
import useAuth from '../../hooks/useAuth';
import axios from 'axios';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import {
  useToast,
  IntercomLayout,
  IntercomButton,
  IntercomCard,
  IntercomSearchInput,
  ToastProvider,
  ThemeProvider,
} from 'components/ui';
import ViewModeToggle from '../../components/ViewModeToggle';

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

function ClientApprovalPageContent() {
  const router = useRouter();
  const { isValidUser, isLoading, user } = useAuth('/login');
  const { admin: isAdminMode } = router.query;
  const { showError, showSuccess } = useToast();

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

  // State for sorting
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
      showError('Request not found', message);
    }
  }, [errorParam, showError]);

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

  // Refetch when tab changes or view mode changes
  useEffect(() => {
    if (isValidUser) {
      fetchApprovalRequests();
    }
  }, [tabValue, viewMode]);

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

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableCell
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      onClick={() => handleSort(column)}
    >
      <Box display="flex" alignItems="center">
        {children}
        <Box
          ml={1}
          display="flex"
          flexDirection="column"
          sx={{ opacity: sortBy === column ? 1 : 0.3 }}
        >
          <ArrowUpwardIcon
            sx={{
              fontSize: 12,
              color:
                sortBy === column && sortDirection === 'asc' ? 'primary.main' : 'text.disabled',
            }}
          />
          <ArrowDownwardIcon
            sx={{
              fontSize: 12,
              mt: -0.5,
              color:
                sortBy === column && sortDirection === 'desc' ? 'primary.main' : 'text.disabled',
            }}
          />
        </Box>
      </Box>
    </TableCell>
  );

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

      // Add filters based on view mode
      if (viewMode === 'table') {
        // In table view, use status dropdown filter
        if (statusFilter && statusFilter !== 'all') {
          if (statusFilter === 'published') {
            params.append('status', 'approved');
            params.append('published', 'true');
          } else if (statusFilter === 'approved') {
            params.append('status', 'approved');
            params.append('published', 'false');
          } else {
            params.append('status', statusFilter);
          }
        }
      } else {
        // In card view, use tab-based filters
        if (isPendingTab) {
          params.append('status', 'pending');
        } else if (isApprovedTab) {
          params.append('status', 'approved');
          params.append('published', 'false');
        } else if (isPublishedTab) {
          params.append('status', 'approved');
          params.append('published', 'true');
        }
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

  // Apply sorting
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const aValue = a[sortBy as keyof ApprovalRequest];
    const bValue = b[sortBy as keyof ApprovalRequest];

    // Handle different data types
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Fallback for dates or other types
    return sortDirection === 'asc'
      ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime()
      : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
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

    // Handle null/undefined status
    if (!request.status) {
      return <Chip label="Unknown" color="default" size="small" />;
    }

    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';
    let label = request.status?.charAt(0).toUpperCase() + request.status.slice(1);

    switch (request.status) {
      case 'pending':
        color = 'warning';
        break;
      case 'approved':
        if (request.published_url) {
          label = 'Published';
          color = 'info';
        } else {
          color = 'success';
        }
        break;
      case 'rejected':
        color = 'error';
        break;
    }
    return <Chip label={label} color={color} size="small" />;
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

      // Add filters based on view mode
      if (viewMode === 'table') {
        // In table view, use status dropdown filter
        if (statusFilter && statusFilter !== 'all') {
          if (statusFilter === 'published') {
            params.append('status', 'approved');
            params.append('published', 'true');
          } else if (statusFilter === 'approved') {
            params.append('status', 'approved');
            params.append('published', 'false');
          } else {
            params.append('status', statusFilter);
          }
        }
      } else {
        // In card view, use tab-based filters
        if (isPendingTab) {
          params.append('status', 'pending');
        } else if (isApprovedTab) {
          params.append('status', 'approved');
          params.append('published', 'false');
        } else if (isPublishedTab) {
          params.append('status', 'approved');
          params.append('published', 'true');
        }
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

      // Add filters based on view mode
      if (viewMode === 'table') {
        // In table view, use status dropdown filter
        if (statusFilter && statusFilter !== 'all') {
          if (statusFilter === 'published') {
            params.append('status', 'approved');
            params.append('published', 'true');
          } else if (statusFilter === 'approved') {
            params.append('status', 'approved');
            params.append('published', 'false');
          } else {
            params.append('status', statusFilter);
          }
        }
      } else {
        // In card view, use tab-based filters
        if (isPendingTab) {
          params.append('status', 'pending');
        } else if (isApprovedTab) {
          params.append('status', 'approved');
          params.append('published', 'false');
        } else if (isPublishedTab) {
          params.append('status', 'approved');
          params.append('published', 'true');
        }
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

      // Add status filter (for table view)
      if (currentStatusFilter && currentStatusFilter !== 'all') {
        if (currentStatusFilter === 'published') {
          params.append('status', 'approved');
          params.append('published', 'true');
        } else if (currentStatusFilter === 'approved') {
          params.append('status', 'approved');
          params.append('published', 'false');
        } else {
          params.append('status', currentStatusFilter);
        }
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
            <SortableHeader column="status">Status</SortableHeader>
            <SortableHeader column="title">Title</SortableHeader>
            <SortableHeader column="client_name">Client</SortableHeader>
            <SortableHeader column="approvals_count">Approvals</SortableHeader>
            <SortableHeader column="created_at">Created</SortableHeader>
            <TableCell>Published URL</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRequests.map(request => (
            <TableRow key={request.request_id} hover sx={{ cursor: 'pointer' }}>
              <TableCell onClick={() => handleViewRequest(request.request_id)}>
                {getStatusChip(request)}
              </TableCell>
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
                  <Box
                    display="flex"
                    alignItems="center"
                    sx={{ cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation();
                      window.open(request.published_url!, '_blank');
                    }}
                  >
                    <LinkIcon color="primary" sx={{ mr: 0.5, fontSize: 16 }} />
                    <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                      {new URL(request.published_url!).hostname}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Not published
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <IntercomButton
                    size="small"
                    variant="secondary"
                    onClick={() => handleViewRequest(request.request_id)}
                  >
                    View
                  </IntercomButton>
                  {request.published_url && (
                    <IntercomButton
                      size="small"
                      variant="primary"
                      onClick={() => window.open(request.published_url!, '_blank')}
                    >
                      Visit
                    </IntercomButton>
                  )}
                </Box>
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
            elevation={3}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
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
                <Box
                  mt={2}
                  sx={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation();
                    window.open(request.published_url!, '_blank');
                  }}
                >
                  <Typography variant="body2" color="primary">
                    Published at: {new URL(request.published_url!).hostname}
                  </Typography>
                </Box>
              )}
            </CardContent>

            <Divider />

            <CardActions>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={e => {
                  e.stopPropagation(); // Prevent card click from triggering
                  handleViewRequest(request.request_id);
                }}
              >
                View Details
              </Button>
              {request.published_url && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={e => {
                    e.stopPropagation();
                    window.open(request.published_url!, '_blank');
                  }}
                >
                  Visit
                </Button>
              )}
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
    <IntercomLayout
      title={pageTitle}
      breadcrumbs={[
        { label: 'Client Approval', href: '/client-approval' },
        ...(isAdminMode && isAdmin ? [{ label: 'Admin View' }] : []),
      ]}
      actions={
        <IntercomButton variant="primary" leftIcon={<AddIcon />} onClick={handleCreateRequest}>
          New Request
        </IntercomButton>
      }
    >
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          {viewMode === 'cards' && (
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="approval request tabs">
              <Tab label="Pending Approval" />
              <Tab label="Approved Content" />
              <Tab label="Published Content" />
            </Tabs>
          )}
          {viewMode === 'table' && (
            <Typography variant="h5" component="div" sx={{ color: 'text.primary' }}>
              All Requests
            </Typography>
          )}
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
        </Box>

        {/* Filters */}
        <IntercomCard borderless padding="medium" sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <IntercomSearchInput
                placeholder="Search by title or client"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                fullWidth
              />
            </Grid>
            {viewMode === 'table' && (
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
                  sx={{
                    '& .MuiInputBase-root': {
                      color: 'text.primary',
                      backgroundColor: 'background.paper',
                    },
                    '& .MuiInputLabel-root': {
                      color: 'text.secondary',
                    },
                    '& .MuiSelect-select': {
                      color: 'text.primary',
                    },
                    '& .MuiOutlinedInput-input': {
                      color: 'text.primary',
                    },
                  }}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </TextField>
              </Grid>
            )}
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
                sx={{
                  '& .MuiInputBase-root': {
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                  '& .MuiSelect-select': {
                    color: 'text.primary',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'text.primary',
                  },
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
                  sx={{
                    '& .MuiInputBase-root': {
                      color: 'text.primary',
                      backgroundColor: 'background.paper',
                    },
                    '& .MuiInputLabel-root': {
                      color: 'text.secondary',
                    },
                    '& .MuiSelect-select': {
                      color: 'text.primary',
                    },
                    '& .MuiOutlinedInput-input': {
                      color: 'text.primary',
                    },
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
              <IntercomButton
                fullWidth
                variant="secondary"
                leftIcon={<RefreshIcon />}
                onClick={fetchApprovalRequests}
              >
                Refresh
              </IntercomButton>
            </Grid>
          </Grid>
        </IntercomCard>

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
                No approval requests found for the selected user. The user may not have created any
                requests or they might all be {tabValue === 0 ? 'archived' : 'active'}.
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

        {/* Toast Notification - keeping for backwards compatibility */}
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
      </Box>
    </IntercomLayout>
  );
}

export default function ClientApprovalPage() {
  return (
    <ToastProvider>
      <ClientApprovalPageContent />
    </ToastProvider>
  );
}
