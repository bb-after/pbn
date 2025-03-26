import React, { useState, useEffect } from 'react';
import { Typography, TextField, Chip, CircularProgress, Box, Paper } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';

interface Industry {
  industry_id: number;
  industry_name: string;
}

interface IndustryMappingSelectorProps {
  selectedIndustries: Industry[];
  onChange: (industries: Industry[]) => void;
  title?: string;
  description?: string;
  paperWrapper?: boolean;
}

const IndustryMappingSelector: React.FC<IndustryMappingSelectorProps> = ({
  selectedIndustries,
  onChange,
  title = 'Industry Mappings',
  description = 'Select industries that this specializes in.',
  paperWrapper = false,
}) => {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchIndustries = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/industries');
        setIndustries(response.data);
      } catch (error) {
        console.error('Error fetching industries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIndustries();
  }, []);

  const sortedIndustries = industries.sort((a, b) =>
    a.industry_name.localeCompare(b.industry_name)
  );

  const content = (
    <>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      <Box my={2}>
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Autocomplete
            multiple
            id="industries"
            options={sortedIndustries}
            getOptionLabel={option => `${option.industry_name}`}
            value={selectedIndustries}
            onChange={(_, newValue) => onChange(newValue)}
            renderInput={params => (
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
                  label={`${option.industry_name}`}
                  sx={{
                    backgroundColor: '#e0f7fa',
                    m: 0.3,
                  }}
                />
              ))
            }
            renderOption={(props, option) => (
              <li {...props}>
                <Typography variant="body2">{option.industry_name}</Typography>
              </li>
            )}
          />
        )}
        {description && (
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>
    </>
  );

  if (paperWrapper) {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {content}
      </Paper>
    );
  }

  return content;
};

export default IndustryMappingSelector;
