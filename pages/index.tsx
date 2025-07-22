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
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import {
  useToast,
  IntercomLayout,
  IntercomButton,
  IntercomCard,
  ToastProvider,
} from 'components/ui';
import axios from 'axios';

interface DashboardStats {
  pendingApprovals: number;
  totalReports: number;
  activeClients: number;
  pbnSubmissions: number;
  superstarSites: number;
}

interface RecentActivity {
  id: string;
  type: 'approval' | 'report' | 'pbn' | 'superstar';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

function DashboardContent() {
  const router = useRouter();
  const { isValidUser, isLoading, user } = useValidateUserToken();
  const { showError, showSuccess } = useToast();

  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    totalReports: 0,
    activeClients: 0,
    pbnSubmissions: 0,
    superstarSites: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  useEffect(() => {
    if (isValidUser && user) {
      fetchDashboardData();
    }
  }, [isValidUser, user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // For now, we'll use mock data. In production, this would be real API calls
      // TODO: Replace with actual API endpoints

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock stats data
      setStats({
        pendingApprovals: 12,
        totalReports: 45,
        activeClients: 8,
        pbnSubmissions: 23,
        superstarSites: 15,
      });

      // Mock recent activity
      setRecentActivity([
        {
          id: '1',
          type: 'approval',
          title: 'Content Review Required',
          description: 'New approval request from TechCorp',
          timestamp: '2 hours ago',
          status: 'pending',
        },
        {
          id: '2',
          type: 'report',
          title: 'Monthly Report Generated',
          description: 'Performance analytics report completed',
          timestamp: '4 hours ago',
          status: 'completed',
        },
        {
          id: '3',
          type: 'pbn',
          title: 'PBN Article Published',
          description: 'Article submitted to wellness-blog.com',
          timestamp: '1 day ago',
          status: 'published',
        },
        {
          id: '4',
          type: 'superstar',
          title: 'New Superstar Site Added',
          description: 'premium-fitness.com added to network',
          timestamp: '2 days ago',
          status: 'active',
        },
      ]);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
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
              <PendingActionsIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {stats.pendingApprovals}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Approvals
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {stats.totalReports}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reports
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <PeopleIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {stats.activeClients}
              </Typography>
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
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {stats.pbnSubmissions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PBN Submissions
              </Typography>
            </CardContent>
          </IntercomCard>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <IntercomCard>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <StarIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {stats.superstarSites}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Superstar Sites
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
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <ScheduleIcon />
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List sx={{ py: 0 }}>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.title}
                        secondary={activity.description}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
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
                            color={activity.status === 'pending' ? 'warning' : 'success'}
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
