import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import DOMPurify from 'dompurify';
import Head from 'next/head';

/// <reference path="./recogito.d.ts" />

declare global {
  interface Window {
    Recogito: any;
  }
}

const loadScript = (src: string): Promise<void> => {
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) {
    existingScript.remove();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = error => reject(new Error(`Failed to load script: ${src}\n${error}`));
    document.body.appendChild(script);
  });
};

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
  inline_content?: string | null;
  section_comments?: SectionComment[];
}

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

  // --- Add Ref to track view marking ---
  const hasMarkedViewRef = useRef(false);

  // --- Recogito Refs & State ---
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);

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
    if (!clientInfo?.contact_id || !id) return;
    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo.contact_id.toString(),
      };
      await axios.put(
        `/api/approval-requests/${id}`,
        {
          markViewed: true,
          contactId: clientInfo.contact_id,
        },
        { headers }
      );
      console.log('View marked successfully');
      hasMarkedViewRef.current = true; // Set flag after successful marking
    } catch (error) {
      console.error('Error marking request as viewed:', error);
    }
  }, [id, clientInfo]);

  // Load request data when component mounts or ID changes
  useEffect(() => {
    if (id && clientInfo) {
      fetchRequestDetails();
    }
  }, [id, clientInfo, fetchRequestDetails]);

  // --- Add Effect to mark view AFTER data is loaded ---
  useEffect(() => {
    // Only run if we have request data, client info, and haven't marked view yet
    if (request && clientInfo && !hasMarkedViewRef.current) {
      // Check if this contact already has views in the fetched data
      const contactData = request.contacts.find(c => c.contact_id === clientInfo.contact_id);

      // If contact exists in the list BUT has no views logged yet, mark it.
      // This handles the initial view. Subsequent views trigger the API directly.
      // We rely on hasMarkedViewRef for strict mode double-runs.
      if (contactData) {
        // Ensure contact is part of this request
        // For simplicity now, just mark if the flag is false.
        // A more robust check could involve comparing timestamps if needed.
        console.log('Checking if view needs marking...');
        markRequestAsViewed();
      }
    }
    // Depend on request, clientInfo, and the stable markRequestAsViewed function
  }, [request, clientInfo, markRequestAsViewed]);

  // --- Recogito Helper Function ---
  const convertDbCommentToAnnotation = (dbComment: SectionComment) => {
    return {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      type: 'Annotation',
      id: `#section-comment-${dbComment.section_comment_id}`,
      body: [
        {
          type: 'TextualBody',
          value: dbComment.comment_text,
          purpose: 'commenting',
          creator: {
            id: `mailto:${dbComment.contact_name}`,
            name: dbComment.contact_name,
          },
        },
      ],
      target: {
        selector: [
          {
            type: 'TextQuoteSelector',
            exact: dbComment.selected_text || '',
          },
          {
            type: 'TextPositionSelector',
            start: dbComment.start_offset,
            end: dbComment.end_offset,
          },
        ],
      },
    };
  };
  // --- End Recogito Helper Function ---

  // --- Recogito Initialization Effect ---
  useEffect(() => {
    if (request?.inline_content && contentRef.current && !recogitoInstance.current) {
      let isMounted = true;

      const initRecogito = async () => {
        try {
          await loadScript('/vendor/recogito.min.js');

          // Debug: Check what's on the window object
          console.log('Script loaded, checking window.Recogito:', (window as any).Recogito);
          console.log(
            'Script loaded, checking window.recogito (lowercase):',
            (window as any).recogito
          );

          // Try accessing the constructor from the module object on window
          const Recogito = (window as any).Recogito?.Recogito || (window as any).Recogito?.default;

          if (!isMounted || !Recogito) {
            console.error(
              'Client View: Recogito constructor not found within window.Recogito module object.',
              (window as any).Recogito
            );
            return;
          }

          // Now Recogito should be the constructor
          const r = new Recogito({
            content: contentRef.current!,
            readOnly: true,
          });

          r.on('selectAnnotation', (annotation: any) => {
            console.log('Client Selected annotation:', annotation);
          });

          if (request.section_comments && request.section_comments.length > 0) {
            console.log('Client View: Loading annotations:', request.section_comments);
            try {
              const loadedAnnotations = request.section_comments.map(convertDbCommentToAnnotation);
              r.setAnnotations(loadedAnnotations);
            } catch (error) {
              console.error('Client View: Error converting/loading annotations:', error);
            }
          }

          recogitoInstance.current = r;
          console.log('Client View: Recogito Initialized (Read-Only) via loadScript');
        } catch (error) {
          console.error('Client View: Failed to load or initialize Recogito:', error);
        }
      };

      initRecogito();

      return () => {
        isMounted = false;
        if (recogitoInstance.current) {
          console.log('Client View: Destroying Recogito instance...');
          recogitoInstance.current.destroy();
          recogitoInstance.current = null;
        }
      };
    }
  }, [request, clientInfo, id, fetchRequestDetails]);
  // --- End Recogito Initialization Effect ---

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

  // Get human-readable file type
  const getFileTypeName = (fileUrl: string) => {
    if (!fileUrl) return 'File';

    const extension = fileUrl.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'PDF Document';
      case 'doc':
      case 'docx':
        return 'Word Document';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'Image';
      default:
        return 'Document';
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
    <Box sx={{ flexGrow: 1 }}>
      <Head>
        <title>Content Review - {request?.title || 'Request'}</title>
        <link rel="stylesheet" href="/vendor/recogito.min.css" />
      </Head>
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
                  {/* Document card - Updated Rendering Logic */}
                  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Content for Review
                    </Typography>

                    {(() => {
                      if (request.inline_content) {
                        // Render Recogito container for inline content
                        return (
                          <div
                            ref={contentRef}
                            className="annotatable"
                            style={{ marginTop: '16px' }}
                          >
                            <div
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(request.inline_content || ''),
                              }}
                            />
                          </div>
                        );
                      } else if (request.file_url) {
                        // Render download button for file-based requests
                        return (
                          <Box display="flex" alignItems="center" my={2}>
                            <DocumentIcon color="primary" sx={{ mr: 2 }} />
                            <Typography variant="body1">
                              {getFileTypeName(request.file_url)}
                            </Typography>
                            <Box flexGrow={1} />
                            <Button
                              variant="contained"
                              startIcon={<DownloadIcon />}
                              href={request.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View / Download
                            </Button>
                          </Box>
                        );
                      } else {
                        // Fallback if neither exists
                        return (
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                            No content available for review.
                          </Typography>
                        );
                      }
                    })()}

                    {/* Conditional text */}
                    {request.status === 'pending' && !request.inline_content && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                        Please review the document carefully before providing your approval or
                        feedback.
                      </Typography>
                    )}
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
            Are you sure you want to approve this content? This will indicate that you have reviewed
            the content and are satisfied with it.
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
  );
}
