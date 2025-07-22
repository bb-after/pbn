import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  TableContainer,
  TextField,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  Link,
  Select,
  MenuItem,
  TablePagination,
} from '@mui/material';
import { useRouter } from 'next/router';
import { IntercomButton } from './ui';

const handleDeleteSubmission = async (submissionId: number, submissionUrl: string, type: 'pbn') => {
  try {
    const response = await fetch(`/api/deleteFromWordPress`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId, submissionUrl, type }),
    });

    const data = await response.json();
    if (response.ok) {
      alert('Submission deleted successfully!');
      window.location.reload();
      // Refresh your submissions list or handle UI updates here
    } else {
      // Handle backend errors (e.g., post not found, deletion failed)
      alert(`Error deleting submission: ${data.error}`);
    }
  } catch (error) {
    console.error('Error deleting submission:', error);
    alert('Failed to delete submission. Please try again.');
  }
};

const PbnSiteSubmissionsTable = () => {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState(''); // new state for the search query
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  interface User {
    name: string;
    user_token: string; // Adjust this type based on the actual data, e.g., string, number, etc.
    pbn_count: number;
  }
  const [users, setUsers] = useState<User[]>([]);
  interface Client {
    client_id: number;
    client_name: string;
    pbn_posts?: number;
    is_active: number;
  }
  const [clients, setClients] = useState<Client[]>([]);

  const [page, setPage] = useState(0); //current page
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  type ExpandedRowsType = { [key: string]: boolean };
  const [expandedRows, setExpandedRows] = useState<ExpandedRowsType>({});

  const handleToggle = (id: string) => {
    setExpandedRows(prevState => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/pbn-site-submissions?page=${page}&rowsPerPage=${rowsPerPage}&search=${search}&userToken=${selectedUser}&clientName=${selectedClient}&clientId=${selectedClientId}`
      );
      const data = await response.json();
      setSubmissions(data.rows);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  }, [search, selectedUser, selectedClient, selectedClientId, page, rowsPerPage]);

  // Check for URL parameters on initial load
  useEffect(() => {
    if (router.isReady) {
      const { clientId } = router.query;

      if (clientId) {
        setSelectedClientId(clientId as string);

        // We don't need to make an additional API call here
        // Instead, when clients are loaded, we'll find the matching client and set it
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/getUsers');
        const data = await response.json();
        setUsers(data.rows);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients?active=true&includeStats=true');
        const data = await response.json();
        setClients(data || []);

        // If we have a selected clientId, find the matching client and set its name
        if (selectedClientId && data && data.length > 0) {
          const selectedClient = data.find(
            (client: Client) => client.client_id.toString() === selectedClientId
          );
          if (selectedClient) {
            setSelectedClient(selectedClient.client_name);
          }
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, [selectedClientId]);

  // Search handler
  const handleSearch = () => {
    fetchData(); // fetch data using the current search query
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedUser('');
    setSelectedClient('');
    setSelectedClientId('');
    setPage(0);

    // Remove clientId from URL if it exists
    if (router.query.clientId) {
      const { clientId, ...restQuery } = router.query;
      router.replace(
        {
          pathname: router.pathname,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    debugger;
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page to 0 when rows per page change
  };

  // Function to safely render HTML content
  const renderHTML = (htmlContent: string) => {
    return { __html: htmlContent };
  };

  return (
    <div>
      <style jsx global>
        {`
          body {
            background: #eee;
          }
          th {
            font-weight: bold !important;
          }
        `}
      </style>

      <div>
        <Typography variant="h5" gutterBottom>
          <Link href="https://sales.statuscrawl.io">Portal</Link> &raquo; PBN Site Submissions
        </Typography>

        <Box mr={1}></Box>

        {/* Search bar */}
        <Box
          display="flex" // creates a flex container
          justifyContent="flex-end" // aligns the child elements to the right
          alignItems="center" // centers children vertically
          mb={2} // margin-bottom for spacing below the search bar
        >
          <Box mr={1}>
            <Select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              displayEmpty
              inputProps={{ 'aria-label': 'Without label' }}
              style={{ minWidth: '120px' }}
            >
              <MenuItem value="">
                <em>All Users</em>
              </MenuItem>
              {users.map((user, index) => (
                <MenuItem key={index} value={user.user_token}>
                  {user.name} ({user.pbn_count})
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box mr={1}>
            <Select
              value={selectedClient}
              onChange={e => {
                const clientName = e.target.value;
                setSelectedClient(clientName);

                // Find the client ID that matches the selected name
                if (clientName) {
                  const client = clients.find(c => c.client_name === clientName);
                  if (client) {
                    setSelectedClientId(client.client_id.toString());
                  }
                } else {
                  setSelectedClientId('');
                }
              }}
              displayEmpty
              inputProps={{ 'aria-label': 'Without label' }}
              style={{ minWidth: '120px' }}
            >
              <MenuItem value="">
                <em>All Clients</em>
              </MenuItem>
              {clients.map(client => (
                <MenuItem key={client.client_id} value={client.client_name}>
                  {client.client_name} ({client.pbn_posts || 0})
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box mr={1}>
            <TextField
              label="Search"
              value={search}
              onChange={e => setSearch(e.target.value)} // update the search query upon change
            />
          </Box>
          <Box display="flex" flexDirection="column">
            <Button onClick={handleSearch} variant="contained" sx={{ mb: 1 }}>
              Search
            </Button>
            <Button onClick={handleResetFilters} variant="outlined" color="secondary">
              Reset Filters
            </Button>
          </Box>
        </Box>

        <TablePagination
          component="div"
          count={totalCount} // Replace with total count of items from server
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Submission Response</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission: any) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.id}</TableCell>
                  <TableCell>
                    {submission.submission_title ? (
                      <Link
                        href={`/editPost/${submission.id}`}
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'underline',
                          '&:hover': {
                            textDecoration: 'none',
                          },
                        }}
                      >
                        {submission.submission_title}
                      </Link>
                    ) : (
                      'No title'
                    )}
                  </TableCell>
                  <TableCell>
                    {expandedRows[submission.id] ? (
                      <div dangerouslySetInnerHTML={renderHTML(submission?.content)} />
                    ) : (
                      <div
                        dangerouslySetInnerHTML={renderHTML(
                          submission?.content?.substring(0, 100) + '...'
                        )}
                      />
                    )}
                    <Button onClick={() => handleToggle(submission.id)}>
                      {expandedRows[submission.id] ? 'Collapse' : 'Expand'}
                    </Button>
                  </TableCell>
                  <TableCell>{submission.name}</TableCell>
                  <TableCell>{submission.client_name || '-'}</TableCell>
                  <TableCell>
                    <Link href={submission.submission_response} target="_blank">
                      {submission.submission_response}
                    </Link>
                  </TableCell>
                  <TableCell>{submission.created}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IntercomButton
                        size="small"
                        variant="primary"
                        onClick={() => window.open(submission.submission_response, '_blank')}
                      >
                        View
                      </IntercomButton>
                      <IntercomButton
                        size="small"
                        variant="secondary"
                        onClick={() => router.push(`/editPost/${submission.id}`)}
                      >
                        Edit
                      </IntercomButton>
                      <IntercomButton
                        size="small"
                        variant="danger"
                        onClick={() =>
                          handleDeleteSubmission(
                            submission.id,
                            submission.submission_response,
                            'pbn'
                          )
                        }
                      >
                        Delete
                      </IntercomButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount} // Replace with total count of items from server
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </div>
    </div>
  );
};

export default PbnSiteSubmissionsTable;
