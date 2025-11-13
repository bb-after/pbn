import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Button,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon,
  Article as ArticleIcon,
  Star as StarIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import {
  useToast,
  IntercomLayout,
  IntercomButton,
  IntercomCard,
  ToastProvider,
} from 'components/ui';
import AnimatedNumber from 'components/AnimatedNumber';
import axios from 'axios';

interface DashboardStats {
  pendingApprovals: number;
  totalReports: number;
  activeClients: number;
  pbnSubmissions: number;
  superstarSites: number;
  userPbnSubmissions: number;
  userSuperstarSubmissions: number;
}

interface RecentActivity {
  id: string;
  type: 'approval' | 'report' | 'pbn' | 'superstar';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  url?: string;
}

function DashboardContent() {
  const router = useRouter();
  const { isValidUser, isLoading, user } = useAuth('/login');
  const { showError, showSuccess } = useToast();

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    totalReports: 0,
    activeClients: 0,
    pbnSubmissions: 0,
    superstarSites: 0,
    userPbnSubmissions: 0,
    userSuperstarSubmissions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activityFading, setActivityFading] = useState(false);

  // Load dashboard data
  useEffect(() => {
    if (isValidUser && user) {
      fetchDashboardData();
    }
  }, [isValidUser, user]);

  // Auto-rotate recent activity pages
  useEffect(() => {
    if (!isValidUser || loading) return;

    const rotationInterval = setInterval(() => {
      setCurrentPage(prevPage => {
        const nextPage = prevPage === 1 ? 2 : 1;
        fetchRecentActivity(nextPage, true); // Enable fade transition
        return nextPage;
      });
    }, 15000); // Switch every 15 seconds

    return () => clearInterval(rotationInterval);
  }, [isValidUser, loading]);

  const fetchRecentActivity = async (page: number = 1, withFade: boolean = false) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      if (!token) return;

      // Start fade out if requested
      if (withFade) {
        setActivityFading(true);
        // Wait for fade out animation
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const activityResponse = await axios.get('/api/dashboard/recent-activity', {
        headers: {
          'x-auth-token': token,
        },
        params: {
          page,
          limit: 5,
        },
      });

      setRecentActivity(activityResponse.data);

      // Start fade in if we faded out
      if (withFade) {
        setTimeout(() => {
          setActivityFading(false);
        }, 50);
      }
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
      if (withFade) {
        setActivityFading(false);
      }
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Fetch dashboard stats
      const statsResponse = await axios.get('/api/dashboard/stats', {
        headers: {
          'x-auth-token': token,
        },
      });

      setStats(statsResponse.data);

      // Fetch initial recent activity (page 1)
      await fetchRecentActivity(1);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-approval':
        router.push('/client-approval/upload');
        break;
      case 'new-report':
        router.push('/reports/upload');
        break;
      case 'new-pbn':
        router.push('/pbn-form');
        break;
      case 'view-clients':
        router.push('/clients');
        break;
      default:
        break;
    }
  };

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircleIcon color="primary" />;
      case 'report':
        return <AssessmentIcon color="secondary" />;
      case 'pbn':
        return <ArticleIcon color="success" />;
      case 'superstar':
        return <StarIcon color="warning" />;
      default:
        return <NotificationsIcon />;
    }
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading || loading) {
    return (
      <IntercomLayout title="Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </IntercomLayout>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  if (error) {
    return (
      <IntercomLayout title="Dashboard">
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </IntercomLayout>
    );
  }

  return (
    <IntercomLayout title="Dashboard">
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          {getGreeting()}, {user?.username || 'User'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here&apos;s what&apos;s happening with your projects today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <PeopleIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <AnimatedNumber
                variant="h4"
                fontWeight="bold"
                gutterBottom
                value={stats.activeClients}
                delay={0}
              />
              <Typography variant="body2" color="text.secondary">
                Active Clients
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <ArticleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <AnimatedNumber
                variant="h4"
                fontWeight="bold"
                gutterBottom
                value={stats.pbnSubmissions}
                delay={200}
              />
              <Typography variant="body2" color="text.secondary">
                Total PBN Posts
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StarIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <AnimatedNumber
                variant="h4"
                fontWeight="bold"
                gutterBottom
                value={stats.superstarSites}
                delay={400}
              />
              <Typography variant="body2" color="text.secondary">
                Superstar Sites
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <ArticleIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <AnimatedNumber
                variant="h4"
                fontWeight="bold"
                gutterBottom
                value={stats.userPbnSubmissions}
                delay={600}
              />
              <Typography variant="body2" color="text.secondary">
                Your PBN Posts
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StarIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <AnimatedNumber
                variant="h4"
                fontWeight="bold"
                gutterBottom
                value={stats.userSuperstarSubmissions}
                delay={800}
              />
              <Typography variant="body2" color="text.secondary">
                Your Superstar Posts
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <IntercomCard>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <DashboardIcon />
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => handleQuickAction('new-approval')}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    New Approval Request
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AssessmentIcon />}
                    onClick={() => handleQuickAction('new-report')}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    Upload Report
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ArticleIcon />}
                    onClick={() => handleQuickAction('new-pbn')}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    Create PBN Post
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PeopleIcon />}
                    onClick={() => handleQuickAction('view-clients')}
                    sx={{ py: 1.5, textTransform: 'none' }}
                  >
                    Manage Clients
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </IntercomCard>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <IntercomCard>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon />
                  Recent Activity
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: currentPage === 1 ? 'primary.main' : 'grey.300',
                    }}
                  />
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: currentPage === 2 ? 'primary.main' : 'grey.300',
                    }}
                  />
                </Box>
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List
                sx={{
                  py: 0,
                  opacity: activityFading ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out',
                }}
              >
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem
                      sx={{
                        px: 0,
                        py: 1,
                        cursor: activity.url ? 'pointer' : 'default',
                        '&:hover': activity.url
                          ? {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              borderRadius: 1,
                            }
                          : {},
                        transition: 'background-color 0.2s ease',
                      }}
                      onClick={() =>
                        activity.url && window.open(activity.url, '_blank', 'noopener,noreferrer')
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.title}
                        secondary={activity.description}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: activity.url ? 'primary.main' : 'text.primary',
                        }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">
                          {activity.timestamp}
                        </Typography>
                        {activity.status && (
                          <Chip
                            label={activity.status}
                            size="small"
                            color={
                              activity.status === 'pending'
                                ? 'warning'
                                : activity.status === 'automated'
                                  ? 'info'
                                  : 'success'
                            }
                            sx={{ mt: 0.5, ml: 1, fontSize: '0.6rem' }}
                          />
                        )}
                      </Box>
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
