import React, { useState, useEffect } from 'react';
import { Typography, Box, CircularProgress, Grid } from '@mui/material';
import ClientForm from '../../../components/ClientForm';
import ClientContactList from '../../../components/ClientContactList';
import { useRouter } from 'next/router';
import useAuth from '../../../hooks/useAuth';
import axios from 'axios';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from 'components/ui';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

function EditClientPageContent() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidUser } = useAuth('/login');
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formSaved, setFormSaved] = useState(false);

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
    setFormSaved(true);
    // Optionally, you could refetch the client data here if needed
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  if (error || !client) {
    return (
      <IntercomLayout title="Error">
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography variant="h6" color="error">
            {error || 'Client not found'}
          </Typography>
        </Box>
      </IntercomLayout>
    );
  }

  return (
    <IntercomLayout
      title={`Edit Client: ${client.client_name}`}
      breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: 'Edit Client' }]}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <IntercomCard title="Client Details">
            <Box p={3}>
              <ClientForm client={client} onSave={handleSave} onCancel={handleCancel} />
              {formSaved && (
                <Box mt={2}>
                  <Typography variant="body2" color="success.main">
                    Client information saved successfully!
                  </Typography>
                </Box>
              )}
            </Box>
          </IntercomCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <IntercomCard title="Client Contacts">
            <ClientContactList clientId={client.client_id} clientName={client.client_name} />
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function EditClientPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <EditClientPageContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
