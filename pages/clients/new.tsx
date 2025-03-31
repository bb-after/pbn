import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import ClientForm from '../../components/ClientForm';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';

export default function NewClientPage() {
  const router = useRouter();
  const { isValidUser } = useValidateUserToken();

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

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Add New Client
          </Typography>
          <ClientForm client={null} onSave={handleSave} onCancel={handleCancel} />
        </Paper>
      </Container>
    </LayoutContainer>
  );
}
