import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import GeoAnalysisForm, { GeoAnalysisFormData } from './GeoAnalysisForm';
import useValidateUserToken from '../hooks/useValidateUserToken';
import axios from 'axios';

interface ScheduleData {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc. (for weekly)
  dayOfMonth?: number; // 1-31 (for monthly)
  time: string; // HH:mm format
  timezone: string;
  isActive: boolean;
}

interface GeoScheduleFormData extends GeoAnalysisFormData {
  schedule: ScheduleData;
}

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly (Testing)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function GeoScheduler() {
  const { token } = useValidateUserToken();
  const router = useRouter();
  const [formData, setFormData] = useState<GeoScheduleFormData>({
    clientName: '',
    keyword: '',
    analysisType: 'brand',
    intentCategory: '',
    customPrompt: '',
    selectedEngines: [],
    schedule: {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      dayOfMonth: 1,
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isActive: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load existing schedule data if editing
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (router.query.edit && token) {
        setEditingId(router.query.edit as string);
        setLoading(true);
        setError(null);

        try {
          // Fetch the schedule data from the server
          const response = await axios.get(`/api/geo-schedules?userToken=${token}`);
          const schedules = response.data.schedules;

          // Find the schedule we're editing
          const scheduleToEdit = schedules.find((s: any) => s.id.toString() === router.query.edit);

          if (!scheduleToEdit) {
            setError('Schedule not found or you do not have permission to edit it');
            return;
          }

          // Set form data from the fetched schedule
          setFormData({
            clientName: scheduleToEdit.client_name,
            keyword: scheduleToEdit.keyword,
            analysisType: scheduleToEdit.analysis_type,
            intentCategory: scheduleToEdit.intent_category,
            customPrompt: scheduleToEdit.custom_prompt,
            selectedEngines: scheduleToEdit.selected_engine_ids,
            schedule: {
              frequency: scheduleToEdit.frequency,
              dayOfWeek: scheduleToEdit.day_of_week,
              dayOfMonth: scheduleToEdit.day_of_month,
              time: scheduleToEdit.time_of_day,
              timezone: scheduleToEdit.timezone,
              isActive: scheduleToEdit.is_active,
            },
          });
        } catch (err: any) {
          console.error('Error fetching schedule data:', err);
          setError('Failed to load schedule data');
        } finally {
          setLoading(false);
        }
      }
    };

    if (router.query.edit && token) {
      fetchScheduleData();
    }
  }, [router.query.edit, token]);

  const handleAnalysisFormChange = (analysisData: GeoAnalysisFormData) => {
    setFormData(prev => ({
      ...prev,
      ...analysisData,
    }));
  };

  const handleScheduleChange = (scheduleUpdates: Partial<ScheduleData>) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        ...scheduleUpdates,
      },
    }));
  };

  const getNextRunDate = () => {
    const now = new Date();
    const [hours, minutes] = formData.schedule.time.split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    switch (formData.schedule.frequency) {
      case 'hourly':
        if (nextRun <= now) {
          nextRun.setHours(nextRun.getHours() + 1);
        }
        break;
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'weekly':
        const targetDay = formData.schedule.dayOfWeek || 1;
        const currentDay = nextRun.getDay();
        let daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && nextRun <= now) {
          daysToAdd = 7;
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        break;
      case 'monthly':
        nextRun.setDate(formData.schedule.dayOfMonth || 1);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  };

  const handleCreateSchedule = async () => {
    if (!token) {
      setError('User authentication required. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        // Update existing schedule
        const response = await axios.put('/api/geo-schedules', {
          id: editingId,
          ...formData,
          userToken: token,
        });

        setSuccess('Scheduled analysis updated successfully!');

        // Redirect back to schedule manager after successful update
        setTimeout(() => {
          router.push('/geo-schedule-manager');
        }, 2000);
      } else {
        // Create new schedule
        const response = await axios.post('/api/geo-schedules', {
          ...formData,
          userToken: token,
        });

        setSuccess('Scheduled analysis created successfully!');

        // Reset form after successful creation
        setFormData({
          clientName: '',
          keyword: '',
          analysisType: 'brand',
          intentCategory: '',
          customPrompt: '',
          selectedEngines: [],
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 1,
            dayOfMonth: 1,
            time: '09:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isActive: true,
          },
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Failed to create scheduled analysis');
      } else {
        setError('An error occurred while creating the schedule');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        {editingId ? 'Edit GEO Analysis Schedule' : 'GEO Analysis Scheduler'}
      </Typography>

      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        {editingId
          ? 'Edit your scheduled GEO analysis settings below and click "Update" to save changes.'
          : 'Set up recurring GEO analyses to track keyword performance and sentiment changes over time.'}
      </Typography>

      {editingId && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Editing Schedule #{editingId}</strong> - Make your changes below and click
            &quot;Update Scheduled Analysis&quot; to save, or &quot;Cancel&quot; to return without
            saving.
          </Typography>
        </Alert>
      )}

      <GeoAnalysisForm
        data={formData}
        onChange={handleAnalysisFormChange}
        showSubmitButton={false}
        title="Analysis Configuration"
        disabled={loading}
      />

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Schedule Configuration
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.schedule.frequency}
                  onChange={e => handleScheduleChange({ frequency: e.target.value as any })}
                  label="Frequency"
                  disabled={loading}
                >
                  {FREQUENCY_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {formData.schedule.frequency === 'weekly' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Day of Week</InputLabel>
                  <Select
                    value={formData.schedule.dayOfWeek || 1}
                    onChange={e => handleScheduleChange({ dayOfWeek: Number(e.target.value) })}
                    label="Day of Week"
                    disabled={loading}
                  >
                    {DAY_OF_WEEK_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {formData.schedule.frequency === 'monthly' && (
              <Grid item xs={12} md={4}>
                <TextField
                  label="Day of Month"
                  type="number"
                  value={formData.schedule.dayOfMonth || 1}
                  onChange={e => handleScheduleChange({ dayOfMonth: Number(e.target.value) })}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 1, max: 31 }}
                  disabled={loading}
                />
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <TextField
                label="Time"
                type="time"
                value={formData.schedule.time}
                onChange={e => handleScheduleChange({ time: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Timezone"
                value={formData.schedule.timezone}
                onChange={e => handleScheduleChange({ timezone: e.target.value })}
                fullWidth
                margin="normal"
                disabled={loading}
                helperText="Auto-detected from your browser"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.schedule.isActive}
                      onChange={e => handleScheduleChange({ isActive: e.target.checked })}
                      disabled={loading}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        Schedule Active
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formData.schedule.isActive
                          ? 'This schedule will run automatically at the specified times'
                          : 'This schedule is paused and will not run automatically'}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Grid>
          </Grid>

          {/* Next Run Preview */}
          <Card sx={{ mt: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📅 Next Scheduled Run
              </Typography>
              <Typography variant="body1">
                {getNextRunDate().toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Analysis will run automatically and results will be stored in your history.
              </Typography>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 4 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {editingId && (
          <Button
            variant="outlined"
            size="large"
            onClick={() => router.push('/geo-schedule-manager')}
            disabled={loading}
            sx={{ minWidth: 150 }}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={handleCreateSchedule}
          disabled={
            loading ||
            !formData.clientName.trim() ||
            !formData.keyword.trim() ||
            !formData.intentCategory ||
            formData.selectedEngines.length === 0
          }
          sx={{ minWidth: 250 }}
        >
          {loading
            ? editingId
              ? 'Updating Schedule...'
              : 'Creating Schedule...'
            : editingId
              ? 'Update Scheduled Analysis'
              : 'Create Scheduled Analysis'}
        </Button>
      </Box>
    </Box>
  );
}
