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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { useRouter } from 'next/router';
import LayoutContainer from '../components/LayoutContainer';
import StyledHeader from '../components/StyledHeader';
import ClientForm from '../components/ClientForm';
import useValidateUserToken from 'hooks/useValidateUserToken';

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  submission_count?: number;
  auto_count?: number;
  manual_count?: number;
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
  { id: 'submission_count', label: 'Total Posts', numeric: true, sortable: true },
  { id: 'auto_count', label: 'Auto Posts', numeric: true, sortable: true },
  { id: 'manual_count', label: 'Manual Posts', numeric: true, sortable: true },
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
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
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
          includeStats: 'true'
        }
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
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setOpenDialog(true);
  };
  
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setOpenDialog(true);
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
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleSaveClient = () => {
    setOpenDialog(false);
    fetchClients();
  };
  
  const sortedAndFilteredClients = clients
    .filter(client => 
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      if (orderBy === 'client_name') {
        comparison = a.client_name.localeCompare(b.client_name);
      } else if (typeof a[orderBy] === 'number' && typeof b[orderBy] === 'number') {
        comparison = (a[orderBy] as number) - (b[orderBy] as number);
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
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleAddClient}
            >
              Add Client
            </Button>
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
                      onChange={(e) => setShowActiveOnly(e.target.checked)}
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
                    {headCells.map((headCell) => (
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
                    sortedAndFilteredClients.map((client) => (
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
                        <TableCell align="right">{client.submission_count || 0}</TableCell>
                        <TableCell align="right">{client.auto_count || 0}</TableCell>
                        <TableCell align="right">{client.manual_count || 0}</TableCell>
                        <TableCell>
                          {new Date(client.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditClient(client)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteClient(client)}
                          >
                            <DeleteIcon />
                          </IconButton>
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
      
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <ClientForm 
          client={selectedClient}
          onSave={handleSaveClient}
          onCancel={handleCloseDialog}
        />
      </Dialog>
    </LayoutContainer>
  );
}