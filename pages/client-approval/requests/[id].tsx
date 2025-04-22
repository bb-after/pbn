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
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
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
  Article as ArticleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import LayoutContainer from '../../../components/LayoutContainer';
import StyledHeader from '../../../components/StyledHeader';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';
import DOMPurify from 'dompurify';
import dynamic from 'next/dynamic';
import ReactionPicker from 'components/ReactionPicker';
import { createRoot } from 'react-dom/client';

// Import Quill CSS
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <Box p={3}>
      <CircularProgress size={24} />
    </Box>
  ),
});

// Add Recogito types declaration reference (assuming it exists)
/// <reference path="../../../client-portal/recogito.d.ts" />
declare module '@recogito/recogito-js';

/// <reference path="./recogito.d.ts" />

declare global {
  interface Window {
    Recogito: any;
    _versionRecogitoInstance?: any; // Store version modal Recogito instance
  }
}

// Interfaces
interface SectionComment {
  section_comment_id: number;
  request_id: number;
  contact_id: number | null;
  user_id?: string | null;
  user_name?: string | null;
  start_offset: number;
  end_offset: number;
  selected_text: string | null;
  comment_text: string;
  created_at: string;
  created_at_iso?: string; // ISO formatted timestamp
  contact_name: string | null;
  replies?: Array<{
    reply_id: number;
    reply_text: string;
    user_id?: string | null;
    user_name?: string | null;
    client_contact_id?: number | null;
    client_name?: string | null;
    author_name?: string | null;
    contact_name?: string | null;
    created_at: string;
    created_at_iso?: string; // ISO formatted timestamp
  }>;
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
  contacts: ContactWithViews[]; // Use the updated ContactWithViews interface
  versions: Array<{
    version_id: number;
    version_number: number;
    file_url: string | null;
    inline_content?: string | null;
    comments: string | null;
    created_by_id: string | null;
    created_at: string;
  }>;
  comments: Array<{
    comment_id: number;
    comment: string;
    user_id: string | null;
    contact_id: number | null;
    contact_name: string | null;
    created_at: string;
    commenter_name?: string;
  }> | null;
  section_comments?: SectionComment[];
}

// Define the structure for a single view record
interface ContactView {
  view_id: number;
  viewed_at: string;
}

// Define the structure for contact details including views
interface ContactWithViews {
  contact_id: number;
  name: string;
  email: string;
  has_approved: boolean;
  approved_at: string | null;
  has_viewed: boolean; // Indicates if there's at least one view
  views: ContactView[]; // Array of view records
}

// Add loadScript helper function
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

export default function ApprovalRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidUser, isLoading, token, user } = useValidateUserToken();

  // State for request data
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

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

  // --- Add State for View Log Modal ---
  const [viewLogModalOpen, setViewLogModalOpen] = useState(false);
  const [selectedContactViews, setSelectedContactViews] = useState<ContactWithViews | null>(null);
  // --- End State for View Log Modal ---

  // --- Add State for Version Content Modal ---
  const [versionContentModalOpen, setVersionContentModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{
    version_id: number;
    version_number: number;
    file_url: string | null;
    inline_content?: string | null;
    comments: string | null;
    created_by_id: string | null;
    created_at: string;
  } | null>(null);
  // --- End State for Version Content Modal ---

  // --- Add State for New Version Dialog ---
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState('');
  const [newVersionComment, setNewVersionComment] = useState('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
  // --- End State for New Version Dialog ---

  // Add Recogito Refs & State
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);

  // Set up axios interceptor for handling 404 errors
  useEffect(() => {
    // Create response interceptor
    const interceptor = axios.interceptors.response.use(
      response => response, // Pass successful responses through
      error => {
        if (error.response && router.pathname.includes('/client-approval/requests/')) {
          // Handle 404 not found errors
          if (error.response.status === 404) {
            console.log('Request not found - redirecting to dashboard');
            setRedirecting(true);
            router.push('/client-approval?error=request_not_found');
            // Return a resolved promise to prevent the error from propagating
            return Promise.resolve({ data: null, status: 404 });
          }
        }
        // Let other errors propagate
        return Promise.reject(error);
      }
    );

    // Clean up interceptor on component unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router]);

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
          id: comment.user_id ? `staff:${comment.user_id}` : `contact:${comment.contact_id}`,
          name: comment.user_name || comment.contact_name || 'Unknown',
        },
        created: comment.created_at_iso || comment.created_at,
      },
      ...(comment.replies && comment.replies.length > 0
        ? comment.replies.map((reply: any) => ({
            type: 'TextualBody',
            purpose: 'replying',
            value: reply.reply_text,
            creator: {
              id: reply.user_id ? `staff:${reply.user_id}` : `contact:${reply.client_contact_id}`,
              name: reply.author_name || reply.user_name || reply.client_name || 'Unknown',
            },
            created: reply.created_at_iso || reply.created_at,
          }))
        : []),
    ],
    target: {
      selector: [
        { type: 'TextQuoteSelector', exact: comment.selected_text || '' },
        { type: 'TextPositionSelector', start: comment.start_offset, end: comment.end_offset },
      ],
    },
    // Add the HTML body with reaction containers
    htmlBody: `
      <div class="section-comment">
        <div class="comment-header">
          <span class="commenter-name">${comment.contact_name || comment.user_name || 'Unknown'}</span>
          <span class="comment-date">${new Date(comment.created_at_iso || comment.created_at).toLocaleString()}</span>
        </div>
        <div class="comment-text">${comment.comment_text}</div>
        <div id="reaction-container-section-${comment.section_comment_id}" class="reaction-container"></div>
        ${
          comment.replies && comment.replies.length > 0
            ? `<div class="replies">
              ${comment.replies
                .map(
                  reply => `
                <div class="reply">
                  <div class="reply-header">
                    <span class="reply-author">${reply.author_name || reply.user_name || reply.client_name || 'Unknown'}</span>
                    <span class="reply-date">${new Date(reply.created_at_iso || reply.created_at).toLocaleString()}</span>
                  </div>
                  <div class="reply-text">${reply.reply_text}</div>
                  <div id="reaction-container-reply-${reply.reply_id}" class="reaction-container"></div>
                </div>
              `
                )
                .join('')}
            </div>`
            : ''
        }
        <div class="add-reply-container">
          <textarea class="add-reply-input" placeholder="Add a reply..."></textarea>
          <button class="add-reply-button">Reply</button>
        </div>
      </div>
    `,
  });

  // --- Recogito Initialization Effect ---
  useEffect(() => {
    let isMounted = true;

    // Create basic CSS for annotations without reaction-specific styling
    const style = document.createElement('style');
    style.textContent = `
      .r6o-annotation {
        border-bottom: 2px solid yellow;
        background-color: rgba(255, 255, 0, 0.2);
      }
    `;
    document.head.appendChild(style);

    if (request?.inline_content && contentRef.current && !recogitoInstance.current) {
      const initRecogito = async () => {
        try {
          // Load the Recogito script via script tag
          await loadScript('/vendor/recogito.min.js');

          console.log('Staff View: Recogito script loaded');

          // Try accessing the constructor from the module object on window
          const Recogito = (window as any).Recogito?.Recogito || (window as any).Recogito?.default;

          if (!isMounted || !Recogito) {
            console.error(
              'Staff View: Recogito constructor not found within window.Recogito module object.'
            );
            return;
          }

          // Add event listener for keydown to handle escape key issues
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && recogitoInstance.current) {
              // Prevent default behavior to avoid the underlying TypeError
              e.preventDefault();
              e.stopPropagation();

              // If there's an active annotation, try to cancel it safely
              try {
                const activeSelection = document.querySelector('.r6o-editor-inner');
                if (activeSelection) {
                  const cancelButton = document.querySelector('.r6o-btn.r6o-btn-cancel');
                  if (cancelButton && cancelButton instanceof HTMLElement) {
                    cancelButton.click();
                  }
                }
              } catch (err) {
                console.error('Error handling escape key:', err);
              }
            }
          };

          // Register the event handler
          document.addEventListener('keydown', handleKeyDown, true);

          // Store the handler reference for cleanup
          const keydownHandler = handleKeyDown;

          if (contentRef.current && !recogitoInstance.current) {
            const innerDiv = contentRef.current.querySelector('div');
            if (innerDiv) {
              console.log('Staff View: Initializing on inner div...');
              recogitoInstance.current = new Recogito({
                content: innerDiv,
                readOnly: false, // Allow staff to add comments
                widgets: [{ widget: 'COMMENT', options: { placeholder: 'Add staff feedback...' } }],
              });

              // Add handler for staff to create annotations
              recogitoInstance.current.on('createAnnotation', async (annotation: any) => {
                console.log('Staff created annotation:', annotation);
                try {
                  const headers: Record<string, string> = {};
                  if (token) {
                    headers['x-auth-token'] = token;
                  }

                  // Extract data from the annotation
                  const body = annotation.body?.[0];
                  const textQuote = annotation.target.selector.find(
                    (s: any) => s.type === 'TextQuoteSelector'
                  );
                  const textPosition = annotation.target.selector.find(
                    (s: any) => s.type === 'TextPositionSelector'
                  );

                  if (body && textPosition) {
                    const response = await axios.post(
                      `/api/approval-requests/${id}/section-comments`,
                      {
                        // Pass user_id instead of staff_id
                        user_id: user?.id,
                        startOffset: textPosition.start,
                        endOffset: textPosition.end,
                        selectedText: textQuote?.exact || '',
                        commentText: body.value,
                      },
                      { headers }
                    );

                    console.log('Staff annotation saved successfully:', response.data);

                    // Add the new comment to the current list
                    if (request?.section_comments) {
                      const newComment = response.data.comment;
                      const updatedRequest = {
                        ...request,
                        section_comments: [...request.section_comments, newComment],
                      };
                      setRequest(updatedRequest);
                    }

                    // Refresh request data
                    fetchRequestDetails();
                  }
                } catch (error) {
                  console.error('Error saving staff annotation:', error);
                  setError('Failed to save comment. Please try again.');
                }
              });

              // Add handler for staff to update annotations (add replies)
              recogitoInstance.current.on(
                'updateAnnotation',
                async (annotation: any, previous: any) => {
                  console.log('Staff updated annotation:', annotation);
                  try {
                    // Log token for debugging
                    console.log('Current token value:', token);

                    // Prepare headers properly
                    const headers: Record<string, string> = {};
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`;
                      // Keep the x-auth-token as backup
                      headers['x-auth-token'] = token;
                    }

                    // Extract annotation ID from the format '#section-comment-123'
                    const idMatch = annotation.id.match(/#section-comment-(\d+)/);
                    if (!idMatch || !idMatch[1]) {
                      console.error('Could not extract comment ID from annotation:', annotation.id);
                      return;
                    }

                    const commentId = parseInt(idMatch[1]);

                    // Get all the bodies, which include the original comment and any replies
                    const bodies = annotation.body || [];

                    // The last body should be the newly added reply
                    const newReply = bodies[bodies.length - 1];

                    if (!newReply || !newReply.value) {
                      console.error('No valid reply found in updated annotation');
                      return;
                    }

                    // Send the reply to the server
                    const response = await axios.post(
                      `/api/approval-requests/${id}/section-comments/${commentId}/replies`,
                      {
                        user_id: user?.id,
                        replyText: newReply.value,
                      },
                      { headers }
                    );

                    console.log('Staff reply saved successfully:', response.data);

                    // Refresh the request data to get all comments and replies
                    fetchRequestDetails();
                  } catch (error) {
                    console.error('Error saving reply:', error);
                    setError('Failed to save reply. Please try again.');
                  }
                }
              );

              if (request.section_comments && request.section_comments.length > 0) {
                console.log('Staff View: Loading annotations:', request.section_comments);
                try {
                  const loadedAnnotations = request.section_comments.map(
                    convertDbCommentToAnnotation
                  );
                  recogitoInstance.current.setAnnotations(loadedAnnotations);
                  setAnnotations(loadedAnnotations);
                } catch (error) {
                  console.error('Staff View: Error converting/loading annotations:', error);
                }
              }

              console.log('Staff View: Recogito Initialized.');
            } else {
              console.error('Staff View: Could not find inner div.');
            }
          } else {
            console.log('Staff View: Init aborted post-import.');
          }
        } catch (error) {
          console.error('Staff View: Failed to import/init Recogito:', error);
        }
      };

      initRecogito();
    }

    return () => {
      isMounted = false;
      // Remove the keydown event handler if it was registered
      const keydownHandler = document
        .querySelector('[data-keydown-handler]')
        ?.getAttribute('data-handler-ref') as unknown as EventListener;
      if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler, true);
      }
      if (recogitoInstance.current) {
        console.log('Staff View: Destroying Recogito instance...');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [request?.inline_content, request?.section_comments, user, token]);

  // Clean up Recogito when component unmounts
  useEffect(() => {
    return () => {
      if (recogitoInstance.current) {
        console.log('Staff View: Destroying Recogito...');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, []);

  // --- Add Modal Handlers ---
  const handleOpenViewLog = (contact: ContactWithViews) => {
    setSelectedContactViews(contact);
    setViewLogModalOpen(true);
  };

  const handleCloseViewLog = () => {
    setViewLogModalOpen(false);
    setSelectedContactViews(null);
  };
  // --- End Modal Handlers ---

  // --- Add Version Modal Handlers ---
  const handleOpenVersionContent = (version: {
    version_id: number;
    version_number: number;
    file_url: string | null;
    inline_content?: string | null;
    comments: string | null;
    created_by_id: string | null;
    created_at: string;
  }) => {
    setSelectedVersion(version);
    setVersionContentModalOpen(true);
  };

  const handleCloseVersionContent = () => {
    // Clean up Recogito instance if it exists
    if (window._versionRecogitoInstance) {
      window._versionRecogitoInstance.destroy();
      window._versionRecogitoInstance = null;
    }
    setVersionContentModalOpen(false);
    setSelectedVersion(null);
  };
  // --- End Version Modal Handlers ---

  // --- Add New Version Dialog Handlers ---
  const handleOpenNewVersionDialog = () => {
    // Pre-populate with current inline content if available
    if (request?.inline_content) {
      setNewVersionContent(request.inline_content);
    }
    setNewVersionComment('');
    setNewVersionDialogOpen(true);
  };

  const handleCloseNewVersionDialog = () => {
    setNewVersionDialogOpen(false);
  };

  const handleNewVersionContentChange = (content: string) => {
    setNewVersionContent(content);
  };

  const handleSubmitNewVersion = async () => {
    if (!newVersionContent.trim()) {
      setError('Content is required');
      return;
    }

    setIsSubmittingVersion(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      // Instead of fileUrl, send inlineContent
      const response = await axios.post(
        `/api/approval-requests/${id}/versions`,
        {
          inlineContent: newVersionContent,
          comments: newVersionComment.trim() || null,
        },
        { headers }
      );

      setNewVersionDialogOpen(false);
      setNewVersionContent('');
      setNewVersionComment('');
      fetchRequestDetails();
    } catch (error: any) {
      console.error('Error submitting new version:', error);
      setError(error.response?.data?.error || 'Failed to add new version');
    } finally {
      setIsSubmittingVersion(false);
    }
  };
  // --- End New Version Dialog Handlers ---

  if (isLoading || (loading && !request)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (redirecting) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body1">Redirecting to dashboard...</Typography>
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
        <title>Request Details - {request?.title || id}</title>
        <link rel="stylesheet" href="/vendor/recogito.min.css" />
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

                          {/* Add status banner for approved content */}
                          {request.status === 'approved' && (
                            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
                              This content has been approved. Annotations shown are from the review
                              process.
                            </Alert>
                          )}

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
                            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
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
                                              {new Date(comment.created_at).toLocaleString(
                                                undefined,
                                                {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  timeZoneName: 'short',
                                                }
                                              )}
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
                                            <ReactionPicker
                                              targetType="comment"
                                              targetId={comment.comment_id}
                                              requestId={Number(id)}
                                              userId={user?.id}
                                              token={token || undefined}
                                            />
                                          </Typography>
                                        }
                                      />
                                    </ListItem>
                                    <Divider variant="inset" component="li" />
                                  </React.Fragment>
                                ))}
                              </List>
                            </Box>
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
                                    <Tooltip
                                      title={
                                        contact.views && contact.views.length > 0
                                          ? `Viewed ${contact.views.length} times. Click to see history. (Last: ${new Date(contact.views[0].viewed_at).toLocaleString()})`
                                          : 'Not viewed'
                                      }
                                    >
                                      <span>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleOpenViewLog(contact)}
                                          disabled={!contact.views || contact.views.length === 0}
                                        >
                                          {contact.views && contact.views.length > 0 ? (
                                            <VisibilityIcon color="info" />
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
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Version History</Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={handleOpenNewVersionDialog}
                        >
                          Create New Version
                        </Button>
                      </Box>

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
                                        {new Date(version.created_at).toLocaleString(undefined, {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          timeZoneName: 'short',
                                        })}
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
                                          sx={{ mt: 2, mr: 2 }}
                                        >
                                          View / Download
                                        </Button>
                                      )}

                                      {/* Add View Content button */}
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ArticleIcon />}
                                        onClick={() => handleOpenVersionContent(version)}
                                        sx={{ mt: 2 }}
                                      >
                                        View Content
                                      </Button>
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
                                            ? `Viewed on ${new Date(contact.views[0].viewed_at).toLocaleDateString()}`
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

        {/* --- View Log Modal --- */}
        <Dialog open={viewLogModalOpen} onClose={handleCloseViewLog} maxWidth="sm" fullWidth>
          <DialogTitle>View History for {selectedContactViews?.name || 'Contact'}</DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {selectedContactViews && selectedContactViews.views.length > 0 ? (
              <TableContainer component={Paper} elevation={0} square>
                <Table size="small" aria-label="view history table">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Time Viewed (Local)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedContactViews.views.map(view => (
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
              <DialogContentText sx={{ p: 2, textAlign: 'center' }}>
                No views recorded for this contact.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewLog}>Close</Button>
          </DialogActions>
        </Dialog>
        {/* --- End View Log Modal --- */}

        {/* --- Version Content Modal --- */}
        <Dialog
          open={versionContentModalOpen}
          onClose={handleCloseVersionContent}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Version {selectedVersion?.version_number || ''} Content
            {selectedVersion && (
              <Typography variant="caption" display="block" color="text.secondary">
                Created on {new Date(selectedVersion.created_at).toLocaleString()}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {selectedVersion ? (
              <>
                {selectedVersion.comments && (
                  <Box mb={3}>
                    <Typography variant="subtitle2" gutterBottom>
                      Version Notes:
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2">{selectedVersion.comments}</Typography>
                    </Paper>
                  </Box>
                )}

                {/* Show file download if available */}
                {selectedVersion.file_url ? (
                  <Box textAlign="center" py={3}>
                    <Typography variant="body1" gutterBottom>
                      This version contains a file attachment.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      href={selectedVersion.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download File
                    </Button>
                  </Box>
                ) : (
                  /* For inline content, show historical content if available */
                  <Box py={3}>
                    {selectedVersion.inline_content ? (
                      // For versions with stored inline_content (future versions)
                      <>
                        {request?.section_comments && request.section_comments.length > 0 && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            Annotations shown are from the current version. In the future,
                            annotations will be version-specific.
                          </Alert>
                        )}
                        <Box
                          ref={el => {
                            if (el && selectedVersion.inline_content) {
                              // Initialize Recogito on this element after a short delay
                              setTimeout(() => {
                                if (el && window.Recogito) {
                                  // Destroy previous instance if it exists
                                  if (window._versionRecogitoInstance) {
                                    window._versionRecogitoInstance.destroy();
                                  }

                                  // Create new instance
                                  const r = new window.Recogito.Recogito({
                                    content: el,
                                    readOnly: true,
                                  });

                                  // Load annotations if available
                                  if (
                                    request?.section_comments &&
                                    request.section_comments.length > 0
                                  ) {
                                    const annotations = request.section_comments.map(
                                      convertDbCommentToAnnotation
                                    );
                                    r.setAnnotations(annotations);
                                  }

                                  // Store instance for cleanup
                                  window._versionRecogitoInstance = r;
                                }
                              }, 100);
                            }
                          }}
                          sx={{
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            p: 2,
                            textAlign: 'left',
                            '& p': { my: 1.5 },
                            '& ul, & ol': { my: 1.5, pl: 3 },
                            '& li': { mb: 0.5 },
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                              my: 2,
                              fontWeight: 'bold',
                            },
                          }}
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(selectedVersion.inline_content || ''),
                          }}
                        />
                      </>
                    ) : request &&
                      selectedVersion &&
                      request.versions.length > 0 &&
                      selectedVersion.version_number === request.versions[0].version_number ? (
                      // For the latest version, show the current request's inline content if version doesn't have it
                      <>
                        {request?.section_comments && request.section_comments.length > 0 && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            Annotations shown are from the current version.
                          </Alert>
                        )}
                        <Box
                          ref={el => {
                            if (el && request.inline_content) {
                              // Initialize Recogito on this element after a short delay
                              setTimeout(() => {
                                if (el && window.Recogito) {
                                  // Destroy previous instance if it exists
                                  if (window._versionRecogitoInstance) {
                                    window._versionRecogitoInstance.destroy();
                                  }

                                  // Create new instance
                                  const r = new window.Recogito.Recogito({
                                    content: el,
                                    readOnly: true,
                                  });

                                  // Load annotations if available
                                  if (
                                    request?.section_comments &&
                                    request.section_comments.length > 0
                                  ) {
                                    const annotations = request.section_comments.map(
                                      convertDbCommentToAnnotation
                                    );
                                    r.setAnnotations(annotations);
                                  }

                                  // Store instance for cleanup
                                  window._versionRecogitoInstance = r;
                                }
                              }, 100);
                            }
                          }}
                          sx={{
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            p: 2,
                            textAlign: 'left',
                            '& p': { my: 1.5 },
                            '& ul, & ol': { my: 1.5, pl: 3 },
                            '& li': { mb: 0.5 },
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                              my: 2,
                              fontWeight: 'bold',
                            },
                          }}
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(request.inline_content || ''),
                          }}
                        />
                      </>
                    ) : (
                      <Box textAlign="center">
                        <Typography color="text.secondary" paragraph>
                          Historical inline content is not preserved for older versions. Future
                          updates will store snapshots of each content revision.
                        </Typography>
                        <Typography variant="body2" color="primary">
                          The database has been updated to store inline content for future versions.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={3}>
                <CircularProgress />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseVersionContent}>Close</Button>
          </DialogActions>
        </Dialog>
        {/* --- End Version Content Modal --- */}

        {/* --- New Version Dialog with Rich Text Editor --- */}
        <Dialog
          open={newVersionDialogOpen}
          onClose={handleCloseNewVersionDialog}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Create New Version</DialogTitle>
          <DialogContent dividers>
            <DialogContentText sx={{ mb: 2 }}>
              Creating a new version will reset approval status for all contacts and send them a
              notification.
            </DialogContentText>

            <Typography variant="subtitle1" gutterBottom>
              Content
            </Typography>
            <Box
              sx={{
                mb: 3,
                '& .quill': {
                  height: '300px',
                  mb: 1,
                  '& .ql-editor': {
                    minHeight: '250px',
                  },
                },
              }}
            >
              <ReactQuill
                value={newVersionContent}
                onChange={handleNewVersionContentChange}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['clean'],
                  ],
                }}
                formats={['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link']}
                placeholder="Enter content for review..."
              />
            </Box>

            <Typography variant="subtitle1" gutterBottom>
              Version Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Describe the changes in this version"
              placeholder="E.g., Updated content based on client feedback, Fixed formatting issues, etc."
              value={newVersionComment}
              onChange={e => setNewVersionComment(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseNewVersionDialog}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitNewVersion}
              disabled={isSubmittingVersion || !newVersionContent.trim()}
            >
              {isSubmittingVersion ? <CircularProgress size={24} /> : 'Submit New Version'}
            </Button>
          </DialogActions>
        </Dialog>
        {/* --- End New Version Dialog --- */}
      </LayoutContainer>
    </>
  );
}
