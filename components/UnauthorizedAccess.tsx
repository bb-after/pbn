import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

interface UnauthorizedAccessProps {
  message?: string;
  showLoginButton?: boolean;
  loginUrl?: string;
}

const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  message = 'Unauthorized access. Please log in.',
  showLoginButton = true,
  loginUrl = 'https://sales.statuscrawl.io/login',
}) => {
  const handleLoginClick = () => {
    window.location.href = loginUrl;
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
    >
      <Typography variant="h5" gutterBottom>
        {message}
      </Typography>
      {showLoginButton && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<LoginIcon />}
          onClick={handleLoginClick}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      )}
    </Box>
  );
};

export default UnauthorizedAccess;
