import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { LocationResult } from '../pages/api/serpapi-locations';

interface LocationTypeaheadProps {
  value: string;
  onChange: (canonicalName: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  fullWidth?: boolean;
  variant?: 'standard' | 'filled' | 'outlined';
}

const LocationTypeahead: React.FC<LocationTypeaheadProps> = ({
  value,
  onChange,
  label = 'Geographic Location (Optional)',
  placeholder = 'e.g. New York, NY or London, UK',
  helperText = 'Start typing to search for locations',
  fullWidth = true,
  variant = 'outlined',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/serpapi-locations?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      
      if (response.ok && data.locations) {
        setSuggestions(data.locations);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } else {
        console.error('Failed to fetch locations:', data.error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (location: LocationResult) => {
    setInputValue(location.canonical_name);
    onChange(location.canonical_name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Format location display text
  const formatLocationText = (location: LocationResult) => {
    return {
      primary: location.name,
      secondary: location.canonical_name.replace(location.name + ',', '').trim(),
      reach: location.reach ? ` (${(location.reach / 1000000).toFixed(1)}M people)` : ''
    };
  };

  return (
    <Box position="relative">
      <TextField
        ref={inputRef}
        fullWidth={fullWidth}
        label={label}
        variant={variant}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        helperText={helperText}
        InputProps={{
          endAdornment: isLoading && (
            <CircularProgress size={20} />
          ),
        }}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Paper
          ref={suggestionsRef}
          elevation={3}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: '300px',
            overflow: 'auto',
            mt: 1,
          }}
        >
          <List dense>
            {suggestions.map((location, index) => {
              const { primary, secondary, reach } = formatLocationText(location);
              return (
                <ListItem
                  key={location.id}
                  button
                  selected={index === highlightedIndex}
                  onClick={() => handleSuggestionClick(location)}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" component="span">
                        {primary}
                        <Typography 
                          variant="caption" 
                          component="span" 
                          sx={{ ml: 1, color: 'text.secondary' }}
                        >
                          {location.target_type}
                        </Typography>
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {secondary}
                        <Typography 
                          variant="caption" 
                          component="span" 
                          sx={{ color: 'primary.main', fontWeight: 'medium' }}
                        >
                          {reach}
                        </Typography>
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default LocationTypeahead;