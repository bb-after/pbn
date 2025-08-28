import React, { useEffect } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/router';
import axios from 'axios';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const StaffLogin: React.FC = () => {
  const router = useRouter();
  const { error, status } = router.query;

  useEffect(() => {
    // Check if staff is already logged in
    const checkExistingAuth = async () => {
      try {
        await axios.get('/api/staff-auth/me');
        // If we get here, user is already authenticated
        const redirectPath = localStorage.getItem('redirectAfterStaffLogin') || '/';
        localStorage.removeItem('redirectAfterStaffLogin');
        router.push(redirectPath);
      } catch (err) {
        // User not authenticated, stay on login page
      }
    };

    checkExistingAuth();
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await axios.post('/api/staff-auth/google', {
        idToken: credentialResponse.credential,
      });

      if (response.data.user) {
        // Redirect to intended page or dashboard
        const redirectPath = localStorage.getItem('redirectAfterStaffLogin') || '/';
        localStorage.removeItem('redirectAfterStaffLogin');
        router.push(redirectPath);
      }
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error.response?.status === 403) {
        router.push('/staff/login?error=domain_not_allowed&status=403');
      } else {
        router.push('/staff/login?error=login_failed&status=500');
      }
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    router.push('/staff/login?error=google_login_failed&status=400');
  };

  const getErrorMessage = () => {
    if (!error) return null;

    switch (error) {
      case 'domain_not_allowed':
        return 'Access denied. Only @statuslabs.com and @blp.co email addresses are allowed.';
      case 'login_failed':
        return 'Login failed. Please try again.';
      case 'google_login_failed':
        return 'Google login failed. Please try again.';
      case 'not_authenticated':
        return 'Please log in to access this page.';
      case 'token_expired':
        return 'Your session has expired. Please log in again.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.50"
        p={3}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom color="primary">
            Staff Login
          </Typography>

          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Sign in with your StatusLabs or BLP Google account
          </Typography>

          {getErrorMessage() && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {getErrorMessage()}
            </Alert>
          )}

          <Box display="flex" justifyContent="center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              theme="filled_blue"
              size="large"
              text="signin_with"
            />
          </Box>

          <Typography variant="caption" color="textSecondary" sx={{ mt: 3, display: 'block' }}>
            Only @statuslabs.com and @blp.co email addresses are permitted
          </Typography>
        </Paper>
      </Box>
    </GoogleOAuthProvider>
  );
};

export default StaffLogin;
