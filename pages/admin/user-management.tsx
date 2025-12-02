import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Avatar,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  LoginOutlined as LoginIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { green, red, grey } from '@mui/material/colors';
import Head from 'next/head';
import { IntercomLayout, useToast } from '../../components/ui';
import useAuth from '../../hooks/useAuth';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface ConfirmationDialog {
  open: boolean;
  user: User | null;
  action: 'activate' | 'deactivate';
}

function AdminUserManagementContent() {
  const { isValidUser, token } = useAuth('/login');
  const { showSuccess, showError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialog>({
    open: false,
    user: null,
    action: 'activate',
  });
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (isValidUser) {
      fetchUsers();
    }
  }, [isValidUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users', {
        withCredentials: true,
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (user: User, newStatus: boolean) => {
    setConfirmation({
      open: true,
      user,
      action: newStatus ? 'activate' : 'deactivate',
    });
  };

  const confirmStatusChange = async () => {
    if (!confirmation.user) return;

    try {
      setUpdating(confirmation.user.id);
      const response = await axios.put(
        '/api/admin/users',
        {
          userId: confirmation.user.id,
          isActive: confirmation.action === 'activate',
        },
        {
          withCredentials: true,
        }
      );

      // Update the user in the local state
      setUsers(users.map(user => (user.id === confirmation.user!.id ? response.data.user : user)));

      showSuccess(response.data.message);
      setConfirmation({ open: false, user: null, action: 'activate' });
    } catch (error: any) {
      console.error('Error updating user status:', error);
      showError(error.response?.data?.error || 'Failed to update user status');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (isActive: boolean) => ({
    color: isActive ? green[600] : red[600],
    backgroundColor: isActive ? green[100] : red[100],
  });

  // Filter users based on status filter
  const filteredUsers = users.filter(user => {
    if (statusFilter === 'active') return user.is_active;
    if (statusFilter === 'inactive') return !user.is_active;
    return true; // 'all'
  });

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (filter: 'all' | 'active' | 'inactive') => {
    setStatusFilter(filter);
    handleFilterClose();
  };

  const getFilterLabel = () => {
    switch (statusFilter) {
      case 'active': return 'Active Users';
      case 'inactive': return 'Inactive Users';
      default: return 'All Users';
    }
  };

  if (!isValidUser) {
    return null;
  }

  return (
    <>
      <Head>
        <title>User Management - Admin</title>
      </Head>

      <Box p={3}>
        <Typography variant="h4" fontWeight={600} mb={1}>
          User Management
        </Typography>
        <Typography variant="h6" color="textSecondary" mb={3}>
          Manage user accounts and their active status
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Card>
            <CardContent>
              <Box mb={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" gutterBottom>
                    {getFilterLabel()} ({filteredUsers.length})
                  </Typography>
                  <Tooltip title="Filter users">
                    <IconButton onClick={handleFilterClick}>
                      <FilterIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography variant="body2" color="textSecondary">
                  Active users: {users.filter(u => u.is_active).length} | Inactive users:{' '}
                  {users.filter(u => !u.is_active).length}
                  {statusFilter !== 'all' && (
                    <> | Showing: {filteredUsers.length} {statusFilter} users</>
                  )}
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: user.is_active ? green[500] : grey[500] }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={500}>
                                {user.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                              >
                                <EmailIcon fontSize="small" />
                                {user.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={user.is_active ? <ActiveIcon /> : <InactiveIcon />}
                            label={user.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            sx={getStatusColor(user.is_active)}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            <CalendarIcon fontSize="small" />
                            {formatDate(user.created_at)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            <LoginIcon fontSize="small" />
                            {formatDate(user.last_login)}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title={user.is_active ? 'Deactivate user' : 'Activate user'}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={user.is_active}
                                  onChange={e => handleStatusChange(user, e.target.checked)}
                                  disabled={updating === user.id}
                                  color={user.is_active ? 'success' : 'default'}
                                />
                              }
                              label=""
                            />
                          </Tooltip>
                          {updating === user.id && <CircularProgress size={16} sx={{ ml: 1 }} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredUsers.length === 0 && users.length > 0 && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="textSecondary">
                    No {statusFilter !== 'all' ? statusFilter : ''} users found.
                  </Typography>
                </Box>
              )}

              {users.length === 0 && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="textSecondary">
                    No users found
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmation.open}
          onClose={() => setConfirmation({ open: false, user: null, action: 'activate' })}
        >
          <DialogTitle>
            {confirmation.action === 'activate' ? 'Activate User' : 'Deactivate User'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to {confirmation.action} the user{' '}
              <strong>{confirmation.user?.name}</strong>?
            </Typography>
            {confirmation.action === 'deactivate' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Deactivating this user will prevent them from accessing the system and remove them
                from assignment dropdowns.
              </Alert>
            )}
            {confirmation.action === 'activate' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Activating this user will allow them to access the system and appear in assignment
                dropdowns.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmation({ open: false, user: null, action: 'activate' })}
              disabled={!!updating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              variant="contained"
              color={confirmation.action === 'activate' ? 'success' : 'warning'}
              disabled={!!updating}
            >
              {updating
                ? 'Updating...'
                : `${confirmation.action === 'activate' ? 'Activate' : 'Deactivate'} User`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={handleFilterClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => handleFilterSelect('all')} selected={statusFilter === 'all'}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>All Users</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterSelect('active')} selected={statusFilter === 'active'}>
            <ListItemIcon>
              <ActiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Active Users</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleFilterSelect('inactive')} selected={statusFilter === 'inactive'}>
            <ListItemIcon>
              <InactiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Inactive Users</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </>
  );
}

export default function AdminUserManagement() {
  return (
    <IntercomLayout>
      <AdminUserManagementContent />
    </IntercomLayout>
  );
}
