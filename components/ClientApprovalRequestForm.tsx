import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Paper,
  Autocomplete,
  FormControl,
  FormLabel,
  FormHelperText,
  FormGroup,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import axios from 'axios';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Import Quill CSS
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

interface Client {
  client_id: number;
  client_name: string;
}

interface ClientContact {
  contact_id: number;
  client_id: number;
  name: string;
  email: string;
  job_title?: string;
  is_active: boolean;
}

interface ApprovalRequestFormProps {
  onSubmitSuccess?: () => void;
}

// Quill editor configuration (optional, customize as needed)
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link'];

export default function ClientApprovalRequestForm({ onSubmitSuccess }: ApprovalRequestFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<ClientContact[]>([]);

  // Replace contentHtml with Google Doc state
  const [googleDocId, setGoogleDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Data loading state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Load client contacts when a client is selected
  useEffect(() => {
    if (selectedClient) {
      fetchClientContacts(selectedClient.client_id);
    } else {
      setClientContacts([]);
      setSelectedContacts([]);
    }
  }, [selectedClient]);

  // Create a Google Doc when both client and title are provided
  useEffect(() => {
    // Reset doc if client or title changes significantly
    if (googleDocId && (!selectedClient || !title.trim())) {
      setGoogleDocId(null);
    }
  }, [selectedClient, title, googleDocId]);

  // Fetch clients
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await axios.get('/api/clients');
      // Filter to only active clients
      const activeClients = response.data.filter((client: any) => client.is_active);
      setClients(activeClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch client contacts
  const fetchClientContacts = async (clientId: number) => {
    setLoadingContacts(true);
    try {
      const response = await axios.get(`/api/clients/contacts?client_id=${clientId}`);
      // Filter to only active contacts
      const activeContacts = response.data.filter((contact: ClientContact) => contact.is_active);
      setClientContacts(activeContacts);
    } catch (error) {
      console.error('Error fetching client contacts:', error);
      setError('Failed to load client contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Handle contact selection
  const handleContactToggle = (contact: ClientContact) => {
    const currentIndex = selectedContacts.findIndex(c => c.contact_id === contact.contact_id);
    const newSelectedContacts = [...selectedContacts];

    if (currentIndex === -1) {
      newSelectedContacts.push(contact);
    } else {
      newSelectedContacts.splice(currentIndex, 1);
    }

    setSelectedContacts(newSelectedContacts);
  };

  // Function to trigger Google Doc creation
  const handleCreateGoogleDoc = () => {
    // Only proceed if we have both client and title, and we're not already loading
    if (selectedClient && title.trim() && !docLoading) {
      createNewGoogleDoc(selectedClient.client_name, title.trim());
    }
  };

  // Create a new Google Doc with client name and title
  const createNewGoogleDoc = async (clientName: string, articleTitle: string) => {
    setDocLoading(true);
    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Log token for debugging (but truncate for security)
      if (token) {
        console.log('Using auth token (first 10 chars):', token.substring(0, 10) + '...');
      } else {
        console.warn('No auth token found in localStorage');
      }

      // Make the API call with auth token in the header
      const response = await axios.post(
        '/api/google-docs/create',
        {
          title: `${clientName} - ${articleTitle}`,
        },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      setGoogleDocId(response.data.docId);
      setDocError(null);
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      setDocError('Failed to create editable document. Please try again.');
    } finally {
      setDocLoading(false);
    }
  };

  // Function to get Google Doc content when submitting
  const getGoogleDocContent = async () => {
    if (!googleDocId) return '';

    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Make the API call with auth token in the header
      const response = await axios.get(`/api/google-docs/content?docId=${googleDocId}`, {
        headers: {
          'x-auth-token': token,
        },
      });
      return response.data.content;
    } catch (error) {
      console.error('Error fetching Google Doc content:', error);
      throw new Error('Failed to retrieve document content');
    }
  };

  // Handle form submission - modified to use Google Doc content
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }

    if (!googleDocId) {
      setError('Document is not ready. Please try again.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Instead of getting HTML content, just use the Google Doc URL
      const googleDocUrl = `https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing&embedded=true&rm=minimal`;

      // Create the approval request with Google Doc URL
      const approvalRequestData = {
        clientId: selectedClient.client_id,
        title,
        description,
        inlineContent: googleDocUrl, // Store the Google Doc URL instead of HTML content
        contactIds: selectedContacts.map(c => c.contact_id),
        googleDocId: googleDocId, // Also store the raw doc ID for reference
        contentType: 'google_doc', // Flag to indicate this is a Google Doc URL
      };

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Log token for debugging (but truncate for security)
      if (token) {
        console.log('Using auth token (first 10 chars):', token.substring(0, 10) + '...');
      } else {
        console.warn('No auth token found in localStorage');
      }

      // Submit the approval request to the backend with auth token
      await axios.post('/api/approval-requests', approvalRequestData, {
        headers: {
          'x-auth-token': token,
        },
      });

      // Set success state
      setSuccess(true);

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedClient(null);
      setSelectedContacts([]);
      setGoogleDocId(null);

      // Create a new doc for the next submission
      handleCreateGoogleDoc();

      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting approval request:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit approval request';
      const statusCode = error.response?.status;

      // Show a more detailed error message including status code if available
      setError(`${errorMessage} ${statusCode ? `(Status: ${statusCode})` : ''}`);

      // Log more details for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Load Google API Client Library */}
      <Script src="https://apis.google.com/js/api.js" strategy="beforeInteractive" />

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create Content Approval Request
        </Typography>

        {success ? (
          <Box my={3}>
            <Alert severity="success">Approval request submitted successfully!</Alert>
            <Box mt={2}>
              <Button variant="contained" onClick={() => setSuccess(false)}>
                Create Another Request
              </Button>
            </Box>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Client Selection */}
              <Grid item xs={12}>
                <Autocomplete
                  id="client-select"
                  options={clients}
                  loading={loadingClients}
                  getOptionLabel={(option: Client) => option.client_name}
                  value={selectedClient}
                  onChange={(_: React.SyntheticEvent, newValue: Client | null) =>
                    setSelectedClient(newValue)
                  }
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Select Client"
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingClients ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Title */}
              <Grid item xs={12}>
                <TextField
                  label="Article Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  fullWidth
                  required
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  label="Notes for Client"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Enter any notes or instructions for the client..."
                />
              </Grid>

              {/* Replace ReactQuill with Google Doc iframe */}
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  component="label"
                  sx={{ display: 'block', mb: 1 }}
                >
                  Content for Review <span style={{ color: 'red' }}>*</span>
                  {googleDocId && (
                    <Button
                      variant="text"
                      size="small"
                      color="primary"
                      onClick={() => setShowOverlay(true)}
                      sx={{ ml: 1, fontSize: '0.8rem', textTransform: 'none', p: 0 }}
                    >
                      Having trouble editing?
                    </Button>
                  )}
                </Typography>

                {docError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {docError}
                  </Alert>
                )}

                {docLoading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="300px"
                    border="1px solid"
                    borderColor="rgba(0, 0, 0, 0.23)"
                    borderRadius={1}
                  >
                    <CircularProgress />
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      Creating document editor...
                    </Typography>
                  </Box>
                ) : googleDocId ? (
                  <Box>
                    <Box
                      sx={{
                        height: '500px',
                        border: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                        borderRadius: 1,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <iframe
                        src={`https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing&embedded=true&rm=minimal`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                      ></iframe>

                      {/* Overlay button for direct access */}
                      {showOverlay && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.9)',
                            zIndex: 1,
                          }}
                        >
                          <Box
                            sx={{
                              textAlign: 'center',
                              p: 2,
                              maxWidth: '80%',
                              position: 'relative',
                            }}
                          >
                            <Button
                              sx={{ position: 'absolute', right: -10, top: -10 }}
                              size="small"
                              onClick={() => setShowOverlay(false)}
                            >
                              ✕
                            </Button>
                            <Typography variant="body1" gutterBottom>
                              If you&apos;re having trouble accessing the document due to Google
                              account permissions:
                            </Typography>
                            <Button
                              variant="contained"
                              color="primary"
                              href={`https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing&rm=minimal`}
                              target="_blank"
                              sx={{ mt: 2 }}
                            >
                              Open Document in New Tab
                            </Button>
                            <Typography variant="body2" sx={{ mt: 2 }}>
                              Please make edits in the new tab, then return here to continue.
                            </Typography>
                            <Button
                              variant="text"
                              color="secondary"
                              onClick={() => setShowOverlay(false)}
                              sx={{ mt: 1 }}
                            >
                              Try embedded view anyway
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ) : selectedClient && title.trim() ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    height="300px"
                    border="1px solid"
                    borderColor="rgba(0, 0, 0, 0.23)"
                    borderRadius={1}
                  >
                    <Typography variant="body1" gutterBottom>
                      Ready to create document for:{' '}
                      <strong>
                        {selectedClient.client_name} - {title}
                      </strong>
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreateGoogleDoc}
                      startIcon={<UploadIcon />}
                      sx={{ mt: 2 }}
                    >
                      Create Document
                    </Button>
                  </Box>
                ) : (
                  <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    height="300px"
                    border="1px solid"
                    borderColor="rgba(0, 0, 0, 0.23)"
                    borderRadius={1}
                  >
                    <Typography variant="body1" gutterBottom color="text.secondary">
                      Please select a client and enter a title to create your document.
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* Contact Selection */}
              <Grid item xs={12}>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend">Select Contacts for Approval</FormLabel>

                  {loadingContacts ? (
                    <Box display="flex" alignItems="center" sx={{ mt: 2 }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body2">Loading contacts...</Typography>
                    </Box>
                  ) : clientContacts.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {selectedClient
                        ? 'No contacts found for this client. Please add contacts first.'
                        : 'Select a client to view contacts'}
                    </Alert>
                  ) : (
                    <FormGroup>
                      {clientContacts.map(contact => (
                        <FormControlLabel
                          key={contact.contact_id}
                          control={
                            <Checkbox
                              checked={selectedContacts.some(
                                c => c.contact_id === contact.contact_id
                              )}
                              onChange={() => handleContactToggle(contact)}
                            />
                          }
                          label={
                            <React.Fragment>
                              {contact.name}
                              {contact.job_title && (
                                <span>
                                  {' '}
                                  (<i>{contact.job_title}</i>)
                                </span>
                              )}
                              {' - '}
                              {contact.email}
                            </React.Fragment>
                          }
                        />
                      ))}
                    </FormGroup>
                  )}

                  <FormHelperText>
                    These contacts will receive an email to review the content
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={
                      submitting ||
                      !selectedClient ||
                      selectedContacts.length === 0 ||
                      !googleDocId ||
                      !title.trim()
                    }
                  >
                    {submitting ? <CircularProgress size={24} /> : 'Submit for Approval'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </>
  );
}
