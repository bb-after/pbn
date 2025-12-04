import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  ButtonGroup,
  Button,
  TableSortLabel,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Person as PersonIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { green, orange, red } from '@mui/material/colors';

export interface UserAnalyticsData {
  user_id: number;
  user_name: string;
  user_email?: string;
  daily_submissions: number;
  weekly_submissions: number;
  monthly_submissions: number;
  total_submissions: number;
  last_submission: string | null;
  avg_daily: number;
}

interface UserAnalyticsTableProps {
  productName: string;
  apiEndpoint: string;
  onClose?: () => void;
}

type TimeFilter = 'day' | 'week' | 'month' | 'all';
type SortField = 'user_name' | 'daily_submissions' | 'weekly_submissions' | 'monthly_submissions' | 'total_submissions' | 'last_submission';
type SortOrder = 'asc' | 'desc';

export const UserAnalyticsTable: React.FC<UserAnalyticsTableProps> = ({
  productName,
  apiEndpoint,
  onClose
}) => {
  const [data, setData] = useState<UserAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [sortField, setSortField] = useState<SortField>('weekly_submissions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    fetchData();
  }, [apiEndpoint]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch user analytics data');
      }
      const result = await response.json();
      setData(result.data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getDisplayValue = (user: UserAnalyticsData, filter: TimeFilter) => {
    switch (filter) {
      case 'day': return user.daily_submissions;
      case 'week': return user.weekly_submissions;
      case 'month': return user.monthly_submissions;
      case 'all': return user.total_submissions;
    }
  };

  const getSortValue = (user: UserAnalyticsData, field: SortField) => {
    switch (field) {
      case 'user_name': return user.user_name.toLowerCase();
      case 'daily_submissions': return user.daily_submissions;
      case 'weekly_submissions': return user.weekly_submissions;
      case 'monthly_submissions': return user.monthly_submissions;
      case 'total_submissions': return user.total_submissions;
      case 'last_submission': return user.last_submission ? new Date(user.last_submission).getTime() : 0;
      default: return 0;
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = getSortValue(a, sortField);
    const bVal = getSortValue(b, sortField);
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const getActivityLevel = (value: number, maxValue: number) => {
    if (maxValue === 0) return 'inactive';
    const percentage = (value / maxValue) * 100;
    if (percentage >= 75) return 'high';
    if (percentage >= 25) return 'medium';
    if (percentage > 0) return 'low';
    return 'inactive';
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return green[600];
      case 'medium': return orange[600];
      case 'low': return orange[400];
      case 'inactive': return red[400];
    }
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const maxValue = Math.max(...data.map(user => getDisplayValue(user, timeFilter)));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography>Loading {productName} analytics...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          {productName} User Analytics
        </Typography>
        <ButtonGroup variant="outlined" size="small">
          <Button 
            variant={timeFilter === 'day' ? 'contained' : 'outlined'}
            onClick={() => setTimeFilter('day')}
          >
            Today
          </Button>
          <Button 
            variant={timeFilter === 'week' ? 'contained' : 'outlined'}
            onClick={() => setTimeFilter('week')}
          >
            Last 7 Days
          </Button>
          <Button 
            variant={timeFilter === 'month' ? 'contained' : 'outlined'}
            onClick={() => setTimeFilter('month')}
          >
            Last 30 Days
          </Button>
          <Button 
            variant={timeFilter === 'all' ? 'contained' : 'outlined'}
            onClick={() => setTimeFilter('all')}
          >
            All Time
          </Button>
        </ButtonGroup>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'user_name'}
                  direction={sortField === 'user_name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('user_name')}
                >
                  User
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'daily_submissions'}
                  direction={sortField === 'daily_submissions' ? sortOrder : 'desc'}
                  onClick={() => handleSort('daily_submissions')}
                >
                  Today
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'weekly_submissions'}
                  direction={sortField === 'weekly_submissions' ? sortOrder : 'desc'}
                  onClick={() => handleSort('weekly_submissions')}
                >
                  Last 7 Days
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'monthly_submissions'}
                  direction={sortField === 'monthly_submissions' ? sortOrder : 'desc'}
                  onClick={() => handleSort('monthly_submissions')}
                >
                  Last 30 Days
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'total_submissions'}
                  direction={sortField === 'total_submissions' ? sortOrder : 'desc'}
                  onClick={() => handleSort('total_submissions')}
                >
                  All Time
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'last_submission'}
                  direction={sortField === 'last_submission' ? sortOrder : 'desc'}
                  onClick={() => handleSort('last_submission')}
                >
                  Last Activity
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Activity Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((user) => {
              const currentValue = getDisplayValue(user, timeFilter);
              const activityLevel = getActivityLevel(currentValue, maxValue);
              
              return (
                <TableRow key={user.user_id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {user.user_name}
                        </Typography>
                        {user.user_email && (
                          <Typography variant="caption" color="textSecondary">
                            {user.user_email}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      fontWeight={timeFilter === 'day' ? 700 : 400}
                      color={timeFilter === 'day' ? 'primary' : 'inherit'}
                    >
                      {user.daily_submissions}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      fontWeight={timeFilter === 'week' ? 700 : 400}
                      color={timeFilter === 'week' ? 'primary' : 'inherit'}
                    >
                      {user.weekly_submissions}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      fontWeight={timeFilter === 'month' ? 700 : 400}
                      color={timeFilter === 'month' ? 'primary' : 'inherit'}
                    >
                      {user.monthly_submissions}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      fontWeight={timeFilter === 'all' ? 700 : 400}
                      color={timeFilter === 'all' ? 'primary' : 'inherit'}
                    >
                      {user.total_submissions}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatLastActivity(user.last_submission)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<TrendingUpIcon />}
                      label={activityLevel.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: `${getActivityColor(activityLevel)}20`,
                        color: getActivityColor(activityLevel),
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {data.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="textSecondary">
            No user activity data available for {productName}
          </Typography>
        </Box>
      )}
    </Box>
  );
};