import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Link,
  TextField,
} from '@mui/material';
import { useRouter } from 'next/router';
import axios from 'axios';
import NextLink from 'next/link';
import Head from 'next/head';

// Define the component as a function
const VerifyLoginPage = () => {
  const router = useRouter();
  const { token } = router.query;

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [requestingNewToken, setRequestingNewToken] = useState(false);
  const [newTokenRequested, setNewTokenRequested] = useState(false);

  // Add a function to directly retrieve email from token by making another API call
  const retrieveEmailFromToken = useCallback(async (token: string | string[]) => {
    try {
      // Make a direct API call to our backend to check the token
      const response = await axios.post('/api/client-auth/token-lookup', { token });
      if (response.data && response.data.email) {
        console.log('Retrieved email from token-lookup:', response.data.email);
        setTokenEmail(response.data.email);
        return true;
      }
    } catch (error) {
      console.error('Error retrieving email from token:', error);
    }
    return false;
  }, []);

  const verifyToken = useCallback(async () => {
    setVerifying(true);
    setError(null);
    setErrorType(null);

    try {
      console.log('Verifying token:', token);
      // Use the debug endpoint that works with both GET and POST methods
      // and provides more detailed error information
      const response = await axios.get(`/api/client-auth/verify-debug?token=${token}`);
      console.log('Verification successful:', response.data);

      setVerified(true);

      // Check if verification response includes a requestId to redirect to
      const requestId = router.query.requestId;
      if (requestId) {
        // Redirect to the specific approval request
        router.push(`/client-portal/requests/${requestId}`);
      } else {
        // Check if there's a saved path to redirect to
        let redirectPath = '/client-portal';

        if (typeof window !== 'undefined') {
          const savedPath = localStorage.getItem('redirectAfterLogin');
          if (savedPath) {
            redirectPath = savedPath;
            // Clear the saved path to prevent unwanted redirects in the future
            localStorage.removeItem('redirectAfterLogin');
          }
        }

        // Redirect to the saved path or default to the client portal home
        router.push(redirectPath);
      }
    } catch (err: any) {
      // Defensive: always set a string error
      let errorMessage = 'Failed to verify login token';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (typeof err.response.data.error === 'string') {
          errorMessage = err.response.data.error;
        }

        // Try to extract email from error response
        if (err.response.data.email) {
          setTokenEmail(err.response.data.email);
          console.log('Email extracted from token response:', err.response.data.email);
        } else if (err.response.data.tokenData && err.response.data.tokenData.email) {
          // If API returns full token data in debug info
          setTokenEmail(err.response.data.tokenData.email);
          console.log('Email extracted from token data:', err.response.data.tokenData.email);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);

      // Defensive: always set an errorType
      if (errorMessage.toLowerCase().includes('expired')) {
        setErrorType('expired');
      } else if (errorMessage.toLowerCase().includes('used')) {
        setErrorType('used');
      } else if (errorMessage.toLowerCase().includes('invalid')) {
        setErrorType('invalid');
      } else if (err.request) {
        setErrorType('network');
      } else {
        setErrorType('general');
      }

      // If we still don't have an email, try to get it from the token directly
      if (!tokenEmail && token) {
        // Make a direct API call to get the email from the token
        await retrieveEmailFromToken(token);
      }
    } finally {
      setVerifying(false);
    }
  }, [token, router]);

  useEffect(() => {
    // Verify the token once it's available from the query params
    if (token) {
      console.log(
        `Starting verification of token: ${typeof token === 'string' ? token.substring(0, 10) + '...' : 'array'}`
      );
      verifyToken();
    }
  }, [token, verifyToken]);

  // Add effect to log token email state changes
  useEffect(() => {
    if (tokenEmail) {
      console.log('Token email state updated:', tokenEmail);
    }
  }, [tokenEmail]);

  // Add effect to attempt token lookup when error type is set but no email is available
  useEffect(() => {
    const attemptEmailLookup = async () => {
      // Only run if we have a token, an error type that needs email, and no email yet
      if (token && (errorType === 'expired' || errorType === 'used') && !tokenEmail && !verifying) {
        console.log('Attempting to look up email for token due to error:', errorType);
        await retrieveEmailFromToken(token);
      }
    };

    attemptEmailLookup();
  }, [errorType, token, tokenEmail, verifying, retrieveEmailFromToken]);

  // Function to request a new login token
  const requestNewToken = async () => {
    if (!tokenEmail) {
      // Try one last attempt to get the email
      if (token) {
        try {
          const emailFound = await retrieveEmailFromToken(token);
          if (!emailFound) {
            setError('No email address available. Please return to the login page.');
            return;
          }
        } catch (err) {
          setError('No email address available. Please return to the login page.');
          return;
        }
      } else {
        setError('No email address available. Please return to the login page.');
        return;
      }
    }

    setRequestingNewToken(true);
    setError(null);

    try {
      await axios.post('/api/client-auth/request-login', { email: tokenEmail });
      setNewTokenRequested(true);
      setError(null); // Clear any previous errors
      console.log('New login token requested for:', tokenEmail);
    } catch (error: any) {
      console.error('Error requesting new token:', error);
      let errorMessage = 'Failed to request a new login link. Please try again.';

      // Extract more detailed error message if available
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data.error === 'string') {
          errorMessage = error.response.data.error;
        }
      }

      setError(errorMessage);
      setNewTokenRequested(false);
    } finally {
      setRequestingNewToken(false);
    }
  };

  // Render loading state while waiting for token from query params
  if (!token && !error) {
    return (
      <Container maxWidth="sm">
        <Box my={8} display="flex" flexDirection="column" alignItems="center">
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Helper function to render token error message and action buttons
  const renderTokenErrorSection = (message: string) => (
    <Box sx={{ width: '100%', mt: 2, mb: 3 }}>
      <Typography variant="body1" gutterBottom>
        {message}
        {tokenEmail ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            We&apos;ll send it to: <strong>{tokenEmail}</strong>
          </Typography>
        ) : (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            We couldn&apos;t determine your email address. Please return to the login page.
          </Typography>
        )}
      </Typography>
      {tokenEmail ? (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={requestNewToken}
          disabled={requestingNewToken}
          sx={{ mt: 2 }}
        >
          {requestingNewToken ? <CircularProgress size={24} /> : 'Send New Login Link'}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => router.push('/client-portal/login')}
          sx={{ mt: 2 }}
        >
          Return to Login Page
        </Button>
      )}
    </Box>
  );

  return (
    <Container maxWidth="sm">
      <Head>
        <title>
          {newTokenRequested
            ? 'Login Link Sent'
            : errorType === 'expired' || errorType === 'used'
              ? 'Login Link ' + (errorType === 'expired' ? 'Expired' : 'Already Used')
              : 'Verifying Login'}
        </title>
      </Head>
      <Box my={8} display="flex" flexDirection="column" alignItems="center">
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box display="flex" justifyContent="center" mb={4}>
            {/* Replace with your logo */}
            <Typography variant="h4" component="h1" gutterBottom>
              Client Portal
            </Typography>
          </Box>

          <Typography variant="h5" align="center" gutterBottom>
            {newTokenRequested
              ? 'Login Link Sent'
              : errorType === 'expired' || errorType === 'used'
                ? 'Login Link ' + (errorType === 'expired' ? 'Expired' : 'Already Used')
                : 'Verifying Login'}
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" my={4}>
            {verifying ? (
              <CircularProgress />
            ) : newTokenRequested ? (
              // Dedicated view for when a new login link has been requested
              <Box width="100%">
                <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
                  A new login link has been sent to your email.
                </Alert>

                <Box
                  sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f9f9f9' }}
                >
                  <Typography variant="h6" gutterBottom>
                    Next steps:
                  </Typography>

                  <Box component="ol" sx={{ pl: 2 }}>
                    <Box component="li" sx={{ mb: 1 }}>
                      Check your inbox at <strong>{tokenEmail}</strong>
                    </Box>
                    <Box component="li" sx={{ mb: 1 }}>
                      Click the login link in the email
                    </Box>
                    <Box component="li">
                      You&apos;ll be automatically logged in to the Client Portal
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 3, fontStyle: 'italic' }}
                  >
                    Note: This current link is no longer valid. Please use the new link from your
                    email.
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="center" mt={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push('/client-portal/login')}
                  >
                    Return to Login Page
                  </Button>
                </Box>
              </Box>
            ) : error ? (
              <>
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>

                {/* For token expiration */}
                {errorType === 'expired' &&
                  !newTokenRequested &&
                  renderTokenErrorSection(
                    'Your login link has expired. Would you like to request a new one?'
                  )}

                {/* For already used token */}
                {errorType === 'used' &&
                  !newTokenRequested &&
                  renderTokenErrorSection(
                    'This login link has already been used. Would you like to request a new one?'
                  )}
              </>
            ) : (
              <Alert severity="success" sx={{ width: '100%' }}>
                Login verified successfully! Redirecting to portal...
              </Alert>
            )}
          </Box>

          {error && !newTokenRequested && errorType !== 'expired' && errorType !== 'used' && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => router.push('/client-portal/login')}
              >
                Return to Login
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

// Export the component as default
export default VerifyLoginPage;
