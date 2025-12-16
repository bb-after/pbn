import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  CircularProgress,
  FormControlLabel,
  Switch,
  Grid,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Stack,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloudIcon from '@mui/icons-material/Cloud';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FilterListIcon from '@mui/icons-material/FilterList';
import axios from 'axios';
import { IntercomLayout } from '../components/ui';
import { GetServerSideProps } from 'next';
import { requireServerAuth, AuthUser } from '../utils/serverAuth';

interface MonitoredCity {
  id: number;
  city_name: string;
  state_code: string;
  country_code: string;
  latitude: number;
  longitude: number;
  client_id?: number;
  slack_channel: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface WeatherAlert {
  alert_id: string;
  alert_type: string;
  alert_title: string;
  alert_description: string;
  severity: string;
  expires_at?: string;
  sent_at: string;
  slack_channel: string;
}

interface WeatherKeyword {
  id: number;
  keyword: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CityFormData {
  city_name: string;
  state_code: string;
  country_code: string;
  latitude: number | string;
  longitude: number | string;
  client_id: number | string;
  slack_channel: string;
  active: boolean;
}

const initialFormData: CityFormData = {
  city_name: '',
  state_code: '',
  country_code: 'US',
  latitude: '',
  longitude: '',
  client_id: '',
  slack_channel: 'weather-alerts',
  active: true,
};

interface Props {
  user: AuthUser;
}

export default function WeatherMonitor({ user }: Props) {
  const [cities, setCities] = useState<MonitoredCity[]>([]);
  const [keywords, setKeywords] = useState<WeatherKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<MonitoredCity | null>(null);
  const [editingKeyword, setEditingKeyword] = useState<WeatherKeyword | null>(null);
  const [formData, setFormData] = useState<CityFormData>(initialFormData);
  const [keywordFormData, setKeywordFormData] = useState({ keyword: '', description: '', active: true });
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [selectedCityAlerts, setSelectedCityAlerts] = useState<WeatherAlert[]>([]);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    fetchCities();
    fetchKeywords();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await axios.get('/api/weather/cities');
      setCities(response.data.cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setSnackbar({ open: true, message: 'Error fetching cities', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchKeywords = async () => {
    try {
      const response = await axios.get('/api/weather/keywords');
      setKeywords(response.data.keywords);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      setSnackbar({ open: true, message: 'Error fetching keywords', severity: 'error' });
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleOpenDialog = (city?: MonitoredCity) => {
    if (city) {
      setEditingCity(city);
      setFormData({
        city_name: city.city_name,
        state_code: city.state_code,
        country_code: city.country_code,
        latitude: city.latitude,
        longitude: city.longitude,
        client_id: city.client_id || '',
        slack_channel: city.slack_channel,
        active: city.active,
      });
    } else {
      setEditingCity(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCity(null);
    setFormData(initialFormData);
  };

  const handleGeocode = async () => {
    if (!formData.city_name || !formData.state_code) {
      setSnackbar({ open: true, message: 'Please enter city name and state code first', severity: 'error' });
      return;
    }

    setGeocoding(true);
    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const query = encodeURIComponent(`${formData.city_name}, ${formData.state_code}, US`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=us`);
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setFormData({
          ...formData,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        });
        setSnackbar({ open: true, message: 'Coordinates found successfully', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Location not found. Please check city name and state code.', severity: 'error' });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSnackbar({ open: true, message: 'Error finding coordinates', severity: 'error' });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.latitude || !formData.longitude) {
      setSnackbar({ open: true, message: 'Please get coordinates first by clicking "Get Coordinates"', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        client_id: formData.client_id ? Number(formData.client_id) : null,
      };

      if (editingCity) {
        await axios.put(`/api/weather/cities?id=${editingCity.id}`, payload);
        setSnackbar({ open: true, message: 'City updated successfully', severity: 'success' });
      } else {
        await axios.post('/api/weather/cities', payload);
        setSnackbar({ open: true, message: 'City added successfully', severity: 'success' });
      }

      fetchCities();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving city:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.error || 'Error saving city', 
        severity: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (city: MonitoredCity) => {
    if (!confirm(`Are you sure you want to delete monitoring for ${city.city_name}, ${city.state_code}?`)) {
      return;
    }

    try {
      await axios.delete(`/api/weather/cities?id=${city.id}`);
      setSnackbar({ open: true, message: 'City deleted successfully', severity: 'success' });
      fetchCities();
    } catch (error) {
      console.error('Error deleting city:', error);
      setSnackbar({ open: true, message: 'Error deleting city', severity: 'error' });
    }
  };

  const handleCheckAlerts = async () => {
    setCheckingAlerts(true);
    try {
      const response = await axios.post('/api/weather/check-alerts');
      const { results } = response.data;
      setSnackbar({ 
        open: true, 
        message: `Alert check completed. ${results.alertsSent} new alerts sent from ${results.alertsFound} total alerts found.`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error checking alerts:', error);
      setSnackbar({ open: true, message: 'Error checking alerts', severity: 'error' });
    } finally {
      setCheckingAlerts(false);
    }
  };

  const handleViewAlerts = async (city: MonitoredCity) => {
    try {
      const response = await axios.get(`/api/weather/cities/${city.id}`);
      setSelectedCityAlerts(response.data.recentAlerts);
      setSelectedCityName(`${city.city_name}, ${city.state_code}`);
      setAlertsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching city alerts:', error);
      setSnackbar({ open: true, message: 'Error fetching alerts', severity: 'error' });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'extreme': return 'error';
      case 'severe': return 'warning';
      case 'moderate': return 'info';
      case 'minor': return 'success';
      default: return 'default';
    }
  };

  const handleOpenKeywordDialog = (keyword?: WeatherKeyword) => {
    if (keyword) {
      setEditingKeyword(keyword);
      setKeywordFormData({
        keyword: keyword.keyword,
        description: keyword.description || '',
        active: keyword.active,
      });
    } else {
      setEditingKeyword(null);
      setKeywordFormData({ keyword: '', description: '', active: true });
    }
    setKeywordDialogOpen(true);
  };

  const handleKeywordSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingKeyword) {
        await axios.put(`/api/weather/keywords?id=${editingKeyword.id}`, keywordFormData);
        setSnackbar({ open: true, message: 'Keyword updated successfully', severity: 'success' });
      } else {
        await axios.post('/api/weather/keywords', keywordFormData);
        setSnackbar({ open: true, message: 'Keyword added successfully', severity: 'success' });
      }

      fetchKeywords();
      setKeywordDialogOpen(false);
      setEditingKeyword(null);
      setKeywordFormData({ keyword: '', description: '', active: true });
    } catch (error: any) {
      console.error('Error saving keyword:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.error || 'Error saving keyword', 
        severity: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKeyword = async (keyword: WeatherKeyword) => {
    if (!confirm(`Are you sure you want to delete the keyword "${keyword.keyword}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/weather/keywords?id=${keyword.id}`);
      setSnackbar({ open: true, message: 'Keyword deleted successfully', severity: 'success' });
      fetchKeywords();
    } catch (error) {
      console.error('Error deleting keyword:', error);
      setSnackbar({ open: true, message: 'Error deleting keyword', severity: 'error' });
    }
  };

  return (
    <IntercomLayout
      title="Weather Monitor"
      breadcrumbs={[
        { label: 'Weather Monitor' },
      ]}
    >
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Weather Monitor
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={checkingAlerts ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleCheckAlerts}
              disabled={checkingAlerts}
            >
              {checkingAlerts ? 'Checking...' : 'Check Alerts Now'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add City
            </Button>
          </Stack>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, value) => setCurrentTab(value)}>
            <Tab label="Cities" />
            <Tab label="Alert Keywords" />
          </Tabs>
        </Paper>

        {currentTab === 0 && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Cities
                    </Typography>
                    <Typography variant="h4">
                      {cities.length}
                    </Typography>
                  </Box>
                  <LocationOnIcon color="primary" sx={{ fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Active Cities
                    </Typography>
                    <Typography variant="h4">
                      {cities.filter(c => c.active).length}
                    </Typography>
                  </Box>
                  <NotificationsIcon color="success" sx={{ fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Cities Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>City</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Slack Channel</TableCell>
                  <TableCell>Client ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : cities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No cities configured for monitoring
                    </TableCell>
                  </TableRow>
                ) : (
                  cities.map((city) => (
                    <TableRow key={city.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {city.city_name}, {city.state_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {Number(city.latitude).toFixed(4)}, {Number(city.longitude).toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          #{city.slack_channel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {city.client_id || '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={city.active ? 'Active' : 'Inactive'}
                          color={city.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(city.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Recent Alerts">
                            <IconButton size="small" onClick={() => handleViewAlerts(city)}>
                              <NotificationsIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit City">
                            <IconButton size="small" onClick={() => handleOpenDialog(city)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete City">
                            <IconButton size="small" color="error" onClick={() => handleDelete(city)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        </>
        )}

        {currentTab === 1 && (
          <>
            {/* Keywords Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5" component="h2">
                <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Alert Keywords
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setKeywordDialogOpen(true)}
              >
                Add Keyword
              </Button>
            </Box>

            {/* Keywords Table */}
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Keyword</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keywordsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : keywords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No keywords configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      keywords.map((keyword) => (
                        <TableRow key={keyword.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                              "{keyword.keyword}"
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {keyword.description || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={keyword.active ? 'Active' : 'Inactive'}
                              color={keyword.active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {new Date(keyword.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Edit Keyword">
                                <IconButton size="small" onClick={() => handleOpenKeywordDialog(keyword)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Keyword">
                                <IconButton size="small" color="error" onClick={() => handleDeleteKeyword(keyword)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* Add/Edit City Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCity ? 'Edit City' : 'Add New City'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="City Name"
                  fullWidth
                  value={formData.city_name}
                  onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="State Code"
                  fullWidth
                  value={formData.state_code}
                  onChange={(e) => setFormData({ ...formData, state_code: e.target.value.toUpperCase() })}
                  inputProps={{ maxLength: 2 }}
                  placeholder="MN"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={handleGeocode}
                  disabled={!formData.city_name || !formData.state_code || geocoding}
                  fullWidth
                  startIcon={geocoding ? <CircularProgress size={16} /> : undefined}
                  sx={{ mb: 2 }}
                >
                  {geocoding ? 'Getting Coordinates...' : 'Get Coordinates'}
                </Button>
                {formData.latitude && formData.longitude && (
                  <Typography variant="body2" color="textSecondary" textAlign="center">
                    Coordinates: {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Slack Channel"
                  fullWidth
                  value={formData.slack_channel}
                  onChange={(e) => setFormData({ ...formData, slack_channel: e.target.value.replace('#', '') })}
                  required
                  helperText="Channel name without the # symbol"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Client ID (Optional)"
                  fullWidth
                  type="number"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting || !formData.city_name || !formData.state_code || !formData.slack_channel || !formData.latitude || !formData.longitude}
            >
              {submitting ? <CircularProgress size={20} /> : editingCity ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Recent Alerts Dialog */}
        <Dialog open={alertsDialogOpen} onClose={() => setAlertsDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Recent Alerts for {selectedCityName}
          </DialogTitle>
          <DialogContent>
            {selectedCityAlerts.length === 0 ? (
              <Alert severity="info">No recent alerts found for this city.</Alert>
            ) : (
              <Stack spacing={2}>
                {selectedCityAlerts.map((alert, index) => (
                  <Paper key={index} sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Chip
                          label={alert.severity}
                          color={getSeverityColor(alert.severity) as any}
                          size="small"
                        />
                        <Typography variant="body2" color="textSecondary">
                          {new Date(alert.sent_at).toLocaleString()}
                        </Typography>
                        {alert.expires_at && (
                          <Typography variant="body2" color="textSecondary">
                            Expires: {new Date(alert.expires_at).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="h6">{alert.alert_title}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Type: {alert.alert_type}
                      </Typography>
                      <Typography variant="body2">
                        {alert.alert_description}
                      </Typography>
                      <Divider />
                      <Typography variant="caption" color="textSecondary">
                        Sent to #{alert.slack_channel} • Alert ID: {alert.alert_id}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAlertsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Keyword Dialog */}
        <Dialog open={keywordDialogOpen} onClose={() => setKeywordDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingKeyword ? 'Edit Keyword' : 'Add New Keyword'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Keyword"
                  fullWidth
                  value={keywordFormData.keyword}
                  onChange={(e) => setKeywordFormData({ ...keywordFormData, keyword: e.target.value })}
                  required
                  placeholder="winter storm"
                  helperText="Enter the keyword to search for in weather alerts"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description (Optional)"
                  fullWidth
                  value={keywordFormData.description}
                  onChange={(e) => setKeywordFormData({ ...keywordFormData, description: e.target.value })}
                  placeholder="Describe when this keyword should trigger alerts"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={keywordFormData.active}
                      onChange={(e) => setKeywordFormData({ ...keywordFormData, active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setKeywordDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleKeywordSubmit}
              variant="contained"
              disabled={submitting || !keywordFormData.keyword.trim()}
            >
              {submitting ? <CircularProgress size={20} /> : editingKeyword ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </IntercomLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const authResult = await requireServerAuth(context);
  if ('redirect' in authResult) {
    return authResult;
  }

  return {
    props: {
      user: authResult.props.user,
    },
  };
};