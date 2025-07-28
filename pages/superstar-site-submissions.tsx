import { IntercomLayout, ThemeProvider, ToastProvider, IntercomCard } from '../components/ui';
import SuperstarSiteSubmissionsTable from '../components/SuperstarSiteSubmissionsTable';
import { Box } from '@mui/material';

const SuperstarSiteSubmissionsPage = () => {
  return (
    <ToastProvider>
      <IntercomLayout
        title="Superstar Submissions"
        breadcrumbs={[{ label: 'Superstar' }, { label: 'Submissions' }]}
      >
        <IntercomCard>
          <Box p={3}>
            <SuperstarSiteSubmissionsTable />
          </Box>
        </IntercomCard>
      </IntercomLayout>
    </ToastProvider>
  );
};

export default SuperstarSiteSubmissionsPage;
