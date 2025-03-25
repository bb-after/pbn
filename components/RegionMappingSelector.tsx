import React, { useState, useEffect } from 'react';
import { Typography, TextField, Chip, CircularProgress, Box, Paper } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import axios from 'axios';

interface Region {
  region_id: number;
  region_name: string;
  region_type: string;
  parent_region_id: number | null;
  sub_regions?: Region[];
}

interface RegionMappingSelectorProps {
  selectedRegions: Region[];
  onChange: (regions: Region[]) => void;
  title?: string;
  description?: string;
  paperWrapper?: boolean;
}

const RegionMappingSelector: React.FC<RegionMappingSelectorProps> = ({
  selectedRegions,
  onChange,
  title = 'Region Mappings',
  description = 'Select geographic regions that this targets.',
  paperWrapper = false,
}) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRegions = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/geo-regions?with_hierarchy=true');
        setRegions(response.data);
      } catch (error) {
        console.error('Error fetching regions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegions();
  }, []);

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

  // Sort regions alphabetically within each type group
  const sortedRegions = flattenRegions(regions).sort((a, b) => {
    // First sort by region_type to maintain groups
    if (a.region_type !== b.region_type) {
      // Custom order for region types
      const typeOrder = {
        continent: 1,
        country: 2,
        us_region: 3,
        state: 4,
        city: 5,
      };
      return (
        (typeOrder[a.region_type as keyof typeof typeOrder] || 99) -
        (typeOrder[b.region_type as keyof typeof typeOrder] || 99)
      );
    }
    // Then sort alphabetically within each type
    return a.region_name.localeCompare(b.region_name);
  });

  // Get friendly name for region type
  const getRegionTypeName = (regionType: string): string => {
    switch (regionType) {
      case 'continent':
        return 'Continents';
      case 'country':
        return 'Countries';
      case 'us_region':
        return 'US Regions';
      case 'state':
        return 'States';
      case 'city':
        return 'Cities';
      default:
        return regionType || 'Other';
    }
  };

  // Get color for region type
  const getRegionChipColor = (regionType: string): string => {
    switch (regionType) {
      case 'continent':
        return '#e3f2fd'; // light blue
      case 'country':
        return '#e8f5e9'; // light green
      case 'us_region':
        return '#f3e5f5'; // light purple
      case 'state':
        return '#fff3e0'; // light orange
      case 'city':
        return '#fce4ec'; // light pink
      default:
        return '#eeeeee'; // light grey
    }
  };

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
            id="regions"
            options={sortedRegions}
            getOptionLabel={option => `${option.region_name}`}
            groupBy={option => getRegionTypeName(option.region_type)}
            value={selectedRegions}
            onChange={(_, newValue) => onChange(newValue)}
            renderInput={params => (
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
                  label={`${option.region_name}`}
                  sx={{
                    backgroundColor: getRegionChipColor(option.region_type),
                    m: 0.3,
                  }}
                />
              ))
            }
            renderOption={(props, option) => (
              <li {...props}>
                <Typography variant="body2">
                  <strong>#{option.region_id}</strong> - {option.region_name}
                </Typography>
              </li>
            )}
            renderGroup={params => (
              <li key={params.key}>
                <Typography
                  variant="body1"
                  fontWeight="bold"
                  color="primary"
                  sx={{
                    p: 1,
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  {params.group}
                </Typography>
                <ul style={{ padding: 0 }}>{params.children}</ul>
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

export default RegionMappingSelector;
