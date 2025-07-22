import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../../components/ui';
import ZoomBackgroundForm from '../../components/ZoomBackgroundForm';
import useValidateUserToken from '../../hooks/useValidateUserToken';
import UnauthorizedAccess from '../../components/UnauthorizedAccess';

function ZoomPageContent() {
  const { isValidUser, isLoading } = useValidateUserToken();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="Zoom Background Generator"
      breadcrumbs={[{ label: 'Other Tooling' }, { label: 'Zoom Backdrop' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Create a Custom Zoom Background
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter a prompt to generate a unique Zoom background using DALL-E.
          </Typography>
          <ZoomBackgroundForm />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function ZoomPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ZoomPageContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
