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

// Define the component as a function
const VerifyLoginPage = () => {
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

      // Check if verification response includes a requestId to redirect to
      const requestId = router.query.requestId;
      if (requestId) {
        // Redirect to the specific approval request
        router.push(`/client-portal/requests/${requestId}`);
      } else {
        // Redirect to the client portal home
        router.push('/client-portal');
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
      setError(null); // Clear any previous errors
      console.log('New login token requested for:', email);
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
};

// Export the component as default
export default VerifyLoginPage;
