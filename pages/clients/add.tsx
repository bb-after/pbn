import React from 'react';
import { useRouter } from 'next/router';
import { Typography, Box, Grid } from '@mui/material';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../../components/ui';
import ClientForm from '../../components/ClientForm';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import useValidateUserToken from 'hooks/useValidateUserToken';

function AddClientPageContent() {
  const router = useRouter();
  const { isValidUser } = useValidateUserToken();

  const handleSave = () => {
    router.push('/clients');
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="Add New Client"
      breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: 'Add Client' }]}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <IntercomCard title="Client Details">
            <Box p={3}>
              <ClientForm client={null} onSave={handleSave} onCancel={handleCancel} />
            </Box>
          </IntercomCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <IntercomCard title="Client Contacts">
            <Box p={3}>
              <Typography variant="body1" color="text.secondary">
                You must save the client before you can add contacts.
              </Typography>
              <ul style={{ color: '#888', marginTop: 16, paddingLeft: 20 }}>
                <li>After saving, you can add, edit, or remove client contacts.</li>
                <li>
                  Contacts are associated with each client and can be managed from the edit screen.
                </li>
              </ul>
            </Box>
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function AddClientPage() {
  return (
    <ToastProvider>
      <AddClientPageContent />
    </ToastProvider>
  );
}
