import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

interface SiteClientPostsModalProps {
  open: boolean;
  onClose: () => void;
  siteId?: number;
  siteName?: string;
}

const SiteClientPostsModal: React.FC<SiteClientPostsModalProps> = ({
  open,
  onClose,
  siteId,
  siteName,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Client Posts for {siteName || 'Site'} (ID: {siteId})
      </DialogTitle>
      <DialogContent>
        <Box my={2}>
          <Typography variant="body1">
            This modal is under development. It will display client posts for the selected site.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SiteClientPostsModal;
