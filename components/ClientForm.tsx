import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import IndustryMappingSelector from './IndustryMappingSelector';
import RegionMappingSelector from './RegionMappingSelector';
import axios from 'axios';

interface Industry {
  industry_id: number;
  industry_name: string;
}

interface Region {
  region_id: number;
  region_name: string;
  region_type: string;
  parent_region_id: number | null;
}

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

interface ClientFormProps {
  client: Client | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const [clientName, setClientName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = Boolean(client);

  // Load client data if in edit mode
  useEffect(() => {
    if (client) {
      setClientName(client.client_name);
      setIsActive(Boolean(client.is_active));

      // Fetch client mappings
      const fetchMappings = async () => {
        setLoading(true);
        try {
          const response = await axios.get(
            `/api/clients/mappings?client_id=${client.client_id}&type=all`
          );

          // Set selected industries
          if (response.data.industries) {
            setSelectedIndustries(response.data.industries);
          }

          // Set selected regions
          if (response.data.regions) {
            setSelectedRegions(response.data.regions);
          }
        } catch (error) {
          console.error('Error fetching client mappings:', error);
          setError('Failed to load client mappings');
        } finally {
          setLoading(false);
        }
      };

      fetchMappings();
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        clientName,
        isActive: isActive ? 1 : 0,
        industries: selectedIndustries.map(i => i.industry_id),
        regions: selectedRegions.map(r => r.region_id),
      };

      if (isEditMode) {
        // Update existing client
        await axios.put(`/api/clients/${client!.client_id}`, payload);
      } else {
        // Create new client
        await axios.post('/api/clients', payload);
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving client:', error);
      setError(error.response?.data?.error || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Client Name"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            fullWidth
            variant="outlined"
            required
            autoFocus
          />
        </Grid>

        {isEditMode && (
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  color="primary"
                />
              }
              label="Active"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <IndustryMappingSelector
            selectedIndustries={selectedIndustries}
            onChange={setSelectedIndustries}
            description="Select industries that this client specializes in."
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <RegionMappingSelector
            selectedRegions={selectedRegions}
            onChange={setSelectedRegions}
            description="Select geographic regions that this client targets."
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !clientName}
            >
              {loading ? <CircularProgress size={24} /> : isEditMode ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
}
