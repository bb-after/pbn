import React from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Paper, Box } from '@mui/material';
import StyledHeader from '../../../components/StyledHeader';
import LayoutContainer from '../../../components/LayoutContainer';

export default function ClientPostsBySite() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 8, mb: 8 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Client Posts for Site ID: {id}
          </Typography>
          <Box mt={4}>
            <Typography>Content for this page is under development.</Typography>
          </Box>
        </Paper>
      </Container>
    </LayoutContainer>
  );
}
