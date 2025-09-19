import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Link,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  OpenInNew as OpenInNewIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { IntercomLayout } from '../components/layout/IntercomLayout';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

interface SyncLog {
  id: number;
  sync_user_id: string;
  sync_user_name?: string;
  target_user_id: string;
  target_user_name: string;
  sync_month: string;
  google_sheet_url: string;
  sheet_tab_name: string;
  expense_count: number;
  total_amount: number | string;
  unique_clients_count: number;
  sync_type: 'matrix' | 'tabular';
  status: 'started' | 'success' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
  sync_duration_ms?: number;
}

interface SyncSummary {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalExpensesProcessed: number;
  uniqueUsers: number;
  avgSyncDuration: number;
}

interface UserMapping {
  id: number;
  ramp_user_id: string;
  ramp_user_name: string;
  ramp_user_email: string;
}

const formatCurrency = (amount: number | string): string => {
  // Ensure we have a number (MySQL DECIMAL fields come as strings)
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '$0.00';
  }

  return numAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const RampSyncHistory: React.FC = () => {
  const { token } = useValidateUserToken();
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMappings, setUserMappings] = useState<UserMapping[]>([]);

  // Filters
  const [targetUserId, setTargetUserId] = useState('');
  const [syncMonth, setSyncMonth] = useState('');
  const [status, setStatus] = useState('');

  // Generate last 12 months for dropdown
  const getLast12Months = (): { value: string; label: string }[] => {
    const months = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      months.push({ value, label });
    }

    return months;
  };

  // Get users who haven't synced for the selected month
  const getUsersWithoutSyncs = (selectedMonth: string): UserMapping[] => {
    if (!selectedMonth || !userMappings.length || !syncLogs.length) {
      return [];
    }

    // Get all user IDs who have successfully synced for this month
    const syncedUserIds = new Set(
      syncLogs
        .filter(log => log.sync_month === selectedMonth && log.status === 'success')
        .map(log => log.target_user_id)
    );

    // Return users who don't have successful syncs for this month
    return userMappings.filter(user => !syncedUserIds.has(user.ramp_user_id));
  };

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    if (token) {
      fetchSyncHistory();
      fetchSummaryStats();
      fetchUserMappings();
    }
  }, [token, targetUserId, syncMonth, status, page]);

  const fetchUserMappings = async () => {
    try {
      const response = await fetch('/api/ramp/user-mappings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const mappings = await response.json();
        setUserMappings(mappings);
      } else {
        console.error('Failed to fetch user mappings');
      }
    } catch (err) {
      console.error('Error fetching user mappings:', err);
    }
  };

  const fetchSyncHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });

      if (targetUserId) params.append('target_user_id', targetUserId);
      if (syncMonth) params.append('sync_month', syncMonth);
      if (status) params.append('status', status);

      const response = await fetch(`/api/ramp/sync-history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.syncLogs);
        setTotalCount(data.pagination.total);
        setHasMore(data.pagination.hasMore);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch sync history');
      }
    } catch (err) {
      setError('Network error fetching sync history');
      console.error('Error fetching sync history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryStats = async () => {
    try {
      const response = await fetch('/api/ramp/sync-history?limit=1000', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const logs = data.syncLogs;

        const summary: SyncSummary = {
          totalSyncs: logs.length,
          successfulSyncs: logs.filter((log: SyncLog) => log.status === 'success').length,
          failedSyncs: logs.filter((log: SyncLog) => log.status === 'failed').length,
          totalExpensesProcessed: logs.reduce(
            (sum: number, log: SyncLog) => sum + log.expense_count,
            0
          ),
          uniqueUsers: new Set(logs.map((log: SyncLog) => log.target_user_id)).size,
          avgSyncDuration:
            logs
              .filter((log: SyncLog) => log.sync_duration_ms)
              .reduce(
                (sum: number, log: SyncLog, _index: number, arr: SyncLog[]) =>
                  sum + log.sync_duration_ms! / arr.length,
                0
              ) || 0,
        };

        setSummary(summary);
      }
    } catch (err) {
      console.error('Error fetching summary stats:', err);
    }
  };

  const handleFilterChange = () => {
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setTargetUserId('');
    setSyncMonth('');
    setStatus('');
    setPage(0);
  };

  // Helper to check if a sync is a re-sync (multiple successful syncs for same user/month)
  const isResync = (log: SyncLog): boolean => {
    if (log.status !== 'success') return false;

    const duplicates = syncLogs.filter(
      otherLog =>
        otherLog.target_user_id === log.target_user_id &&
        otherLog.sync_month === log.sync_month &&
        otherLog.status === 'success' &&
        otherLog.id !== log.id
    );

    return duplicates.length > 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" fontSize="small" />;
      case 'failed':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'started':
        return <PendingIcon color="warning" fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusChip = (status: string) => {
    const colors = {
      success: 'success' as const,
      failed: 'error' as const,
      started: 'warning' as const,
    };

    const statusIcon = getStatusIcon(status);

    return (
      <Chip
        icon={statusIcon || undefined}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={colors[status as keyof typeof colors]}
        size="small"
      />
    );
  };

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="Ramp Sync History"
      breadcrumbs={[{ label: 'Ramp', href: '/ramp-expense-sync' }, { label: 'Sync History' }]}
    >
      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div">
                  {summary.totalSyncs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Syncs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" color="success.main">
                  {summary.successfulSyncs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successful Syncs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div">
                  {summary.totalExpensesProcessed.toLocaleString('en-US')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expenses Processed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Missing Syncs Section */}
      {syncMonth && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <ErrorIcon color="warning" />
              Users Who Haven&apos;t Synced -{' '}
              {getLast12Months().find(m => m.value === syncMonth)?.label}
            </Typography>
            {getUsersWithoutSyncs(syncMonth).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <SuccessIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body1" color="success.main">
                  All users have synced for this month! 🎉
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {getUsersWithoutSyncs(syncMonth).map(user => (
                  <Grid item xs={12} sm={6} md={4} key={user.ramp_user_id}>
                    <Card
                      variant="outlined"
                      sx={{ backgroundColor: 'warning.light', opacity: 0.8 }}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <ErrorIcon color="warning" fontSize="small" />
                          <Typography variant="subtitle2" fontWeight="bold">
                            {user.ramp_user_name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {user.ramp_user_email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          ID: {user.ramp_user_id}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          sx={{ mt: 1 }}
                          onClick={() => {
                            setTargetUserId(user.ramp_user_id);
                            setSyncMonth('');
                            setStatus('');
                          }}
                        >
                          View User History
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Target User</InputLabel>
                <Select
                  value={targetUserId}
                  label="Target User"
                  onChange={e => setTargetUserId(e.target.value)}
                >
                  <MenuItem value="">All Users</MenuItem>
                  {userMappings.map(mapping => (
                    <MenuItem key={mapping.ramp_user_id} value={mapping.ramp_user_id}>
                      {mapping.ramp_user_name} ({mapping.ramp_user_email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sync Month</InputLabel>
                <Select
                  value={syncMonth}
                  label="Sync Month"
                  onChange={e => setSyncMonth(e.target.value)}
                >
                  <MenuItem value="">All Months</MenuItem>
                  {getLast12Months().map(month => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={e => setStatus(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="started">Started</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={handleFilterChange} size="small">
                  Apply
                </Button>
                <Button variant="text" onClick={clearFilters} size="small">
                  Clear
                </Button>
                <IconButton onClick={fetchSyncHistory} size="small" title="Refresh">
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Sync History Table */}
      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Sync History ({totalCount} total)</Typography>
            <Typography variant="body2" color="text.secondary">
              Page {page + 1} • {syncLogs.length} of {totalCount} results
            </Typography>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Synced By</TableCell>
                  <TableCell>Target User</TableCell>
                  <TableCell>Month</TableCell>
                  <TableCell>Sheet Tab</TableCell>
                  <TableCell>Expenses</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Clients</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {syncLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        {loading ? 'Loading...' : 'No sync history found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  syncLogs.map(log => (
                    <TableRow key={log.id} hover>
                      <TableCell>{getStatusChip(log.status)}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {log.sync_user_name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.sync_user_id === 'anonymous' ? 'No auth' : log.sync_user_id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {log.target_user_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.target_user_id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{log.sync_month}</Typography>
                          {isResync(log) && (
                            <Tooltip title="Re-sync: Multiple syncs exist for this user/month">
                              <Chip
                                icon={<SyncIcon />}
                                label="Re-sync"
                                color="warning"
                                variant="outlined"
                                size="small"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {log.sheet_tab_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.expense_count}</TableCell>
                      <TableCell>{formatCurrency(log.total_amount)}</TableCell>
                      <TableCell>{log.unique_clients_count}</TableCell>
                      <TableCell>
                        <Chip label={log.sync_type} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        {log.sync_duration_ms
                          ? `${(log.sync_duration_ms / 1000).toFixed(1)}s`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {format(new Date(log.created_at), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Open Google Sheet">
                          <IconButton
                            size="small"
                            onClick={() => window.open(log.google_sheet_url, '_blank')}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {syncLogs.length > 0 && (
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}
            >
              <Button variant="outlined" onClick={() => setPage(page - 1)} disabled={page === 0}>
                Previous
              </Button>
              <Typography variant="body2" color="text.secondary">
                Showing {page * pageSize + 1}-{page * pageSize + syncLogs.length} of {totalCount}
              </Typography>
              <Button variant="outlined" onClick={() => setPage(page + 1)} disabled={!hasMore}>
                Next
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </IntercomLayout>
  );
};

export default RampSyncHistory;
