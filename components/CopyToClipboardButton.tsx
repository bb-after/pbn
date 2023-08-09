import React, { useState } from 'react';
import { Button, Snackbar, IconButton } from '@mui/material';
import { ContentCopy as ContentCopyIcon, Close as CloseIcon } from '@mui/icons-material';

const CopyToClipboardButton: React.FC<{ text: string }> = ({ text }) => {
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
        const transformedText = text.replace(/<br\s*\/?>/g, '\n'); // Replace <br> tags with line breaks
        await navigator.clipboard.writeText(transformedText);
        setIsSnackbarOpen(true);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setIsSnackbarOpen(false);
  };

  return (
    <div>
        <Button
        startIcon={<ContentCopyIcon />}
        variant="outlined"
        color="primary"
        onClick={handleCopyToClipboard}
        >
        Copy to Clipboard
        </Button>
  
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        open={isSnackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message="Copied to clipboard"
        action={
<IconButton size="small" color="inherit" onClick={handleCloseSnackbar}>
  <CloseIcon fontSize="small" />
</IconButton>
        }
      />
    </div>
  );
};

export default CopyToClipboardButton;