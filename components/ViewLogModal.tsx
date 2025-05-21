import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  Typography,
  Grid,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

interface ContactView {
  contact_id: number;
  name: string;
  email: string;
  has_approved: boolean;
  approved_at: string | null;
  has_viewed: boolean;
  views: Array<{ view_id: number; viewed_at: string }>;
}

interface ViewLogModalProps {
  open: boolean;
  onClose: () => void;
  contactViews: ContactView | null;
  resendingContactId: number | null;
  onResendNotification: (contactId: number) => void;
}

const ViewLogModal: React.FC<ViewLogModalProps> = ({
  open,
  onClose,
  contactViews,
  resendingContactId,
  onResendNotification,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ mr: 2 }}>{contactViews?.name.charAt(0).toUpperCase() || '?'}</Avatar>
          <Box>
            {contactViews?.name || 'Contact'}
            <Typography variant="body2" color="text.secondary">
              {contactViews?.email}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Approval Status
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  {contactViews?.has_approved ? (
                    <>
                      <CheckIcon color="success" sx={{ mr: 1 }} />
                      <Typography>
                        Approved on{' '}
                        {contactViews.approved_at
                          ? new Date(contactViews.approved_at).toLocaleDateString()
                          : 'Unknown date'}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <CloseIcon color="disabled" sx={{ mr: 1 }} />
                      <Typography>Not approved yet</Typography>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" gutterBottom>
                  View Status
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  {contactViews?.has_viewed ? (
                    <>
                      <VisibilityIcon color="info" sx={{ mr: 1 }} />
                      <Typography>
                        Last viewed on{' '}
                        {contactViews.views && contactViews.views.length > 0
                          ? new Date(contactViews.views[0].viewed_at).toLocaleDateString()
                          : 'Unknown date'}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <VisibilityOffIcon color="disabled" sx={{ mr: 1 }} />
                      <Typography>Not viewed yet</Typography>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        <br />
        <br />
        <Typography variant="h6" gutterBottom>
          View History
        </Typography>
        {contactViews && contactViews.views.length > 0 ? (
          <TableContainer
            component={Paper}
            elevation={0}
            square
            variant="outlined"
            sx={{ maxHeight: '200px', overflow: 'auto' }}
          >
            <Table size="small" aria-label="view history table">
              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell>Time Viewed (Local)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contactViews.views.map(view => (
                  <TableRow
                    key={view.view_id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>{new Date(view.viewed_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            No views recorded for this contact.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        {contactViews && (
          <Button
            startIcon={
              resendingContactId === contactViews.contact_id ? (
                <CircularProgress size={20} />
              ) : (
                <EmailIcon />
              )
            }
            color="primary"
            variant="contained"
            onClick={() => contactViews && onResendNotification(contactViews.contact_id)}
            disabled={resendingContactId === contactViews?.contact_id}
            sx={{ mr: 'auto' }}
          >
            Send Notification
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewLogModal;
