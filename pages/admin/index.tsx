import React from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import {
  Settings as ControlCenterIcon,
  SupervisorAccount as UserManagementIcon,
  AdminPanelSettings as AdminIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { blue, green, orange } from '@mui/material/colors';
import Head from 'next/head';
import { IntercomLayout } from '../../components/ui';
import useAuth from '../../hooks/useAuth';
import { useRouter } from 'next/router';

interface AdminCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
}

const adminCards: AdminCard[] = [
  {
    id: 'control-center',
    title: 'Control Center',
    description: 'Monitor the heartbeat of all your tooling and services. View real-time metrics and system health.',
    icon: <ControlCenterIcon />,
    href: '/control-center',
    color: blue[500],
    badge: 'Live Metrics',
  },
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Manage user accounts, activate or deactivate users, and control access to the system.',
    icon: <UserManagementIcon />,
    href: '/admin/user-management',
    color: green[500],
    badge: 'User Admin',
  },
];

function AdminDashboardContent() {
  const { isValidUser, user } = useAuth('/login');
  const router = useRouter();

  // Redirect non-admin users
  React.useEffect(() => {
    if (isValidUser && user?.role !== 'admin') {
      router.push('/');
    }
  }, [isValidUser, user, router]);

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  if (!isValidUser || user?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - System Administration</title>
      </Head>

      <Box p={3}>
        {/* Header Section */}
        <Paper sx={{ p: 4, mb: 4, background: `linear-gradient(135deg, ${blue[600]} 0%, ${blue[800]} 100%)`, color: 'white' }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar sx={{ bgcolor: 'white', color: blue[600], width: 64, height: 64 }}>
              <AdminIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Admin Dashboard
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Welcome back, {user?.name}! Manage your system and monitor performance.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Quick Stats */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                    <TrendingUpIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      System Health
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      All services operational
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: green[100], color: green[600] }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      User Management
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active user monitoring
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: orange[100], color: orange[600] }}>
                    <ControlCenterIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      Live Monitoring
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Real-time system metrics
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Admin Tools */}
        <Typography variant="h4" fontWeight={600} mb={3}>
          Administration Tools
        </Typography>

        <Grid container spacing={3}>
          {adminCards.map((card) => (
            <Grid item xs={12} md={6} key={card.id}>
              <Card sx={{ height: '100%', transition: 'all 0.2s ease-in-out', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                <CardActionArea 
                  onClick={() => handleCardClick(card.href)}
                  sx={{ height: '100%', p: 0 }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Avatar 
                          sx={{ 
                            bgcolor: card.color, 
                            width: 56, 
                            height: 56,
                            '& .MuiSvgIcon-root': { fontSize: 28 }
                          }}
                        >
                          {card.icon}
                        </Avatar>
                        {card.badge && (
                          <Chip 
                            label={card.badge} 
                            size="small" 
                            sx={{ 
                              bgcolor: `${card.color}20`, 
                              color: card.color,
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Box>
                      
                      <Box>
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                          {card.title}
                        </Typography>
                        <Typography variant="body1" color="textSecondary" lineHeight={1.6}>
                          {card.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Footer Information */}
        <Box mt={6} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            Admin Dashboard • Last updated: {new Date().toLocaleString()} • System Version 2.0
          </Typography>
        </Box>
      </Box>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <IntercomLayout>
      <AdminDashboardContent />
    </IntercomLayout>
  );
}