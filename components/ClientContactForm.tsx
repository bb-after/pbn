import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import axios from 'axios';

interface ClientContact {
  contact_id?: number;
  client_id: number;
  name: string;
  job_title?: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ClientContactFormProps {
  clientId: number;
  contact?: ClientContact;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ClientContactForm({
  clientId,
  contact,
  open,
  onClose,
  onSave,
}: ClientContactFormProps) {
  const isEditMode = Boolean(contact?.contact_id);
  const initialFormData = contact || {
    client_id: clientId,
    name: '',
    email: '',
    phone: '',
    is_active: true,
  };

  const [formData, setFormData] = useState<Partial<ClientContact>>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens with a new contact
  useEffect(() => {
    if (open) {
      setFormData(
        contact || {
          client_id: clientId,
          name: '',
          email: '',
          phone: '',
          is_active: true,
        }
      );
    }
  }, [open, contact, clientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    const newValue = name === 'is_active' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('usertoken') : null;

      // Prepare headers with auth token
      const headers = {
        'x-auth-token': token,
      };

      const payload = {
        ...formData,
        client_id: clientId,
      };

      if (isEditMode && contact?.contact_id) {
        // Update existing contact
        await axios.put(`/api/clients/contacts/${contact.contact_id}`, payload, { headers });
      } else {
        // Create new contact
        await axios.post('/api/clients/contacts', payload, { headers });

        // Reset form data for next time the form is opened
        setFormData({
          client_id: clientId,
          name: '',
          email: '',
          phone: '',
          is_active: true,
        });
      }

      setLoading(false);
      onSave();
      onClose(); // Always close the modal after successful submission
    } catch (error: any) {
      console.error('Error saving contact:', error);
      setError(error.response?.data?.error || 'Failed to save contact');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                fullWidth
                required
                autoFocus
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Job Title (optional)"
                name="job_title"
                value={formData.job_title || ''}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Phone Number (optional)"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            {isEditMode && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !formData.name || !formData.email}
          >
            {loading ? <CircularProgress size={24} /> : isEditMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
