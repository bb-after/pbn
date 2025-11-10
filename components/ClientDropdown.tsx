import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  TextFieldProps,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import axios from 'axios';
import ClientForm from './ClientForm';

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
}

interface ClientDropdownProps {
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  margin?: TextFieldProps['margin'];
  required?: boolean;
  variant?: TextFieldProps['variant'];
  label?: string;
  onClientIdChange?: (clientId: number | null) => void;
  initialClientId?: number;
  enableCreate?: boolean;
  sx?: TextFieldProps['sx'];
}

export default function ClientDropdown({
  value,
  onChange,
  fullWidth = false,
  margin = 'none',
  required = false,
  variant = 'outlined',
  label = 'Client Name',
  onClientIdChange,
  initialClientId,
  enableCreate = true,
  sx,
}: ClientDropdownProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingNewName, setPendingNewName] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.client_id === initialClientId);
      if (selectedClient) {
        onChange(selectedClient.client_name);
        onClientIdChange?.(selectedClient.client_id);
      }
    }
  }, [initialClientId, clients, onChange, onClientIdChange]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/clients', {
        params: {
          active: 'true',
        },
      });
      setClients(response.data);
      return response.data as Client[];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [] as Client[];
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: string | null) => {
    if (enableCreate && newValue && /^Add \".*\"$/.test(newValue)) {
      const name = newValue.replace(/^Add \"/, '').replace(/\"$/, '');
      setPendingNewName(name);
      setIsModalOpen(true);
      return;
    }

    onChange(newValue || '');

    if (onClientIdChange) {
      const selectedClient = clients.find(c => c.client_name === newValue);
      onClientIdChange(selectedClient?.client_id || null);
    }
  };

  return (
    <Box>
      <Autocomplete
        id="client-select"
        options={clients.map(client => client.client_name)}
        value={value || null}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_event, newValue) => setInputValue(newValue)}
        loading={loading}
        filterOptions={options => {
          const filtered = options.filter(opt =>
            opt.toLowerCase().includes((inputValue || '').toLowerCase())
          );
          if (
            enableCreate &&
            inputValue &&
            !options.some(opt => opt.toLowerCase() === inputValue.toLowerCase())
          ) {
            filtered.push(`Add "${inputValue}"`);
          }
          return filtered;
        }}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            variant={variant}
            fullWidth={fullWidth}
            margin={margin}
            required={required}
            sx={sx}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
            helperText={enableCreate ? "Can't find a client? Add a new one." : undefined}
          />
        )}
      />

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Client</DialogTitle>
        <DialogContent>
          <br />
          <ClientForm
            client={null}
            onSave={async () => {
              setIsModalOpen(false);
              const updated = await fetchClients();
              if (pendingNewName) {
                onChange(pendingNewName);
                const selected = updated.find(c => c.client_name === pendingNewName);
                onClientIdChange?.(selected?.client_id || null);
                setPendingNewName(null);
              }
            }}
            onCancel={() => setIsModalOpen(false)}
            hideRegionMappings
            initialName={pendingNewName || undefined}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
