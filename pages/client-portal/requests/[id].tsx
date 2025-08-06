import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Tooltip,
  FormLabel,
} from '@mui/material';
import {
  AccountCircle,
  Logout as LogoutIcon,
  Description as DocumentIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Article as ArticleIcon,
  Close as CloseIcon,
  Google as GoogleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { ClientPortalLayout } from '../../../components/layout/ClientPortalLayout';
import {
  ThemeProvider,
  ToastProvider,
  IntercomButton,
  IntercomCard,
  IntercomInput,
} from '../../../components/ui';
import { useRouter } from 'next/router';
import useClientAuth from '../../../hooks/useClientAuth';
import axios from 'axios';
import DOMPurify from 'dompurify';
import Head from 'next/head';
import ReactionPicker from 'components/ReactionPicker';
import { createRoot } from 'react-dom/client';
import { initVersionRecogito } from 'utils/recogito';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// Separate Comments Component to prevent iframe re-renders
const CommentsSection: React.FC<{
  requestId: string | string[] | undefined;
  clientInfo: any;
  request: ApprovalRequest | null;
  clientAuthToken: string | null;
  onRequestUpdate: () => void;
}> = ({ requestId, clientInfo, request, clientAuthToken, onRequestUpdate }) => {
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle submitting a new comment
  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    setSubmittingComment(true);
    setError(null);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      await axios.post(
        `/api/approval-requests/${requestId}/comments`,
        {
          comment: newComment,
          contactId: clientInfo?.contact_id,
        },
        { headers }
      );

      setNewComment('');
      onRequestUpdate(); // Trigger parent to refresh data
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Comments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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

      {request?.comments && request.comments.length > 0 ? (
        <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
          <List>
            {request.comments.map(comment => (
              <React.Fragment key={comment.comment_id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>
                      {comment.contact_name ? comment.contact_name.charAt(0).toUpperCase() : 'S'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="subtitle2">
                          {comment.contact_name || 'Staff'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(comment.created_at).toLocaleString(undefined, {
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
                          requestId={Number(requestId)}
                          isClientPortal={true}
                          clientContactId={clientInfo?.contact_id}
                          token={clientAuthToken || undefined}
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
  );
};

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

// Helper function to load CSS
const loadStyle = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
    document.head.appendChild(link);
  });
};

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
  version_id?: number | null; // Version ID this comment belongs to
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
  content_type?: string;
  google_doc_id?: string | null;
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
    file_url: string | null;
    inline_content?: string | null;
    content_type?: string;
    google_doc_id?: string | null;
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
  }> | null;
  inline_content?: string | null;
  section_comments?: SectionComment[];
}

// Function to process Google Doc URLs for embedding
// IMPORTANT: Client portal users should ONLY have comment/suggestion capabilities,
// never direct edit access to Google Docs. This function ensures all Google Doc URLs
// use comment-only mode (mode=comment parameter).
const getEmbeddableGoogleDocUrl = (
  url: string,
  status: string,
  isAuthenticated = false,
  email: string | null = null,
  staffEmail: string | null = null
): string => {
  try {
    if (!url.includes('docs.google.com')) return url;

    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!docIdMatch) return url;
    const docId = docIdMatch[1];

    // For pending requests where the user is authenticated, use the standard /edit URL.
    // This allows commenting and relies on Google's cookie-based authentication.
    if (status === 'pending' && isAuthenticated && email) {
      // Add a parameter to help Google identify the user in the iframe
      // Use mode=comment to ensure client has comment-only access
      const authUrl = `https://docs.google.com/document/d/${docId}/edit?embedded=true&rm=minimal&mode=comment&authuser=${email}`;

      // If we have the staff email, we can suggest inviting them.
      if (staffEmail) {
        return `${authUrl}&usp=sharing_eip&userstoinvite=${encodeURIComponent(staffEmail)}`;
      }
      return authUrl;
    }

    // For all other cases (not pending, or not authenticated), use the safer /preview endpoint.
    return `https://docs.google.com/document/d/${docId}/preview?embedded=true`;
  } catch (error) {
    console.error('Error processing Google Doc URL:', error);
    return url; // Fallback to original URL
  }
};

// Google Login Button Component
const GoogleLoginButton = ({
  onSuccess,
  onError,
  disabled = false,
  onLoginStart,
}: {
  onSuccess: (response: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
  onLoginStart?: () => void;
}) => {
  const login = useGoogleLogin({
    onSuccess,
    onError,
    scope: 'openid email profile',
  });

  const handleLoginClick = () => {
    if (onLoginStart) {
      onLoginStart();
    }
    login();
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleLoginClick}
      startIcon={<GoogleIcon />}
      disabled={disabled}
      fullWidth
      sx={{
        py: 1.5,
        bgcolor: '#4285f4',
        '&:hover': {
          bgcolor: '#3367d6',
        },
        '&:disabled': {
          bgcolor: 'grey.400',
        },
        position: 'relative',
        zIndex: 2,
      }}
    >
      {disabled ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  );
};

export default function ClientRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidClient, isLoading, clientInfo, logout } = useClientAuth('/client-portal/login');
  const [clientAuthToken, setClientAuthToken] = useState<string | null>(null);

  // TEMPORARY: Bypass authentication for testing
  const bypassAuth = true; // Set to false to restore authentication

  // TEMPORARY: Mock clientInfo for testing
  const testClientInfo = bypassAuth
    ? {
        contact_id: 1,
        name: 'Roger Arphaun',
        email: 'brett+50@statuslabs.com',
        client_id: 131,
        client_name: '3G Capital',
      }
    : null;

  const effectiveClientInfo = bypassAuth ? testClientInfo : clientInfo;

  // State for user menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // State for request data
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // State for approval/rejection
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // State for feedback dialog
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // State for optional approval note dialog
  const [approvalNoteDialogOpen, setApprovalNoteDialogOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const isRecogitoContentType = (request: ApprovalRequest | null): boolean => {
    if (!request) return false;
    return request.content_type === 'html' || request.content_type === 'google_doc_recogito';
  };

  const sanitizedHtmlContent = useMemo(() => {
    if (!request || !isRecogitoContentType(request) || !request.inline_content) {
      return null;
    }

    let contentToDisplay: string;
    if (request.content_type === 'google_doc_recogito') {
      contentToDisplay = request.inline_content || '';
    } else {
      // 'html'
      contentToDisplay = `<h1 style="font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${
        request.title
      }</h1>${request.inline_content || ''}`;
    }
    // Perform sanitization once and memoize the result
    return DOMPurify.sanitize(contentToDisplay);
  }, [request?.content_type, request?.inline_content, request?.title]);

  // State for comments
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // State for version history dialog
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // State for currently viewed version
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [versionContent, setVersionContent] = useState<string | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [viewingVersion, setViewingVersion] = useState(false);

  // State for annotations
  const [annotations, setAnnotations] = useState<any[]>([]);

  // --- Add Ref to track view marking ---
  const hasMarkedViewRef = useRef(false);

  // --- Recogito Refs & State ---
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);
  const versionContentRef = useRef<HTMLDivElement>(null);
  const versionRecogitoInstance = useRef<any>(null);

  // Add the isLoggedInToGoogle state near the beginning of the component
  const [isLoggedInToGoogle, setIsLoggedInToGoogle] = useState(false);

  // Add isMinimalMode state
  const [isMinimalMode, setIsMinimalMode] = useState(true);

  // State to store the staff member's email
  const [staffEmail, setStaffEmail] = useState<string | null>(null);

  // State for Google user's email
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);

  // Google authentication state
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleAuthenticating, setIsGoogleAuthenticating] = useState(false);
  const [showGoogleAuthPrompt, setShowGoogleAuthPrompt] = useState(false);
  const [userChosenMode, setUserChosenMode] = useState<'google_comment' | 'readonly' | null>(null);

  // Memoized iframe component to prevent re-renders when typing in comments
  const GoogleDocIframe = useMemo(() => {
    if (
      !request?.inline_content ||
      !(
        request?.content_type === 'google_doc' ||
        (request?.inline_content.includes('docs.google.com') &&
          !request?.inline_content.startsWith('<'))
      )
    ) {
      return null;
    }

    if (!userChosenMode && request.status === 'pending') {
      return null;
    }

    const iframeUrl = request.inline_content
      ? getEmbeddableGoogleDocUrl(
          request.inline_content,
          request.status,
          userChosenMode === 'google_comment' && !!googleAccessToken,
          googleUserEmail,
          staffEmail
        )
      : '';

    if (!iframeUrl) {
      return null; // Don't render iframe if URL is empty
    }

    return (
      <iframe
        key={googleAccessToken || 'anonymous'}
        src={iframeUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 'none' }}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }, [
    request?.inline_content,
    request?.content_type,
    request?.status,
    userChosenMode,
    googleAccessToken,
    googleUserEmail,
    staffEmail,
  ]);

  // Get client token from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('client_token') || undefined;
      setClientAuthToken(token || null);
    }
  }, []);

  // Handle successful Google login
  const handleGoogleLoginSuccess = async (tokenResponse: any) => {
    console.log('Google login successful');
    const accessToken = tokenResponse.access_token;
    setGoogleAccessToken(accessToken);

    try {
      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const userEmail = userInfoResponse.data.email;
      setGoogleUserEmail(userEmail);
      console.log('Google user email:', userEmail);
    } catch (error) {
      console.error('Error fetching user info from Google:', error);
      setError('Failed to fetch user profile from Google. Please try again.');
    }

    setUserChosenMode('google_comment');
    setShowGoogleAuthPrompt(false);
    setIsGoogleAuthenticating(false);
  };

  // Handle Google login error
  const handleGoogleLoginError = (error: any) => {
    console.error('Google login failed:', error);
    setError('Google sign-in failed. Please try again or use readonly mode.');
    setIsGoogleAuthenticating(false);
    setShowGoogleAuthPrompt(false);
  };

  const handleCloseGoogleAuthPrompt = () => {
    setShowGoogleAuthPrompt(false);
    setIsGoogleAuthenticating(false);
  };

  // Handle mode selection
  const handleModeSelection = (mode: 'google_comment' | 'readonly') => {
    if (mode === 'google_comment') {
      if (googleAccessToken) {
        setUserChosenMode('google_comment');
      } else {
        setShowGoogleAuthPrompt(true);
      }
    } else {
      setUserChosenMode('readonly');
    }
  };

  // Set up axios interceptor for handling 403 errors globally
  useEffect(() => {
    // Create response interceptor
    const interceptor = axios.interceptors.response.use(
      response => response, // Pass successful responses through
      error => {
        if (error.response && router.pathname.includes('/client-portal/requests/')) {
          // Handle 403 forbidden errors
          if (error.response.status === 403) {
            console.log('Access forbidden - redirecting to dashboard');
            setRedirecting(true);
            router.push('/client-portal?error=unauthorized_request');
            // Return a resolved promise to prevent the error from propagating
            return Promise.resolve({ data: null, status: 403 });
          }

          // Handle 404 not found errors
          if (error.response.status === 404) {
            console.log('Request not found - redirecting to dashboard');
            setRedirecting(true);
            router.push('/client-portal?error=request_not_found');
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

    // Defensive logging
    console.log('fetchRequestDetails called with:', { id, clientInfo });

    // Only proceed if clientInfo.contact_id is a valid number
    if (!clientInfo || typeof clientInfo.contact_id !== 'number' || isNaN(clientInfo.contact_id)) {
      console.warn(
        'Aborting fetch: clientInfo.contact_id is not a valid number',
        clientInfo?.contact_id
      );
      setLoading(false);
      return;
    }

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo.contact_id.toString(),
      };
      console.log('Fetching approval request with headers:', headers, 'id:', id);

      const response = await axios.get(`/api/approval-requests/${id}`, { headers });

      // Only set request if we got valid data
      if (response.data) {
        setRequest(response.data);

        // Fetch staff member email if we have created_by_id
        if (response.data.created_by_id) {
          fetchStaffEmail(response.data.created_by_id);
        }

        // If we have Recogito instance and new comments, update them without reinitializing
        if (recogitoInstance.current && response.data.section_comments) {
          try {
            // Use the same conversion function that's defined elsewhere in the component
            const convertToAnnotation = (dbComment: SectionComment) => ({
              '@context': 'http://www.w3.org/ns/anno.jsonld',
              type: 'Annotation',
              id: `#section-comment-${dbComment.section_comment_id}`,
              body: [
                {
                  type: 'TextualBody',
                  value: dbComment.comment_text,
                  purpose: 'commenting',
                  creator: {
                    id: dbComment.user_id
                      ? `staff:${dbComment.user_id}`
                      : `mailto:${dbComment.contact_name}`,
                    name: dbComment.user_name || dbComment.contact_name || 'Unknown',
                  },
                  created: dbComment.created_at_iso || dbComment.created_at,
                },
                ...(dbComment.replies && dbComment.replies.length > 0
                  ? dbComment.replies.map((reply: any) => ({
                      type: 'TextualBody',
                      purpose: 'replying',
                      value: reply.reply_text,
                      creator: {
                        id: reply.user_id
                          ? `staff:${reply.user_id}`
                          : `contact:${reply.client_contact_id}`,
                        name:
                          reply.author_name || reply.user_name || reply.client_name || 'Unknown',
                      },
                      created: reply.created_at_iso || reply.created_at,
                    }))
                  : []),
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
              htmlBody: `
                <div class="section-comment">
                  <div class="comment-header">
                    <span class="commenter-name">${dbComment.contact_name || dbComment.user_name || 'Unknown'}</span>
                    <span class="comment-date">${new Date(dbComment.created_at_iso || dbComment.created_at).toLocaleString()}</span>
                  </div>
                  <div class="comment-text">${dbComment.comment_text}</div>
                  <div id="reaction-container-section-${dbComment.section_comment_id}" class="reaction-container"></div>
                  ${
                    dbComment.replies && dbComment.replies.length > 0
                      ? `<div class="replies">
                        ${dbComment.replies
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

            const loadedAnnotations = response.data.section_comments.map(convertToAnnotation);
            recogitoInstance.current.setAnnotations(loadedAnnotations);
            console.log('Updated annotations in existing Recogito instance');
          } catch (error) {
            console.error('Error updating annotations:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching approval request details:', error);

      // The 403 case is now handled by the interceptor, this is for other errors
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id, clientInfo?.contact_id]); // Only depend on id and contact_id, not the entire clientInfo object

  // Fetch staff member email
  const fetchStaffEmail = async (userId: string) => {
    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      const response = await axios.get(`/api/users/${userId}/email`, { headers });
      if (response.data && response.data.email) {
        setStaffEmail(response.data.email);
      }
    } catch (error) {
      console.error('Error fetching staff email:', error);
      // Don't set an error, just fail silently since this is not critical
    }
  };

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
    console.log('Client portal useEffect triggered:', {
      id,
      clientInfo,
      effectiveClientInfo,
      isValidClient,
      isLoading,
      hasClientInfo: !!clientInfo,
      clientInfoType: typeof clientInfo,
      clientInfoKeys: clientInfo ? Object.keys(clientInfo) : null,
    });

    if (
      id &&
      effectiveClientInfo &&
      typeof effectiveClientInfo.contact_id === 'number' &&
      !isNaN(effectiveClientInfo.contact_id) &&
      !loading // Prevent multiple simultaneous requests
    ) {
      console.log('Fetching request details with valid client info');
      fetchRequestDetails();
    } else {
      console.warn(
        'Skipping fetchRequestDetails: id or valid effectiveClientInfo.contact_id not ready',
        {
          id,
          clientInfo,
          effectiveClientInfo,
          isValidClient,
          isLoading,
          hasClientInfo: !!clientInfo,
          clientInfoType: typeof clientInfo,
          clientInfoKeys: clientInfo ? Object.keys(clientInfo) : null,
        }
      );
    }
  }, [id, effectiveClientInfo?.contact_id, fetchRequestDetails, loading]); // Simplified dependencies

  // Add a separate effect to handle authentication state changes
  useEffect(() => {
    console.log('Authentication state changed:', {
      isLoading,
      isValidClient,
      hasClientInfo: !!clientInfo,
      hasEffectiveClientInfo: !!effectiveClientInfo,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    });

    if (!isLoading && !isValidClient && clientInfo === null && !bypassAuth) {
      console.log('Client authentication failed - redirecting to login');
      // The useClientAuth hook should handle the redirect, but let's add a fallback
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        router.push('/client-portal/login');
      }
    }
  }, [isLoading, isValidClient, clientInfo, effectiveClientInfo, router, bypassAuth]);

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
  const convertDbCommentToAnnotation = useCallback((dbComment: SectionComment) => {
    // Create a simpler structure that Recogito can handle better
    const annotation = {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      type: 'Annotation',
      id: `#section-comment-${dbComment.section_comment_id}`,
      // Use a single body object instead of an array for better Recogito compatibility
      body: {
        type: 'TextualBody',
        value: dbComment.comment_text,
        purpose: 'commenting',
        creator: {
          id: dbComment.user_id ? `staff:${dbComment.user_id}` : `contact:${dbComment.contact_id}`,
          name: dbComment.user_name || dbComment.contact_name || 'Unknown',
        },
        created: dbComment.created_at_iso || dbComment.created_at,
      },
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
      // Store replies separately for the formatter to access
      replies: dbComment.replies || [],
      // Store metadata for the formatter
      metadata: {
        comment_text: dbComment.comment_text,
        author_name: dbComment.user_name || dbComment.contact_name || 'Unknown',
        created_at: dbComment.created_at_iso || dbComment.created_at,
        replies: dbComment.replies || [],
      },
    };

    console.log('Client View: Created annotation:', annotation);
    return annotation;
  }, []); // Empty dependency array since this function doesn't depend on any props or state
  // --- End Recogito Helper Function ---

  // Formatter function to display comment text in popups
  const formatter = useCallback((annotation: any) => {
    console.log('Client View: Formatting annotation:', annotation);
    console.log('Client View: Annotation body:', annotation.body);
    console.log('Client View: Annotation metadata:', annotation.metadata);

    // Try different ways to get the comment data
    let commentText = '';
    let creatorName = 'Unknown';
    let createdDate = '';
    let replies = [];

    // First try the metadata approach
    if (annotation.metadata) {
      commentText = annotation.metadata.comment_text || '';
      creatorName = annotation.metadata.author_name || 'Unknown';
      createdDate = annotation.metadata.created_at || '';
      replies = annotation.metadata.replies || [];
    }
    // Fallback to body structure
    else if (annotation.body) {
      // Handle single body object
      if (annotation.body.value) {
        commentText = annotation.body.value;
        creatorName = annotation.body.creator?.name || 'Unknown';
        createdDate = annotation.body.created || '';
      }
      // Handle array of bodies
      else if (Array.isArray(annotation.body)) {
        const mainComment = annotation.body.find((body: any) => body.purpose === 'commenting');
        if (mainComment) {
          commentText = mainComment.value;
          creatorName = mainComment.creator?.name || 'Unknown';
          createdDate = mainComment.created || '';
        }
      }
      replies = annotation.replies || [];
    }

    if (!commentText) {
      console.log('Client View: No comment text found, returning fallback');
      return '<div style="padding: 8px;">No comment text available</div>';
    }

    const formattedDate = createdDate ? new Date(createdDate).toLocaleString() : '';

    let html = `
      <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 250px; max-width: 400px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #1976d2;">${creatorName}</div>
        <div style="margin-bottom: 8px; line-height: 1.4; color: #333;">${commentText}</div>
        ${formattedDate ? `<div style="font-size: 0.85em; color: #666; border-top: 1px solid #eee; padding-top: 6px; margin-top: 6px;">${formattedDate}</div>` : ''}
    `;

    // Add replies if they exist
    if (replies && replies.length > 0) {
      html += `<div style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 8px;">`;
      replies.forEach((reply: any) => {
        const replyDate = reply.created_at_iso || reply.created_at;
        const replyFormattedDate = replyDate ? new Date(replyDate).toLocaleString() : '';
        html += `
          <div style="margin-bottom: 8px; padding: 6px; background: #f5f5f5; border-radius: 4px;">
            <div style="font-weight: 500; font-size: 0.9em; color: #1976d2;">${reply.author_name || reply.user_name || reply.client_name || 'Unknown'}</div>
            <div style="font-size: 0.9em; color: #333; margin: 4px 0;">${reply.reply_text}</div>
            ${replyFormattedDate ? `<div style="font-size: 0.8em; color: #666;">${replyFormattedDate}</div>` : ''}
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;

    console.log('Client View: Generated HTML:', html);
    return html;
  }, []);

  // Memoize annotations for Recogito to prevent re-conversion on every render
  const recogitoAnnotations = useMemo(() => {
    if (!request?.section_comments) {
      return [];
    }
    console.log('Client View: Converting DB comments to Recogito annotations');
    return request.section_comments.map(convertDbCommentToAnnotation);
  }, [request?.section_comments, convertDbCommentToAnnotation]);

  // Effect for Recogito INITIALIZATION and event handler setup
  useEffect(() => {
    if (!sanitizedHtmlContent || viewingVersion || !clientInfo || !request) {
      console.log('Skipping Recogito init:', {
        hasSanitizedContent: !!sanitizedHtmlContent,
        viewingVersion,
        hasClientInfo: !!clientInfo,
        hasRequest: !!request,
      });
      return;
    }

    if (recogitoInstance.current) {
      // Already initialized
      return;
    }

    let isMounted = true;

    const initRecogitoWithHandlers = async () => {
      const contentElement = document.getElementById('content-view');
      if (!isMounted || !contentElement) {
        return;
      }

      const isReadOnly = request.status !== 'pending';
      const r = await initVersionRecogito({
        contentElementId: 'content-view',
        annotations: [], // Start with empty, will be loaded by another effect
        readOnly: isReadOnly,
        currentInstance: null,
        formatter: formatter, // Add formatter for hover popups
      });

      if (!r) {
        console.error('Failed to initialize Recogito instance.');
        return;
      }

      recogitoInstance.current = r;

      if (!isReadOnly) {
        // Handle creating new annotations
        r.on('createAnnotation', async (annotation: any) => {
          try {
            const headers = {
              'x-client-portal': 'true',
              'x-client-contact-id': clientInfo?.contact_id.toString(),
            };
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
                  contactId: clientInfo?.contact_id,
                  startOffset: textPosition.start,
                  endOffset: textPosition.end,
                  selectedText: textQuote?.exact || '',
                  commentText: body.value,
                  versionId: request.versions[0]?.version_id,
                },
                { headers }
              );

              // Optimistically update local state with the new comment from the server
              const newComment = response.data.comment;
              setRequest(prevRequest => {
                if (!prevRequest) return null;
                const updatedComments = [...(prevRequest.section_comments || []), newComment];
                return { ...prevRequest, section_comments: updatedComments };
              });
            }
          } catch (error) {
            console.error('Error saving annotation:', error);
            setError('Failed to save comment. Please try again.');
            // On error, refetch to sync state
            fetchRequestDetails();
          }
        });

        // Handle adding replies (also an optimistic update)
        r.on('updateAnnotation', async (annotation: any) => {
          // Find the new reply text
          const newReply = annotation.body[annotation.body.length - 1];
          if (!newReply || !newReply.purpose || newReply.purpose !== 'replying') return;

          const idMatch = annotation.id.match(/#section-comment-(\d+)/);
          if (!idMatch || !idMatch[1]) return;
          const commentId = parseInt(idMatch[1]);

          try {
            const headers = {
              'x-client-portal': 'true',
              'x-client-contact-id': clientInfo?.contact_id.toString(),
            };
            const response = await axios.post(
              `/api/approval-requests/${id}/section-comments/${commentId}/replies`,
              { contactId: clientInfo?.contact_id, replyText: newReply.value },
              { headers }
            );

            // Update local state with the server's response
            const updatedCommentWithReply = response.data.comment;
            setRequest(prevRequest => {
              if (!prevRequest) return null;
              const updatedComments =
                prevRequest.section_comments?.map(c =>
                  c.section_comment_id === commentId ? updatedCommentWithReply : c
                ) || [];
              return { ...prevRequest, section_comments: updatedComments };
            });
          } catch (error) {
            console.error('Error saving reply:', error);
            setError('Failed to save reply. Please try again.');
            fetchRequestDetails();
          }
        });
      }
    };

    initRecogitoWithHandlers();

    return () => {
      isMounted = false;
      if (recogitoInstance.current) {
        console.log('Client View: Destroying Recogito instance.');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [sanitizedHtmlContent, viewingVersion, request?.status, clientInfo, id, fetchRequestDetails]); // Dependencies that trigger re-initialization

  // Effect for LOADING/UPDATING annotations into the instance
  useEffect(() => {
    if (recogitoInstance.current && recogitoAnnotations) {
      console.log('Client View: Loading/updating annotations into Recogito.');
      recogitoInstance.current.setAnnotations(recogitoAnnotations);
    }
  }, [recogitoAnnotations]); // This runs only when the comments change

  // Handle version content view
  const handleViewVersionContent = async (version: any) => {
    try {
      // First close history modal and set loading state
      setVersionHistoryOpen(false);
      setVersionLoading(true);
      setViewingVersion(true);
      setCurrentVersionId(version.version_id);

      // Check if this content is a Google Doc by checking both content_type and URL
      const isGoogleDoc = (content?: string | null, contentType?: string | null): boolean => {
        return (
          contentType === 'google_doc' ||
          (!!content && content.includes('docs.google.com') && !content.startsWith('<'))
        );
      };

      // Save version content type for rendering
      const versionContentType =
        version.content_type ||
        (version.version_number === request?.versions[0]?.version_number
          ? request?.content_type
          : 'html');

      // Set content based on version
      const content =
        version.version_number === request?.versions[0]?.version_number
          ? request?.inline_content || ''
          : version.inline_content || '';

      setVersionContent(content);

      // If this is a Google Doc, we don't need to initialize Recogito
      if (isGoogleDoc(content, versionContentType)) {
        console.log(
          'Version View: Detected Google Doc, skipping Recogito initialization completely'
        );
        // Clear annotations and exit early - don't attempt to initialize Recogito
        setAnnotations([]);
        setVersionLoading(false);
        return;
      }

      // Only proceed with Recogito for non-Google Doc content
      // Filter section comments for this version
      if (request?.section_comments) {
        const versionSpecificComments = request.section_comments.filter(
          comment => comment.version_id === version.version_id
        );
        console.log(
          `Found ${versionSpecificComments.length} comments for version ${version.version_number}`
        );
        setAnnotations(versionSpecificComments.map(convertDbCommentToAnnotation));
      } else {
        setAnnotations([]);
      }

      // Wait for the DOM to update with the new content
      setTimeout(async () => {
        // Now initialize Recogito using the shared utility
        versionRecogitoInstance.current = await initVersionRecogito({
          contentElementId: 'version-content-view',
          annotations: annotations,
          readOnly: true,
          currentInstance: versionRecogitoInstance.current,
          formatter: formatter, // Add formatter for hover popups
        });
      }, 500);
    } catch (error) {
      console.error('Error viewing version content:', error);
      setError('Failed to load version content');
    } finally {
      setVersionLoading(false);
    }
  };

  // Return to current version view
  const handleCloseVersionView = () => {
    setViewingVersion(false);
    setVersionContent(null);
    setCurrentVersionId(null);

    // Cleanup any version-specific Recogito instance
    if (versionRecogitoInstance.current) {
      versionRecogitoInstance.current.destroy();
      versionRecogitoInstance.current = null;
    }
  };

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
          note: approvalNote.trim() || null, // Include note if provided
          notifyOwner: true, // Trigger email notification
        },
        { headers }
      );

      setApprovalDialogOpen(false);
      setApprovalNote('');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle submit with feedback
  const handleSubmitWithFeedback = async () => {
    if (!feedbackNote.trim()) {
      setError('Please provide feedback before submitting');
      return;
    }

    setSubmittingFeedback(true);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': clientInfo?.contact_id.toString(),
      };

      await axios.put(
        `/api/approval-requests/${id}/feedback`,
        {
          feedback: feedbackNote,
          contactId: clientInfo?.contact_id,
          notifyOwner: true, // Trigger email notification
        },
        { headers }
      );

      setFeedbackDialogOpen(false);
      setFeedbackNote('');
      fetchRequestDetails();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
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
      <Chip label={status?.charAt(0).toUpperCase() + status?.slice(1)} color={color} size="small" />
    );
  };

  // Add this in the React.useEffect for Recogito initialization
  useEffect(() => {
    // Only run if we have the right content type, not in version view, and have client info
    if (!sanitizedHtmlContent || viewingVersion || !clientInfo || !request) {
      console.log('Skipping Recogito init in second useEffect:', {
        hasSanitizedContent: !!sanitizedHtmlContent,
        viewingVersion,
        hasClientInfo: !!clientInfo,
        hasRequest: !!request,
      });
      return;
    }

    let isMounted = true;

    // Async function to initialize Recogito
    const initRecogito = async () => {
      try {
        // Ensure the element exists before initializing
        const contentElement = document.getElementById('content-view');
        if (!isMounted || !contentElement) {
          console.log('Aborting Recogito init: component unmounted or element not found.');
          return;
        }

        // Determine if Recogito should be in read-only mode
        const isReadOnly = request.status !== 'pending';
        console.log(`Client View: Initializing Recogito (readOnly: ${isReadOnly})`);

        // Initialize Recogito using the shared utility
        const r = await initVersionRecogito({
          contentElementId: 'content-view',
          annotations: [], // Start with empty annotations
          readOnly: isReadOnly,
          currentInstance: null, // Always create a new instance
          formatter: formatter, // Add formatter for hover popups
        });

        // If initialization fails, stop here
        if (!r) {
          console.error('Failed to initialize Recogito instance.');
          return;
        }

        // Store the instance in the ref
        recogitoInstance.current = r;

        // --- Attach Event Handlers ---
        if (!isReadOnly) {
          // Handle creating new annotations
          r.on('createAnnotation', async (annotation: any) => {
            console.log('Client created annotation:', annotation);
            try {
              const headers = {
                'x-client-portal': 'true',
                'x-client-contact-id': clientInfo?.contact_id.toString(),
              };

              const body = annotation.body?.[0];
              const textQuote = annotation.target.selector.find(
                (s: any) => s.type === 'TextQuoteSelector'
              );
              const textPosition = annotation.target.selector.find(
                (s: any) => s.type === 'TextPositionSelector'
              );

              if (body && textPosition) {
                await axios.post(
                  `/api/approval-requests/${id}/section-comments`,
                  {
                    contactId: clientInfo?.contact_id,
                    startOffset: textPosition.start,
                    endOffset: textPosition.end,
                    selectedText: textQuote?.exact || '',
                    commentText: body.value,
                    versionId: request.versions[0]?.version_id,
                  },
                  { headers }
                );
                // Refresh data to get the latest state
                fetchRequestDetails();
              }
            } catch (error) {
              console.error('Error saving annotation:', error);
              setError('Failed to save comment. Please try again.');
            }
          });

          // Handle adding replies
          r.on('updateAnnotation', async (annotation: any) => {
            console.log('Client updated annotation:', annotation);
            try {
              const headers = {
                'x-client-portal': 'true',
                'x-client-contact-id': clientInfo?.contact_id.toString(),
              };
              const idMatch = annotation.id.match(/#section-comment-(\d+)/);
              if (!idMatch || !idMatch[1]) return;

              const commentId = parseInt(idMatch[1]);
              const newReply = annotation.body[annotation.body.length - 1];

              if (newReply?.value) {
                await axios.post(
                  `/api/approval-requests/${id}/section-comments/${commentId}/replies`,
                  {
                    contactId: clientInfo?.contact_id,
                    replyText: newReply.value,
                  },
                  { headers }
                );
                // Refresh data
                fetchRequestDetails();
              }
            } catch (error) {
              console.error('Error saving reply:', error);
              setError('Failed to save reply. Please try again.');
            }
          });
        }

        // --- Load Existing Annotations ---
        // Removed: This is now handled by a separate useEffect
      } catch (error) {
        console.error('Client View: Failed to load or initialize Recogito:', error);
      }
    };

    // Run the initialization
    initRecogito();

    // --- Cleanup Function ---
    return () => {
      isMounted = false;
      if (recogitoInstance.current) {
        console.log('Client View: Destroying Recogito instance...');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [
    sanitizedHtmlContent,
    viewingVersion,
    request?.status,
    request?.section_comments?.length, // Only depend on length, not the full array
    clientInfo?.contact_id, // Only depend on contact_id, not the full object
    id,
    // Remove fetchRequestDetails and convertDbCommentToAnnotation from dependencies
    // as they cause infinite loops
  ]);

  // Separate effect to load annotations after Recogito is initialized
  useEffect(() => {
    if (recogitoInstance.current && request?.section_comments) {
      console.log('Client View: Loading existing annotations...');
      const loadedAnnotations = request.section_comments.map(convertDbCommentToAnnotation);
      recogitoInstance.current.setAnnotations(loadedAnnotations);
      console.log('Client View: Annotations loaded.');
    }
  }, [recogitoInstance.current, request?.section_comments, convertDbCommentToAnnotation]);

  // Add useEffect to try to detect Google login status (basic detection)
  useEffect(() => {
    // This is a basic detection method - won't work for all cases
    // but gives us something to show in the UI
    const checkGoogleLoginStatus = () => {
      // Check if there are any Google cookies
      const hasGoogleCookies = document.cookie
        .split(';')
        .some(
          cookie =>
            cookie.trim().startsWith('GAPS=') ||
            cookie.trim().startsWith('LSID=') ||
            cookie.trim().startsWith('SID=')
        );
      setIsLoggedInToGoogle(hasGoogleCookies);
    };

    checkGoogleLoginStatus();
  }, []);

  if (isLoading || (loading && !request)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!bypassAuth && !isValidClient) {
    return null; // The hook will redirect to login page
  }

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_CONTENT_APPROVAL_REVIEWER;

  function ClientPortalRequestContent() {
    const actionButtons = (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Approve button */}
        {request && request.status === 'pending' && !hasApproved() && (
          <Tooltip
            title={
              <Typography variant="body2">
                <strong>Your Decision</strong>
                <br />
                Please review the content and approve if you&apos;re satisfied with it. Once
                approved, the content will be prepared for publishing.
              </Typography>
            }
            arrow
          >
            <IntercomButton
              variant="primary"
              startIcon={<CheckCircleIcon />}
              onClick={() => setApprovalDialogOpen(true)}
            >
              Approve
            </IntercomButton>
          </Tooltip>
        )}

        {/* Submit with Feedback button */}
        {request && request.status === 'pending' && !hasApproved() && (
          <IntercomButton
            onClick={() => setFeedbackDialogOpen(true)}
            variant="secondary"
            startIcon={<CommentIcon />}
          >
            Submit with Feedback
          </IntercomButton>
        )}
      </Box>
    );

    return (
      <ClientPortalLayout
        title={request?.title || 'Content Review'}
        breadcrumbs={[
          { label: 'Content Portal', href: '/client-portal' },
          { label: 'Content Review' },
        ]}
        actions={actionButtons}
        clientInfo={
          effectiveClientInfo
            ? { name: effectiveClientInfo.name, email: effectiveClientInfo.email }
            : null
        }
      >
        {/* Error alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Authentication error alert */}
        {!isLoading && !isValidClient && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Authentication required. Please{' '}
              <Button
                variant="text"
                color="primary"
                onClick={() => router.push('/client-portal/login')}
                sx={{ p: 0, minWidth: 'auto', textTransform: 'none' }}
              >
                sign in
              </Button>{' '}
              to view this content.
            </Typography>
          </Alert>
        )}

        {/* Show content even when authentication is in progress for testing */}
        {(request || isLoading) && (
          <>
            {/* Request header */}
            {request && (
              <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
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

                  <Grid item xs={12} md={5}>
                    <Box
                      sx={{
                        position: 'sticky',
                        top: '20px',
                        zIndex: 2,
                      }}
                    >
                      {/* Request info card */}
                      <Card variant="outlined">
                        <CardContent>
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
                              Submitted by:
                            </Typography>
                            <Typography variant="body2">{staffEmail || 'Staff member'}</Typography>
                          </Box>
                        </CardContent>
                      </Card>

                      {/* Remove the Decision box and keep only the approval status alerts */}
                      {request.status === 'approved' && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          You have approved this content.
                        </Alert>
                      )}

                      {request.status === 'rejected' && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          You have rejected this content.
                        </Alert>
                      )}

                      {request.status === 'pending' && hasApproved() && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          You have approved this content. Waiting for other stakeholders to review.
                        </Alert>
                      )}

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
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Main content grid */}
            {!viewingVersion ? (
              <Grid container spacing={3}>
                {/* Main content column */}
                <Grid item xs={12}>
                  {/* Document card - Updated Rendering Logic */}
                  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {request?.status === 'pending' ? 'Content for Review' : 'Reviewed Content'}
                    </Typography>

                    {/* GOOGLE DOC DISPLAY - Separate rendering for Google Docs */}
                    {!viewingVersion &&
                      request?.inline_content &&
                      (request?.content_type === 'google_doc' ||
                        (request?.inline_content.includes('docs.google.com') &&
                          !request?.inline_content.startsWith('<'))) && (
                        <Box mt={2}>
                          <Typography variant="h4" gutterBottom>
                            {request.title}
                          </Typography>

                          {/* UNIFIED CONTENT AREA FOR RECOGITO AND IFRAME */}
                          {isRecogitoContentType(request) ? (
                            // Render Recogito-compatible content declaratively
                            <Box
                              ref={contentRef}
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
                                  '&:hover': {
                                    color: 'primary.dark',
                                  },
                                },
                              }}
                              className="annotatable-container"
                            >
                              <div
                                id="content-view"
                                dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent || '' }}
                              />
                            </Box>
                          ) : (
                            // Traditional Google Doc iframe rendering
                            <>
                              {/* Mode Selection for Google Docs */}
                              {request.status === 'pending' && !userChosenMode && (
                                <Box sx={{ mb: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                  <Typography variant="h6" gutterBottom>
                                    How would you like to review this content?
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Sign in with Google to comment directly on the document, or
                                    review without an account.
                                  </Typography>

                                  <Box sx={{ textAlign: 'center' }}>
                                    {/* Primary CTA: Sign in to Google */}
                                    <Button
                                      variant="contained"
                                      size="large"
                                      onClick={() => handleModeSelection('google_comment')}
                                      startIcon={<GoogleIcon />}
                                      sx={{
                                        py: 2,
                                        px: 4,
                                        mb: 2,
                                        bgcolor: '#4285f4',
                                        '&:hover': {
                                          bgcolor: '#3367d6',
                                        },
                                      }}
                                    >
                                      Sign in with Google to Comment
                                    </Button>

                                    <br />

                                    {/* Secondary option: No G-Suite account */}
                                    <Button
                                      variant="text"
                                      color="primary"
                                      onClick={() => handleModeSelection('readonly')}
                                      sx={{
                                        textTransform: 'none',
                                        textDecoration: 'underline',
                                        '&:hover': {
                                          textDecoration: 'underline',
                                          bgcolor: 'transparent',
                                        },
                                      }}
                                    >
                                      Don&apos;t have a G-Suite account? View document and leave
                                      comments below
                                    </Button>
                                  </Box>
                                </Box>
                              )}

                              {/* Status indicators and mode controls */}
                              {userChosenMode === 'google_comment' && googleAccessToken && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                  <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography variant="body2">
                                      ✅ <strong>Signed in with Google</strong> - You can comment
                                      directly on the document
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => setUserChosenMode(null)}
                                    >
                                      Change Mode
                                    </Button>
                                  </Box>
                                </Alert>
                              )}

                              {userChosenMode === 'google_comment' &&
                                !googleAccessToken &&
                                isGoogleAuthenticating && (
                                  <Alert severity="info" sx={{ mb: 2 }}>
                                    <Box display="flex" alignItems="center">
                                      <CircularProgress size={20} sx={{ mr: 2 }} />
                                      <Typography variant="body2">
                                        Waiting for Google sign-in...
                                      </Typography>
                                    </Box>
                                  </Alert>
                                )}

                              {userChosenMode === 'readonly' && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                  <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography variant="body2">
                                      👁️ <strong>View-only mode</strong> - Use the comments section
                                      below to provide feedback
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => setUserChosenMode(null)}
                                    >
                                      Change Mode
                                    </Button>
                                  </Box>
                                </Alert>
                              )}

                              {/* Only show document if user has made a choice OR if request is not pending */}
                              {(userChosenMode || request.status !== 'pending') && (
                                <Box
                                  sx={{
                                    height: '700px',
                                    border: '1px solid',
                                    borderColor: 'rgba(0, 0, 0, 0.23)',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {GoogleDocIframe}
                                </Box>
                              )}
                            </>
                          )}
                        </Box>
                      )}

                    {/* REGULAR HTML CONTENT DISPLAY - This block is now handled by the logic above */}
                    {/* The old logic for non-Google Docs is now merged into the isRecogitoContentType check */}

                    {/* File download button for file-based requests */}
                    {!viewingVersion && !request?.inline_content && request?.file_url && (
                      <Box display="flex" alignItems="center" my={2}>
                        <DocumentIcon color="primary" sx={{ mr: 2 }} />
                        <Typography variant="body1">{getFileTypeName(request.file_url)}</Typography>
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
                    )}

                    {/* Fallback if no content exists */}
                    {!viewingVersion && !request?.inline_content && !request?.file_url && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                        No content available for review.
                      </Typography>
                    )}
                  </Paper>

                  {/* Comments section */}
                  <CommentsSection
                    requestId={id}
                    clientInfo={effectiveClientInfo}
                    request={request}
                    clientAuthToken={clientAuthToken}
                    onRequestUpdate={fetchRequestDetails}
                  />
                </Grid>
              </Grid>
            ) : (
              // Version history content view
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Version{' '}
                        {request?.versions.find(v => v.version_id === currentVersionId)
                          ?.version_number || ''}{' '}
                        Content
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<BackIcon />}
                        onClick={handleCloseVersionView}
                      >
                        Back to Current Version
                      </Button>
                    </Box>

                    {versionLoading ? (
                      <Box display="flex" justifyContent="center" my={4}>
                        <CircularProgress />
                      </Box>
                    ) : versionContent ? (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {annotations.length} comment{annotations.length !== 1 ? 's' : ''} for this
                          version.
                        </Typography>

                        {/* Check if this is a Google Doc */}
                        {currentVersionId &&
                        (request?.versions?.find(v => v.version_id === currentVersionId)
                          ?.content_type === 'google_doc' ||
                          (versionContent &&
                            versionContent.includes('docs.google.com') &&
                            !versionContent.startsWith('<'))) ? (
                          <Box
                            sx={{
                              height: '700px',
                              border: '1px solid',
                              borderColor: 'rgba(0, 0, 0, 0.23)',
                              borderRadius: 1,
                              overflow: 'hidden',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <iframe
                              key={`${currentVersionId}-${googleAccessToken || 'anonymous'}`}
                              src={getEmbeddableGoogleDocUrl(
                                versionContent,
                                request?.status || 'pending',
                                userChosenMode === 'google_comment' && !!googleAccessToken,
                                googleUserEmail,
                                staffEmail
                              )}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              style={{ border: 'none' }}
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            ></iframe>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary" align="center">
                            Historical inline content is not preserved for older versions. The
                            database has been updated to store inline content for future versions.
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary" align="center">
                        Historical inline content is not preserved for older versions. The database
                        has been updated to store inline content for future versions.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}
          </>
        )}
      </ClientPortalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Content Review - {request?.title || 'Request'}</title>
        <link rel="stylesheet" href="/vendor/recogito.min.css" />
        <style jsx global>{`
          /* Ensure Recogito popups are visible and properly styled */
          .r6o-popup {
            z-index: 10000 !important;
            background: white !important;
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
            padding: 0 !important;
            max-width: 450px !important;
            min-width: 250px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
          }

          .r6o-popup-content {
            background: white !important;
            color: #333 !important;
            padding: 0 !important;
            border-radius: 8px !important;
          }

          /* Style for the popup arrow */
          .r6o-popup:after {
            border-color: white transparent transparent transparent !important;
          }

          /* Ensure annotations are highlighted */
          .r6o-annotation {
            background-color: rgba(255, 215, 0, 0.3) !important;
            border-bottom: 2px solid #ffd700 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
          }

          .r6o-annotation:hover {
            background-color: rgba(255, 215, 0, 0.5) !important;
            border-bottom-width: 3px !important;
          }

          /* Fix text input colors for light mode - more aggressive */
          .r6o-editor textarea,
          .r6o-editor input[type='text'],
          .r6o-widget textarea,
          .r6o-widget input[type='text'],
          .r6o-editor-inner textarea,
          .r6o-editor-inner input[type='text'],
          textarea.r6o-editable,
          input.r6o-editable,
          .r6o-editable-text,
          .r6o-comment-input {
            background: white !important;
            color: #000 !important;
            border: 1px solid #ccc !important;
            padding: 8px !important;
            border-radius: 4px !important;
            font-family: inherit !important;
            font-size: 14px !important;
          }

          .r6o-editor textarea:focus,
          .r6o-editor input[type='text']:focus,
          .r6o-widget textarea:focus,
          .r6o-widget input[type='text']:focus,
          textarea.r6o-editable:focus,
          input.r6o-editable:focus {
            border-color: #1976d2 !important;
            outline: none !important;
            box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2) !important;
            color: #000 !important;
          }

          /* Force all text in Recogito widgets to be black */
          .r6o-widget,
          .r6o-widget *,
          .r6o-editor,
          .r6o-editor *,
          .r6o-editor-inner,
          .r6o-editor-inner * {
            color: #000 !important;
          }

          /* Ensure popup content is visible */
          .r6o-popup .r6o-widget {
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
          }

          /* Override any conflicting styles */
          .r6o-popup * {
            box-sizing: border-box !important;
          }
        `}</style>
      </Head>
      <GoogleOAuthProvider clientId={googleClientId || ''}>
        <ThemeProvider>
          <ToastProvider>
            <ClientPortalRequestContent />

            {/* Approval confirmation dialog */}
            <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
              <DialogTitle>Confirm Approval</DialogTitle>
              <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                  Are you sure you want to approve this content? This will indicate that you have
                  reviewed the content and are satisfied with it.
                </DialogContentText>

                <Box sx={{ mt: 2 }}>
                  <FormLabel component="legend" sx={{ mb: 1, display: 'block' }}>
                    Add any comments about your approval (optional)
                  </FormLabel>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={approvalNote}
                    onChange={e => setApprovalNote(e.target.value)}
                    placeholder="Your note will be sent to the content owner"
                    variant="outlined"
                  />
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    Your note will be sent to the content owner with your approval
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <IntercomButton onClick={() => setApprovalDialogOpen(false)} variant="ghost">
                  Cancel
                </IntercomButton>
                <IntercomButton onClick={handleApprove} variant="primary" disabled={actionLoading}>
                  {actionLoading ? <CircularProgress size={24} /> : 'Approve'}
                </IntercomButton>
              </DialogActions>
            </Dialog>

            {/* Feedback dialog */}
            <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)}>
              <DialogTitle>Submit with Feedback</DialogTitle>
              <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                  Please provide your feedback about this content. The content owner will be
                  notified.
                </DialogContentText>
                <TextField
                  autoFocus
                  required
                  label="Your Feedback"
                  fullWidth
                  multiline
                  rows={4}
                  value={feedbackNote}
                  onChange={e => setFeedbackNote(e.target.value)}
                  placeholder="What changes or improvements would you like to see?"
                  error={!feedbackNote.trim() && submittingFeedback}
                  helperText={
                    !feedbackNote.trim() && submittingFeedback ? 'Feedback is required' : ''
                  }
                />
              </DialogContent>
              <DialogActions>
                <IntercomButton onClick={() => setFeedbackDialogOpen(false)} variant="ghost">
                  Cancel
                </IntercomButton>
                <IntercomButton
                  variant="primary"
                  onClick={handleSubmitWithFeedback}
                  disabled={submittingFeedback || !feedbackNote.trim()}
                >
                  {submittingFeedback ? <CircularProgress size={24} /> : 'Submit Feedback'}
                </IntercomButton>
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
                                {version.file_url ? (
                                  // For file-based versions
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<DownloadIcon />}
                                    href={version.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ mt: 2 }}
                                  >
                                    Download File
                                  </Button>
                                ) : (
                                  // For inline content versions - ensure Google Doc links use comment mode
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ArticleIcon />}
                                    onClick={() => {
                                      handleViewVersionContent(version);
                                      setVersionHistoryOpen(false);
                                    }}
                                    sx={{ mt: 2 }}
                                  >
                                    View Content
                                  </Button>
                                )}
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
                <IntercomButton onClick={() => setVersionHistoryOpen(false)} variant="primary">
                  Close
                </IntercomButton>
              </DialogActions>
            </Dialog>

            {/* Google Authentication Dialog */}
            <Dialog
              open={showGoogleAuthPrompt}
              onClose={handleCloseGoogleAuthPrompt}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 2,
                },
              }}
            >
              <DialogTitle>Sign in with Google</DialogTitle>
              <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                  To comment directly on the document, please sign in with your Google account. This
                  ensures your identity is associated with your feedback.
                </DialogContentText>

                <Box sx={{ mt: 3, mb: 2, position: 'relative', zIndex: 1 }}>
                  <GoogleLoginButton
                    onSuccess={handleGoogleLoginSuccess}
                    onError={handleGoogleLoginError}
                    disabled={isGoogleAuthenticating}
                    onLoginStart={() => setIsGoogleAuthenticating(true)}
                  />
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Alternative:</strong> You can also provide feedback using the comments
                    section below without signing in to Google.
                  </Typography>
                </Alert>
              </DialogContent>
              <DialogActions>
                <IntercomButton onClick={handleCloseGoogleAuthPrompt} variant="ghost">
                  Cancel
                </IntercomButton>
                <IntercomButton
                  onClick={() => {
                    setUserChosenMode('readonly');
                    setShowGoogleAuthPrompt(false);
                  }}
                  variant="secondary"
                >
                  Continue without G-Suite
                </IntercomButton>
              </DialogActions>
            </Dialog>
          </ToastProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </>
  );
}
