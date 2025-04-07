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
} from '@mui/material';
import {
  AccountCircle,
  Logout as LogoutIcon,
  Description as DocumentIcon,
  CheckCircle as ApprovedIcon,
  Warning as PendingIcon,
  ThumbDown as RejectedIcon,
  Link as LinkIcon,
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

  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // State for tabs
  const [tabValue, setTabValue] = useState(0);

  // State for requests data
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<ApprovalRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Split into pending and completed
      const pending: ApprovalRequest[] = [];
      const completed: ApprovalRequest[] = [];

      response.data.forEach((request: ApprovalRequest) => {
        if (request.status === 'pending') {
          pending.push(request);
        } else {
          completed.push(request);
        }
      });

      setPendingRequests(pending);
      setCompletedRequests(completed);
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

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
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
              <Tab label="Published Content" />
            </Tabs>
          </Box>

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Pending approval tab */}
          {tabValue === 0 && (
            <>
              {loadingRequests ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : pendingRequests.length === 0 ? (
                <Alert severity="info">No content is waiting for your approval at this time.</Alert>
              ) : (
                <Grid container spacing={3}>
                  {pendingRequests.map(request => (
                    <Grid item xs={12} md={6} lg={4} key={request.request_id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            mb={2}
                          >
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

                          <Box display="flex" alignItems="center">
                            <DocumentIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="textSecondary">
                              {new Date(request.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </CardContent>

                        <Divider />

                        <CardActions>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => handleViewRequest(request.request_id)}
                          >
                            Review Content
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {/* Published content tab */}
          {tabValue === 1 && (
            <>
              {loadingRequests ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : completedRequests.length === 0 ? (
                <Alert severity="info">
                  No published content is available to view at this time.
                </Alert>
              ) : (
                <Grid container spacing={3}>
                  {completedRequests.map(request => (
                    <Grid item xs={12} md={6} lg={4} key={request.request_id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            mb={2}
                          >
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
                            variant="outlined"
                            onClick={() => handleViewRequest(request.request_id)}
                          >
                            View Details
                          </Button>
                          {request.published_url && (
                            <Button
                              fullWidth
                              variant="contained"
                              href={request.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Published
                            </Button>
                          )}
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
}
