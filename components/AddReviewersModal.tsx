import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  CircularProgress,
  Alert,
  FormGroup,
  FormControlLabel,
  Typography,
  Box,
  Link,
  ListItemButton,
} from '@mui/material';
import axios from 'axios';

interface Contact {
  contact_id: number;
  name: string;
  email: string;
}

interface AddReviewersModalProps {
  open: boolean;
  onClose: () => void;
  requestId: number;
  clientId: number;
  currentReviewerIds: number[];
  onReviewersAdded: () => void;
}

export default function AddReviewersModal({
  open,
  onClose,
  requestId,
  clientId,
  currentReviewerIds,
  onReviewersAdded,
}: AddReviewersModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [notifyNewReviewers, setNotifyNewReviewers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      axios
        .get(`/api/clients/contacts?client_id=${clientId}`)
        .then(response => {
          setContacts(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch client contacts', err);
          setError('Could not load client contacts. Please try again.');
          setLoading(false);
        });
    } else {
      // Reset state on close
      setSelectedContacts([]);
      setError(null);
      setNotifyNewReviewers(true);
    }
  }, [open, clientId]);

  const handleToggleContact = (contactId: number): void => {
    setSelectedContacts(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  const handleSubmit = async () => {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact to add.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await axios.post(`/api/approval-requests/${requestId}/reviewers`, {
        contactIds: selectedContacts,
        notify: notifyNewReviewers,
      });
      onReviewersAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add reviewers', err);
      setError('An error occurred while adding reviewers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const newContactsSelected = selectedContacts.filter(id => !currentReviewerIds.includes(id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Reviewers</DialogTitle>
      <DialogContent dividers>
        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Select contacts from the list below to add them as reviewers to this request.
            </Typography>
            <List dense>
              {contacts.map(contact => {
                const isAlreadyReviewer = currentReviewerIds.includes(contact.contact_id);
                return (
                  <ListItem key={contact.contact_id} disablePadding>
                    <ListItemButton
                      onClick={() => !isAlreadyReviewer && handleToggleContact(contact.contact_id)}
                      disabled={isAlreadyReviewer}
                    >
                      <Checkbox
                        edge="start"
                        checked={isAlreadyReviewer || selectedContacts.includes(contact.contact_id)}
                        disabled={isAlreadyReviewer}
                        tabIndex={-1}
                      />
                      <ListItemText primary={contact.name} secondary={contact.email} />
                      {isAlreadyReviewer && (
                        <Typography variant="caption">Already a reviewer</Typography>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Need to add a new contact to this client?{' '}
                <Link href={`/clients/edit/${clientId}`} target="_blank" rel="noopener noreferrer">
                  Add a contact here
                </Link>
                .
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, display: 'flex', justifyContent: 'space-between' }}>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={notifyNewReviewers}
                onChange={e => setNotifyNewReviewers(e.target.checked)}
                disabled={newContactsSelected.length === 0}
              />
            }
            label="Notify new reviewers"
          />
        </FormGroup>
        <Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || newContactsSelected.length === 0}
          >
            {submitting ? (
              <CircularProgress size={24} />
            ) : (
              `Add ${newContactsSelected.length} Reviewer(s)`
            )}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
