import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Check as CheckIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { IntercomLayout } from '../../../components/layout/IntercomLayout';
import {
  ThemeProvider,
  ToastProvider,
  IntercomButton,
  IntercomCard,
  IntercomInput,
  useToast,
} from '../../../components/ui';
import { useRouter } from 'next/router';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';
import DOMPurify from 'dompurify';
import ReactionPicker from 'components/ReactionPicker';
import ViewLogModal from 'components/ViewLogModal';
import AddReviewersModal from 'components/AddReviewersModal';
import { RecogitoManager, type RecogitoAnnotation } from '../../../utils/recogitoManager';

// Interfaces
type SectionComment = RecogitoAnnotation; // Use shared interface

interface ApprovalRequest {
  request_id: number;
  client_id: number;
  client_name: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  inline_content?: string | null;
  content_type?: string;
  google_doc_id?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by_id: string | null;
  published_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  approved_by_name?: string | null;
  staff_approved_at?: string | null;
  contacts: ContactWithViews[];
  versions: Array<any>;
  comments: Array<any> | null;
  section_comments?: SectionComment[];
  project_slack_channel?: string | null;
}

interface ContactView {
  view_id: number;
  viewed_at: string;
}

interface ContactWithViews {
  contact_id: number;
  name: string;
  email: string;
  has_approved: boolean;
  approved_at: string | null;
  has_viewed: boolean;
  views: ContactView[];
}

const getEmbeddableGoogleDocUrl = (
  url: string,
  status: string,
  useMinimalMode: boolean = true
): string => {
  try {
    if (!url.includes('docs.google.com')) return url;
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const docId = docIdMatch ? docIdMatch[1] : '';
    if (docId) {
      if (status !== 'pending') {
        return `https://docs.google.com/document/d/${docId}/view?embedded=true${
          useMinimalMode ? '&rm=minimal' : ''
        }&usp=sharing`;
      } else {
        return `https://docs.google.com/document/d/${docId}/edit?embedded=true${
          useMinimalMode ? '&rm=minimal' : ''
        }&usp=sharing`;
      }
    }
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace(/\/edit$/, status !== 'pending' ? '/view' : '/edit');
    urlObj.searchParams.set('embedded', 'true');
    if (useMinimalMode) urlObj.searchParams.set('rm', 'minimal');
    return urlObj.toString();
  } catch (err) {
    return url;
  }
};

function ApprovalRequestDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const { isValidUser, user, token } = useValidateUserToken();
  const { showSuccess, showError } = useToast();

  // All hooks must be called at the top, before any conditional returns
  const [tabValue, setTabValue] = useState(0);
  const [openApprovalDialog, setOpenApprovalDialog] = useState(false);
  const [openViewLogModal, setOpenViewLogModal] = useState(false);
  const [openAddReviewersModal, setOpenAddReviewersModal] = useState(false);
  const [isMinimalMode, setIsMinimalMode] = useState(true);
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactWithViews | null>(null);
  const [resendingContactId, setResendingContactId] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoManagerRef = useRef<RecogitoManager | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenApprovalDialog = () => {
    setOpenApprovalDialog(true);
  };

  const handleOpenViewLogModal = () => {
    setOpenViewLogModal(true);
  };

  const handleOpenAddReviewersModal = () => {
    setOpenAddReviewersModal(true);
  };

  const handleContactClick = (contact: ContactWithViews) => {
    setSelectedContact(contact);
    setOpenViewLogModal(true);
  };

  const handleResendNotification = async (contactId: number) => {
    setResendingContactId(contactId);
    try {
      const response = await axios.post(
        `/api/approval-requests/${id}/resend-notification`,
        { contactId },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );
      showSuccess('Notification sent successfully');
    } catch (error) {
      console.error('Error resending notification:', error);
      showError('Failed to send notification');
    } finally {
      setResendingContactId(null);
    }
  };

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

  // No longer needed - using shared RecogitoManager utility

  const fetchRequestDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/approval-requests/${id}`);
      setRequest(response.data);
    } catch (error) {
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && isValidUser) {
      fetchRequestDetails();
    }
  }, [id, isValidUser, fetchRequestDetails]);

  // Initialize Recogito using shared RecogitoManager
  useEffect(() => {
    if (!sanitizedHtmlContent || !request?.section_comments || !id || !token) {
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
        // Create RecogitoManager instance
        const manager = new RecogitoManager({
          contentElementId: 'content-view',
          annotations: request.section_comments || [],
          isReadOnly: false, // Staff can interact
          requestId: id,
          auth: {
            type: 'staff',
            token: token,
          },
          onReplySuccess: () => {
            showSuccess('Reply added successfully');
            fetchRequestDetails();
          },
          onError: (message: string) => {
            showError(message);
          },
        });

        // Initialize the manager
        const success = await manager.initialize();
        if (success) {
          recogitoManagerRef.current = manager;
          console.log('Staff RecogitoManager initialized successfully');
        } else {
          console.error('Failed to initialize RecogitoManager');
        }
      } catch (error) {
        console.error('Error initializing RecogitoManager:', error);
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
    id,
    token,
    showSuccess,
    showError,
    fetchRequestDetails,
  ]);

  // Now we can have conditional returns
  if (loading && !request) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidUser) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Request Details - {request?.title || 'Loading...'}</title>
        <link rel="stylesheet" href="/vendor/recogito.min.css" />
        <style jsx global>{`
          /* Force Recogito popups to be visible */
          .r6o-popup {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999999 !important;
            position: absolute !important;
            background: white !important;
            border: 2px solid #1976d2 !important;
            border-radius: 8px !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
            padding: 0 !important;
            max-width: 400px !important;
            min-width: 250px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            pointer-events: auto !important;
          }

          .r6o-popup-content {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: white !important;
            color: #333 !important;
            padding: 0 !important;
            border-radius: 6px !important;
            pointer-events: auto !important;
          }

          /* Ensure the popup is not hidden */
          .r6o-popup,
          .r6o-popup * {
            transform: none !important;
            clip: none !important;
            clip-path: none !important;
            overflow: visible !important;
          }

          /* Style annotations to be visible */
          .r6o-annotation {
            background-color: rgba(25, 118, 210, 0.15) !important;
            border-bottom: 2px solid #1976d2 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
          }

          .r6o-annotation:hover {
            background-color: rgba(25, 118, 210, 0.25) !important;
            border-bottom-width: 3px !important;
          }

          /* Force widget visibility */
          .r6o-popup .r6o-widget {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
            pointer-events: auto !important;
          }

          .r6o-popup .r6o-widget * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }

          /* Override Recogito's default hidden states */
          .r6o-popup[style*='display: none'] {
            display: block !important;
          }

          .r6o-popup[style*='visibility: hidden'] {
            visibility: visible !important;
          }

          .r6o-popup[style*='opacity: 0'] {
            opacity: 1 !important;
          }

          /* Make sure popup content takes up space */
          .r6o-popup .r6o-widget-content {
            min-height: 20px !important;
            min-width: 100px !important;
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

          /* Style buttons */
          .r6o-btn {
            background: #1976d2 !important;
            color: white !important;
            border: none !important;
            padding: 6px 12px !important;
            border-radius: 4px !important;
            font-size: 13px !important;
            cursor: pointer !important;
            margin: 0 4px !important;
          }

          .r6o-btn:hover {
            background: #1565c0 !important;
          }

          .r6o-btn.cancel {
            background: #666 !important;
          }

          .r6o-btn.cancel:hover {
            background: #555 !important;
          }

          /* Style the editor container */
          .r6o-editor-inner {
            background: white !important;
            color: #333 !important;
          }

          /* Remove debug outlines now that it's working */
          .r6o-popup {
            outline: none !important;
            border: 1px solid #ddd !important;
          }

          .r6o-annotation {
            outline: none !important;
            background-color: rgba(255, 215, 0, 0.3) !important;
            border-bottom: 2px solid #ffd700 !important;
          }

          .r6o-annotation:hover {
            background-color: rgba(255, 215, 0, 0.5) !important;
          }
        `}</style>
      </Head>
      <IntercomLayout
        title={request?.title || 'Request Details'}
        breadcrumbs={[
          { label: 'Client Approval', href: '/client-approval' },
          { label: 'Request Details' },
        ]}
      >
        <Box p={3}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
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
                          label={request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
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

                    {/* Display manual approval info prominently if approved by staff */}
                    {request.status === 'approved' && request.approved_by_name && (
                      <Box mt={2} mb={2} display="flex" alignItems="center">
                        <Paper
                          elevation={0}
                          sx={{
                            bgcolor: 'success.light',
                            color: 'success.contrastText',
                            p: 1.5,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            width: 'fit-content',
                          }}
                        >
                          <CheckIcon sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            Approved by {request.approved_by_name}
                            {request.staff_approved_at && (
                              <Typography variant="caption" display="block">
                                {new Date(request.staff_approved_at).toLocaleString()}
                              </Typography>
                            )}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <IntercomCard title="Notifications" sx={{ mt: 2 }}>
                      <Box p={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Project Slack Channel
                        </Typography>
                        <Typography variant="body1">
                          {request?.project_slack_channel || 'Using default channel'}
                        </Typography>
                      </Box>
                    </IntercomCard>
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
                </Tabs>
              </Box>

              <Box mb={4}>
                {tabValue === 0 && (
                  <>
                    {/* Contact Status + Actions in a top bar */}
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                      <Grid container spacing={3}>
                        {/* Contact Status */}
                        <Grid item xs={12} md={8}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={2}
                          >
                            <Typography variant="h6">Contact Status</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {request.contacts.map(contact => (
                              <Chip
                                key={contact.contact_id}
                                label={contact.name}
                                icon={<PersonIcon />}
                                color={contact.has_approved ? 'success' : 'default'}
                                variant="outlined"
                                sx={{ mb: 1, cursor: 'pointer' }}
                                onClick={() => handleContactClick(contact)}
                                deleteIcon={
                                  <Tooltip
                                    title={
                                      contact.has_viewed
                                        ? `Last viewed on ${new Date(contact.views[0].viewed_at).toLocaleString()}`
                                        : 'Not viewed yet'
                                    }
                                  >
                                    <Box sx={{ display: 'flex' }}>
                                      {contact.has_viewed ? (
                                        <VisibilityIcon fontSize="small" color="info" />
                                      ) : (
                                        <VisibilityOffIcon fontSize="small" color="disabled" />
                                      )}
                                    </Box>
                                  </Tooltip>
                                }
                                onDelete={() => {
                                  // This is just to show the icons, not actually delete
                                }}
                              />
                            ))}
                          </Box>
                        </Grid>

                        {/* Actions */}
                        <Grid item xs={12} md={4}>
                          <Typography variant="h6" gutterBottom>
                            Actions
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* Only show approve button if status is not already approved */}
                            {request.status !== 'approved' && (
                              <IntercomButton
                                variant="primary"
                                onClick={handleOpenApprovalDialog}
                                startIcon={<CheckIcon />}
                              >
                                Approve Content
                              </IntercomButton>
                            )}
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Main Content - Full Width */}
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                          {/* Add status banner for approved content */}
                          {request.status === 'approved' && (
                            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
                              This content has been approved
                              {request.approved_by_name
                                ? ` by ${request.approved_by_name} (Staff)`
                                : request.contacts.some(c => c.has_approved)
                                  ? ` by client contact`
                                  : ''}
                              . Annotations shown are from the review process.
                            </Alert>
                          )}

                          {isRecogitoContentType(request) ? (
                            <Box>
                              <Typography variant="h6">Client Feedback</Typography>
                              <Box
                                ref={contentRef}
                                sx={{
                                  '.r6o-annotation': {
                                    borderBottom: '3px solid #FFD700',
                                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                                    cursor: 'pointer',
                                  },
                                  '.r6o-widget': {
                                    padding: '10px',
                                    border: '1px solid #ccc',
                                    backgroundColor: 'white',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                    zIndex: 1000,
                                  },
                                  '.comment-text': { fontWeight: 'bold' },
                                  '.comment-creator': {
                                    fontSize: '0.8em',
                                    color: '#555',
                                    borderBottom: '1px solid #eee',
                                    paddingBottom: '5px',
                                    marginBottom: '5px',
                                  },
                                  '.replies-container': { marginTop: '10px' },
                                  '.reply-item': {
                                    borderTop: '1px solid #f0f0f0',
                                    paddingTop: '5px',
                                    marginTop: '5px',
                                  },
                                  '.reply-creator': { fontSize: '0.75em', color: '#777' },
                                }}
                              >
                                <div
                                  id="content-view"
                                  dangerouslySetInnerHTML={{ __html: sanitizedHtmlContent || '' }}
                                />
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              sx={{ height: '700px', border: '1px solid', borderColor: 'divider' }}
                            >
                              <iframe
                                src={getEmbeddableGoogleDocUrl(
                                  request.inline_content || '',
                                  request.status,
                                  isMinimalMode
                                )}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                              />
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            </>
          )}
        </Box>
      </IntercomLayout>

      {/* View Log Modal */}
      <ViewLogModal
        open={openViewLogModal}
        onClose={() => setOpenViewLogModal(false)}
        contactViews={selectedContact}
        resendingContactId={resendingContactId}
        onResendNotification={handleResendNotification}
      />
    </>
  );
}

export default function ApprovalRequestDetailPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ApprovalRequestDetailContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
