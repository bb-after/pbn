// pages/pbn-site-submissions.js

import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../components/ui';
import PbnSiteSubmissionsTable from '../components/PbnSiteSubmissionsTable';
import { Box } from '@mui/material';

const PbnSiteSubmissionsPage = () => {
  return (
    <ToastProvider>
      <IntercomLayout
        title="PBN Submissions"
        breadcrumbs={[{ label: 'PBNJ' }, { label: 'Submissions' }]}
      >
        <IntercomCard>
          <Box p={3}>
            <PbnSiteSubmissionsTable />
          </Box>
        </IntercomCard>
      </IntercomLayout>
    </ToastProvider>
  );
};

export default PbnSiteSubmissionsPage;
