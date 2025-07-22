import React from 'react';
import { useRouter } from 'next/router';
import { Typography, Box } from '@mui/material';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../../components/ui';
import ClientForm from '../../components/ClientForm';
import UnauthorizedAccess from '../../components/UnauthorizedAccess';
import useValidateUserToken from 'hooks/useValidateUserToken';

function NewClientPageContent() {
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
      breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: 'New Client' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Client Details
          </Typography>
          <ClientForm client={null} onSave={handleSave} onCancel={handleCancel} />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function NewClientPage() {
  return (
    <ToastProvider>
      <NewClientPageContent />
    </ToastProvider>
  );
}
