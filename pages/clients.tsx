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
  TableSortLabel,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MergeIcon from '@mui/icons-material/MergeType';
import axios from 'axios';
import { useRouter } from 'next/router';
import LayoutContainer from '../components/LayoutContainer';
import StyledHeader from '../components/StyledHeader';
import ClientForm from '../components/ClientForm';
import useValidateUserToken from 'hooks/useValidateUserToken';
import Link from 'next/link';

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  superstar_posts?: number;
  pbn_posts?: number;
}

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof Client | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

const headCells: HeadCell[] = [
  { id: 'client_id', label: 'ID', numeric: true, sortable: true },
  { id: 'client_name', label: 'Client Name', numeric: false, sortable: true },
  { id: 'is_active', label: 'Status', numeric: false, sortable: true },
  { id: 'superstar_posts', label: 'Superstar Posts', numeric: true, sortable: true },
  { id: 'pbn_posts', label: 'PBN Posts', numeric: true, sortable: true },
  { id: 'created_at', label: 'Created At', numeric: false, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

export default function ClientsPage() {
  const router = useRouter();
  const { isValidUser } = useValidateUserToken();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof Client>('client_name');
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [mergingClient, setMergingClient] = useState<Client | null>(null);
  const [targetClientId, setTargetClientId] = useState<number | ''>('');

  useEffect(() => {
    if (isValidUser) {
      fetchClients();
    }
  }, [isValidUser, showActiveOnly]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/clients', {
        params: {
          active: showActiveOnly ? 'true' : undefined,
          includeStats: 'true',
        },
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSort = (property: keyof Client) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDeleteClient = async (client: Client) => {
    if (confirm(`Are you sure you want to delete or deactivate client "${client.client_name}"?`)) {
      try {
        await axios.delete(`/api/clients/${client.client_id}`);
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('An error occurred while deleting the client.');
      }
    }
  };

  const handleMergeClick = (client: Client) => {
    setMergingClient(client);
  };

  const handleMergeClose = () => {
    setMergingClient(null);
    setTargetClientId('');
  };

  const handleMergeConfirm = async () => {
    if (!mergingClient || !targetClientId) return;

    try {
      await axios.post('/api/clients/merge', {
        sourceClientId: mergingClient.client_id,
        targetClientId,
      });
      handleMergeClose();
      fetchClients();
    } catch (error) {
      console.error('Error merging clients:', error);
      alert('Failed to merge clients');
    }
  };

  const sortedAndFilteredClients = clients
    .filter(client => client.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;

      if (orderBy === 'client_name') {
        comparison = a.client_name.localeCompare(b.client_name);
      } else if (
        orderBy === 'superstar_posts' ||
        orderBy === 'pbn_posts' ||
        orderBy === 'client_id' ||
        orderBy === 'is_active'
      ) {
        comparison = ((a[orderBy] || 0) as number) - ((b[orderBy] || 0) as number);
      } else if (orderBy === 'created_at' || orderBy === 'updated_at') {
        comparison = new Date(a[orderBy]).getTime() - new Date(b[orderBy]).getTime();
      }

      return order === 'asc' ? comparison : -comparison;
    });

  if (!isValidUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6">Unauthorized access. Please log in.</Typography>
      </Box>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />

      <Container maxWidth="xl">
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">Client Management</Typography>
            <Link href="/clients/new" passHref>
              <Button variant="contained" color="primary" startIcon={<AddIcon />} component="a">
                Add Client
              </Button>
            </Link>
          </Box>

          <Box mb={3}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  label="Search Clients"
                  variant="outlined"
                  fullWidth
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showActiveOnly}
                      onChange={e => setShowActiveOnly(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show Active Clients Only"
                />
              </Grid>
            </Grid>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table aria-label="clients table">
                <TableHead>
                  <TableRow>
                    {headCells.map(headCell => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        sortDirection={orderBy === headCell.id ? order : false}
                      >
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={() => handleRequestSort(headCell.id as keyof Client)}
                          >
                            {headCell.label}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAndFilteredClients.length > 0 ? (
                    sortedAndFilteredClients.map(client => (
                      <TableRow key={client.client_id}>
                        <TableCell align="right">{client.client_id}</TableCell>
                        <TableCell>{client.client_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={client.is_active ? 'Active' : 'Inactive'}
                            color={client.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {client.superstar_posts && client.superstar_posts > 0 ? (
                            <Tooltip title="View all Superstar posts for this client" arrow>
                              <Button
                                color="primary"
                                variant="text"
                                size="small"
                                component={Link}
                                href={`/superstar-site-submissions?clientId=${client.client_id}`}
                                sx={{ minWidth: 'auto', p: 0, fontWeight: 'bold' }}
                              >
                                {client.superstar_posts}
                              </Button>
                            </Tooltip>
                          ) : (
                            0
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {client.pbn_posts && client.pbn_posts > 0 ? (
                            <Tooltip title="View all PBN posts for this client" arrow>
                              <Button
                                color="primary"
                                variant="text"
                                size="small"
                                component={Link}
                                href={`/pbn-site-submissions?clientId=${client.client_id}`}
                                sx={{ minWidth: 'auto', p: 0, fontWeight: 'bold' }}
                              >
                                {client.pbn_posts}
                              </Button>
                            </Tooltip>
                          ) : (
                            0
                          )}
                        </TableCell>
                        <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title="Edit client" arrow placement="top">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => router.push(`/clients/edit/${client.client_id}`)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Merge with another client" arrow placement="top">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleMergeClick(client)}
                            >
                              <MergeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete client" arrow placement="top">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClient(client)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={headCells.length} align="center">
                        No clients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* Client Merge Dialog */}
      <Dialog open={Boolean(mergingClient)} onClose={handleMergeClose} maxWidth="sm" fullWidth>
        <DialogTitle>Merge Client</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Merge &ldquo;{mergingClient?.client_name}&rdquo; (ID: {mergingClient?.client_id}) into:
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Target Client</InputLabel>
            <Select
              value={targetClientId}
              onChange={e => setTargetClientId(e.target.value as number)}
              label="Target Client"
            >
              {clients
                .filter(c => c.client_id !== mergingClient?.client_id)
                .map(client => (
                  <MenuItem key={client.client_id} value={client.client_id}>
                    #{client.client_id} - {client.client_name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Typography color="warning.main" sx={{ mt: 2 }}>
            Warning: This action cannot be undone. All posts and mappings will be moved to the
            target client.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMergeClose}>Cancel</Button>
          <Button
            onClick={handleMergeConfirm}
            variant="contained"
            color="primary"
            disabled={!targetClientId}
          >
            Merge
          </Button>
        </DialogActions>
      </Dialog>
    </LayoutContainer>
  );
}
