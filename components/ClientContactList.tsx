import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import ClientContactForm from './ClientContactForm';

interface ClientContact {
  contact_id: number;
  client_id: number;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClientContactListProps {
  clientId: number;
  clientName: string;
}

export default function ClientContactList({ clientId, clientName }: ClientContactListProps) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [editContact, setEditContact] = useState<ClientContact | null>(null);

  const [deleteContact, setDeleteContact] = useState<ClientContact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/clients/contacts?client_id=${clientId}`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Load contacts on mount and when clientId changes
  useEffect(() => {
    if (clientId) {
      fetchContacts();
    }
  }, [clientId, fetchContacts]);

  // Handle adding/editing a contact
  const handleSaveContact = () => {
    fetchContacts();
  };

  // Handle opening edit dialog
  const handleEditContact = (contact: ClientContact) => {
    setEditContact(contact);
  };

  // Handle closing edit dialog
  const handleCloseEditDialog = () => {
    setEditContact(null);
  };

  // Handle opening delete confirmation
  const handleDeleteClick = (contact: ClientContact) => {
    setDeleteContact(contact);
  };

  // Handle closing delete confirmation
  const handleCloseDeleteDialog = () => {
    setDeleteContact(null);
    setDeleteError(null);
  };

  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    if (!deleteContact) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await axios.delete(`/api/clients/contacts/${deleteContact.contact_id}`);
      fetchContacts();
      setDeleteContact(null);
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      setDeleteError(error.response?.data?.error || 'Failed to delete contact');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box mt={4}>
      <Divider sx={{ mb: 3 }} />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Client Contacts</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          Add Contact
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : contacts.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No contacts found for this client. Add a contact to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map(contact => (
                <TableRow key={contact.contact_id}>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={contact.is_active ? 'Active' : 'Inactive'}
                      color={contact.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEditContact(contact)} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(contact)} size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Contact Dialog */}
      <ClientContactForm
        clientId={clientId}
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onSave={handleSaveContact}
      />

      {/* Edit Contact Dialog */}
      {editContact && (
        <ClientContactForm
          clientId={clientId}
          contact={editContact}
          open={Boolean(editContact)}
          onClose={handleCloseEditDialog}
          onSave={handleSaveContact}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteContact)} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Contact</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <DialogContentText>
            Are you sure you want to delete contact {deleteContact?.name}? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
