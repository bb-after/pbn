import React from 'react';
import PbnSubmissionForm from '../components/PbnSubmissionForm';
import Image from 'next/image';
import { IntercomLayout, ToastProvider, IntercomCard } from '../components/ui';
import { Box, Typography } from '@mui/material';
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from 'components/UnauthorizedAccess';

const pageTitle = 'PBN Manual / Bulk Upload';

function PbnUploadPage() {
  const { token } = useValidateUserToken();

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title={pageTitle}
      breadcrumbs={[{ label: 'PBN' }, { label: 'Manual / Bulk Upload' }]}
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
          <PbnSubmissionForm
            articleTitle=""
            clientName=""
            categories=""
            content=""
            onSubmit={() => {}}
          />
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function PbnUpload() {
  return (
    <ToastProvider>
      <PbnUploadPage />
    </ToastProvider>
  );
}
