/// <reference path="../recogito.d.ts" />
// Point to the declaration file in the parent directory

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  AccountCircle,
  Logout as LogoutIcon,
  Description as DocumentIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import useClientAuth from '../../../hooks/useClientAuth';
import axios from 'axios';

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
  file_url: string;
  file_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by_id: string | null;
  published_url: string | null;
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
    file_url: string;
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
  }> | null;
  inline_content: string | null;
  section_comments?: SectionComment[];
}

declare module '@recogito/recogito-js';

export default function ClientRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidClient, clientInfo, isLoading, logout } = useClientAuth('/client-portal/login');

  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // State for request data
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for approval/rejection
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // State for comments
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // State for version history dialog
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // State for annotations
  const [annotations, setAnnotations] = useState<any[]>([]);

  // --- Re-add Recogito Refs & State ---
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);
  // --- End Recogito Refs & State ---

  // Fetch request details
  const fetchRequestDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      const response = await axios.get(`/api/approval-requests/${id}`, { headers });
      setRequest(response.data);
    } catch (error) {
      console.error('Error fetching approval request details:', error);
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id, clientInfo]);

  // Mark the request as viewed
  const markRequestAsViewed = useCallback(async () => {
    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      await axios.put(
        `/api/approval-requests/${id}`,
        {
          markViewed: true,
          contactId: clientInfo?.contact_id,
        },
        { headers }
      );
    } catch (error) {
      console.error('Error marking request as viewed:', error);
    }
  }, [id, clientInfo]);

  // Load request data when component mounts or ID changes
  useEffect(() => {
    if (id && clientInfo) {
      fetchRequestDetails();
      markRequestAsViewed();
    }
  }, [id, clientInfo, fetchRequestDetails, markRequestAsViewed]);

  // Recogito Event Handlers
  const handleCreateAnnotation = async (annotation: any) => {
    console.log('Recogito createAnnotation event:', annotation);
    if (!recogitoInstance.current) return;

    // Extract necessary data
    const target = annotation.target;
    const selectors = target.selector;
    const textQuoteSelector = selectors.find((s: any) => s.type === 'TextQuoteSelector');
    const textPositionSelector = selectors.find((s: any) => s.type === 'TextPositionSelector');
    const commentBody = annotation.body.find((b: any) => b.purpose === 'commenting');

    if (!textPositionSelector || !commentBody?.value) {
      // Check commentBody.value
      console.error('Could not find necessary selector or comment body value');
      recogitoInstance.current.removeAnnotation(annotation); // Remove temp annotation
      setError('Failed to process annotation: comment missing.');
      return;
    }

    const sectionCommentData = {
      startOffset: textPositionSelector.start,
      endOffset: textPositionSelector.end,
      selectedText: textQuoteSelector?.exact,
      commentText: commentBody.value,
    };

    console.log('Saving section comment:', sectionCommentData);

    try {
      const headers: Record<string, string> = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString() || '',
      };

      const response = await axios.post(
        `/api/approval-requests/${id}/section-comments`,
        sectionCommentData,
        { headers }
      );

      if (response.data.comment) {
        const savedComment = response.data.comment;
        // Update annotation ID with DB ID and re-add/update
        annotation.id = `#section-comment-${savedComment.section_comment_id}`;
        // Add creator info from saved comment if needed
        annotation.body[0].creator = {
          id: `contact:${savedComment.contact_id}`,
          name: savedComment.contact_name,
        };
        recogitoInstance.current.addAnnotation(annotation, true); // true = silent update
        setAnnotations(prev => [...prev.filter(a => a !== annotation), annotation]); // Update state
        console.log('Annotation saved and updated with ID:', annotation.id);
      } else {
        console.warn('Save successful but no comment data returned from API');
        setError('Failed to save comment data properly.');
        recogitoInstance.current.removeAnnotation(annotation); // Remove temp annotation
      }
    } catch (err: any) {
      console.error('Error saving section comment via API:', err);
      setError(err.response?.data?.error || 'Failed to save comment');
      recogitoInstance.current.removeAnnotation(annotation); // Remove temp annotation
    }
  };

  // Helper to convert DB comments to Annotations
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

  // --- Recogito Initialization/Loading Effect ---
  useEffect(() => {
    let recogito: any = null; // Variable to hold instance inside effect scope

    const initRecogito = async () => {
      // Initial check remains
      if (
        contentRef.current &&
        request?.inline_content &&
        clientInfo &&
        !recogitoInstance.current
      ) {
        console.log('Attempting to dynamically import and initialize Recogito...');
        try {
          const { Recogito } = await import('@recogito/recogito-js');

          // Add another check *after* the await
          if (contentRef.current && !recogitoInstance.current) {
            // Find the inner div holding the actual content
            const innerDiv = contentRef.current.querySelector('div');

            if (innerDiv) {
              console.log('Recogito imported, initializing on inner div...'); // Update log
              recogito = new Recogito({
                content: innerDiv, // Initialize on the inner div
                readOnly: false,
                widgets: [{ widget: 'COMMENT', options: { placeholder: 'Add your feedback...' } }],
              });

              // Attach Event Listeners
              recogito.on('createAnnotation', handleCreateAnnotation);
              recogito.on('selectAnnotation', (annotation: any, element: any) => {
                console.log('Recogito selectAnnotation event triggered:', annotation, element);
              });

              // Load Existing Annotations
              if (request.section_comments && request.section_comments.length > 0) {
                console.log('Loading existing annotations from DB:', request.section_comments);
                try {
                  const loadedAnnotations = request.section_comments.map(
                    convertDbCommentToAnnotation
                  );
                  console.log('Converted annotations for Recogito:', loadedAnnotations);
                  recogito.setAnnotations(loadedAnnotations);
                  setAnnotations(loadedAnnotations);
                } catch (error) {
                  console.error('Error converting/loading annotations:', error);
                }
              }

              recogitoInstance.current = recogito; // Store instance
              console.log('Recogito instance after setup:', recogitoInstance.current);
              console.log('Recogito Initialized.');
            } else {
              console.error('Could not find inner div to attach Recogito to.');
            }
          } else {
            console.log(
              'Initialization aborted: contentRef missing or instance already created after dynamic import.'
            );
          }
        } catch (error) {
          console.error('Failed to import or initialize Recogito:', error);
        }
      }
    };

    // Run the async initialization function inside a setTimeout
    const timeoutId = setTimeout(() => {
      initRecogito();
    }, 100); // Delay of 100ms

    // Cleanup function
    return () => {
      clearTimeout(timeoutId); // Clear the timeout
      // Use the instance from the ref for cleanup
      if (recogitoInstance.current) {
        console.log('Destroying Recogito instance on unmount/cleanup...');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [request, clientInfo]); // Keep dependencies
  // --- End Recogito Initialization/Loading Effect ---

  // Handle user menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle user menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle logout
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  // Handle approve request
  const handleApprove = async () => {
    setActionLoading(true);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      await axios.put(
        `/api/approval-requests/${id}`,
        {
          status: 'approved',
          contactId: clientInfo?.contact_id,
        },
        { headers }
      );

      setApprovalDialogOpen(false);
      fetchRequestDetails();
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject request
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      // First add a comment with the rejection reason
      await axios.post(
        `/api/approval-requests/${id}/comments`,
        {
          comment: `Rejection reason: ${rejectionReason}`,
          contactId: clientInfo?.contact_id,
        },
        { headers }
      );

      // Then update the status
      await axios.put(
        `/api/approval-requests/${id}`,
        {
          status: 'rejected',
          contactId: clientInfo?.contact_id,
        },
        { headers }
      );

      setRejectionDialogOpen(false);
      setRejectionReason('');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle submitting a new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    setSubmittingComment(true);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      await axios.post(
        `/api/approval-requests/${id}/comments`,
        {
          comment: newComment,
          contactId: clientInfo?.contact_id,
        },
        { headers }
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

  // Check if the current contact has already approved
  const hasApproved = () => {
    if (!request || !clientInfo) return false;

    const contactRecord = request.contacts.find(c => c.contact_id === clientInfo.contact_id);
    return contactRecord?.has_approved || false;
  };

  // Generate status badge
  const getStatusBadge = (status: string) => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' =
      'default';

    switch (status) {
      case 'pending':
        color = 'warning';
        break;
      case 'approved':
        color = 'success';
        break;
      case 'rejected':
        color = 'error';
        break;
    }

    return (
      <Chip label={status.charAt(0).toUpperCase() + status.slice(1)} color={color} size="small" />
    );
  };

  if (isLoading || (loading && !request)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidClient) {
    return null; // The hook will redirect to login page
  }

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/recogito.min.css" />
      </Head>

      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="back"
              sx={{ mr: 2 }}
              onClick={() => router.push('/client-portal')}
            >
              <BackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Content Review
            </Typography>

            <Box>
              <IconButton
                size="large"
                edge="end"
                aria-label="account menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem disabled>
                  {clientInfo?.name} ({clientInfo?.email})
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Container maxWidth="lg">
          <Box my={4}>
            {/* Error alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {request && (
              <>
                {/* Request header */}
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Typography variant="h5">{request.title}</Typography>
                        <Box ml={2}>{getStatusBadge(request.status)}</Box>
                      </Box>

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
                              Submitted:
                            </Typography>
                            <Typography variant="body2">
                              {new Date(request.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">
                              Version:
                            </Typography>
                            <Typography variant="body2">
                              {request.versions && request.versions.length > 0
                                ? request.versions[0].version_number
                                : 1}
                            </Typography>
                          </Box>
                          {request.versions && request.versions.length > 1 && (
                            <Box mt={2}>
                              <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<HistoryIcon />}
                                onClick={() => setVersionHistoryOpen(true)}
                                size="small"
                              >
                                View Version History
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                      {/* Published URL (if available) */}
                      {request.published_url && (
                        <Box mt={2}>
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<LinkIcon />}
                            href={request.published_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Published Content
                          </Button>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </Paper>

                {/* Main content grid */}
                <Grid container spacing={3}>
                  {/* Left column: document and comments */}
                  <Grid item xs={12} md={8}>
                    {/* NEW Inline Content Display - Simplified */}
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Content for Review
                      </Typography>
                      {(() => {
                        // Always try to render inline_content if it exists
                        if (request.inline_content) {
                          return (
                            <Box
                              mt={2}
                              sx={{
                                // Add necessary styles for rendered HTML
                                '& p': { my: 1.5 }, // Example: margin for paragraphs
                                '& ul, & ol': { my: 1.5, pl: 3 },
                                '& li': { mb: 0.5 },
                                '& h1, & h2, & h3, & h4, & h5, & h6': { my: 2, fontWeight: 'bold' },
                                '& a': {
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                  '&:hover': { color: 'primary.dark' },
                                },
                                // Ensure Recogito highlights are visible
                                '.r6o-annotation': {
                                  borderBottom: '2px solid yellow', // Or your preferred style
                                  backgroundColor: 'rgba(255, 255, 0, 0.2)', // Optional background
                                },
                              }}
                              ref={contentRef}
                            >
                              <div dangerouslySetInnerHTML={{ __html: request.inline_content }} />
                            </Box>
                          );
                        } else {
                          // Fallback if inline_content is missing
                          return (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                              Content preview is not available.
                              {/* Optionally keep download button if file_url might still exist for old requests */}
                              {request.file_url && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  href={request.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  startIcon={<DownloadIcon />}
                                  sx={{ ml: 2 }}
                                >
                                  Download Original File
                                </Button>
                              )}
                            </Alert>
                          );
                        }
                      })()}
                    </Paper>

                    {/* Comments section */}
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
                          placeholder="Enter your feedback here..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                        />
                        <Box display="flex" justifyContent="flex-end" mt={2}>
                          <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={handleSubmitComment}
                            disabled={submittingComment || !newComment.trim()}
                          >
                            {submittingComment ? <CircularProgress size={24} /> : 'Send Feedback'}
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
                                        {comment.contact_name || 'Staff'}
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

                  {/* Right column: approval actions */}
                  <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Your Decision
                      </Typography>

                      {request.status === 'approved' ? (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          You have approved this content.
                        </Alert>
                      ) : request.status === 'rejected' ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          You have rejected this content.
                        </Alert>
                      ) : hasApproved() ? (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          You have approved this content. Waiting for other stakeholders to review.
                        </Alert>
                      ) : (
                        <>
                          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                            Please review the content and provide your decision. Once approved, the
                            content will be prepared for publishing.
                          </Typography>

                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                              <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => setRejectionDialogOpen(true)}
                                size="large"
                              >
                                Reject
                              </Button>
                            </Grid>
                            <Grid item xs={6}>
                              <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => setApprovalDialogOpen(true)}
                                size="large"
                              >
                                Approve
                              </Button>
                            </Grid>
                          </Grid>
                        </>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        </Container>

        {/* Approval confirmation dialog */}
        <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
          <DialogTitle>Confirm Approval</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to approve this content? This will indicate that you have
              reviewed the content and are satisfied with it.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              variant="contained"
              color="success"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Approve'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Rejection dialog */}
        <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)}>
          <DialogTitle>Reject Content</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please provide a reason for rejecting this content. This feedback will help in making
              appropriate revisions.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Reason for Rejection"
              fullWidth
              multiline
              rows={4}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              variant="outlined"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReject}
              variant="contained"
              color="error"
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? <CircularProgress size={24} /> : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Version history dialog */}
        <Dialog
          open={versionHistoryOpen}
          onClose={() => setVersionHistoryOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Version History</DialogTitle>
          <DialogContent>
            {request?.versions && (
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
                      <DocumentIcon fontSize="large" sx={{ mr: 2, mt: 1 }} />
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="h6">Version {version.version_number}</Typography>
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
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVersionHistoryOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
