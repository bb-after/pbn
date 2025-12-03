import React, { useState } from 'react';
import { Typography, Box, CircularProgress } from '@mui/material';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../../components/ui';
import ClientApprovalRequestForm from '../../components/ClientApprovalRequestForm';
import { useRouter } from 'next/router';
import useAuth from '../../hooks/useAuth';
import UnauthorizedAccess from '../../components/UnauthorizedAccess';

function UploadApprovalRequestPageContent() {
  const router = useRouter();
  const { isValidUser, isLoading } = useAuth('/login');
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
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="New Content Approval Request"
      breadcrumbs={[
        { label: 'Client Approval', href: '/client-approval' },
        { label: 'New Request' },
      ]}
    >
      <IntercomCard>
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Content Submission
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
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
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function UploadApprovalRequestPage() {
  return (
    <ToastProvider>
      <UploadApprovalRequestPageContent />
    </ToastProvider>
  );
}
