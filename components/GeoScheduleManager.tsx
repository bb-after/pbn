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
  Button,
  IconButton,
  Switch,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import useAuth from '../hooks/useAuth';
import axios from 'axios';

interface ScheduledAnalysis {
  id: number;
  client_name: string;
  keyword: string;
  analysis_type: 'brand' | 'individual';
  intent_category: string;
  custom_prompt: string;
  selected_engine_ids: number[];
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  timezone: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at: string;
  run_count: number;
  created_at: string;
  updated_at: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function GeoScheduleManager() {
  const { token, isLoading } = useAuth('/login');
  const [schedules, setSchedules] = useState<ScheduledAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledAnalysis | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchSchedules = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/geo-schedules?userToken=${token}`);
      setSchedules(response.data.schedules);
    } catch (err) {
      setError('Failed to load scheduled analyses');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && token) {
      fetchSchedules();
    }
  }, [isLoading, token]);

  const getFrequencyDisplay = (schedule: ScheduledAnalysis) => {
    const time = new Date(`2000-01-01T${schedule.time_of_day}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    switch (schedule.frequency) {
      case 'hourly':
        return `Hourly (every hour at minute ${time.split(':')[1]})`;
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const dayName = DAY_NAMES[schedule.day_of_week || 1];
        return `Weekly on ${dayName} at ${time}`;
      case 'monthly':
        return `Monthly on day ${schedule.day_of_month || 1} at ${time}`;
      default:
        return `${schedule.frequency} at ${time}`;
    }
  };

  const getNextRunDisplay = (nextRunAt: string) => {
    const nextRun = new Date(nextRunAt);
    const now = new Date();

    if (nextRun < now) {
      return 'Overdue';
    }

    const diffMs = nextRun.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Soon';
    }
  };

  const handleToggleActive = async (schedule: ScheduledAnalysis) => {
    if (!token) return;

    try {
      await axios.patch('/api/geo-schedules', {
        id: schedule.id,
        isActive: !schedule.is_active,
        userToken: token,
      });

      // Update the local state
      setSchedules(prev =>
        prev.map(s => (s.id === schedule.id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch (err) {
      console.error('Error toggling schedule status:', err);
      setError('Failed to update schedule status');
    }
  };

  const handleRunNow = async (schedule: ScheduledAnalysis) => {
    if (!token) return;

    try {
      setError(null);

      // Use the scheduled analysis execution endpoint which properly tracks runs and sends Slack notifications
      const response = await axios.post('/api/execute-scheduled-analysis', {
        scheduleId: schedule.id,
        userToken: token,
      });

      if (response.data.success) {
        alert(
          `✅ Analysis executed successfully!\n\nClient: ${schedule.client_name}\nKeyword: "${schedule.keyword}"\n\nRun count and next scheduled time have been updated. Check #geo-scheduled-runs Slack channel for details.`
        );

        // Refresh schedules to show updated run count and next run time
        fetchSchedules();
      } else {
        throw new Error(response.data.error || 'Analysis execution failed');
      }
    } catch (err: any) {
      console.error('Error executing scheduled analysis:', err);
      setError(`Failed to execute analysis: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleEdit = (schedule: ScheduledAnalysis) => {
    // Redirect to scheduler page with just the schedule ID
    window.location.href = `/geo-scheduler?edit=${schedule.id}`;
  };

  const handleDelete = async (schedule: ScheduledAnalysis) => {
    if (!confirm('Are you sure you want to delete this scheduled analysis?')) {
      return;
    }

    if (!token) return;

    try {
      await axios.delete('/api/geo-schedules', {
        data: {
          id: schedule.id,
          userToken: token,
        },
      });

      // Remove from local state
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete scheduled analysis');
    }
  };

  const handleViewDetails = (schedule: ScheduledAnalysis) => {
    setSelectedSchedule(schedule);
    setDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        Scheduled GEO Analyses
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">
              Active Schedules ({schedules.filter(s => s.is_active).length})
            </Typography>
            <Button variant="outlined" onClick={fetchSchedules} disabled={loading}>
              Refresh
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : schedules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No scheduled analyses found. Create your first schedule to get started!
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client & Keyword</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell>Runs</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map(schedule => (
                    <TableRow key={schedule.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {schedule.client_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {schedule.keyword}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={schedule.analysis_type}
                          size="small"
                          color={schedule.analysis_type === 'brand' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{getFrequencyDisplay(schedule)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {new Date(schedule.next_run_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getNextRunDisplay(schedule.next_run_at)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{schedule.run_count}</Typography>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={schedule.is_active}
                          onChange={() => handleToggleActive(schedule)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRunNow(schedule)}
                            title="Run Now"
                            color="primary"
                          >
                            <PlayArrowIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(schedule)}
                            title="View Details"
                          >
                            <HistoryIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(schedule)}
                            title="Edit"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(schedule)}
                            title="Delete"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Schedule Details Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Schedule Details: {selectedSchedule?.keyword} ({selectedSchedule?.client_name})
        </DialogTitle>
        <DialogContent>
          {selectedSchedule && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Analysis Type:</Typography>
                <Typography variant="body2">{selectedSchedule.analysis_type}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Intent Category:</Typography>
                <Typography variant="body2">{selectedSchedule.intent_category}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Frequency:</Typography>
                <Typography variant="body2">{getFrequencyDisplay(selectedSchedule)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Engines:</Typography>
                <Typography variant="body2">
                  {selectedSchedule.selected_engine_ids.length} engines
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Created:</Typography>
                <Typography variant="body2">
                  {new Date(selectedSchedule.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Last Run:</Typography>
                <Typography variant="body2">
                  {selectedSchedule.last_run_at
                    ? new Date(selectedSchedule.last_run_at).toLocaleDateString()
                    : 'Never'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Custom Prompt:</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    backgroundColor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                    mt: 0.5,
                  }}
                >
                  {selectedSchedule.custom_prompt}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
