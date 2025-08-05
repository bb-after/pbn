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
import { CloudUpload as UploadIcon, Google } from '@mui/icons-material';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import ClientContactForm from './ClientContactForm';
import type { ClientContact } from './ClientContactForm';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { IntercomButton } from './ui';

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

interface ApprovalRequestFormProps {
  onSubmitSuccess?: () => void;
  googleAccessToken?: string;
  onGoogleLoginSuccess?: (response: any) => void;
  googleClientId?: string;
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

export default function ClientApprovalRequestForm({
  onSubmitSuccess,
  googleAccessToken,
  onGoogleLoginSuccess,
  googleClientId,
}: ApprovalRequestFormProps) {
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
  const [editorMode, setEditorMode] = useState({
    isMinimal: true,
    refreshKey: 0,
  });

  // Data loading state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Add state for the new slack channel field
  const [slackChannel, setSlackChannel] = useState('');

  // Add workflow type selection
  const [workflowType, setWorkflowType] = useState<'google_doc' | 'recogito_html'>('google_doc');

  // Contact form state
  const [contactFormOpen, setContactFormOpen] = useState(false);

  // Add this state for storing the real access token
  const [accessToken, setAccessToken] = useState<string | null>(googleAccessToken || null);

  // Add this state for storing the login prompt
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Add this state for storing the required approvals
  const [requiredApprovals, setRequiredApprovals] = useState<number>(1);

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

  // When selectedContacts changes, reset requiredApprovals to 1 if needed
  useEffect(() => {
    if (
      selectedContacts.length > 0 &&
      (requiredApprovals < 1 || requiredApprovals > selectedContacts.length)
    ) {
      setRequiredApprovals(1);
    }
  }, [selectedContacts]);

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

  // Update handleCreateGoogleDoc to check for token and show login
  const handleCreateGoogleDoc = () => {
    // Only proceed if we have both client and title, and we're not already loading
    if (selectedClient && title.trim() && !docLoading) {
      if (accessToken || googleAccessToken) {
        // Use the non-null access token
        const token = accessToken || googleAccessToken || '';
        createNewGoogleDoc(selectedClient.client_name, title.trim(), token);
      } else {
        // Instead of calling login() directly, set a state that shows the login button
        setShowLoginPrompt(true);
      }
    }
  };

  // Modify createNewGoogleDoc to require access token
  const createNewGoogleDoc = async (clientName: string, articleTitle: string, token: string) => {
    setDocLoading(true);
    try {
      // Get auth token from localStorage
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Log token for debugging (but truncate for security)
      if (authToken) {
        console.log('Using auth token (first 10 chars):', authToken.substring(0, 10) + '...');
      } else {
        console.warn('No auth token found in localStorage');
      }

      // Make the API call with auth token in the header
      const response = await axios.post(
        '/api/google-docs/create',
        {
          title: `${clientName} - ${articleTitle}`,
          googleAccessToken: token, // Pass the actual access token
        },
        {
          headers: {
            'x-auth-token': authToken,
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
      // Determine content type and URL based on workflow
      let inlineContent: string;
      let contentType: string;

      if (workflowType === 'recogito_html') {
        // For Recogito flow, we'll need to convert the Google Doc to HTML
        // For now, we'll store the Google Doc ID and convert it later
        inlineContent = `https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing&embedded=true&rm=minimal`;
        contentType = 'google_doc_recogito'; // New content type for Recogito workflow
      } else {
        // Traditional Google Doc flow
        inlineContent = `https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing&embedded=true&rm=minimal`;
        contentType = 'google_doc';
      }

      // Create the approval request with Google Doc URL
      const approvalRequestData = {
        clientId: selectedClient.client_id,
        title,
        description,
        inlineContent,
        contactIds: selectedContacts.map(c => c.contact_id),
        googleDocId: googleDocId,
        contentType,
        workflowType, // Add workflow type to the request
        googleAccessToken,
        requiredApprovals: requiredApprovals || selectedContacts.length,
        slackChannel: slackChannel,
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

  // Handle successful contact addition
  const handleContactAdded = (newContact: ClientContact) => {
    // Refresh the contacts list
    if (selectedClient) {
      fetchClientContacts(selectedClient.client_id);

      // Pre-select the newly added contact
      setSelectedContacts(prevSelected => {
        // Check if this contact is already selected (shouldn't be, but just in case)
        const isAlreadySelected = prevSelected.some(
          contact => contact.contact_id === newContact.contact_id
        );

        // Only add if not already selected
        if (!isAlreadySelected) {
          return [...prevSelected, newContact];
        }

        return prevSelected;
      });
    }
  };

  // Replace the handleEditorModeToggle function with an in-place solution
  const handleEditorModeToggle = () => {
    // Toggle minimal mode and increment the refresh key to force iframe reload
    setEditorMode(prev => ({
      isMinimal: !prev.isMinimal,
      refreshKey: prev.refreshKey + 1,
    }));

    // Show a temporary loading overlay
    setShowOverlay(true);

    // Hide the overlay after a brief delay to give the iframe time to reload
    setTimeout(() => {
      setShowOverlay(false);
    }, 1500);
  };

  // Function to handle successful login
  const handleLoginSuccess = (tokenResponse: any) => {
    console.log('Google login successful, got access token');
    const newToken = tokenResponse.access_token;
    setAccessToken(newToken);

    // Also call the parent's success handler if it exists
    if (onGoogleLoginSuccess) {
      onGoogleLoginSuccess({ credential: newToken });
    }

    // If the user already filled in client and title, create the doc right away
    if (selectedClient && title.trim()) {
      setTimeout(() => createNewGoogleDoc(selectedClient.client_name, title.trim(), newToken), 500);
    }

    // Hide the login prompt
    setShowLoginPrompt(false);
  };

  // Create a wrapper component that uses useGoogleLogin hook inside the GoogleOAuthProvider
  const GoogleLoginButton = () => {
    const login = useGoogleLogin({
      onSuccess: handleLoginSuccess,
      onError: error => {
        console.error('Google login failed:', error);
        setDocError('Google sign-in failed. Please try again.');
      },
      scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive',
    });

    return (
      <Button variant="contained" color="primary" onClick={() => login()} startIcon={<Google />}>
        Sign in with Google
      </Button>
    );
  };

  return (
    <>
      {/* Load Google API Client Library */}
      <Script src="https://apis.google.com/js/api.js" strategy="beforeInteractive" />

      {/* Contact Form Dialog */}
      {selectedClient && (
        <ClientContactForm
          clientId={selectedClient.client_id}
          open={contactFormOpen}
          onClose={() => setContactFormOpen(false)}
          onSave={handleContactAdded}
        />
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
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

              {/* Workflow Type Selection */}
              <Grid item xs={12}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend">Review Workflow Type</FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={workflowType === 'google_doc'}
                          onChange={() => setWorkflowType('google_doc')}
                        />
                      }
                      label="Traditional Google Doc Flow - Clients use native Google Docs commenting"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={workflowType === 'recogito_html'}
                          onChange={() => setWorkflowType('recogito_html')}
                        />
                      }
                      label="Recogito HTML Flow - Clients use our custom commenting interface (no Google auth required)"
                    />
                  </FormGroup>
                  <FormHelperText>
                    Choose how clients will review and comment on the content. The Recogito flow
                    provides a more controlled experience.
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Google Doc iframe */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    component="label"
                    sx={{ display: 'inline-flex', alignItems: 'center' }}
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

                  {googleDocId && (
                    <Button
                      variant="text"
                      size="small"
                      color="secondary"
                      onClick={handleEditorModeToggle}
                      sx={{ fontSize: '0.8rem', textTransform: 'none', p: 0 }}
                    >
                      {editorMode.isMinimal ? 'Use Standard Editor' : 'Use Minimal Editor'}
                    </Button>
                  )}
                </Box>

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
                        key={`google-doc-iframe-${editorMode.refreshKey}`}
                        src={`https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing&embedded=true${editorMode.isMinimal ? '&rm=minimal' : ''}`}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                      ></iframe>
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
                              p: 3,
                              maxWidth: '80%',
                              position: 'relative',
                              bgcolor: 'background.paper',
                              borderRadius: 2,
                              boxShadow: 3,
                            }}
                          >
                            <Button
                              sx={{ position: 'absolute', right: -10, top: -10 }}
                              size="small"
                              onClick={() => setShowOverlay(false)}
                            >
                              ✕
                            </Button>
                            <Typography variant="h6" gutterBottom>
                              Google Account Access
                            </Typography>
                            <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
                              If you&apos;re having trouble accessing the document, try one of these
                              options:
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  href={`https://docs.google.com/document/d/${googleDocId}/edit?usp=sharing`}
                                  target="_blank"
                                  fullWidth
                                >
                                  Open in New Tab
                                </Button>
                              </Grid>
                              <Grid item xs={12}>
                                <Button
                                  variant="text"
                                  color="secondary"
                                  onClick={() => setShowOverlay(false)}
                                >
                                  Close
                                </Button>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>
                      )}
                    </Box>
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
                    {selectedClient && title.trim() ? (
                      <>
                        <Typography variant="body1" gutterBottom>
                          Ready to create document for:{' '}
                          <strong>
                            {selectedClient.client_name} - {title}
                          </strong>
                        </Typography>

                        {(!accessToken && !googleAccessToken && googleClientId) ||
                        showLoginPrompt ? (
                          <Box my={2} textAlign="center">
                            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
                              Please sign in with Google to create the document:
                            </Alert>
                            {googleClientId && (
                              <GoogleOAuthProvider clientId={googleClientId}>
                                <GoogleLoginButton />
                              </GoogleOAuthProvider>
                            )}
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleCreateGoogleDoc}
                            startIcon={<UploadIcon />}
                            sx={{ mt: 2 }}
                          >
                            Create Document
                          </Button>
                        )}
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Please select a client and enter a title to create your document.
                      </Typography>
                    )}
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
                    <Box>
                      <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                        {selectedClient
                          ? 'No contacts found for this client.'
                          : 'Select a client to view contacts'}
                      </Alert>
                      {selectedClient && (
                        <Box display="flex" justifyContent="flex-start">
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => setContactFormOpen(true)}
                          >
                            Add Contact
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="body2" color="text.secondary">
                          Select contacts who should review this content:
                        </Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => setContactFormOpen(true)}
                        >
                          Add Contact
                        </Button>
                      </Box>
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
                            label={`${contact.name} - ${contact.email}`}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                  )}
                  <FormHelperText>
                    These contacts will receive an email to review the content
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Required Approvals & Slack Channel */}
              {selectedContacts.length > 1 && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <FormLabel component="legend">Required Approvals</FormLabel>
                    <TextField
                      type="number"
                      value={requiredApprovals}
                      onChange={e => {
                        const numValue = parseInt(e.target.value, 10);
                        if (
                          !isNaN(numValue) &&
                          numValue >= 1 &&
                          numValue <= selectedContacts.length
                        ) {
                          setRequiredApprovals(numValue);
                        }
                      }}
                      InputProps={{
                        inputProps: {
                          min: 1,
                          max: selectedContacts.length,
                        },
                      }}
                      helperText={`Approvals needed: ${requiredApprovals} of ${selectedContacts.length}`}
                      margin="normal"
                    />
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={selectedContacts.length > 1 ? 6 : 12}>
                <FormControl fullWidth>
                  <FormLabel component="legend">Slack Notifications (Optional)</FormLabel>
                  <TextField
                    label="Project Slack Channel"
                    value={slackChannel}
                    onChange={e => {
                      let value = e.target.value;
                      // Automatically prepend '#' if it's missing and the field is not empty
                      if (value && !value.startsWith('#')) {
                        value = '#' + value;
                      }
                      setSlackChannel(value);
                    }}
                    margin="normal"
                    placeholder="e.g., #project-approvals"
                    helperText="Overrides default notification channel."
                  />
                </FormControl>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Divider sx={{ my: 3 }} />
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
          </form>
        )}
      </Paper>
    </>
  );
}
