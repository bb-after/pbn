import React from 'react';
import { IntercomLayout } from '../components/ui';
import GeoScheduleManager from '../components/GeoScheduleManager';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import { Box, CircularProgress } from '@mui/material';

export default function GeoScheduleManagerPage() {
  const { isLoading, isValidUser } = useValidateUserToken();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <IntercomLayout title="GEO Schedule Manager">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      </IntercomLayout>
    );
  }

  // Show unauthorized access if not authenticated
  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="GEO Schedule Manager"
      breadcrumbs={[{ label: 'GEO' }, { label: 'Schedule Manager' }]}
    >
      <GeoScheduleManager />
    </IntercomLayout>
  );
}
