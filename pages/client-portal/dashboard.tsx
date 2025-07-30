import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  Launch as LaunchIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import { ClientPortalLayout } from '../../components/layout/ClientPortalLayout';
import { ThemeProvider, ToastProvider } from '../../components/ui';
import useClientAuth from '../../hooks/useClientAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  inProgressRequests: number;
}

interface RecentRequest {
  id: number;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function ClientDashboardContent() {
  const { isValidClient, isLoading, clientInfo } = useClientAuth('/client-portal/login');
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    inProgressRequests: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isValidClient && clientInfo) {
      fetchDashboardData();
    }
  }, [isValidClient, clientInfo]);

  const fetchDashboardData = async () => {
    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      // Fetch requests data
      const response = await axios.get('/api/approval-requests', { headers });
      const requests = response.data || [];

      // Calculate stats
      const totalRequests = requests.length;
      const pendingRequests = requests.filter((req: any) => req.status === 'pending').length;
      const completedRequests = requests.filter((req: any) => req.status === 'approved').length;
      const inProgressRequests = requests.filter((req: any) => req.status === 'in_progress').length;

      setStats({
        totalRequests,
        pendingRequests,
        completedRequests,
        inProgressRequests,
      });

      // Get recent requests (last 5)
      const recent = requests
        .sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      setRecentRequests(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Completed';
      case 'pending':
        return 'Pending Review';
      case 'in_progress':
        return 'In Progress';
      case 'rejected':
        return 'Needs Revision';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const completionRate =
    stats.totalRequests > 0 ? (stats.completedRequests / stats.totalRequests) * 100 : 0;

  if (isLoading || loading) {
    return <Box>Loading...</Box>;
  }

  if (!isValidClient) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard - Client Portal</title>
      </Head>
      <ClientPortalLayout
        title="Dashboard"
        breadcrumbs={[{ label: 'Dashboard' }]}
        clientInfo={clientInfo ? { name: clientInfo.name, email: clientInfo.email } : null}
      >
        <Container maxWidth="xl">
          {/* Welcome Section */}
          <Box mb={4}>
            <Typography variant="h4" gutterBottom>
              Welcome back, {clientInfo?.name?.split(' ')[0] || 'there'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here&apos;s an overview of your content requests and project status.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Stats Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <AssignmentIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stats.totalRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Requests
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                      <PendingIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stats.pendingRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Review
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                      <ScheduleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stats.inProgressRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        In Progress
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stats.completedRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completed
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Completion Rate */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Project Progress</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="h3" fontWeight="bold" color="primary.main">
                    {completionRate.toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={completionRate}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {stats.completedRequests} of {stats.totalRequests} requests completed
                </Typography>
              </Paper>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Quick Actions</Typography>
                </Box>
                <List>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => router.push('/client-portal')}
                  >
                    <ListItemIcon>
                      <AssignmentIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="View All Requests"
                      secondary="See all your content requests and their status"
                    />
                    <IconButton size="small">
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  </ListItem>

                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => router.push('/client-portal/reports')}
                  >
                    <ListItemIcon>
                      <ReportIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="View Reports"
                      secondary="Access detailed analytics and reports"
                    />
                    <IconButton size="small">
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* Recent Requests */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center">
                    <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Recent Requests</Typography>
                  </Box>
                  <Tooltip title="View all requests">
                    <IconButton onClick={() => router.push('/client-portal')}>
                      <LaunchIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {recentRequests.length === 0 ? (
                  <Alert severity="info">
                    No requests found. Create your first content request to get started!
                  </Alert>
                ) : (
                  <List>
                    {recentRequests.map(request => (
                      <ListItem
                        key={request.id}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                          border: 1,
                          borderColor: 'divider',
                          mb: 1,
                        }}
                        onClick={() => router.push(`/client-portal/requests/${request.id}`)}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle1" fontWeight={500}>
                                {request.title || `Request #${request.id}`}
                              </Typography>
                              <Chip
                                label={getStatusLabel(request.status)}
                                color={getStatusColor(request.status) as any}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box display="flex" justifyContent="space-between" mt={0.5}>
                              <Typography variant="body2" color="text.secondary">
                                Created: {formatDate(request.created_at)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Updated: {formatDate(request.updated_at)}
                              </Typography>
                            </Box>
                          }
                        />
                        <IconButton size="small">
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </ClientPortalLayout>
    </>
  );
}

export default function ClientDashboardPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ClientDashboardContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
