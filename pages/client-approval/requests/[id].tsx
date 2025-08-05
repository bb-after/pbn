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
import { initVersionRecogito } from '../../../utils/recogito';

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
  created_at_iso?: string;
  contact_name: string | null;
  version_id?: number | null;
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
    created_at_iso?: string;
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
  const { isValidUser, isLoading, token, user } = useValidateUserToken();
  const { showError, showSuccess } = useToast();

  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMinimalMode, setIsMinimalMode] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);

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

  const convertDbCommentToAnnotation = useCallback((dbComment: SectionComment) => {
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
            id: dbComment.user_id
              ? `staff:${dbComment.user_id}`
              : `mailto:${dbComment.contact_name}`,
            name: dbComment.user_name || dbComment.contact_name || 'Unknown',
          },
          created: dbComment.created_at_iso || dbComment.created_at,
        },
        ...(dbComment.replies || []).map((reply: any) => ({
          type: 'TextualBody',
          purpose: 'replying',
          value: reply.reply_text,
          creator: {
            id: reply.user_id ? `staff:${reply.user_id}` : `contact:${reply.client_contact_id}`,
            name: reply.author_name || reply.user_name || reply.client_name || 'Unknown',
          },
          created: reply.created_at_iso || reply.created_at,
        })),
      ],
      target: {
        selector: [
          { type: 'TextQuoteSelector', exact: dbComment.selected_text || '' },
          {
            type: 'TextPositionSelector',
            start: dbComment.start_offset,
            end: dbComment.end_offset,
          },
        ],
      },
      // Add a simple text field for Recogito's built-in display
      text: dbComment.comment_text,
    };
  }, []);

  const recogitoAnnotations = useMemo(() => {
    if (!request?.section_comments) return [];
    return request.section_comments.map(convertDbCommentToAnnotation);
  }, [request?.section_comments, convertDbCommentToAnnotation]);

  useEffect(() => {
    if (!sanitizedHtmlContent) {
      if (recogitoInstance.current) {
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
      return;
    }

    if (recogitoInstance.current) {
      recogitoInstance.current.setAnnotations(recogitoAnnotations);
      return;
    }

    let isMounted = true;
    const initRecogitoForStaff = async () => {
      const contentElement = document.getElementById('content-view');
      if (!isMounted || !contentElement) return;

      const r = await initVersionRecogito({
        contentElementId: 'content-view',
        annotations: recogitoAnnotations,
        readOnly: true,
        currentInstance: null,
        // Remove the formatter for now to test built-in display
        // formatter: formatter,
      });

      if (r) {
        recogitoInstance.current = r;

        // Add event listener to see what happens when annotations are clicked
        r.on('selectAnnotation', (annotation: any) => {
          console.log('Annotation selected:', annotation);
          console.log('Annotation body:', annotation.body);
        });
      }
    };

    initRecogitoForStaff();

    return () => {
      isMounted = false;
      if (recogitoInstance.current) {
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [sanitizedHtmlContent, recogitoAnnotations]);

  if (isLoading || (loading && !request)) {
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
          /* Ensure Recogito popups are visible */
          .r6o-popup {
            z-index: 9999 !important;
            background: white !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            padding: 10px !important;
            max-width: 300px !important;
            font-family: inherit !important;
          }

          .r6o-popup-content {
            background: white !important;
            color: #333 !important;
          }

          /* Ensure annotations are highlighted */
          .r6o-annotation {
            background-color: rgba(255, 255, 0, 0.3) !important;
            cursor: pointer !important;
          }

          .r6o-annotation:hover {
            background-color: rgba(255, 255, 0, 0.5) !important;
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
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h4">{request.title}</Typography>
                      <Typography variant="subtitle1" color="text.secondary">
                        Client: {request.client_name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                      <Chip
                        label={request.status}
                        color={
                          request.status === 'approved'
                            ? 'success'
                            : request.status === 'rejected'
                              ? 'error'
                              : 'warning'
                        }
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
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
                    <Box sx={{ height: '700px', border: '1px solid', borderColor: 'divider' }}>
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
          )}
        </Box>
      </IntercomLayout>
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
