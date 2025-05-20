import React, { useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import ClientApprovalRequestForm from '../../components/ClientApprovalRequestForm';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';

export default function UploadApprovalRequestPage() {
  const router = useRouter();
  const { isValidUser, isLoading } = useValidateUserToken();
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const handleGoogleLoginSuccess = (credentialResponse: any) => {
    setGoogleToken(credentialResponse.credential);
  };

  const handleSubmitSuccess = () => {
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
        <Box my={3}>
          <Typography variant="h4" gutterBottom>
            Content Approval Request
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Upload content for client review and approval. The selected client contacts will receive
            an email notification with a link to review the content.
          </Typography>

          <ClientApprovalRequestForm
            onSubmitSuccess={handleSubmitSuccess}
            googleAccessToken={googleToken ?? undefined}
            onGoogleLoginSuccess={handleGoogleLoginSuccess}
            googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_CONTENT_APPROVAL!}
          />
        </Box>
      </Container>
    </LayoutContainer>
  );
}
