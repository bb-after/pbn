import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  Box,
  Link,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
} from '@mui/material';
import { useRouter } from 'next/router';
import {
  IntercomLayout,
  ThemeProvider,
  ToastProvider,
  IntercomCard,
  IntercomButton,
} from '../components/ui';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import useValidateUserToken from 'hooks/useValidateUserToken';
import { handleWPLogin } from '../utils/handle-wp-login';
import { colors } from '../utils/colors';
import debounce from 'lodash/debounce';

interface PbnSite {
  id: number;
  domain: string;
  login: string;
  password: string;
  active: number;
  post_count: number;
  client_count: number;
}

type SortField = 'id' | 'domain' | 'post_count' | 'client_count';
type SortOrder = 'asc' | 'desc';

function PbnSitesPage() {
  const [sites, setSites] = useState<PbnSite[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [sortField, setSortField] = useState<SortField>('domain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortedAndFilteredSites, setSortedAndFilteredSites] = useState<PbnSite[]>([]);
  const [active, setActive] = useState<string>('1');

  const router = useRouter();
  const { isLoading: isAuthLoading, isValidUser } = useValidateUserToken();

  // Debounced search handler
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debouncedSetSearch(e.target.value);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort function
  const sortSites = (sites: PbnSite[]) => {
    return [...sites].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'domain') {
        return multiplier * a.domain.localeCompare(b.domain);
      }
      return multiplier * ((a[sortField] || 0) - (b[sortField] || 0));
    });
  };

  // Update sorting and filtering when sort parameters change
  useEffect(() => {
    if (sites.length > 0) {
      const filteredSites = filterSites(sites);
      setSortedAndFilteredSites(sortSites(filteredSites));
    }
  }, [sortField, sortOrder]);

  // Filter function
  const filterSites = (sites: PbnSite[]) => {
    return sites.filter(site => {
      // Filter by search query only (active filtering is handled by API)
      const searchMatch =
        !debouncedSearchQuery ||
        site.domain.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      return searchMatch;
    });
  };

  useEffect(() => {
    const fetchSites = async () => {
      setIsFetching(true);
      try {
        const response = await axios.get<PbnSite[]>(
          `/api/pbn-sites?search=${debouncedSearchQuery}&active=${active}`
        );
        setSites(response.data);

        // Apply filters and sorting
        const filteredSites = filterSites(response.data);
        setSortedAndFilteredSites(sortSites(filteredSites));
      } catch (error) {
        console.error('Error fetching PBN sites:', error);
      } finally {
        setIsFetching(false);
        setIsLoading(false);
      }
    };

    if (isValidUser) {
      fetchSites();
    }
  }, [isValidUser, debouncedSearchQuery, active]);

  const handleEdit = (id: number) => {
    router.push(`/pbn-sites/${id}/edit`);
  };

  const handleViewPosts = (id: number) => {
    router.push(`/pbn-site-submissions?siteId=${id}`);
  };

  // PBN-specific WordPress login function
  const handlePbnWPLogin = async (site: PbnSite) => {
    try {
      const response = await fetch('/api/pbn-wp-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId: site.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to get WordPress credentials');
        return;
      }

      const credentials = await response.json();

      // For application passwords, we need to use Basic Auth
      // However, due to browser security restrictions, we cannot automatically
      // set the Authorization header for cross-origin requests
      // So we'll open the admin URL and let the user handle authentication
      const adminUrl = credentials.adminUrl;
      const newWindow = window.open(adminUrl, '_blank');

      if (newWindow) {
        // Show a helpful message to the user
        alert(
          `Opened WordPress admin for ${site.domain}.\n\nYou may need to enter your credentials manually:\nUsername: ${credentials.login}\nPassword: [Application Password]`
        );
      }
    } catch (error) {
      console.error('Error logging into WordPress:', error);
      alert('Failed to open WordPress admin. Please try again.');
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  const pageActions = (
    <>
      <IntercomButton variant="secondary" onClick={() => router.push('/pbn-form')}>
        Create PBN Post
      </IntercomButton>
      <IntercomButton variant="primary" onClick={() => router.push('/pbn-sites/new')}>
        New PBN Site
      </IntercomButton>
    </>
  );

  return (
    <IntercomLayout title="PBN Sites" breadcrumbs={[{ label: 'PBN Sites' }]} actions={pageActions}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <IntercomCard>
            <Box p={3}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="active-label">Status</InputLabel>
                    <Select
                      labelId="active-label"
                      value={active}
                      onChange={e => setActive(e.target.value as string)}
                      label="Status"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="1">Active</MenuItem>
                      <MenuItem value="0">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={9}>
                  <TextField
                    variant="outlined"
                    label="Search by Domain"
                    fullWidth
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </Grid>
              </Grid>
            </Box>

            {isFetching && (
              <Box display="flex" justifyContent="center" my={2}>
                <CircularProgress size={24} />
              </Box>
            )}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'id'}
                        direction={sortField === 'id' ? sortOrder : 'asc'}
                        onClick={() => handleSort('id')}
                      >
                        ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'domain'}
                        direction={sortField === 'domain' ? sortOrder : 'asc'}
                        onClick={() => handleSort('domain')}
                      >
                        Domain
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Login</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'post_count'}
                        direction={sortField === 'post_count' ? sortOrder : 'asc'}
                        onClick={() => handleSort('post_count')}
                      >
                        Posts
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'client_count'}
                        direction={sortField === 'client_count' ? sortOrder : 'asc'}
                        onClick={() => handleSort('client_count')}
                      >
                        Clients
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAndFilteredSites.map(site => (
                    <TableRow key={site.id}>
                      <TableCell>{site.id}</TableCell>
                      <TableCell>
                        <Link href={site.domain} target="_blank" rel="noopener noreferrer">
                          {site.domain}
                        </Link>
                      </TableCell>
                      <TableCell>{site.login || '—'}</TableCell>
                      <TableCell>
                        {site.post_count > 0 ? (
                          <Link
                            href={`/pbn-site-submissions?siteId=${site.id}`}
                            style={{
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              color: '#1976d2',
                            }}
                          >
                            {site.post_count}
                          </Link>
                        ) : (
                          site.post_count
                        )}
                      </TableCell>
                      <TableCell>{site.client_count || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={site.active === 1 ? 'Active' : 'Inactive'}
                          color={site.active === 1 ? 'success' : 'default'}
                          variant={site.active === 1 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={1}>
                          <IntercomButton
                            variant="primary"
                            size="small"
                            onClick={() => handleEdit(site.id)}
                          >
                            Edit
                          </IntercomButton>
                          <IntercomButton
                            variant="secondary"
                            size="small"
                            onClick={() => handleViewPosts(site.id)}
                          >
                            View Posts
                          </IntercomButton>
                          {site.login && (
                            <IntercomButton
                              variant="secondary"
                              size="small"
                              onClick={() => handlePbnWPLogin(site)}
                            >
                              WordPress
                            </IntercomButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </IntercomCard>
        </Grid>
      </Grid>
    </IntercomLayout>
  );
}

export default function PbnSites() {
  return (
    <ToastProvider>
      <PbnSitesPage />
    </ToastProvider>
  );
}
