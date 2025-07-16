import React from 'react';
import { Box, Typography } from '@mui/material';
import { IntercomEmptyCard, ThemeProvider, ToastProvider } from '../../components/ui';
import { ClientPortalLayout } from '../../components/layout/ClientPortalLayout';
import { Assessment as ReportsIcon } from '@mui/icons-material';

function ReportsPageContent() {
  return (
    <ClientPortalLayout title="Reports" breadcrumbs={[{ label: 'Reports', href: '/reports' }]}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <IntercomEmptyCard
          title="No Reports Available"
          description="You don't have any reports shared with you at this time. Reports will appear here once they are generated and shared by your account administrator."
          icon={<ReportsIcon />}
        />
      </Box>
    </ClientPortalLayout>
  );
}

export default function ReportsPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ReportsPageContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
