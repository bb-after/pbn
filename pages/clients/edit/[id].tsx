import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, CircularProgress } from '@mui/material';
import LayoutContainer from '../../../components/LayoutContainer';
import StyledHeader from '../../../components/StyledHeader';
import ClientForm from '../../../components/ClientForm';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export default function EditClientPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidUser } = useValidateUserToken();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && isValidUser) {
      fetchClient();
    }
  }, [id, isValidUser]);

  const fetchClient = async () => {
    try {
      const response = await axios.get(`/api/clients/${id}`);
      setClient(response.data);
    } catch (error) {
      console.error('Error fetching client:', error);
      setError('Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    router.push('/clients');
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  if (!isValidUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6">Unauthorized access. Please log in.</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6" color="error">
          {error || 'Client not found'}
        </Typography>
      </Box>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Edit Client: {client.client_name}
          </Typography>
          <ClientForm client={client} onSave={handleSave} onCancel={handleCancel} />
        </Paper>
      </Container>
    </LayoutContainer>
  );
}
