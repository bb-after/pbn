import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  Typography,
  TextField,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import useValidateUserToken from 'hooks/useValidateUserToken';
import {
  IntercomLayout,
  ThemeProvider,
  ToastProvider,
  IntercomCard,
  IntercomButton,
} from '../../components/ui';
import UnauthorizedAccess from '../../components/UnauthorizedAccess';

function NewSitePage() {
  const router = useRouter();
  const [domain, setDomain] = useState<string>('');
  const [topics, setTopics] = useState<string[]>([]);
  const [wpUsername, setWpUsername] = useState<string>('');
  const [wpPassword, setWpPassword] = useState<string>('');
  const [wpAppPassword, setWpAppPassword] = useState<string>('');
  const [active, setActive] = useState<string>('1');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { isLoading, isValidUser } = useValidateUserToken();

  const handleSave = async () => {
    if (!domain.startsWith('https://')) {
      setErrorMessage("Domain must start with 'https://'");
      return;
    }

    try {
      await axios.post(`/api/create-superstar-site`, {
        domain,
        topics,
        wpUsername,
        wpPassword,
        wpAppPassword,
        active: active === '1' ? 1 : 0,
        customPrompt,
      });
      router.push('/superstar-sites');
    } catch (error) {
      console.error('Error saving site:', error);
      setErrorMessage('Error saving site. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/superstar-sites');
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
      title="Create New Superstar Site"
      breadcrumbs={[{ label: 'Superstar Sites', href: '/superstar-sites' }, { label: 'New Site' }]}
    >
      <IntercomCard
        title="Site Details"
        actions={
          <Box display="flex" gap={2}>
            <IntercomButton variant="secondary" onClick={handleCancel}>
              Cancel
            </IntercomButton>
            <IntercomButton variant="primary" onClick={handleSave}>
              Create Site
            </IntercomButton>
          </Box>
        }
      >
        <Box p={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                label="Domain - e.g., https://yourdomain.com"
                fullWidth
                value={domain}
                onChange={e => setDomain(e.target.value)}
                error={!!errorMessage}
                helperText={errorMessage}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={topics}
                onChange={(event, newValue) => setTopics(newValue as string[])}
                renderInput={params => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Topics"
                    placeholder="Add topics and press Enter"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                label="WordPress Username"
                fullWidth
                value={wpUsername}
                onChange={e => setWpUsername(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                label="WordPress Password"
                type="password"
                fullWidth
                value={wpPassword}
                onChange={e => setWpPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                label="WordPress Application Password"
                type="password"
                fullWidth
                value={wpAppPassword}
                onChange={e => setWpAppPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                label="Custom Prompt"
                multiline
                rows={4}
                fullWidth
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Enter a custom prompt to override the default prompt for this site."
                helperText="Leave empty to use the default generation prompt."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="active-label">Status</InputLabel>
                <Select
                  labelId="active-label"
                  label="Status"
                  value={active}
                  onChange={e => setActive(e.target.value)}
                >
                  <MenuItem value="1">Active</MenuItem>
                  <MenuItem value="0">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}

export default function NewSite() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NewSitePage />
      </ToastProvider>
    </ThemeProvider>
  );
}
