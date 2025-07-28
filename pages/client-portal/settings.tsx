import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import {
  Palette as ThemeIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ClientPortalLayout } from '../../components/layout/ClientPortalLayout';
import { ThemeProvider, ToastProvider, useTheme } from '../../components/ui';
import useClientAuth from '../../hooks/useClientAuth';
import Head from 'next/head';

function ClientSettingsContent() {
  const { isValidClient, isLoading, clientInfo } = useClientAuth('/client-portal/login');
  const { mode, setTheme } = useTheme();
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Handle theme change
  const handleThemeChange = (newMode: 'light' | 'dark') => {
    setTheme(newMode);

    // Show confirmation
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  if (!isValidClient) {
    return null; // The hook will redirect to login page
  }

  return (
    <>
      <Head>
        <title>Settings - Client Portal</title>
      </Head>
      <ClientPortalLayout
        title="Settings"
        breadcrumbs={[{ label: 'Content Portal', href: '/client-portal' }, { label: 'Settings' }]}
        clientInfo={clientInfo ? { name: clientInfo.name, email: clientInfo.email } : null}
      >
        <Container maxWidth="md">
          {settingsSaved && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Settings saved successfully!
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Theme Settings */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <ThemeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Theme Preferences</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Choose how the client portal appears to you
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
                    Currently using:{' '}
                    <strong>{mode === 'light' ? 'Light Mode' : 'Dark Mode'}</strong>
                  </Typography>
                </Alert>
              </Paper>
            </Grid>

            {/* Account Information Section */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Account Information</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your account details are managed by your organization.
                </Typography>

                <Box
                  sx={{
                    bgcolor: 'background.default',
                    p: 3,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="body1" gutterBottom sx={{ color: 'text.primary' }}>
                    <strong>Name:</strong> {clientInfo?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: 'text.primary' }}>
                    <strong>Email:</strong> {clientInfo?.email || 'N/A'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary' }}>
                    <strong>Organization:</strong> {clientInfo?.client_name || 'N/A'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </ClientPortalLayout>
    </>
  );
}

export default function ClientSettingsPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ClientSettingsContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
