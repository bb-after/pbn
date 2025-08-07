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
import {
  RecogitoManager,
  type RecogitoAnnotation,
  convertDbCommentToAnnotation,
  createAnnotationFormatter,
} from 'utils/recogitoManager';
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

// Use shared interface from RecogitoManager
type SectionComment = RecogitoAnnotation;

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
  console.log('🚀 ClientRequestDetailPage component starting...');
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

  // State for request data
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recogito manager ref
  const recogitoManagerRef = useRef<RecogitoManager | null>(null);

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
      contentToDisplay = `<h1 style="font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${
        request.title
      }</h1>${request.inline_content || ''}`;
    }
    return DOMPurify.sanitize(contentToDisplay);
  }, [request]);

  // Fetch request details
  const fetchRequestDetails = useCallback(async () => {
    if (!effectiveClientInfo || !id) return;

    setLoading(true);
    setError(null);

    try {
      const headers = {
        'x-client-portal': 'true',
        'x-client-contact-id': effectiveClientInfo.contact_id.toString(),
      };

      const response = await axios.get(`/api/approval-requests/${id}`, { headers });
      console.log('📝 Request data received:', response.data);
      console.log('📝 Available contacts for this request:', response.data.contacts);
      setRequest(response.data);
    } catch (error: any) {
      console.error('Error fetching approval request details:', error);
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id, effectiveClientInfo?.contact_id]);

  // Load request data when component mounts or ID changes
  useEffect(() => {
    if (id && effectiveClientInfo) {
      fetchRequestDetails();
    }
  }, [id, effectiveClientInfo?.contact_id, fetchRequestDetails]);

  // Initialize Recogito using shared RecogitoManager
  useEffect(() => {
    if (!sanitizedHtmlContent || !effectiveClientInfo || !request || !id) {
      if (recogitoManagerRef.current) {
        recogitoManagerRef.current.destroy();
        recogitoManagerRef.current = null;
      }
      return;
    }

    // Clean up previous instance
    if (recogitoManagerRef.current) {
      recogitoManagerRef.current.destroy();
      recogitoManagerRef.current = null;
    }

    const initRecogito = async () => {
      try {
        // Create RecogitoManager instance for client
        console.log('🔍 CLIENT-PORTAL: Creating RecogitoManager with auth config:', {
          type: 'client',
          clientContactId: effectiveClientInfo.contact_id,
          effectiveClientInfo,
        });

        const authConfig = {
          type: 'client' as const,
          clientContactId: effectiveClientInfo.contact_id,
        };
        console.log('🔍 CLIENT-PORTAL: Explicit auth config object:', authConfig);

        const manager = new RecogitoManager({
          contentElementId: 'content-view',
          annotations: request.section_comments || [],
          isReadOnly: request.status !== 'pending', // Clients can interact only on pending requests
          requestId: id,
          auth: authConfig,
          onReplySuccess: () => {
            // Refresh request data to show new reply
            fetchRequestDetails();
          },
          onError: (message: string) => {
            setError(message);
          },
        });

        // Initialize the manager
        const success = await manager.initialize();
        if (success) {
          recogitoManagerRef.current = manager;
          console.log('Client RecogitoManager initialized successfully');
        } else {
          console.error('Failed to initialize RecogitoManager for client');
        }
      } catch (error) {
        console.error('Error initializing RecogitoManager for client:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(initRecogito, 100);

    return () => {
      clearTimeout(timeout);
      if (recogitoManagerRef.current) {
        recogitoManagerRef.current.destroy();
        recogitoManagerRef.current = null;
      }
    };
  }, [
    sanitizedHtmlContent,
    request?.section_comments,
    effectiveClientInfo?.contact_id,
    request?.status,
    id,
    fetchRequestDetails,
  ]);

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

          /* Fix text input colors for light mode */
          .r6o-editor textarea,
          .r6o-editor input[type='text'],
          .r6o-widget textarea,
          .r6o-widget input[type='text'],
          .r6o-editor-inner textarea,
          .r6o-editor-inner input[type='text'] {
            background: white !important;
            color: #000 !important;
            border: 1px solid #ccc !important;
            padding: 8px !important;
            border-radius: 4px !important;
          }
        `}</style>
      </Head>
      <GoogleOAuthProvider clientId={googleClientId || ''}>
        <ThemeProvider>
          <ToastProvider>
            <ClientPortalLayout
              title={request?.title || 'Content Review'}
              breadcrumbs={[
                { label: 'Content Portal', href: '/client-portal' },
                { label: 'Content Review' },
              ]}
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

              {/* Request content */}
              {request && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {request.title}
                  </Typography>

                  {/* Recogito content */}
                  {sanitizedHtmlContent && isRecogitoContentType(request) && (
                    <Box mt={2}>
                      <Box
                        sx={{
                          '& p': { my: 1.5 },
                          '& ul, & ol': { my: 1.5, pl: 3 },
                          '& li': { mb: 0.5 },
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            my: 2,
                            fontWeight: 'bold',
                          },
                        }}
                      >
                        <div
                          id="content-view"
                          dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent || '' }}
                        />
                      </Box>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Comments section */}
              <CommentsSection
                requestId={id}
                clientInfo={effectiveClientInfo}
                request={request}
                clientAuthToken={clientAuthToken}
                onRequestUpdate={fetchRequestDetails}
              />
            </ClientPortalLayout>
          </ToastProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </>
  );
}
