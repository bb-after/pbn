import React, { useState } from 'react';
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

export default function ClientPortalLoginPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setSubmitting(true);
    setError(null);

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
      setError(error.response?.data?.error || 'Failed to request login link');
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
            </Alert>
          ) : (
            <>
              <Typography variant="h5" align="center" gutterBottom>
                Log in to your account
              </Typography>

              <Typography variant="body1" align="center" color="textSecondary" paragraph>
                Enter your email address to receive a secure login link.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
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

          <Typography variant="body2" color="textSecondary" align="center">
            This is a secure, passwordless login system. You will receive an email with a link that
            will log you in automatically.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
