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
  Autocomplete,
  Alert,
  Snackbar,
  SelectChangeEvent,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MergeIcon from '@mui/icons-material/MergeType';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import axios from 'axios';
import { useRouter } from 'next/router';
import LayoutContainer from '../components/LayoutContainer';
import StyledHeader from '../components/StyledHeader';
import { IntercomLayout } from '../components/layout/IntercomLayout';
import {
  ThemeProvider,
  ToastProvider,
  IntercomButton,
  IntercomCard,
  IntercomInput,
} from '../components/ui';
import useValidateUserToken from 'hooks/useValidateUserToken';
import Link from 'next/link';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

interface Industry {
  industry_id: number;
  industry_name: string;
}

interface Region {
  region_id: number;
  region_name: string;
  region_type: string;
}

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  superstar_posts?: number;
  pbn_posts?: number;
  industries?: Industry[];
  regions?: Region[];
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
  { id: 'industries', label: 'Industries', numeric: false, sortable: false },
  { id: 'regions', label: 'Regions', numeric: false, sortable: false },
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

  // New state for filters
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  useEffect(() => {
    if (isValidUser) {
      fetchClients();
      fetchIndustries();
      fetchRegions();
    }
  }, [isValidUser, showActiveOnly, selectedIndustryId, selectedRegionId]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/clients', {
        params: {
          active: showActiveOnly ? 'true' : undefined,
          includeStats: 'true',
          industryId: selectedIndustryId,
          regionId: selectedRegionId,
        },
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      const response = await axios.get('/api/industries');
      setAllIndustries(response.data);
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await axios.get('/api/regions');
      setAllRegions(response.data);
    } catch (error) {
      console.error('Error fetching regions:', error);
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

  const handleIndustryFilterChange = (value: number | null) => {
    setSelectedIndustryId(value);
  };

  const handleRegionFilterChange = (value: number | null) => {
    setSelectedRegionId(value);
  };

  const handleResetFilters = () => {
    setSelectedIndustryId(null);
    setSelectedRegionId(null);
    setSearchTerm('');
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
    return <UnauthorizedAccess />;
  }

  function ClientsPageContent() {
    const actionButton = (
      <Link href="/clients/new" passHref>
        <IntercomButton variant="primary" startIcon={<AddIcon />} component="a">
          Add Client
        </IntercomButton>
      </Link>
    );

    return (
      <>
        <IntercomLayout
          title="Client Management"
          breadcrumbs={[{ label: 'Clients', href: '/clients' }]}
          actions={actionButton}
        >
          <Box>
            <IntercomCard borderless padding="medium" sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <IntercomInput
                    label="Search Clients"
                    fullWidth
                    value={searchTerm}
                    onChange={handleSearch}
                    isSearch
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <Autocomplete
                      id="industry-filter"
                      options={allIndustries}
                      getOptionLabel={option => option.industry_name}
                      value={allIndustries.find(i => i.industry_id === selectedIndustryId) || null}
                      onChange={(_, newValue) =>
                        handleIndustryFilterChange(newValue ? newValue.industry_id : null)
                      }
                      renderInput={params => (
                        <TextField {...params} label="Filter by Industry" variant="outlined" />
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <Autocomplete
                      id="region-filter"
                      options={allRegions}
                      getOptionLabel={option => option.region_name}
                      value={allRegions.find(r => r.region_id === selectedRegionId) || null}
                      onChange={(_, newValue) =>
                        handleRegionFilterChange(newValue ? newValue.region_id : null)
                      }
                      renderInput={params => (
                        <TextField {...params} label="Filter by Region" variant="outlined" />
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showActiveOnly}
                          onChange={e => setShowActiveOnly(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Active Only"
                    />
                    <IntercomButton
                      variant="ghost"
                      startIcon={<FilterAltIcon />}
                      onClick={handleResetFilters}
                      disabled={!selectedIndustryId && !selectedRegionId && !searchTerm}
                    >
                      Clear Filters
                    </IntercomButton>
                  </Box>
                </Grid>
              </Grid>
            </IntercomCard>

            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : (
              <IntercomCard>
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
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {client.industries && client.industries.length > 0 ? (
                                  client.industries.map(industry => (
                                    <Chip
                                      key={industry.industry_id}
                                      label={industry.industry_name}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    None
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {client.regions && client.regions.length > 0 ? (
                                  client.regions.map(region => (
                                    <Chip
                                      key={region.region_id}
                                      label={region.region_name}
                                      size="small"
                                      color="secondary"
                                      variant="outlined"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    None
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
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
                                  <IntercomButton
                                    variant="ghost"
                                    component={Link}
                                    href={`/superstar-site-submissions?clientId=${client.client_id}`}
                                    sx={{ minWidth: 'auto', p: 0, fontWeight: 'bold' }}
                                  >
                                    {client.superstar_posts}
                                  </IntercomButton>
                                </Tooltip>
                              ) : (
                                0
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {client.pbn_posts && client.pbn_posts > 0 ? (
                                <Tooltip title="View all PBN posts for this client" arrow>
                                  <IntercomButton
                                    variant="ghost"
                                    component={Link}
                                    href={`/pbn-site-submissions?clientId=${client.client_id}`}
                                    sx={{ minWidth: 'auto', p: 0, fontWeight: 'bold' }}
                                  >
                                    {client.pbn_posts}
                                  </IntercomButton>
                                </Tooltip>
                              ) : (
                                0
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(client.created_at).toLocaleDateString()}
                            </TableCell>
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
              </IntercomCard>
            )}
          </Box>
        </IntercomLayout>

        {/* Client Merge Dialog */}
        <Dialog open={Boolean(mergingClient)} onClose={handleMergeClose} maxWidth="sm" fullWidth>
          <DialogTitle>Merge Client</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              Merge &ldquo;{mergingClient?.client_name}&rdquo; (ID: {mergingClient?.client_id})
              into:
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <Autocomplete
                options={clients.filter(c => c.client_id !== mergingClient?.client_id)}
                getOptionLabel={option => `#${option.client_id} - ${option.client_name}`}
                value={clients.find(c => c.client_id === targetClientId) || null}
                onChange={(_, newValue) => setTargetClientId(newValue ? newValue.client_id : '')}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Target Client"
                    placeholder="Start typing to search..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    #{option.client_id} - {option.client_name}
                  </li>
                )}
              />
            </FormControl>
            <Typography color="warning.main" sx={{ mt: 2 }}>
              Warning: This action cannot be undone. All posts and mappings will be moved to the
              target client.
            </Typography>
          </DialogContent>
          <DialogActions>
            <IntercomButton onClick={handleMergeClose} variant="ghost">
              Cancel
            </IntercomButton>
            <IntercomButton
              onClick={handleMergeConfirm}
              variant="primary"
              disabled={!targetClientId}
            >
              Merge
            </IntercomButton>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <ToastProvider>
      <ClientsPageContent />
    </ToastProvider>
  );
}
