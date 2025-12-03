import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Avatar,
  Button,
  TextField,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Chat as SlackIcon,
  Description as BioIcon,
  Schedule as ScheduleIcon,
  Palette as ThemeIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import axios from 'axios';
import { GetServerSideProps } from 'next';
import { requireServerAuth, AuthUser } from '../utils/serverAuth';
import {
  useToast,
  IntercomLayout,
  IntercomButton,
  IntercomCard,
  ToastProvider,
} from 'components/ui';
import { useThemeMode } from '../contexts/ThemeContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  slack_handle?: string;
  phone?: string;
  department?: string;
  location?: string;
  bio?: string;
  theme_preference?: 'light' | 'dark';
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  is_active?: boolean;
}

interface ProfilePageProps {
  user: AuthUser;
}

function ProfilePageContent({ user }: ProfilePageProps) {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { setMode } = useThemeMode();

  // State for user profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch enhanced profile data from API
      const response = await axios.get('/api/users/profile', {
        headers: {
          'x-auth-token': token,
        },
      });

      const userData = response.data;
      const profileData: UserProfile = {
        id: userData.id || '',
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'staff',
        slack_handle: userData.slack_handle || '',
        phone: userData.phone || '',
        department: userData.department || '',
        location: userData.location || '',
        bio: userData.bio || '',
        theme_preference: userData.theme_preference || 'light',
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_login: userData.last_login,
        is_active: userData.is_active,
      };

      setProfile(profileData);
      setEditForm(profileData);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Fallback to basic user data from token validation if API fails
      const profileData: UserProfile = {
        id: user?.id?.toString() || '',
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'staff',
        theme_preference: 'light',
      };
      setProfile(profileData);
      setEditForm(profileData);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setEditForm(profile || {});
      setIsEditing(false);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle save profile
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Make API call to update the profile
      const updateData = {
        name: editForm.name,
        slack_handle: editForm.slack_handle,
        phone: editForm.phone,
        department: editForm.department,
        location: editForm.location,
        bio: editForm.bio,
        theme_preference: editForm.theme_preference,
      };

      await axios.put('/api/users/profile', updateData, {
        headers: {
          'x-auth-token': token,
        },
      });

      const updatedProfile = {
        ...profile!,
        ...editForm,
      };
      setProfile(updatedProfile);

      // Update the theme context if theme preference changed
      if (editForm.theme_preference && editForm.theme_preference !== profile?.theme_preference) {
        setMode(editForm.theme_preference as 'light' | 'dark');
      }

      setIsEditing(false);
      showSuccess('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Get role chip color
  const getRoleChipColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      case 'staff':
      default:
        return 'primary';
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  if (error) {
    return (
      <IntercomLayout title="Profile" breadcrumbs={[{ label: 'Profile' }]}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </IntercomLayout>
    );
  }

  if (!profile) {
    return (
      <IntercomLayout title="Profile" breadcrumbs={[{ label: 'Profile' }]}>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </IntercomLayout>
    );
  }

  return (
    <IntercomLayout
      title="My Profile"
      breadcrumbs={[{ label: 'Profile' }]}
      actions={
        <IntercomButton
          variant={isEditing ? 'secondary' : 'primary'}
          leftIcon={isEditing ? <CancelIcon /> : <EditIcon />}
          onClick={handleEditToggle}
          disabled={saving}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </IntercomButton>
      }
    >
      <Grid container spacing={3}>
        {/* Profile Header */}
        <Grid item xs={12}>
          <IntercomCard>
            <Box p={3}>
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                  }}
                >
                  {getUserInitials(profile.name)}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h4" gutterBottom>
                    {profile.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {profile.email}
                  </Typography>
                  <Box display="flex" gap={1} alignItems="center">
                    <Chip
                      label={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                      color={getRoleChipColor(profile.role)}
                      size="small"
                      icon={profile.role === 'admin' ? <AdminIcon /> : <WorkIcon />}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </IntercomCard>
        </Grid>

        {/* Profile Details */}
        <Grid item xs={12} md={8}>
          <IntercomCard>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={isEditing ? editForm.name || '' : profile.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={profile.email}
                    disabled
                    helperText="Email cannot be changed"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Slack Handle */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Slack Handle"
                    value={isEditing ? editForm.slack_handle || '' : profile.slack_handle || ''}
                    onChange={e => handleInputChange('slack_handle', e.target.value)}
                    disabled={!isEditing}
                    placeholder="@username"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SlackIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Phone */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={isEditing ? editForm.phone || '' : profile.phone || ''}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    placeholder="+1 (555) 123-4567"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Department */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={isEditing ? editForm.department || '' : profile.department || ''}
                    onChange={e => handleInputChange('department', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Engineering, Marketing, etc."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Location */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={isEditing ? editForm.location || '' : profile.location || ''}
                    onChange={e => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                    placeholder="City, State/Country"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Bio */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    value={isEditing ? editForm.bio || '' : profile.bio || ''}
                    onChange={e => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    multiline
                    rows={3}
                    placeholder="Tell us about yourself..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <BioIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Theme Preference */}
                <Grid item xs={12} sm={6}>
                  {isEditing ? (
                    <FormControl fullWidth>
                      <InputLabel>Theme Preference</InputLabel>
                      <Select
                        value={editForm.theme_preference || 'light'}
                        label="Theme Preference"
                        onChange={e => handleInputChange('theme_preference', e.target.value)}
                      >
                        <MenuItem value="light">
                          <ListItemIcon>
                            <LightModeIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Light Mode" />
                        </MenuItem>
                        <MenuItem value="dark">
                          <ListItemIcon>
                            <DarkModeIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Dark Mode" />
                        </MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label="Theme Preference"
                      value={profile.theme_preference === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {profile.theme_preference === 'dark' ? (
                              <DarkModeIcon />
                            ) : (
                              <LightModeIcon />
                            )}
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                    disabled
                    helperText="Role is managed by administrators"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {profile.role === 'admin' ? <AdminIcon /> : <WorkIcon />}
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Save/Cancel buttons when editing */}
                {isEditing && (
                  <Grid item xs={12}>
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button variant="outlined" onClick={handleEditToggle} disabled={saving}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </IntercomCard>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12} md={4}>
          <IntercomCard>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Role
                  </Typography>
                  <Typography variant="body1">
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    User ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {profile.id}
                  </Typography>
                </Box>

                {profile.created_at && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Member Since
                    </Typography>
                    <Typography variant="body1">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                {profile.last_login && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last Login
                    </Typography>
                    <Typography variant="body1">
                      {new Date(profile.last_login).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: profile.is_active ? 'success.main' : 'error.main',
                      fontWeight: 500,
                    }}
                  >
                    {profile.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function ProfilePage({ user }: ProfilePageProps) {
  return (
    <ToastProvider>
      <ProfilePageContent user={user} />
    </ToastProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await requireServerAuth(context);
};
