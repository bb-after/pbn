import React, { useEffect } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/router';
import axios from 'axios';
import { keyframes } from '@mui/system';
import { tokens } from '../theme/intercom-theme';
import { Psychology as BrainIcon } from '@mui/icons-material';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Fast sprint-like animation for the "AI" label - like a runner stopping abruptly
const aiSprintIn = keyframes`
  0% { opacity: 0; transform: translateX(-60px) scale(0.9); }
  70% { opacity: 1; transform: translateX(3px) scale(1.05); }
  85% { opacity: 1; transform: translateX(-1px) scale(1.02); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
`;

// Logo slide-in from the left after AI has settled
const logoSlideIn = keyframes`
  0% { opacity: 0; transform: scaleX(-1) translateX(30px) scale(0.8); }
  60% { opacity: 1; transform: scaleX(-1) translateX(-2px) scale(1.1); }
  100% { opacity: 1; transform: scaleX(-1) translateX(0) scale(1); }
`;

const Login: React.FC = () => {
  const router = useRouter();
  const { error, status } = router.query;

  useEffect(() => {
    // Check if user is already logged in
    const checkExistingAuth = async () => {
      try {
        await axios.get('/api/auth/me');
        // If we get here, user is already authenticated
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (err) {
        // User not authenticated, stay on login page
      }
    };

    checkExistingAuth();
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await axios.post('/api/auth/google', {
        idToken: credentialResponse.credential,
      });

      if (response.data.user) {
        // Redirect to intended page or dashboard
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      }
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error.response?.status === 403) {
        router.push('/login?error=domain_not_allowed&status=403');
      } else {
        router.push('/login?error=login_failed&status=500');
      }
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    router.push('/login?error=google_login_failed&status=400');
  };

  const getErrorMessage = () => {
    if (!error) return null;

    switch (error) {
      case 'domain_not_allowed':
        return 'Access denied. Only work email addresses allowed.';
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
          <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
            <BrainIcon
              sx={{
                fontSize: '3rem',
                color: tokens.colors.primary[400],
                mr: 0.5,
                opacity: 0,
                // Transform handled in keyframes to maintain flip during animation
                animation: `${logoSlideIn} 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                animationDelay: '0.2s', // Brain appears first
                willChange: 'transform, opacity',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                fontSize: '3rem',
              }}
            >
              Status{' '}
              <Box
                component="span"
                sx={{
                  color: tokens.colors.primary[400],
                  display: 'inline-block',
                  opacity: 0,
                  animation: `${aiSprintIn} 400ms cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards`,
                  animationDelay: '0.8s', // AI sprints in after brain has appeared
                  willChange: 'transform, opacity',
                }}
              >
                AI
              </Box>
            </Typography>
          </Box>

          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            A Millbrook Companies&reg; product.
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
        </Paper>
      </Box>
    </GoogleOAuthProvider>
  );
};

export default Login;
