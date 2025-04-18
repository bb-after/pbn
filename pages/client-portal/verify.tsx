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

export default function VerifyLoginPage() {
  const router = useRouter();
  const { token } = router.query;

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [requestingNewToken, setRequestingNewToken] = useState(false);
  const [newTokenRequested, setNewTokenRequested] = useState(false);

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

      // Redirect to the client portal immediately
      router.push('/client-portal');
    } catch (error: any) {
      console.error('Error verifying token:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);

        // Check for specific error types
        const errorMessage = error.response.data.error || 'Failed to verify login token';
        setError(errorMessage);

        // Set error type for better user experience
        if (errorMessage.includes('expired')) {
          setErrorType('expired');
        } else if (errorMessage.includes('used')) {
          setErrorType('used');
        } else if (errorMessage.includes('Invalid token')) {
          setErrorType('invalid');
        } else {
          setErrorType('general');
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('Server did not respond. Please try again later.');
        setErrorType('network');
      } else {
        console.error('Error setting up request:', error.message);
        setError('An unexpected error occurred. Please try again.');
        setErrorType('general');
      }
    } finally {
      setVerifying(false);
    }
  }, [token, router]);

  useEffect(() => {
    // Verify the token once it's available from the query params
    if (token) {
      verifyToken();
    }
  }, [token, verifyToken]);

  // Function to request a new login token
  const requestNewToken = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setRequestingNewToken(true);
    setError(null);

    try {
      await axios.post('/api/client-auth/request-login', { email });
      setNewTokenRequested(true);
    } catch (error: any) {
      console.error('Error requesting new token:', error);
      setError('Failed to request a new login link. Please try again.');
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

          <Typography variant="h5" align="center" gutterBottom>
            Verifying Login
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" my={4}>
            {verifying ? (
              <CircularProgress />
            ) : error ? (
              <>
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>

                {/* For token expiration */}
                {errorType === 'expired' && !newTokenRequested && (
                  <Box sx={{ width: '100%', mt: 2, mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      Your login link has expired. Would you like to request a new one?
                    </Typography>
                    <TextField
                      fullWidth
                      label="Email Address"
                      variant="outlined"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={requestNewToken}
                      disabled={requestingNewToken || !email}
                    >
                      {requestingNewToken ? <CircularProgress size={24} /> : 'Send New Login Link'}
                    </Button>
                  </Box>
                )}

                {/* For already used token */}
                {errorType === 'used' && !newTokenRequested && (
                  <Box sx={{ width: '100%', mt: 2, mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      This login link has already been used. Would you like to request a new one?
                    </Typography>
                    <TextField
                      fullWidth
                      label="Email Address"
                      variant="outlined"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={requestNewToken}
                      disabled={requestingNewToken || !email}
                    >
                      {requestingNewToken ? <CircularProgress size={24} /> : 'Send New Login Link'}
                    </Button>
                  </Box>
                )}

                {/* Success message after requesting a new token */}
                {newTokenRequested && (
                  <Alert severity="success" sx={{ width: '100%', mt: 2, mb: 2 }}>
                    A new login link has been sent to your email.
                  </Alert>
                )}

                {/* Technical details for debugging (can be removed in production) */}
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Token: {token ? token.toString().substring(0, 8) + '...' : 'No token provided'}
                </Typography>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <NextLink
                    href={`/api/client-auth/token-check?token=${token}`}
                    passHref
                    legacyBehavior
                  >
                    <Link target="_blank" rel="noopener noreferrer" sx={{ mb: 2 }}>
                      Check token details
                    </Link>
                  </NextLink>
                  <NextLink
                    href={`/api/client-auth/verify-debug?token=${token}`}
                    passHref
                    legacyBehavior
                  >
                    <Link target="_blank" rel="noopener noreferrer" sx={{ mb: 2 }}>
                      Try manual verification
                    </Link>
                  </NextLink>
                </Box>
              </>
            ) : (
              <Alert severity="success" sx={{ width: '100%' }}>
                Login verified successfully! Redirecting to portal...
              </Alert>
            )}
          </Box>

          {error && !newTokenRequested && (
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
}
