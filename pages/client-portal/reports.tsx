import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  TableChart as TableIcon,
  ViewModule as CardIcon,
} from '@mui/icons-material';
import { ClientPortalLayout } from '../../components/layout/ClientPortalLayout';
import {
  ThemeProvider,
  ToastProvider,
  IntercomButton,
  IntercomCard,
  IntercomEmptyCard,
  IntercomInput,
} from '../../components/ui';
import useClientAuth from '../../hooks/useClientAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

interface Report {
  id: number;
  title: string;
  description?: string;
  type: string;
  uploaded_at: string;
  report_url: string;
  file_size?: string;
  uploaded_by: string;
}

type SortField = 'title' | 'uploaded_at' | 'type';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'cards' | 'table';

// Mock data - replace with actual API call
const mockReports: Report[] = [
  {
    id: 1,
    title: 'January 2024 SEO Performance Report',
    description:
      'Monthly SEO analysis including keyword rankings, organic traffic growth, and competitor insights.',
    type: 'SEO Report',
    uploaded_at: '2024-01-28T10:00:00Z',
    report_url: 'https://example.com/reports/seo-jan-2024.pdf',
    file_size: '2.4 MB',
    uploaded_by: 'Sarah Johnson',
  },
  {
    id: 2,
    title: 'Q4 2023 Social Media Analytics',
    description:
      'Quarterly social media performance across all platforms with engagement metrics and ROI analysis.',
    type: 'Social Media Report',
    uploaded_at: '2024-01-15T14:30:00Z',
    report_url: 'https://example.com/reports/social-q4-2023.pdf',
    file_size: '1.8 MB',
    uploaded_by: 'Mike Chen',
  },
  {
    id: 3,
    title: 'Website Analytics - December 2023',
    description:
      'Comprehensive website performance report including traffic sources, user behavior, and conversion data.',
    type: 'Web Analytics',
    uploaded_at: '2024-01-05T09:15:00Z',
    report_url: 'https://example.com/reports/web-analytics-dec-2023.pdf',
    file_size: '3.1 MB',
    uploaded_by: 'Emily Rodriguez',
  },
  {
    id: 4,
    title: 'Content Performance Summary - 2023',
    description:
      'Annual content marketing report showing top-performing articles, engagement metrics, and content strategy insights.',
    type: 'Content Report',
    uploaded_at: '2024-01-02T16:45:00Z',
    report_url: 'https://example.com/reports/content-2023-summary.pdf',
    file_size: '4.2 MB',
    uploaded_by: 'David Kim',
  },
  {
    id: 5,
    title: 'PPC Campaign Results - December 2023',
    description:
      'Monthly PPC performance report including ad spend, conversions, and optimization recommendations.',
    type: 'PPC Report',
    uploaded_at: '2023-12-31T11:20:00Z',
    report_url: 'https://example.com/reports/ppc-dec-2023.pdf',
    file_size: '1.5 MB',
    uploaded_by: 'Jessica Lee',
  },
];

function ClientReportsContent() {
  const { isValidClient, isLoading, clientInfo } = useClientAuth('/client-portal/login');
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch reports data
  useEffect(() => {
    if (isValidClient && clientInfo) {
      fetchReports();
    }
  }, [isValidClient, clientInfo]);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };
      const response = await axios.get('/api/client-reports', { headers });
      setReports(response.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
      // Fallback to mock data in case of error (for development)
      setReports(mockReports);
    } finally {
      setLoadingReports(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDownloadReport = async (reportId: number, reportUrl: string) => {
    try {
      // Mark as viewed
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };
      await axios.put(`/api/client-reports/${reportId}/view`, {}, { headers });

      // Open the report
      window.open(reportUrl, '_blank');
    } catch (error) {
      console.error('Error marking report as viewed:', error);
      // Still open the report even if marking as viewed fails
      window.open(reportUrl, '_blank');
    }
  };

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedReports = [...reports].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'uploaded_at') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const ViewModeToggle = ({
    value,
    onChange,
  }: {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
  }) => (
    <Box display="flex" gap={1}>
      <Tooltip title="Card View">
        <IconButton
          onClick={() => onChange('cards')}
          color={value === 'cards' ? 'primary' : 'default'}
          size="small"
        >
          <CardIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Table View">
        <IconButton
          onClick={() => onChange('table')}
          color={value === 'table' ? 'primary' : 'default'}
          size="small"
        >
          <TableIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Box
      display="flex"
      alignItems="center"
      sx={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field &&
        (sortDirection === 'asc' ? (
          <ArrowUpwardIcon fontSize="small" />
        ) : (
          <ArrowDownwardIcon fontSize="small" />
        ))}
    </Box>
  );

  // Reports Table Component
  const ReportsTable = ({ reports }: { reports: Report[] }) => (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <SortButton field="title">Report Title</SortButton>
            </TableCell>
            <TableCell>
              <SortButton field="type">Type</SortButton>
            </TableCell>
            <TableCell>File Size</TableCell>
            <TableCell>
              <SortButton field="uploaded_at">Upload Date</SortButton>
            </TableCell>
            <TableCell>Uploaded By</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map(report => (
            <TableRow key={report.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
              <TableCell>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {report.title}
                  </Typography>
                  {report.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: 300 }}
                      noWrap
                    >
                      {report.description}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="primary.main" fontWeight={500}>
                  {report.type}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {report.file_size || 'N/A'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatDate(report.uploaded_at)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {report.uploaded_by}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <Tooltip title="Download Report">
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadReport(report.id, report.report_url)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Reports Cards Component
  const ReportsCards = ({ reports }: { reports: Report[] }) => (
    <Grid container spacing={3}>
      {reports.map(report => (
        <Grid item xs={12} sm={6} lg={4} key={report.id}>
          <IntercomCard>
            <CardContent>
              <Box mb={2}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {report.title}
                </Typography>
                <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ mb: 1 }}>
                  {report.type}
                </Typography>
              </Box>

              {report.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {report.description}
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Upload Date:
                </Typography>
                <Typography variant="body2">{formatDate(report.uploaded_at)}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  File Size:
                </Typography>
                <Typography variant="body2">{report.file_size || 'N/A'}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Uploaded by:
                </Typography>
                <Typography variant="body2">{report.uploaded_by}</Typography>
              </Box>
            </CardContent>

            <CardActions>
              <Box display="flex" gap={1} width="100%">
                <IntercomButton
                  size="small"
                  variant="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadReport(report.id, report.report_url)}
                  fullWidth
                >
                  Download Report
                </IntercomButton>
              </Box>
            </CardActions>
          </IntercomCard>
        </Grid>
      ))}
    </Grid>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidClient) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Reports - Client Portal</title>
      </Head>
      <ClientPortalLayout
        title="Reports"
        breadcrumbs={[
          { label: 'Dashboard', href: '/client-portal/dashboard' },
          { label: 'Reports' },
        ]}
        clientInfo={clientInfo ? { name: clientInfo.name, email: clientInfo.email } : null}
      >
        <Container maxWidth="xl">
          <Paper elevation={0} sx={{ p: 4, mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Reports & Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Access your historical reports, analytics, and performance documents uploaded by your
              team.
            </Typography>
          </Paper>

          {/* View Toggle */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="div">
                All Reports ({reports.length})
              </Typography>
              <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
            </Box>
          </Box>

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Content based on current view */}
          {loadingReports ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : sortedReports.length === 0 ? (
            <IntercomEmptyCard
              title="No Reports Available"
              description="No reports have been uploaded yet. Your team will upload reports here for you to access and download."
              icon={<ReportIcon />}
            />
          ) : viewMode === 'table' ? (
            <ReportsTable reports={sortedReports} />
          ) : (
            <ReportsCards reports={sortedReports} />
          )}
        </Container>
      </ClientPortalLayout>
    </>
  );
}

export default function ClientReportsPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ClientReportsContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
