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
          <div style={{ marginTop: 40 }}>
            <hr style={{ margin: '32px 0' }} />
            <Typography variant="h6" gutterBottom>
              Client Contacts
            </Typography>
            <Typography variant="body1" color="textSecondary">
              You must save the client before you can add contacts.
            </Typography>
            <ul style={{ color: '#888', marginTop: 16 }}>
              <li>After saving, you can add, edit, or remove client contacts.</li>
              <li>
                Contacts are associated with each client and can be managed from the edit screen.
              </li>
            </ul>
          </div>
        </Paper>
      </Container>
    </LayoutContainer>
  );
}
