import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
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
  AccountCircle,
  Logout as LogoutIcon,
  Description as DocumentIcon,
  CheckCircle as ApprovedIcon,
  Warning as PendingIcon,
  ThumbDown as RejectedIcon,
  Link as LinkIcon,
  ViewModule as CardViewIcon,
  ViewList as TableViewIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import useClientAuth from '../../hooks/useClientAuth';
import axios from 'axios';

// Define request interface
interface ApprovalRequest {
  request_id: number;
  client_id: number;
  client_name: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  published_url: string | null;
}

export default function ClientPortalPage() {
  const router = useRouter();
  const { isValidClient, clientInfo, isLoading, logout } = useClientAuth('/client-portal/login');

  // Get error param from URL if present
  const { error: errorParam } = router.query;

  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // State for view mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // State for tabs
  const [tabValue, setTabValue] = useState(0);

  // State for requests data
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<ApprovalRequest[]>([]);
  const [publishedRequests, setPublishedRequests] = useState<ApprovalRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for toast notification
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Helper to determine tab types
  const isPendingTab = tabValue === 0;
  const isApprovedTab = tabValue === 1;
  const isPublishedTab = tabValue === 2;

  // Set error message and toast based on URL parameter
  useEffect(() => {
    if (errorParam === 'unauthorized_request') {
      const message = 'You do not have permission to view that request.';
      setError(message);
      setToastMessage(message);
      setToastOpen(true);
    } else if (errorParam === 'request_not_found') {
      const message = 'The requested content could not be found or has been removed.';
      setError(message);
      setToastMessage(message);
      setToastOpen(true);
    }
  }, [errorParam]);

  // Fetch requests from the API
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    setError(null);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      // Fetch all requests for this client
      const response = await axios.get(
        `/api/approval-requests?client_id=${clientInfo?.client_id}`,
        { headers }
      );

      // Split into pending, approved, and published
      const pending: ApprovalRequest[] = [];
      const approved: ApprovalRequest[] = [];
      const published: ApprovalRequest[] = [];

      response.data.forEach((request: ApprovalRequest) => {
        if (request.status === 'pending') {
          pending.push(request);
        } else if (request.status === 'approved') {
          if (request.published_url) {
            published.push(request);
          } else {
            approved.push(request);
          }
        }
      });

      setPendingRequests(pending);
      setApprovedRequests(approved);
      setPublishedRequests(published);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load content requests');
    } finally {
      setLoadingRequests(false);
    }
  }, [clientInfo]);

  // Load requests when client info is available
  useEffect(() => {
    if (clientInfo) {
      fetchRequests();
    }
  }, [clientInfo, fetchRequests]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle view mode change
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'cards' | 'table'
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Handle user menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle user menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle logout
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  // Handle view request
  const handleViewRequest = (requestId: number) => {
    router.push(`/client-portal/requests/${requestId}`);
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

  // Generate status chip with appropriate color
  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';
    let icon = null;

    switch (status) {
      case 'pending':
        color = 'warning';
        icon = <PendingIcon />;
        break;
      case 'approved':
        color = 'success';
        icon = <ApprovedIcon />;
        break;
      case 'rejected':
        color = 'error';
        icon = <RejectedIcon />;
        break;
    }

    return (
      <Chip
        icon={icon as React.ReactElement}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={color}
        size="small"
      />
    );
  };

  // Get current requests based on tab
  const getCurrentRequests = () => {
    if (isPendingTab) return pendingRequests;
    if (isApprovedTab) return approvedRequests;
    if (isPublishedTab) return publishedRequests;
    return [];
  };

  // Table component for requests
  const RequestsTable = ({ requests }: { requests: ApprovalRequest[] }) => (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Published URL</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map(request => (
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
                {getStatusChip(request.status)}
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
                    <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
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
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleViewRequest(request.request_id)}
                  >
                    {isPendingTab ? 'Review' : 'View'}
                  </Button>
                  {request.published_url && (
                    <Button
                      size="small"
                      variant="contained"
                      href={request.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit
                    </Button>
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
  const RequestsCards = ({ requests }: { requests: ApprovalRequest[] }) => (
    <Grid container spacing={3}>
      {requests.map(request => (
        <Grid item xs={12} md={6} lg={4} key={request.request_id}>
          <Card
            elevation={3}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: 'all 0.2s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
            onClick={() => handleViewRequest(request.request_id)}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                  {request.title}
                </Typography>
                {getStatusChip(request.status)}
              </Box>

              {request.description && (
                <Typography
                  variant="body2"
                  sx={{
                    mb: 2,
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

              <Box display="flex" alignItems="center" mb={2}>
                <DocumentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  {new Date(request.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              {request.published_url && (
                <Box display="flex" alignItems="center">
                  <LinkIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
                    {new URL(request.published_url).hostname}
                  </Typography>
                </Box>
              )}
            </CardContent>

            <Divider />

            <CardActions>
              <Button
                fullWidth
                variant={isPendingTab ? 'contained' : 'outlined'}
                onClick={e => {
                  e.stopPropagation(); // Prevent card click from triggering
                  handleViewRequest(request.request_id);
                }}
              >
                {isPendingTab ? 'Review Content' : 'View Details'}
              </Button>
              {request.published_url && (
                <Button
                  fullWidth
                  variant="contained"
                  href={request.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  View Published Content
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidClient) {
    return null; // The hook will redirect to login page
  }

  const currentRequests = getCurrentRequests();

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {clientInfo?.client_name} - Content Portal
          </Typography>

          <Box>
            <IconButton
              size="large"
              edge="end"
              aria-label="account menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>
                {clientInfo?.name} ({clientInfo?.email})
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Content Approval Dashboard
          </Typography>

          <Typography variant="body1" paragraph>
            Welcome back, {clientInfo?.name}. Here you can review and approve content before
            it&apos;s published.
          </Typography>

          {/* Tabs and View Toggle */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="approval request tabs">
                <Tab
                  label={
                    <Box display="flex" alignItems="center">
                      Pending Approval
                      {pendingRequests.length > 0 && (
                        <Chip
                          label={pendingRequests.length}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box display="flex" alignItems="center">
                      Approved Content
                      {approvedRequests.length > 0 && (
                        <Chip
                          label={approvedRequests.length}
                          color="success"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box display="flex" alignItems="center">
                      Published Content
                      {publishedRequests.length > 0 && (
                        <Chip
                          label={publishedRequests.length}
                          color="info"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
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

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Content based on current tab */}
          {loadingRequests ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : currentRequests.length === 0 ? (
            <Alert severity="info">
              {isPendingTab && 'No content is waiting for your approval at this time.'}
              {isApprovedTab && 'No approved content is available to view at this time.'}
              {isPublishedTab && 'No published content is available to view at this time.'}
            </Alert>
          ) : viewMode === 'table' ? (
            <RequestsTable requests={currentRequests} />
          ) : (
            <RequestsCards requests={currentRequests} />
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
    </Box>
  );
}
