import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { ThemeProvider, ToastProvider } from '../../components/ui';

// Wrap axios to suppress 401 errors specifically on the login page
const safeGet = async (url: string) => {
  try {
    return await axios.get(url);
  } catch (error) {
    // Silently fail on auth endpoints when on login page
    console.log('Ignoring expected auth error on login page');
    return { data: null };
  }
};

function ClientPortalLoginContent() {
  const router = useRouter();
  const { error, status } = router.query;

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  // Handle error messages from query parameters
  useEffect(() => {
    if (error) {
      let message = 'Please log in to access the client portal.';

      switch (error) {
        case 'unauthorized_token':
        case 'invalid_token':
        case 'token_expired':
          message = 'Your session has expired. Please log in again.';
          break;
        case 'unauthorized_contact_not_found_or_inactive':
          message = 'Your account appears to be inactive. Please contact support.';
          break;
        case 'not_authenticated':
          message = 'Please log in to continue.';
          break;
        default:
          if (error.includes('unauthorized')) {
            message = 'Authentication required. Please log in.';
          }
      }

      setErrorMessage(message);
    }
  }, [error, status]);

  // Check for a saved redirect path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPath = localStorage.getItem('redirectAfterLogin');
      if (savedPath) {
        setRedirectPath(savedPath);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Log the request for debugging
      console.log('Sending login request for email:', email);

      const response = await axios.post('/api/client-auth/request-login', {
        email,
      });

      console.log('Login request response:', response.data);
      setSuccess(true);
    } catch (error: any) {
      console.error('Error requesting login:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      setErrorMessage(error.response?.data?.error || 'Failed to request login link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box my={8} display="flex" flexDirection="column" alignItems="center">
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box display="flex" justifyContent="center" mb={4}>
            {/* Replace with your logo */}
            <Typography variant="h4" component="h1" gutterBottom>
              Client Portal
            </Typography>
          </Box>

          {success ? (
            <Alert severity="success" sx={{ mb: 3 }}>
              If your email is associated with a client account, you will receive a login link
              shortly. Please check your email.
              {redirectPath && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  After logging in, you&apos;ll be redirected to your requested page.
                </Typography>
              )}
            </Alert>
          ) : (
            <>
              <Typography variant="h5" align="center" gutterBottom>
                Log in to your account
              </Typography>

              <Typography variant="body1" align="center" color="text.secondary" paragraph>
                Enter your email address to receive a secure login link.
              </Typography>

              {errorMessage && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  {errorMessage}
                </Alert>
              )}

              {redirectPath && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  You&apos;ll be redirected to your requested page after logging in.
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                  }}
                  required
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={submitting || !email.trim()}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Send Login Link'}
                </Button>
              </form>
            </>
          )}

          <Divider sx={{ my: 4 }} />

          <Typography variant="body2" color="text.secondary" align="center">
            This is a secure, passwordless login system. You will receive an email with a link that
            will log you in automatically.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}

export default function ClientPortalLoginPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ClientPortalLoginContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
