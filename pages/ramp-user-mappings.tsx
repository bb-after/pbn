import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Chip,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { IntercomLayout } from '../components/layout/IntercomLayout';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserMapping {
  id: number;
  ramp_user_id: string;
  ramp_user_name: string;
  ramp_user_email: string;
  google_sheet_url: string;
  created_at: string;
  updated_at: string;
}

const RampUserMappings: React.FC = () => {
  const { token } = useValidateUserToken();
  const [users, setUsers] = useState<User[]>([]);
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<UserMapping | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchMappings();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/ramp/users-simple');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showAlert('error', 'Failed to fetch Ramp users');
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/ramp/user-mappings');
      if (response.ok) {
        const mappingData = await response.json();
        setMappings(mappingData);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      showAlert('error', 'Failed to fetch user mappings');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const openDialog = (mapping?: UserMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setSelectedUserId(mapping.ramp_user_id);
      setGoogleSheetUrl(mapping.google_sheet_url);
    } else {
      setEditingMapping(null);
      setSelectedUserId('');
      setGoogleSheetUrl('');
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMapping(null);
    setSelectedUserId('');
    setGoogleSheetUrl('');
  };

  const saveMapping = async () => {
    if (!selectedUserId || !googleSheetUrl) {
      showAlert('error', 'Please fill in all required fields');
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      showAlert('error', 'Selected user not found');
      return;
    }

    try {
      const response = await fetch('/api/ramp/user-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ramp_user_id: selectedUser.id,
          ramp_user_name: selectedUser.name,
          ramp_user_email: selectedUser.email,
          google_sheet_url: googleSheetUrl,
        }),
      });

      if (response.ok) {
        showAlert('success', 'Mapping saved successfully');
        fetchMappings();
        closeDialog();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.error || 'Failed to save mapping');
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      showAlert('error', 'Failed to save mapping');
    }
  };

  const deleteMapping = async (rampUserId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const response = await fetch(`/api/ramp/user-mappings?ramp_user_id=${rampUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showAlert('success', 'Mapping deleted successfully');
        fetchMappings();
      } else {
        const errorData = await response.json();
        showAlert('error', errorData.error || 'Failed to delete mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      showAlert('error', 'Failed to delete mapping');
    }
  };

  const getAvailableUsers = () => {
    const mappedUserIds = mappings.map(m => m.ramp_user_id);
    return users.filter(user =>
      editingMapping
        ? user.id === editingMapping.ramp_user_id || !mappedUserIds.includes(user.id)
        : !mappedUserIds.includes(user.id)
    );
  };

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="Ramp User Sheet Mappings"
      breadcrumbs={[{ label: 'Ramp', href: '/ramp-expense-sync' }, { label: 'User Mappings' }]}
    >
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">User to Google Sheet Mappings</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openDialog()}
              disabled={getAvailableUsers().length === 0}
            >
              Add Mapping
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            Map Ramp users to their corresponding Google Sheets for expense syncing. Each user can
            only be mapped to one sheet.
          </Typography>

          {loading ? (
            <Typography>Loading...</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Google Sheet</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">
                          No mappings configured. Add a mapping to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    mappings.map(mapping => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {mapping.ramp_user_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{mapping.ramp_user_email}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkIcon fontSize="small" color="action" />
                            <Link
                              href={mapping.google_sheet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={{
                                maxWidth: 250,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: '0.875rem',
                                color: 'primary.main',
                              }}
                            >
                              {mapping.google_sheet_url}
                            </Link>
                          </Box>
                        </TableCell>
                        <TableCell>{new Date(mapping.updated_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => openDialog(mapping)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteMapping(mapping.ramp_user_id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingMapping ? 'Edit User Mapping' : 'Add User Mapping'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Ramp User</InputLabel>
              <Select
                value={selectedUserId}
                label="Ramp User"
                onChange={e => setSelectedUserId(e.target.value)}
                disabled={!!editingMapping}
              >
                {getAvailableUsers().map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Google Sheet URL"
              value={googleSheetUrl}
              onChange={e => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              fullWidth
              helperText="Paste the full Google Sheets URL"
            />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Sheet tabs will be automatically created in the format &quot;Expenses - Month
              Year&quot; based on your selected date ranges during sync.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={saveMapping} variant="contained">
            Save Mapping
          </Button>
        </DialogActions>
      </Dialog>
    </IntercomLayout>
  );
};

export default RampUserMappings;
