import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  ListItemAvatar,
} from '@mui/material';
import {
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import {
  useToast,
  IntercomLayout,
  IntercomButton,
  IntercomCard,
  ToastProvider,
  ThemeProvider,
} from 'components/ui';

// Define report detail interface
interface ReportDetail {
  report_id: number;
  client_id: number;
  client_name: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  status: 'pending' | 'shared' | 'archived';
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  shared_contacts_count: number;
  viewed_contacts_count: number;
  total_contacts: number;
  contacts: Array<{
    report_contact_id: number;
    contact_id: number;
    name: string;
    email: string;
    job_title: string | null;
    shared_at: string | null;
    viewed_at: string | null;
    created_at: string;
    has_viewed: boolean;
    views: Array<{
      viewed_at: string;
    }>;
  }>;
  comments: Array<{
    comment_id: number;
    contact_id: number | null;
    staff_user_id: string | null;
    comment_text: string;
    created_at: string;
    updated_at: string;
    contact_name: string | null;
    contact_email: string | null;
  }>;
}

function ReportDetailPageContent() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidUser, isLoading, user } = useValidateUserToken();
  const { showError, showSuccess } = useToast();

  // State for data and loading
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Load report on mount
  useEffect(() => {
    if (isValidUser && id && !Array.isArray(id)) {
      fetchReport(parseInt(id as string, 10));
    }
  }, [isValidUser, id]);

  // Fetch report details
  const fetchReport = async (reportId: number) => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      const response = await axios.get(`/api/reports/${reportId}`, {
        headers: {
          'x-auth-token': token,
        },
      });

      setReport(response.data);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load report';
      setError(errorMessage);

      if (error.response?.status === 404) {
        showError('Report not found', 'The requested report could not be found.');
      } else if (error.response?.status === 403) {
        showError('Access denied', 'You do not have permission to view this report.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle downloading the report
  const handleDownloadReport = () => {
    if (report) {
      window.open(report.file_url, '_blank');
    }
  };

  // Handle editing the report
  const handleEdit = () => {
    if (report) {
      router.push(`/reports/${report.report_id}/edit`);
    }
  };

  // Handle deleting the report
  const handleDelete = async () => {
    if (!report) return;

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      await axios.delete(`/api/reports/${report.report_id}`, {
        headers: {
          'x-auth-token': token,
        },
      });

      showSuccess('Report deleted', 'The report has been deleted successfully.');
      router.push('/reports');
    } catch (error: any) {
      console.error('Error deleting report:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete report';
      showError('Delete failed', errorMessage);
    }
  };

  // Generate status chip with appropriate color
  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';
    let label = status.charAt(0).toUpperCase() + status.slice(1);

    switch (status) {
      case 'pending':
        color = 'warning';
        break;
      case 'shared':
        color = 'success';
        break;
      case 'archived':
        color = 'default';
        break;
    }
    return <Chip label={label} color={color} size="medium" />;
  };

  // Format file size (if we had file size data)
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type display
  const getFileTypeDisplay = (fileType: string | null, fileName: string | null) => {
    if (fileName) {
      const extension = fileName.split('.').pop()?.toUpperCase();
      return extension || 'FILE';
    }
    return fileType?.toUpperCase() || 'FILE';
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  if (error) {
    return (
      <IntercomLayout
        title="Report Not Found"
        breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: 'Report Details' }]}
      >
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <IntercomButton variant="primary" onClick={() => router.push('/reports')}>
          Back to Reports
        </IntercomButton>
      </IntercomLayout>
    );
  }

  if (!report) {
    return (
      <IntercomLayout
        title="Loading..."
        breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: 'Report Details' }]}
      >
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </IntercomLayout>
    );
  }

  const isOwner = user?.id === report.created_by_id;
  const canEdit = isAdmin || isOwner;

  return (
    <IntercomLayout
      title={report.title}
      breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: report.title }]}
      actions={
        <Box display="flex" gap={1}>
          <IntercomButton
            variant="primary"
            leftIcon={<DownloadIcon />}
            onClick={handleDownloadReport}
          >
            Download
          </IntercomButton>
          {canEdit && (
            <>
              <IntercomButton variant="secondary" leftIcon={<EditIcon />} onClick={handleEdit}>
                Edit
              </IntercomButton>
              <IntercomButton variant="danger" leftIcon={<DeleteIcon />} onClick={handleDelete}>
                Delete
              </IntercomButton>
            </>
          )}
        </Box>
      }
    >
      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <IntercomCard>
            <Box p={3}>
              {/* Header */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Typography variant="h4" gutterBottom>
                    {report.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Client: {report.client_name}
                  </Typography>
                </Box>
                {getStatusChip(report.status)}
              </Box>

              {/* Description */}
              {report.description && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {report.description}
                  </Typography>
                </Box>
              )}

              {/* File Information */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  File Information
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <DocumentIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box flex={1}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {report.file_name || 'Report File'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getFileTypeDisplay(report.file_type, report.file_name)} File
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadReport}
                    >
                      Download
                    </Button>
                  </Box>
                </Paper>
              </Box>

              {/* Metadata */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {new Date(report.created_at).toLocaleDateString()} at{' '}
                      {new Date(report.created_at).toLocaleTimeString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {new Date(report.updated_at).toLocaleDateString()} at{' '}
                      {new Date(report.updated_at).toLocaleTimeString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </IntercomCard>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Sharing Summary */}
          <IntercomCard sx={{ mb: 3 }}>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Sharing Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {report.shared_contacts_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shared
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {report.viewed_contacts_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Viewed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </IntercomCard>

          {/* Contact List */}
          <IntercomCard>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Shared With ({report.total_contacts})
              </Typography>
              <List>
                {report.contacts.map(contact => (
                  <ListItem
                    key={contact.contact_id}
                    sx={{
                      transition: 'background-color 0.2s ease-in-out',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>{contact.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={contact.name}
                      secondary={contact.email}
                      primaryTypographyProps={{
                        fontWeight: 500,
                        color: 'text.primary',
                      }}
                      secondaryTypographyProps={{
                        color: 'text.secondary',
                      }}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      {contact.has_viewed ? (
                        <Tooltip
                          title={`Last viewed: ${new Date(
                            contact.views[0]?.viewed_at
                          ).toLocaleString()}`}
                        >
                          <Chip
                            icon={<VisibilityIcon />}
                            label="Viewed"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Tooltip>
                      ) : (
                        <Chip label="Not Viewed" size="small" variant="outlined" />
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function ReportDetailPage() {
  return (
    <ToastProvider>
      <ReportDetailPageContent />
    </ToastProvider>
  );
}
