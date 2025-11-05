import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Stack,
  Alert,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { IntercomLayout, ToastProvider, IntercomCard, IntercomButton } from '../components/ui';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import useValidateUserToken from '../hooks/useValidateUserToken';
import { useRouter } from 'next/router';

interface SavedSearch {
  id: number;
  user_id: number;
  client_id: number;
  client_name: string;
  search_name: string;
  search_query: string;
  search_type?: string;
  urls?: string[];
  keywords?: string[];
  positive_urls?: string[];
  positive_keywords?: string[];
  location?: string;
  language?: string;
  country?: string;
  google_domain?: string;
  enable_negative_urls: boolean;
  enable_negative_sentiment: boolean;
  enable_negative_keywords: boolean;
  enable_positive_urls: boolean;
  enable_positive_sentiment: boolean;
  enable_positive_keywords: boolean;
  created_at: string;
  updated_at: string;
}

interface Client {
  client_id: number;
  client_name: string;
}

function MySavedSearchesContent() {
  const { isValidUser, token } = useValidateUserToken();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<SavedSearch | null>(null);

  useEffect(() => {
    if (isValidUser && token) {
      fetchClients();
      fetchSearches();
    }
  }, [isValidUser, token, selectedClientId]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients', {
        headers: {
          ...(token ? { 'x-auth-token': token } : {}),
        },
      });

      if (response.ok) {
        const clientData = await response.json();
        setClients(clientData);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchSearches = async () => {
    setLoading(true);
    try {
      const url = selectedClientId === 'all' 
        ? '/api/saved-searches'
        : `/api/saved-searches?clientId=${selectedClientId}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'x-auth-token': token } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch saved searches');
      }

      const data = await response.json();
      setSearches(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching searches:', err);
      setError(err.message || 'Failed to load saved searches');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSearch = (search: SavedSearch) => {
    // Navigate to stillbrook page with search parameters
    const params = new URLSearchParams({
      loadSearch: search.id.toString(),
    });
    
    router.push(`/stillbrook?${params.toString()}`);
  };

  const handleDeleteSearch = async () => {
    if (!searchToDelete) return;

    try {
      const response = await fetch(`/api/saved-searches?id=${searchToDelete.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'x-auth-token': token } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete search');
      }

      // Refresh the searches list
      fetchSearches();
      setDeleteDialogOpen(false);
      setSearchToDelete(null);
    } catch (err: any) {
      console.error('Error deleting search:', err);
      setError(err.message || 'Failed to delete search');
    }
  };

  const getHighlightChips = (search: SavedSearch) => {
    const negativeHighlights = [];
    const positiveHighlights = [];

    if (search.enable_negative_urls) negativeHighlights.push('URLs');
    if (search.enable_negative_sentiment) negativeHighlights.push('Sentiment');
    if (search.enable_negative_keywords) negativeHighlights.push('Keywords');

    if (search.enable_positive_urls) positiveHighlights.push('URLs');
    if (search.enable_positive_sentiment) positiveHighlights.push('Sentiment');
    if (search.enable_positive_keywords) positiveHighlights.push('Keywords');

    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        {negativeHighlights.map((highlight) => (
          <Chip
            key={`neg-${highlight}`}
            label={`🔴 ${highlight}`}
            size="small"
            variant="outlined"
            color="error"
          />
        ))}
        {positiveHighlights.map((highlight) => (
          <Chip
            key={`pos-${highlight}`}
            label={`🟢 ${highlight}`}
            size="small"
            variant="outlined"
            color="success"
          />
        ))}
      </Box>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="My Saved Stillbrook Searches"
      breadcrumbs={[{ label: 'Stillbrook' }, { label: 'My Saved Searches' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" gutterBottom>
                My Saved Stillbrook Searches
              </Typography>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => router.push('/stillbrook')}
              >
                Create New Stillbrook Search
              </Button>
            </Box>

            {/* Client Filter */}
            <FormControl variant="outlined" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Client</InputLabel>
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                label="Filter by Client"
              >
                <MenuItem value="all">All Clients</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.client_id} value={client.client_id.toString()}>
                    {client.client_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {error && <Alert severity="error">{error}</Alert>}

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography>Loading saved searches...</Typography>
              </Box>
            ) : searches.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No saved Stillbrook searches found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  {selectedClientId !== 'all' 
                    ? 'No Stillbrook searches found for the selected client.'
                    : 'Create your first Stillbrook search to get started.'
                  }
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={() => router.push('/stillbrook')}
                >
                  Create First Stillbrook Search
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {searches.map((search) => (
                  <Grid item xs={12} md={6} lg={4} key={search.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {search.search_name}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Client: {search.client_name}
                        </Typography>
                        
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          &quot;{search.search_query}&quot;
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Domain: {search.google_domain || 'google.com'}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Language: {search.language || 'en'}
                          </Typography>
                          {search.location && (
                            <>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                Location: {search.location}
                              </Typography>
                            </>
                          )}
                          
                          {/* Show negative search criteria */}
                          {(search.urls && search.urls.length > 0) && (
                            <>
                              <br />
                              <Typography variant="caption" color="error.main">
                                🔴 URLs: {search.urls.join(', ')}
                              </Typography>
                            </>
                          )}
                          {(search.keywords && search.keywords.length > 0) && (
                            <>
                              <br />
                              <Typography variant="caption" color="error.main">
                                🔴 Keywords: {search.keywords.join(', ')}
                              </Typography>
                            </>
                          )}
                          
                          {/* Show positive search criteria */}
                          {(search.positive_urls && search.positive_urls.length > 0) && (
                            <>
                              <br />
                              <Typography variant="caption" color="success.main">
                                🟢 URLs: {search.positive_urls.join(', ')}
                              </Typography>
                            </>
                          )}
                          {(search.positive_keywords && search.positive_keywords.length > 0) && (
                            <>
                              <br />
                              <Typography variant="caption" color="success.main">
                                🟢 Keywords: {search.positive_keywords.join(', ')}
                              </Typography>
                            </>
                          )}
                        </Box>

                        {getHighlightChips(search)}

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                          Created: {formatDate(search.created_at)}
                        </Typography>
                      </CardContent>
                      
                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<SearchIcon />}
                          onClick={() => handleRunSearch(search)}
                          size="small"
                        >
                          Run Stillbrook Search
                        </Button>
                        <IconButton
                          color="error"
                          onClick={() => {
                            setSearchToDelete(search);
                            setDeleteDialogOpen(true);
                          }}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Stack>
        </Box>
      </IntercomCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Stillbrook Search</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{searchToDelete?.search_name}&quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSearch} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </IntercomLayout>
  );
}

export default function MySavedSearchesPage() {
  return (
    <ToastProvider>
      <MySavedSearchesContent />
    </ToastProvider>
  );
}