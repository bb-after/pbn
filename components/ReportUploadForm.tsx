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
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import axios from 'axios';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import ClientContactForm from './ClientContactForm';
import type { ClientContact } from './ClientContactForm';

interface Client {
  client_id: number;
  client_name: string;
}

interface ReportUploadFormProps {
  onSubmitSuccess?: () => void;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function ReportUploadForm({ onSubmitSuccess }: ReportUploadFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<ClientContact[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Data loading state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Contact form state
  const [contactFormOpen, setContactFormOpen] = useState(false);

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

  // Fetch clients
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;
      const response = await axios.get('/api/clients', {
        headers: {
          'x-auth-token': token,
        },
      });
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;
      const response = await axios.get(`/api/clients/contacts?client_id=${clientId}`, {
        headers: {
          'x-auth-token': token,
        },
      });
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

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      setError('Please select a PDF, DOCX, or PPTX file.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 50MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      // First, upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', selectedClient.client_id.toString());

      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      const uploadResponse = await axios.post('/api/upload-file', formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      const fileUrl = uploadResponse.data.url;
      const fileType = selectedFile.type;
      const fileName = selectedFile.name;

      // Then create the report record
      const reportData = {
        clientId: selectedClient.client_id,
        title,
        description,
        fileUrl,
        fileType,
        fileName,
        contactIds: selectedContacts.map(c => c.contact_id),
      };

      await axios.post('/api/reports', reportData, {
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
      setSelectedFile(null);
      setUploadProgress(0);

      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload report';
      const statusCode = error.response?.status;

      setError(`${errorMessage} ${statusCode ? `(Status: ${statusCode})` : ''}`);

      // Log more details for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Handle successful contact addition
  const handleContactAdded = (newContact: ClientContact) => {
    // Refresh the contacts list
    if (selectedClient) {
      fetchClientContacts(selectedClient.client_id);

      // Pre-select the newly added contact
      setSelectedContacts(prevSelected => {
        const isAlreadySelected = prevSelected.some(
          contact => contact.contact_id === newContact.contact_id
        );

        if (!isAlreadySelected) {
          return [...prevSelected, newContact];
        }

        return prevSelected;
      });
    }
  };

  // Get file type display name
  const getFileTypeDisplay = (file: File) => {
    const extension = file.name.split('.').pop()?.toUpperCase();
    return extension || 'FILE';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
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
            <Alert severity="success" icon={<CheckIcon />}>
              Report uploaded successfully and shared with selected contacts!
            </Alert>
            <Box mt={2}>
              <Button variant="contained" onClick={() => setSuccess(false)}>
                Upload Another Report
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
                  label="Report Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  fullWidth
                  required
                  placeholder="Enter a descriptive title for this report"
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  label="Description (Optional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Enter any additional notes about this report..."
                />
              </Grid>

              {/* File Upload */}
              <Grid item xs={12}>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend">Upload Report File</FormLabel>
                  <FormHelperText sx={{ mb: 2 }}>
                    Accepted formats: PDF, DOCX, PPTX (Max size: 50MB)
                  </FormHelperText>

                  <Box sx={{ mt: 1 }}>
                    <input
                      accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      style={{ display: 'none' }}
                      id="file-upload"
                      type="file"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadIcon />}
                        sx={{ mb: 2 }}
                      >
                        Choose File
                      </Button>
                    </label>

                    {selectedFile && (
                      <Card variant="outlined" sx={{ mt: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <FileIcon color="primary" />
                            <Box flex={1}>
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {selectedFile.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getFileTypeDisplay(selectedFile)} •{' '}
                                {formatFileSize(selectedFile.size)}
                              </Typography>
                            </Box>
                            {submitting && (
                              <Box sx={{ minWidth: 100 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {uploadProgress}%
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          {submitting && uploadProgress > 0 && (
                            <LinearProgress
                              variant="determinate"
                              value={uploadProgress}
                              sx={{ mt: 1 }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                </FormControl>
              </Grid>

              {/* Contact Selection */}
              <Grid item xs={12}>
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend">Select Contacts to Share With</FormLabel>

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
                          Select contacts who should have access to this report:
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
                    </Box>
                  )}

                  <FormHelperText>
                    Selected contacts will be able to view and download this report
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
                      !title.trim() ||
                      !selectedFile ||
                      selectedContacts.length === 0
                    }
                    startIcon={submitting ? <CircularProgress size={20} /> : <UploadIcon />}
                  >
                    {submitting ? 'Uploading...' : 'Upload Report'}
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
