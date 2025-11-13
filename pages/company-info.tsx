import React, { useState } from 'react';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import CompanyInfoPage from '../components/CompanyInfoPage';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../components/ui';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

function CompanyInfoContent() {
  const { isValidUser, isLoading } = useAuth('/login');

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
      title="Wikipedia Company Scraper"
      breadcrumbs={[{ label: 'Other Tooling' }, { label: 'Wiki Scraper' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Company Information
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter a company name to scrape its Wikipedia page for key information.
          </Typography>
          <CompanyInfoPage />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function CompanyInfo() {
  return (
    <ToastProvider>
      <CompanyInfoContent />
    </ToastProvider>
  );
}
