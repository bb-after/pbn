import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  Alert,
  Stack,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Autorenew as ProcessingIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import axios from 'axios';
import { IntercomLayout, IntercomCard, IntercomButton } from '../../components/ui';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import useAuth from '../../hooks/useAuth';

interface ProcessingStatus {
  request_id: string;
  submission_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_count: number;
  total_count: number;
  progress_percentage: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  submission_user_name?: string;
  submission_created_at?: string;
}

function LeadEnricherStatusContent() {
  const router = useRouter();
  const { isValidUser, token } = useAuth('/login');
  const { requestId } = router.query;
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!requestId || !token) return;

    try {
      const response = await axios.get(`/api/lead-enricher/status/${requestId}`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setStatus(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching status:', error);
      setError(error.response?.data?.error || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [requestId, token]);

  // Auto-refresh for active processing
  useEffect(() => {
    if (!status) return;

    const isActive = status.status === 'pending' || status.status === 'processing';
    if (!isActive) return;

    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [status?.status]);

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 40 }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 40 }} />;
      case 'processing':
        return <ProcessingIcon sx={{ color: 'warning.main', fontSize: 40 }} />;
      case 'pending':
      default:
        return <ScheduleIcon sx={{ color: 'info.main', fontSize: 40 }} />;
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      case 'pending':
      default:
        return 'info';
    }
  };

  const getStatusLabel = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  if (loading) {
    return (
      <IntercomLayout
        title="Loading..."
        breadcrumbs={[{ label: 'Lead Enricher' }, { label: 'Status' }]}
      >
        <IntercomCard>
          <Box p={4} textAlign="center">
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Loading processing status...</Typography>
          </Box>
        </IntercomCard>
      </IntercomLayout>
    );
  }

  if (error) {
    return (
      <IntercomLayout title="Error" breadcrumbs={[{ label: 'Lead Enricher' }, { label: 'Status' }]}>
        <IntercomCard>
          <Box p={4} textAlign="center">
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Error Loading Status
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Stack direction="row" spacing={2} justifyContent="center">
              <IntercomButton variant="ghost" onClick={fetchStatus}>
                Retry
              </IntercomButton>
              <IntercomButton
                variant="secondary"
                leftIcon={<ArrowBackIcon />}
                onClick={() => router.push('/lead-enricher')}
              >
                Back to Lead Enricher
              </IntercomButton>
            </Stack>
          </Box>
        </IntercomCard>
      </IntercomLayout>
    );
  }

  if (!status) {
    return (
      <IntercomLayout
        title="Not Found"
        breadcrumbs={[{ label: 'Lead Enricher' }, { label: 'Status' }]}
      >
        <IntercomCard>
          <Box p={4} textAlign="center">
            <Typography variant="h6" gutterBottom>
              Processing Status Not Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The requested processing status could not be found.
            </Typography>
            <IntercomButton variant="primary" onClick={() => router.push('/lead-enricher')}>
              Back to Lead Enricher
            </IntercomButton>
          </Box>
        </IntercomCard>
      </IntercomLayout>
    );
  }

  return (
    <IntercomLayout
      title="Lead Enricher Status"
      breadcrumbs={[{ label: 'Lead Enricher' }, { label: 'Processing Status' }]}
    >
      <Stack spacing={3}>
        {/* Status Overview Card */}
        <IntercomCard>
          <Box p={4} textAlign="center">
            {getStatusIcon(status.status)}
            <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
              {getStatusLabel(status.status)}
            </Typography>
            <Chip
              label={getStatusLabel(status.status)}
              color={getStatusColor(status.status) as any}
              sx={{ mb: 3 }}
            />

            {/* Progress Bar */}
            <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 35 }}>
                  {status.progress_percentage}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={status.progress_percentage}
                  sx={{ flexGrow: 1, mx: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {status.processed_count} / {status.total_count}
                </Typography>
              </Box>
            </Box>

            {/* Error Message */}
            {status.error_message && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {status.error_message}
              </Alert>
            )}

            {/* Auto-refresh indicator for active status */}
            {(status.status === 'pending' || status.status === 'processing') && (
              <Typography variant="caption" color="text.secondary">
                Auto-refreshing every 5 seconds...
              </Typography>
            )}
          </Box>
        </IntercomCard>

        {/* Details Card */}
        <IntercomCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Processing Details
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Request ID
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {status.request_id}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Submitted By
                    </TableCell>
                    <TableCell>{status.submission_user_name || 'Unknown'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Total Records
                    </TableCell>
                    <TableCell>{status.total_count}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Processed Records
                    </TableCell>
                    <TableCell>{status.processed_count}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Submitted At
                    </TableCell>
                    <TableCell>{formatDateTime(status.submission_created_at)}</TableCell>
                  </TableRow>
                  {status.started_at && (
                    <TableRow>
                      <TableCell component="th" scope="row">
                        Processing Started
                      </TableCell>
                      <TableCell>{formatDateTime(status.started_at)}</TableCell>
                    </TableRow>
                  )}
                  {status.completed_at && (
                    <TableRow>
                      <TableCell component="th" scope="row">
                        {status.status === 'completed' ? 'Completed At' : 'Failed At'}
                      </TableCell>
                      <TableCell>{formatDateTime(status.completed_at)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell component="th" scope="row">
                      Last Updated
                    </TableCell>
                    <TableCell>{formatDateTime(status.updated_at)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </IntercomCard>

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="center">
          <IntercomButton
            variant="ghost"
            leftIcon={<ArrowBackIcon />}
            onClick={() => router.push('/lead-enricher')}
          >
            Back to Lead Enricher
          </IntercomButton>
          <IntercomButton variant="ghost" onClick={fetchStatus}>
            Refresh Status
          </IntercomButton>
        </Stack>
      </Stack>
    </IntercomLayout>
  );
}

export default function LeadEnricherStatusPage() {
  return <LeadEnricherStatusContent />;
}
