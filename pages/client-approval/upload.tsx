import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import ClientApprovalRequestForm from '../../components/ClientApprovalRequestForm';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';

export default function UploadApprovalRequestPage() {
  const router = useRouter();
  const { isValidUser, isLoading } = useValidateUserToken();

  const handleSubmitSuccess = () => {
    // Navigate to the approval requests list after successful submission
    setTimeout(() => {
      router.push('/client-approval');
    }, 2000);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

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
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Content Approval Request
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Upload content for client review and approval. The selected client contacts will receive
            an email notification with a link to review the content.
          </Typography>

          <ClientApprovalRequestForm onSubmitSuccess={handleSubmitSuccess} />
        </Box>
      </Container>
    </LayoutContainer>
  );
}
