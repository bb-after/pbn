import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useStaffAuth from '../hooks/useStaffAuth';

interface StaffProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const StaffProtectedRoute: React.FC<StaffProtectedRouteProps> = ({
  children,
  fallback = (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
    >
      <CircularProgress />
      <Typography variant="body1" sx={{ mt: 2 }}>
        Verifying authentication...
      </Typography>
    </Box>
  ),
}) => {
  const { isValidStaff, isLoading } = useStaffAuth('/staff/login');

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isValidStaff) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default StaffProtectedRoute;
