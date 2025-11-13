import React from 'react';
import { Box, Typography } from '@mui/material';
import SuperstarPostCaptureForm from '../components/SuperstarPostCaptureForm';
import { IntercomLayout, ToastProvider, IntercomCard } from '../components/ui';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

const pageTitle = 'Capture Superstar Article Submission';

function SuperstarCapturePage() {
  const { token } = useAuth('/login');

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title={pageTitle}
      breadcrumbs={[{ label: 'Superstar' }, { label: 'Capture Submission' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" component="h1" gutterBottom>
            {pageTitle}
          </Typography>
          <SuperstarPostCaptureForm />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function SuperstarPostCaptureFormPage() {
  return (
    <ToastProvider>
      <SuperstarCapturePage />
    </ToastProvider>
  );
}
