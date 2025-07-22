import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  IconButton,
  Divider,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
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
  IntercomSearchInput,
  ToastProvider,
  ThemeProvider,
} from 'components/ui';
import ViewModeToggle from '../../components/ViewModeToggle';

// Define report interface
interface Report {
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
}

function ReportsPageContent() {
  const router = useRouter();
  const { isValidUser, isLoading, user } = useValidateUserToken();
  const { admin: isAdminMode } = router.query;
  const { showError, showSuccess } = useToast();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // State for data and loading
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for view mode
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<number | string>('all');
  const [clients, setClients] = useState<{ client_id: number; client_name: string }[]>([]);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // State for sorting
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for toast notification
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Page title reflecting the mode
  const pageTitle = isAdminMode && isAdmin ? 'Admin: All Reports' : 'Client Reports';

  // Redirect non-admin users trying to access admin mode
  useEffect(() => {
    if (isAdminMode && !isAdmin && !isLoading && isValidUser) {
      router.push('/reports');
    }
  }, [isAdminMode, isAdmin, isLoading, isValidUser, router]);

  // Load reports on mount
  useEffect(() => {
    if (isValidUser) {
      fetchReports();
      fetchClients();
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [isValidUser, isAdmin]);

  // Handle view mode change
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'cards' | 'table'
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableCell
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      onClick={() => handleSort(column)}
    >
      <Box display="flex" alignItems="center">
        {children}
        <Box
          ml={1}
          display="flex"
          flexDirection="column"
          sx={{ opacity: sortBy === column ? 1 : 0.3 }}
        >
          <ArrowUpwardIcon
            sx={{
              fontSize: 12,
              color:
                sortBy === column && sortDirection === 'asc' ? 'primary.main' : 'text.disabled',
            }}
          />
          <ArrowDownwardIcon
            sx={{
              fontSize: 12,
              mt: -0.5,
              color:
                sortBy === column && sortDirection === 'desc' ? 'primary.main' : 'text.disabled',
            }}
          />
        </Box>
      </Box>
    </TableCell>
  );

  // Fetch all reports
  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Build query parameters
      let url = '/api/reports';
      const params = new URLSearchParams();

      // Only add admin=true param if user is admin and in admin mode
      if (isAdmin && isAdminMode) {
        params.append('admin', 'true');
      }

      // Add user_id filter if an admin has selected a specific user
      if (isAdmin && userFilter !== 'all') {
        params.append('user_id', userFilter);
      }

      // Add client filter if selected
      if (clientFilter !== 'all') {
        params.append('client_id', clientFilter.toString());
      }

      // Add status filter if selected
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching reports with URL:', url);

      const response = await axios.get(url, {
        headers: {
          'x-auth-token': token,
        },
      });

      console.log('API Response status:', response.status);
      console.log('Received reports:', response.data.length, 'items');

      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all clients for filtering
  const fetchClients = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      const response = await axios.get('/api/clients', {
        headers: {
          'x-auth-token': token,
        },
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Fetch all users for admin filtering
  const fetchUsers = async () => {
    if (!isAdmin) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      const response = await axios.get('/api/users', {
        headers: {
          'x-auth-token': token,
        },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Handle creating a new report
  const handleCreateReport = () => {
    router.push('/reports/upload');
  };

  // Handle viewing a report
  const handleViewReport = (reportId: number) => {
    router.push(`/reports/${reportId}`);
  };

  // Handle downloading a report
  const handleDownloadReport = (report: Report) => {
    window.open(report.file_url, '_blank');
  };

  // Get the filtered reports
  const filteredReports = reports.filter(report => {
    return (
      searchTerm === '' ||
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Apply sorting
  const sortedReports = [...filteredReports].sort((a, b) => {
    const aValue = a[sortBy as keyof Report];
    const bValue = b[sortBy as keyof Report];

    // Handle different data types
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Fallback for dates or other types
    return sortDirection === 'asc'
      ? new Date(aValue as string).getTime() - new Date(bValue as string).getTime()
      : new Date(bValue as string).getTime() - new Date(aValue as string).getTime();
  });

  // Generate status chip with appropriate color
  const getStatusChip = (report: Report) => {
    // Handle null/undefined status
    if (!report.status) {
      return <Chip label="Unknown" color="default" size="small" />;
    }

    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';
    let label = report.status.charAt(0).toUpperCase() + report.status.slice(1);

    switch (report.status) {
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
    return <Chip label={label} color={color} size="small" />;
  };

  // Handle closing the toast
  const handleCloseToast = () => {
    setToastOpen(false);
  };

  // Table component for reports
  const ReportsTable = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHead>
          <TableRow>
            <SortableHeader column="status">Status</SortableHeader>
            <SortableHeader column="title">Title</SortableHeader>
            <SortableHeader column="client_name">Client</SortableHeader>
            <SortableHeader column="file_type">Type</SortableHeader>
            <SortableHeader column="shared_contacts_count">Sharing</SortableHeader>
            <SortableHeader column="created_at">Created</SortableHeader>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedReports.map(report => (
            <TableRow key={report.report_id} hover sx={{ cursor: 'pointer' }}>
              <TableCell onClick={() => handleViewReport(report.report_id)}>
                {getStatusChip(report)}
              </TableCell>
              <TableCell onClick={() => handleViewReport(report.report_id)}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {report.title}
                </Typography>
                {report.description && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      mt: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {report.description}
                  </Typography>
                )}
              </TableCell>
              <TableCell onClick={() => handleViewReport(report.report_id)}>
                {report.client_name}
              </TableCell>
              <TableCell onClick={() => handleViewReport(report.report_id)}>
                <Chip
                  size="small"
                  label={report.file_type?.toUpperCase() || 'FILE'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell onClick={() => handleViewReport(report.report_id)}>
                <Chip
                  size="small"
                  label={`${report.shared_contacts_count}/${report.total_contacts}`}
                  color={report.shared_contacts_count > 0 ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell onClick={() => handleViewReport(report.report_id)}>
                <Typography variant="body2">
                  {new Date(report.created_at).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <IntercomButton
                    size="small"
                    variant="secondary"
                    onClick={() => handleViewReport(report.report_id)}
                  >
                    View
                  </IntercomButton>
                  <IntercomButton
                    size="small"
                    variant="primary"
                    onClick={() => handleDownloadReport(report)}
                  >
                    Download
                  </IntercomButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Cards component for reports
  const ReportsCards = () => (
    <Grid container spacing={3}>
      {filteredReports.map(report => (
        <Grid item xs={12} md={6} lg={4} key={report.report_id}>
          <Card
            elevation={3}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
            onClick={() => handleViewReport(report.report_id)}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                  {report.title}
                </Typography>
                {getStatusChip(report)}
              </Box>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Client: {report.client_name}
              </Typography>

              <Box mt={1}>
                <Chip
                  size="small"
                  label={report.file_type?.toUpperCase() || 'FILE'}
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Chip
                  size="small"
                  label={`${report.shared_contacts_count}/${report.total_contacts} Shared`}
                  color={report.shared_contacts_count > 0 ? 'success' : 'default'}
                />
              </Box>

              {report.description && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {report.description}
                </Typography>
              )}
            </CardContent>

            <Divider />

            <CardActions>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={e => {
                  e.stopPropagation();
                  handleViewReport(report.report_id);
                }}
              >
                View Details
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={e => {
                  e.stopPropagation();
                  handleDownloadReport(report);
                }}
              >
                Download
              </Button>
              <Box flexGrow={1} />
              <Typography variant="caption" color="textSecondary">
                {new Date(report.created_at).toLocaleDateString()}
              </Typography>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title={pageTitle}
      breadcrumbs={[
        { label: 'Reports', href: '/reports' },
        ...(isAdminMode && isAdmin ? [{ label: 'Admin View' }] : []),
      ]}
      actions={
        <IntercomButton variant="primary" leftIcon={<AddIcon />} onClick={handleCreateReport}>
          New Report
        </IntercomButton>
      }
    >
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" component="div" sx={{ color: 'text.primary' }}>
            All Reports
          </Typography>
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
        </Box>

        {/* Filters */}
        <IntercomCard borderless padding="medium" sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <IntercomSearchInput
                placeholder="Search by title or client"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                  '& .MuiSelect-select': {
                    color: 'text.primary',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'text.primary',
                  },
                }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="shared">Shared</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Client"
                value={clientFilter}
                onChange={e => setClientFilter(Number(e.target.value) || e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'text.secondary',
                  },
                  '& .MuiSelect-select': {
                    color: 'text.primary',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'text.primary',
                  },
                }}
              >
                <MenuItem value="all">All Clients</MenuItem>
                {clients.map(client => (
                  <MenuItem key={client.client_id} value={client.client_id}>
                    {client.client_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <IntercomButton
                fullWidth
                variant="secondary"
                leftIcon={<RefreshIcon />}
                onClick={fetchReports}
              >
                Refresh
              </IntercomButton>
            </Grid>
          </Grid>
        </IntercomCard>

        {/* Content */}
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : filteredReports.length === 0 ? (
          <Alert severity="info">No reports found. Create a new report to get started.</Alert>
        ) : viewMode === 'table' ? (
          <ReportsTable />
        ) : (
          <ReportsCards />
        )}
      </Box>
    </IntercomLayout>
  );
}

export default function ReportsPage() {
  return (
    <ToastProvider>
      <ReportsPageContent />
    </ToastProvider>
  );
}
