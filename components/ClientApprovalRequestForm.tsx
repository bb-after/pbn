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

interface Client {
  client_id: number;
  client_name: string;
}

interface ClientContact {
  contact_id: number;
  client_id: number;
  name: string;
  email: string;
  is_active: boolean;
}

interface ApprovalRequestFormProps {
  onSubmitSuccess?: () => void;
}

export default function ClientApprovalRequestForm({ onSubmitSuccess }: ApprovalRequestFormProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<ClientContact[]>([]);
  const [file, setFile] = useState<File | null>(null);

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

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
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

  // Handle form submission
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

    if (!file) {
      setError('Please upload a file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // For testing purposes, just use a fake file URL
      // In production, uncomment this code to actually upload the file

      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('clientId', selectedClient.client_id.toString());
      // const fileUploadResponse = await axios.post('/api/upload-file-simple', formData);
      // const fileUrl = fileUploadResponse.data.url;

      // Use a dummy URL for testing
      const fileUrl = `/dummy-path/${file.name}`;
      const fileType = file.type;

      // 2. Create the approval request
      const approvalRequestData = {
        clientId: selectedClient.client_id,
        title,
        description,
        fileUrl,
        fileType,
        contactIds: selectedContacts.map(c => c.contact_id),
      };

      // Submit the approval request to the backend
      await axios.post('/api/approval-requests', approvalRequestData);

      // Set success state
      setSuccess(true);

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedClient(null);
      setSelectedContacts([]);
      setFile(null);

      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting approval request:', error);
      setError(error.response?.data?.error || 'Failed to submit approval request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
                getOptionLabel={option => option.client_name}
                value={selectedClient}
                onChange={(_, newValue) => setSelectedClient(newValue)}
                renderInput={params => (
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
                label="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                fullWidth
                required
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                multiline
                rows={4}
                fullWidth
                placeholder="Enter any notes or instructions for the client..."
              />
            </Grid>

            {/* File Upload */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Content
                </Typography>
                <input
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.google-apps.document"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload">
                  <Button component="span" variant="outlined" startIcon={<UploadIcon />}>
                    Select File
                  </Button>
                </label>
                {file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected file: {file.name}
                  </Typography>
                )}
              </Box>
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
                        label={`${contact.name} (${contact.email})`}
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
                    !file ||
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
  );
}
