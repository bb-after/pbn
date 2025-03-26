import { useRouter } from 'next/router';
import { Container, Paper, Typography } from '@mui/material';
import LayoutContainer from '../../components/LayoutContainer';
import StyledHeader from '../../components/StyledHeader';
import ClientForm from '../../components/ClientForm';
import useValidateUserToken from 'hooks/useValidateUserToken';

export default function AddClientPage() {
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
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <Typography variant="h6">Unauthorized access. Please log in.</Typography>
      </div>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="xl">
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <ClientForm client={null} onSave={handleSave} onCancel={handleCancel} />
        </Paper>
      </Container>
    </LayoutContainer>
  );
}
