import React from 'react';
import Form from '../components/Form';
import Image from 'next/image';
import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../components/ui';
import { Box, Typography } from '@mui/material';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

const pageTitle = 'Create New PBN Post';

function PbnFormPage() {
  const { token } = useAuth('/login');

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title={pageTitle}
      breadcrumbs={[{ label: 'PBN' }, { label: 'Create New Submission' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Box display="flex" alignItems="center" mb={3}>
            <Image
              priority
              src="/images/pbnj.png"
              height={60}
              width={60}
              style={{ marginRight: '1rem' }}
              alt="PBNJ Logo"
            />
            <Typography variant="h5" component="h1">
              {pageTitle}
            </Typography>
          </Box>

          <Form />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

const CreateNewPbnPost: React.FC = () => {
  return (
    <ToastProvider>
      <PbnFormPage />
    </ToastProvider>
  );
};

export default CreateNewPbnPost;
