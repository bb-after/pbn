import React, { useState } from 'react';
import { Typography, Box, CircularProgress } from '@mui/material';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../../components/ui';
import ReportUploadForm from '../../components/ReportUploadForm';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from '../../components/UnauthorizedAccess';

function UploadReportPageContent() {
  const router = useRouter();
  const { isValidUser, isLoading } = useValidateUserToken();

  const handleSubmitSuccess = () => {
    setTimeout(() => {
      router.push('/reports');
    }, 2000);
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
    <IntercomLayout
      title="New Report Upload"
      breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: 'Upload Report' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Upload Report
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload a report file (PDF, DOCX, or PPTX) to share with selected client contacts. The
            selected contacts will be able to view and download the report.
          </Typography>

          <ReportUploadForm onSubmitSuccess={handleSubmitSuccess} />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function UploadReportPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <UploadReportPageContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
