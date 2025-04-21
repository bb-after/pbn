import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Link as LinkIcon,
  Description as DocumentIcon,
  CloudDownload as DownloadIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  ArrowBack as BackIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import LayoutContainer from '../../../components/LayoutContainer';
import StyledHeader from '../../../components/StyledHeader';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';

// Add Recogito types declaration reference (assuming it exists)
/// <reference path="../../../client-portal/recogito.d.ts" />
declare module '@recogito/recogito-js';

// Interfaces
interface SectionComment {
  section_comment_id: number;
  request_id: number;
  contact_id: number;
  start_offset: number;
  end_offset: number;
  selected_text: string | null;
  comment_text: string;
  created_at: string;
  contact_name: string;
}

interface ApprovalRequest {
  request_id: number;
  client_id: number;
  client_name: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  inline_content?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by_id: string | null;
  published_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  contacts: Array<{
    contact_id: number;
    name: string;
    email: string;
    has_viewed: boolean;
    has_approved: boolean;
    viewed_at: string | null;
    approved_at: string | null;
  }>;
  versions: Array<{
    version_id: number;
    version_number: number;
    file_url: string | null;
    comments: string | null;
    created_by_id: string | null;
    created_at: string;
  }>;
  comments: Array<{
    comment_id: number;
    comment: string;
    created_by_id: string | null;
    contact_id: number | null;
    contact_name: string | null;
    created_at: string;
    commenter_name?: string;
  }> | null;
  section_comments?: SectionComment[];
}

export default function ApprovalRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidUser, isLoading, token } = useValidateUserToken();

  // State for request data
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for tabs
  const [tabValue, setTabValue] = useState(0);

  // State for published URL input
  const [publishedUrl, setPublishedUrl] = useState('');
  const [updatingUrl, setUpdatingUrl] = useState(false);

  // State for comments
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // State for resending notification
  const [resendingContactId, setResendingContactId] = useState<number | null>(null);
  const [removingContactId, setRemovingContactId] = useState<number | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [contactToRemove, setContactToRemove] = useState<{ id: number; name: string } | null>(null);

  // Add Recogito Refs & State
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);

  // Fetch request details
  const fetchRequestDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/approval-requests/${id}`);
      setRequest(response.data);
    } catch (error) {
      console.error('Error fetching approval request details:', error);
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch request data when component mounts or ID changes
  useEffect(() => {
    if (id && isValidUser) {
      fetchRequestDetails();
    }
  }, [id, isValidUser, fetchRequestDetails]);

  // Update published URL state when request data changes
  useEffect(() => {
    if (request?.published_url) {
      fetchRequestDetails();
      setPublishedUrl(request.published_url);
    } else {
      setPublishedUrl('');
    }
  }, [fetchRequestDetails, request]);

  useEffect(() => {
    // Redirect to login if user is not valid and loading is finished
    if (!isLoading && !isValidUser) {
      router.push('/login'); // Redirect to your staff login page
    }
  }, [isLoading, isValidUser, router]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle published URL update
  const handleUpdatePublishedUrl = async () => {
    if (!publishedUrl.trim() && !request?.published_url) {
      return;
    }

    setUpdatingUrl(true);

    try {
      await axios.put(`/api/approval-requests/${id}`, {
        publishedUrl: publishedUrl.trim(),
      });

      fetchRequestDetails();
    } catch (error) {
      console.error('Error updating published URL:', error);
      setError('Failed to update published URL');
    } finally {
      setUpdatingUrl(false);
    }
  };

  // Handle submitting a new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    setSubmittingComment(true);

    try {
      // Prepare headers
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      await axios.post(
        `/api/approval-requests/${id}/comments`,
        {
          comment: newComment,
          versionId: request?.versions[0]?.version_id,
        },
        { headers } // Pass headers to axios
      );

      setNewComment('');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle archiving the request
  const handleArchiveRequest = async () => {
    try {
      await axios.put(`/api/approval-requests/${id}`, {
        isArchived: true,
      });

      router.push('/client-approval');
    } catch (error) {
      console.error('Error archiving request:', error);
      setError('Failed to archive request');
    }
  };

  // Handle resending notification to a specific contact
  const handleResendNotification = async (contactId: number) => {
    if (resendingContactId) return; // Prevent concurrent resends

    setResendingContactId(contactId);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      await axios.post(
        `/api/approval-requests/${id}/resend-notification`,
        { contactId }, // Send contactId in the body
        { headers }
      );

      // Optionally show a success message (e.g., using a Snackbar)
      console.log(`Notification resent successfully to contact ${contactId}`);
    } catch (err: any) {
      console.error('Error resending notification:', err);
      setError(err.response?.data?.error || 'Failed to resend notification');
    } finally {
      setResendingContactId(null);
    }
  };

  // --- Contact Removal Functions ---
  const handleOpenRemoveDialog = (contact: { id: number; name: string }) => {
    setContactToRemove(contact);
    setConfirmRemoveOpen(true);
  };

  const handleCloseRemoveDialog = () => {
    setConfirmRemoveOpen(false);
    setContactToRemove(null);
  };

  const handleConfirmRemoveContact = async () => {
    if (!contactToRemove) return;

    setRemovingContactId(contactToRemove.id);
    setError(null);
    handleCloseRemoveDialog(); // Close dialog immediately

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      await axios.post(
        `/api/approval-requests/${id}/remove-contact`,
        { contactId: contactToRemove.id }, // Send contactId in the body
        { headers }
      );

      // Refresh request details to update the list
      fetchRequestDetails();
      console.log(`Contact ${contactToRemove.name} removed successfully`);
    } catch (err: any) {
      console.error('Error removing contact:', err);
      setError(err.response?.data?.error || 'Failed to remove contact');
    } finally {
      setRemovingContactId(null);
    }
  };

  // Add Recogito helper function
  const convertDbCommentToAnnotation = (comment: SectionComment): any => ({
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    id: `#section-comment-${comment.section_comment_id}`,
    body: [
      {
        type: 'TextualBody',
        purpose: 'commenting',
        value: comment.comment_text,
        creator: {
          id: `contact:${comment.contact_id}`,
          name: comment.contact_name,
        },
      },
    ],
    target: {
      selector: [
        { type: 'TextQuoteSelector', exact: comment.selected_text || '' },
        { type: 'TextPositionSelector', start: comment.start_offset, end: comment.end_offset },
      ],
    },
  });

  // Recogito Initialization/Loading Effect (Staff ReadOnly View)
  useEffect(() => {
    let recogito: any = null;

    const initRecogitoReadOnly = async () => {
      if (contentRef.current && request?.inline_content && !recogitoInstance.current) {
        console.log('Staff View: Attempting Recogito init (ReadOnly)...');
        try {
          const { Recogito } = await import('@recogito/recogito-js');

          if (contentRef.current && !recogitoInstance.current) {
            const innerDiv = contentRef.current.querySelector('div');
            if (innerDiv) {
              console.log('Staff View: Initializing on inner div (ReadOnly)...');
              recogito = new Recogito({
                content: innerDiv,
                readOnly: true,
                widgets: [{ widget: 'COMMENT', options: { placeholder: 'Client feedback...' } }],
              });

              if (request.section_comments && request.section_comments.length > 0) {
                console.log('Staff View: Loading annotations:', request.section_comments);
                try {
                  const loadedAnnotations = request.section_comments.map(
                    convertDbCommentToAnnotation
                  );
                  recogito.setAnnotations(loadedAnnotations);
                  setAnnotations(loadedAnnotations);
                } catch (error) {
                  console.error('Staff View: Error converting/loading annotations:', error);
                }
              }

              recogitoInstance.current = recogito;
              console.log('Staff View: Recogito Initialized (ReadOnly).');
            } else {
              console.error('Staff View: Could not find inner div.');
            }
          } else {
            console.log('Staff View: Init aborted post-import.');
          }
        } catch (error) {
          console.error('Staff View: Failed to import/init Recogito:', error);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      initRecogitoReadOnly();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (recogitoInstance.current) {
        console.log('Staff View: Destroying Recogito...');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [request?.inline_content, request?.section_comments]);

  if (!isValidUser || (isLoading && !request)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !request) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/recogito.min.css" />
      </Head>

      <LayoutContainer>
        <StyledHeader />
        <Container maxWidth="lg">
          <Box my={4}>
            <Box display="flex" alignItems="center" mb={3}>
              <IconButton onClick={() => router.push('/client-approval')} sx={{ mr: 2 }}>
                <BackIcon />
              </IconButton>
              <Typography variant="h4">Approval Request Details</Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {request && (
              <>
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Typography variant="h5">{request.title}</Typography>
                        <Box ml={2}>
                          <Chip
                            label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            color={
                              request.status === 'approved'
                                ? 'success'
                                : request.status === 'rejected'
                                  ? 'error'
                                  : 'warning'
                            }
                          />
                        </Box>
                      </Box>

                      <Typography variant="subtitle1" gutterBottom>
                        Client: {request.client_name}
                      </Typography>

                      {request.description && (
                        <Typography variant="body1" sx={{ mt: 2 }}>
                          {request.description}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            Request Info
                          </Typography>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">
                              Created:
                            </Typography>
                            <Typography variant="body2">
                              {new Date(request.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">
                              Latest Version:
                            </Typography>
                            <Typography variant="body2">
                              {request.versions && request.versions.length > 0
                                ? request.versions[0].version_number
                                : 1}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="textSecondary">
                              Approvals:
                            </Typography>
                            <Typography variant="body2">
                              {request.contacts.filter(c => c.has_approved).length} /{' '}
                              {request.contacts.length}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="approval request tabs"
                  >
                    <Tab label="Details & Comments" />
                    <Tab label="Version History" />
                    <Tab label="Contacts" />
                  </Tabs>
                </Box>

                <Box mb={4}>
                  {tabValue === 0 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={7}>
                        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Content & Annotations
                          </Typography>
                          {(() => {
                            if (request.inline_content) {
                              return (
                                <Box
                                  mt={2}
                                  sx={{
                                    '& p': { my: 1.5 },
                                    '& ul, & ol': { my: 1.5, pl: 3 },
                                    '& li': { mb: 0.5 },
                                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                                      my: 2,
                                      fontWeight: 'bold',
                                    },
                                    '& a': {
                                      color: 'primary.main',
                                      textDecoration: 'underline',
                                      '&:hover': { color: 'primary.dark' },
                                    },
                                    '.r6o-annotation': {
                                      borderBottom: '2px solid yellow',
                                      backgroundColor: 'rgba(255, 255, 0, 0.2)',
                                    },
                                  }}
                                  ref={contentRef}
                                >
                                  <div
                                    dangerouslySetInnerHTML={{ __html: request.inline_content }}
                                  />
                                </Box>
                              );
                            } else if (request.file_url) {
                              return (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                  This request contains a file attachment instead of inline content.
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    href={request.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    startIcon={<DownloadIcon />}
                                    sx={{ ml: 2 }}
                                  >
                                    Download File
                                  </Button>
                                </Alert>
                              );
                            } else {
                              return (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                  Content is not available for this request.
                                </Alert>
                              );
                            }
                          })()}
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Published URL
                          </Typography>

                          <Box mt={2}>
                            <Grid container spacing={2} alignItems="flex-end">
                              <Grid item xs={request.published_url ? 9 : 12}>
                                <TextField
                                  fullWidth
                                  label="Published URL"
                                  placeholder="https://example.com/published-content"
                                  value={publishedUrl}
                                  onChange={e => setPublishedUrl(e.target.value)}
                                  InputProps={{
                                    startAdornment: <LinkIcon color="action" sx={{ mr: 1 }} />,
                                  }}
                                />
                              </Grid>
                              {request.published_url && (
                                <Grid item xs={3}>
                                  <Button
                                    fullWidth
                                    href={request.published_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Visit
                                  </Button>
                                </Grid>
                              )}
                            </Grid>
                            <Box display="flex" justifyContent="flex-end" mt={2}>
                              <Button
                                variant="contained"
                                onClick={handleUpdatePublishedUrl}
                                disabled={updatingUrl}
                              >
                                {updatingUrl ? <CircularProgress size={24} /> : 'Update URL'}
                              </Button>
                            </Box>
                          </Box>
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Comments
                          </Typography>

                          <Box mt={2} mb={3}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Add a comment"
                              placeholder="Enter your comment here..."
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                            />
                            <Box display="flex" justifyContent="flex-end" mt={2}>
                              <Button
                                variant="contained"
                                onClick={handleSubmitComment}
                                disabled={submittingComment || !newComment.trim()}
                              >
                                {submittingComment ? (
                                  <CircularProgress size={24} />
                                ) : (
                                  'Post Comment'
                                )}
                              </Button>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 2 }} />

                          {request.comments && request.comments.length > 0 ? (
                            <List>
                              {request.comments.map(comment => (
                                <React.Fragment key={comment.comment_id}>
                                  <ListItem alignItems="flex-start">
                                    <ListItemAvatar>
                                      <Avatar>
                                        {comment.contact_name
                                          ? comment.contact_name.charAt(0).toUpperCase()
                                          : 'S'}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Box display="flex" justifyContent="space-between">
                                          <Typography variant="subtitle2">
                                            {comment.commenter_name || 'Unknown'}
                                          </Typography>
                                          <Typography variant="caption" color="textSecondary">
                                            {new Date(comment.created_at).toLocaleString()}
                                          </Typography>
                                        </Box>
                                      }
                                      secondary={
                                        <Typography
                                          component="span"
                                          variant="body2"
                                          color="textPrimary"
                                          sx={{ mt: 1, display: 'block' }}
                                        >
                                          {comment.comment}
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                  <Divider variant="inset" component="li" />
                                </React.Fragment>
                              ))}
                            </List>
                          ) : (
                            <Typography variant="body2" color="textSecondary" align="center">
                              No comments yet
                            </Typography>
                          )}
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={5}>
                        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Contact Status
                          </Typography>

                          <List>
                            {request.contacts.map(contact => (
                              <ListItem
                                key={contact.contact_id}
                                secondaryAction={
                                  <Box display="flex" alignItems="center">
                                    <Tooltip title={contact.has_viewed ? 'Viewed' : 'Not viewed'}>
                                      <span>
                                        <IconButton size="small" disabled>
                                          {contact.has_viewed ? (
                                            <VisibilityIcon color="success" />
                                          ) : (
                                            <VisibilityOffIcon color="disabled" />
                                          )}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip
                                      title={contact.has_approved ? 'Approved' : 'Not approved'}
                                    >
                                      <span>
                                        <IconButton size="small" disabled>
                                          {contact.has_approved ? (
                                            <CheckIcon color="success" />
                                          ) : (
                                            <CloseIcon color="disabled" />
                                          )}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title="Resend Notification">
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleResendNotification(contact.contact_id)}
                                        disabled={resendingContactId === contact.contact_id}
                                        sx={{ ml: 1 }}
                                      >
                                        {resendingContactId === contact.contact_id ? (
                                          <CircularProgress size={20} />
                                        ) : (
                                          <EmailIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove Contact">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          handleOpenRemoveDialog({
                                            id: contact.contact_id,
                                            name: contact.name,
                                          })
                                        }
                                        disabled={removingContactId === contact.contact_id}
                                        sx={{ ml: 0.5 }}
                                      >
                                        {removingContactId === contact.contact_id ? (
                                          <CircularProgress size={20} />
                                        ) : (
                                          <DeleteIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                }
                              >
                                <ListItemIcon>
                                  <PersonIcon />
                                </ListItemIcon>
                                <ListItemText primary={contact.name} secondary={contact.email} />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>

                        <Paper elevation={2} sx={{ p: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Actions
                          </Typography>

                          <Button
                            fullWidth
                            variant="outlined"
                            color="warning"
                            onClick={handleArchiveRequest}
                            sx={{ mt: 2 }}
                          >
                            Archive Request
                          </Button>
                        </Paper>
                      </Grid>
                    </Grid>
                  )}

                  {tabValue === 1 && (
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Version History
                      </Typography>

                      {request.versions && request.versions.length > 0 ? (
                        <List>
                          {request.versions.map(version => (
                            <React.Fragment key={version.version_id}>
                              <ListItem
                                alignItems="flex-start"
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  my: 2,
                                }}
                              >
                                <ListItemIcon>
                                  <DocumentIcon fontSize="large" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box display="flex" justifyContent="space-between">
                                      <Typography variant="h6">
                                        Version {version.version_number}
                                      </Typography>
                                      <Typography variant="body2" color="textSecondary">
                                        {new Date(version.created_at).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <>
                                      {version.comments && (
                                        <Typography
                                          component="span"
                                          variant="body2"
                                          color="textPrimary"
                                          sx={{ mt: 1, display: 'block' }}
                                        >
                                          {version.comments}
                                        </Typography>
                                      )}
                                      {version.file_url && (
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          startIcon={<DownloadIcon />}
                                          href={version.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          sx={{ mt: 2 }}
                                        >
                                          View / Download
                                        </Button>
                                      )}
                                    </>
                                  }
                                />
                              </ListItem>
                            </React.Fragment>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="textSecondary" align="center">
                          No version history available
                        </Typography>
                      )}
                    </Paper>
                  )}

                  {tabValue === 2 && (
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Contact Information
                      </Typography>

                      <List>
                        {request.contacts.map(contact => (
                          <React.Fragment key={contact.contact_id}>
                            <ListItem alignItems="flex-start">
                              <ListItemAvatar>
                                <Avatar>{contact.name.charAt(0).toUpperCase()}</Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={contact.name}
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2" display="block">
                                      {contact.email}
                                    </Typography>
                                    <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                                      <Chip
                                        size="small"
                                        icon={
                                          contact.has_viewed ? (
                                            <VisibilityIcon />
                                          ) : (
                                            <VisibilityOffIcon />
                                          )
                                        }
                                        label={
                                          contact.has_viewed
                                            ? `Viewed on ${new Date(contact.viewed_at!).toLocaleDateString()}`
                                            : 'Not viewed'
                                        }
                                        color={contact.has_viewed ? 'info' : 'default'}
                                      />
                                      <Chip
                                        size="small"
                                        icon={contact.has_approved ? <CheckIcon /> : <CloseIcon />}
                                        label={
                                          contact.has_approved
                                            ? `Approved on ${new Date(contact.approved_at!).toLocaleDateString()}`
                                            : 'Not approved'
                                        }
                                        color={contact.has_approved ? 'success' : 'default'}
                                      />
                                    </Box>
                                  </>
                                }
                              />
                            </ListItem>
                            <Divider variant="inset" component="li" />
                          </React.Fragment>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Container>

        <Dialog open={confirmRemoveOpen} onClose={handleCloseRemoveDialog}>
          <DialogTitle>Remove Contact?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to remove contact &quot;{contactToRemove?.name}&quot;? They will
              no longer have access to this approval request.
              {request && request.contacts.length === 1 && contactToRemove && (
                <Typography color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Warning: This is the last contact associated with this request.
                </Typography>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRemoveDialog}>Cancel</Button>
            <Button onClick={handleConfirmRemoveContact} color="error" variant="contained">
              Remove
            </Button>
          </DialogActions>
        </Dialog>
      </LayoutContainer>
    </>
  );
}
