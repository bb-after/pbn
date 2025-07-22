import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Palette as ThemeIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import { useToast, IntercomLayout, IntercomCard, ToastProvider } from 'components/ui';
import { useThemeMode } from '../contexts/ThemeContext';

function SettingsPageContent() {
  const router = useRouter();
  const { isValidUser, isLoading, user } = useValidateUserToken();
  const { showError, showSuccess } = useToast();
  const { mode, setMode } = useThemeMode();

  // State for various settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  // Handle theme change
  const handleThemeChange = (newMode: 'light' | 'dark') => {
    setMode(newMode);
    showSuccess(`Theme changed to ${newMode} mode`);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout title="Settings" breadcrumbs={[{ label: 'Settings' }]}>
      <Grid container spacing={3}>
        {/* Theme Settings */}
        <Grid item xs={12}>
          <IntercomCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ThemeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Theme Preferences</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose how the interface appears to you
              </Typography>

              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} sm={6} md={4}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: mode === 'light' ? 2 : 1,
                      borderColor: mode === 'light' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => handleThemeChange('light')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <LightModeIcon sx={{ fontSize: 48, mb: 2, color: 'warning.main' }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Light Mode
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Clean and bright interface
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: mode === 'dark' ? 2 : 1,
                      borderColor: mode === 'dark' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <DarkModeIcon sx={{ fontSize: 48, mb: 2, color: 'info.main' }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Dark Mode
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Easy on the eyes
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  Currently using: <strong>{mode === 'light' ? 'Light Mode' : 'Dark Mode'}</strong>
                </Typography>
              </Alert>
            </CardContent>
          </IntercomCard>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <IntercomCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Notification Preferences</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Control how you receive notifications
              </Typography>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={e => setEmailNotifications(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Receive email updates for approval requests and status changes
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={slackNotifications}
                      onChange={e => setSlackNotifications(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Slack Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Get notified in Slack channels for important updates
                </Typography>
              </Box>
            </CardContent>
          </IntercomCard>
        </Grid>

        {/* Account Security */}
        <Grid item xs={12}>
          <IntercomCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Security</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your account security settings
              </Typography>

              <Alert severity="info">
                <Typography variant="body2">
                  Security settings are managed by your system administrator. Contact support if you
                  need to update your password or security preferences.
                </Typography>
              </Alert>
            </CardContent>
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <SettingsPageContent />
    </ToastProvider>
  );
}
