import React, { useRef, useEffect } from 'react';
import {
  TextField,
  Button,
  IconButton,
  Paper,
  Typography,
  Box,
  Stack,
  InputAdornment,
  alpha,
  Chip,
} from '@mui/material';
import { Link, Plus, ExternalLink, DeleteIcon } from 'lucide-react';

interface BacklinkInputsProps {
  backlinks: string[]; // Replace `YourBacklinksType` with the actual type of `backlinks`
  setBacklinks: (newBacklinks: string[]) => void; // Assuming `setBacklinks` is a state setter function
}

const BacklinkInputs: React.FC<BacklinkInputsProps> = ({ backlinks, setBacklinks }) => {
  const newestInputRef = useRef<HTMLInputElement>(null); // Step 1: Create a reference
  const addBacklink = () => {
    if (backlinks.length < 20) {
      setBacklinks([...backlinks, '']);
    }
  };

  useEffect(() => {
    // Step 3: Focus on the input when the backlinks length changes
    if (newestInputRef.current && backlinks.length > 1) {
      newestInputRef.current.focus();
    }
  }, [backlinks.length]);

  const removeBacklink = (index: number) => {
    const updatedBacklinks = [...backlinks];
    updatedBacklinks.splice(index, 1);
    setBacklinks(updatedBacklinks);
  };

  const updateBacklink = (index: number, value: string) => {
    const updatedBacklinks = [...backlinks];
    updatedBacklinks[index] = value;
    setBacklinks(updatedBacklinks);
  };

  return (
    <Paper
      sx={{
        p: 3,
        border: '2px solid',
        borderColor: alpha('#06b6d4', 0.1),
        borderRadius: 2,
        bgcolor: alpha('#ecfeff', 0.3),
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
          borderRadius: '2px 2px 0 0',
        },
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ExternalLink size={20} color="white" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#0891b2' }}>
          Backlink URLs
        </Typography>
        <Chip
          label="SEO Power"
          size="small"
          sx={{
            bgcolor: alpha('#06b6d4', 0.1),
            color: '#0891b2',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <Stack spacing={2}>
        {backlinks.map((backlink, index) => (
          <Box key={index} display="flex" alignItems="flex-end" gap={2}>
            <TextField
              label={`Backlink URL ${index + 1}`}
              value={backlink}
              type="url"
              inputRef={index === backlinks.length - 1 ? newestInputRef : null}
              onChange={e => updateBacklink(index, e.target.value)}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: `0 4px 12px -4px ${alpha('#06b6d4', 0.2)}`,
                  },
                  '&.Mui-focused': {
                    boxShadow: `0 4px 12px -4px ${alpha('#06b6d4', 0.3)}`,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#0891b2',
                  fontWeight: 500,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Link size={18} color="#06b6d4" />
                  </InputAdornment>
                ),
              }}
              placeholder="https://example.com/target-page"
            />
            {index > 0 && (
              <IconButton
                onClick={() => removeBacklink(index)}
                sx={{
                  color: '#ef4444',
                  mb: 1,
                  '&:hover': {
                    bgcolor: alpha('#ef4444', 0.1),
                    color: '#dc2626',
                  },
                }}
                aria-label="delete"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        ))}

        <Box mt={2}>
          <Button
            variant="outlined"
            onClick={addBacklink}
            disabled={backlinks.length >= 20}
            sx={{
              borderColor: '#06b6d4',
              color: '#0891b2',
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 500,
              '&:hover': {
                borderColor: '#0891b2',
                bgcolor: alpha('#06b6d4', 0.05),
              },
            }}
            startIcon={<Plus size={18} />}
          >
            Add Another Backlink ({backlinks.length}/20)
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default BacklinkInputs;
