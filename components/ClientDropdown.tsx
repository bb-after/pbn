import React, { useState, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  TextFieldProps,
} from "@mui/material";
import axios from "axios";

interface Client {
  client_id: number;
  client_name: string;
  is_active: number;
}

interface ClientDropdownProps {
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  margin?: TextFieldProps["margin"];
  required?: boolean;
  variant?: TextFieldProps["variant"];
  label?: string;
  onClientIdChange?: (clientId: number | null) => void;
  initialClientId?: number;
}

export default function ClientDropdown({
  value,
  onChange,
  fullWidth = false,
  margin = "none",
  required = false,
  variant = "outlined",
  label = "Client Name",
  onClientIdChange,
  initialClientId,
}: ClientDropdownProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const selectedClient = clients.find(
        (c) => c.client_id === initialClientId
      );
      if (selectedClient) {
        onChange(selectedClient.client_name);
        onClientIdChange?.(selectedClient.client_id);
      }
    }
  }, [initialClientId, clients, onChange, onClientIdChange]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/clients", {
        params: {
          active: "true",
        },
      });
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    _event: React.SyntheticEvent,
    newValue: string | null
  ) => {
    onChange(newValue || "");

    if (onClientIdChange) {
      const selectedClient = clients.find((c) => c.client_name === newValue);
      onClientIdChange(selectedClient?.client_id || null);
    }
  };

  return (
    <Autocomplete
      id="client-select"
      options={clients.map((client) => client.client_name)}
      value={value || null}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(_event, newValue) => setInputValue(newValue)}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant={variant}
          fullWidth={fullWidth}
          margin={margin}
          required={required}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
}
