import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Autocomplete,
  Chip,
  CircularProgress,
  Paper,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Divider
} from '@mui/material';
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
  sub_regions?: Region[];
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
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = Boolean(client);

  // Load industries and regions data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [industriesRes, regionsRes] = await Promise.all([
          axios.get('/api/industries'),
          axios.get('/api/geo-regions?with_hierarchy=true')
        ]);
        setIndustries(industriesRes.data);
        setRegions(regionsRes.data);
      } catch (error) {
        console.error('Error fetching form data:', error);
        setError('Failed to load form data');
      }
    };

    fetchData();
  }, []);

  // Load client data if in edit mode
  useEffect(() => {
    if (client) {
      setClientName(client.client_name);
      setIsActive(Boolean(client.is_active));
      
      // Fetch client mappings
      const fetchMappings = async () => {
        setLoadingMappings(true);
        try {
          const response = await axios.get(`/api/clients/mappings?client_id=${client.client_id}&type=all`);
          
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
          setLoadingMappings(false);
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
        regions: selectedRegions.map(r => r.region_id)
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

  // Helper function to flatten nested regions for Autocomplete
  const flattenRegions = (regions: Region[]): Region[] => {
    let result: Region[] = [];
    
    for (const region of regions) {
      result.push(region);
      
      if (region.sub_regions && region.sub_regions.length > 0) {
        result = [...result, ...flattenRegions(region.sub_regions)];
      }
    }
    
    return result;
  };

  const allRegionsFlat = flattenRegions(regions);

  return (
    <>
      <DialogTitle>
        {isEditMode ? 'Edit Client' : 'Add New Client'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
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
                onChange={(e) => setClientName(e.target.value)}
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
                      onChange={(e) => setIsActive(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" gutterBottom>
                Industry Mappings
              </Typography>
              {loadingMappings ? (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Autocomplete
                  multiple
                  id="industries"
                  options={industries}
                  getOptionLabel={(option) => `${option.industry_id} - ${option.industry_name}`}
                  value={selectedIndustries}
                  onChange={(_, newValue) => setSelectedIndustries(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Select Industries"
                      placeholder="Add industries"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.industry_id}
                        label={`${option.industry_id} - ${option.industry_name}`}
                      />
                    ))
                  }
                />
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6" gutterBottom>
                Region Mappings
              </Typography>
              {loadingMappings ? (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Autocomplete
                  multiple
                  id="regions"
                  options={allRegionsFlat}
                  getOptionLabel={(option) => `${option.region_id} - ${option.region_name}`}
                  groupBy={(option) => option.region_type}
                  value={selectedRegions}
                  onChange={(_, newValue) => setSelectedRegions(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Select Regions"
                      placeholder="Add regions"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.region_id}
                        label={`${option.region_id} - ${option.region_name}`}
                      />
                    ))
                  }
                />
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || !clientName}
          >
            {loading ? <CircularProgress size={24} /> : isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </>
  );
}