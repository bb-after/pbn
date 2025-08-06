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
  const contentRef = useRef<HTMLDivElement>(null);
  const recogitoInstance = useRef<any>(null);

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
          { type: 'TextQuoteSelector', exact: dbComment.selected_text || '' },
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

    console.log('Created annotation:', annotation);
    return annotation;
  }, []);

  const recogitoAnnotations = useMemo(() => {
    if (!request?.section_comments) return [];
    return request.section_comments.map(convertDbCommentToAnnotation);
  }, [request?.section_comments, convertDbCommentToAnnotation]);

  // Formatter function to display comment text in popups
  const formatter = useCallback((annotation: any) => {
    console.log('Formatting annotation:', annotation);
    console.log('Annotation underlying:', annotation.underlying);
    console.log('Annotation body:', annotation.body);
    console.log('Annotation bodies:', annotation.bodies);

    // Try to access the original annotation data through Recogito's wrapper
    let originalAnnotation = annotation.underlying || annotation;
    let commentText = '';
    let creatorName = 'Unknown';
    let createdDate = '';
    let replies = [];

    // First try the metadata approach from our original structure
    if (originalAnnotation?.metadata) {
      commentText = originalAnnotation.metadata.comment_text || '';
      creatorName = originalAnnotation.metadata.author_name || 'Unknown';
      createdDate = originalAnnotation.metadata.created_at || '';
      replies = originalAnnotation.metadata.replies || [];
    }
    // Try Recogito's bodies array
    else if (annotation.bodies && annotation.bodies.length > 0) {
      const mainBody = annotation.bodies[0];
      commentText = mainBody.value || '';
      creatorName = mainBody.creator?.name || 'Unknown';
      createdDate = mainBody.created || '';
    }
    // Try original annotation body structure
    else if (originalAnnotation?.body) {
      // Handle single body object
      if (originalAnnotation.body.value) {
        commentText = originalAnnotation.body.value;
        creatorName = originalAnnotation.body.creator?.name || 'Unknown';
        createdDate = originalAnnotation.body.created || '';
      }
      // Handle array of bodies
      else if (Array.isArray(originalAnnotation.body)) {
        const mainComment = originalAnnotation.body.find(
          (body: any) => body.purpose === 'commenting'
        );
        if (mainComment) {
          commentText = mainComment.value;
          creatorName = mainComment.creator?.name || 'Unknown';
          createdDate = mainComment.created || '';
        }
      }
      replies = originalAnnotation.replies || [];
    }
    // Try direct annotation properties (Recogito might expose them directly)
    else if (annotation.body && annotation.body.value) {
      commentText = annotation.body.value;
      creatorName = annotation.body.creator?.name || 'Unknown';
      createdDate = annotation.body.created || '';
    }

    console.log('Extracted data:', { commentText, creatorName, createdDate, replies });

    if (!commentText) {
      console.log('No comment text found, returning fallback');
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

    console.log('Generated HTML:', html);
    return html;
  }, []);

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

  useEffect(() => {
    if (!sanitizedHtmlContent) {
      if (recogitoInstance.current) {
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
      return;
    }

    // Always destroy and recreate to ensure formatter is applied correctly
    if (recogitoInstance.current) {
      console.log('Destroying existing Recogito instance');
      recogitoInstance.current.destroy();
      recogitoInstance.current = null;
    }

    let isMounted = true;
    const initRecogitoForStaff = async () => {
      // Add a small delay to ensure DOM is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const contentElement = document.getElementById('content-view');
      if (!isMounted || !contentElement) {
        console.log('Content element not found or component unmounted');
        return;
      }

      console.log('Initializing Recogito with', recogitoAnnotations.length, 'annotations');
      console.log('Formatter function:', formatter);

      const r = await initVersionRecogito({
        contentElementId: 'content-view',
        annotations: recogitoAnnotations,
        readOnly: false, // Allow interaction since this is the staff approval interface
        currentInstance: null,
        formatter: formatter, // Enable the formatter to display comment text
      });

      if (r && isMounted) {
        recogitoInstance.current = r;

        // Add comprehensive event listeners for debugging
        r.on('selectAnnotation', (annotation: any) => {
          console.log('Annotation selected:', annotation);
          console.log('Annotation body:', annotation.body);
          console.log('Annotation metadata:', annotation.metadata);

          // Try to manually set the popup content with reply functionality
          setTimeout(() => {
            const popup = document.querySelector('.r6o-editor-inner');
            if (popup) {
              console.log('Found popup element, attempting to inject content');
              const formattedContent = formatter(annotation);
              console.log('Formatted content to inject:', formattedContent);

              // Get the section comment ID for replies
              const sectionCommentId =
                annotation.id?.replace('#section-comment-', '') ||
                annotation.underlying?.id?.replace('#section-comment-', '');

              // Create a unique function name for this reply to avoid conflicts
              const replyFunctionName = `addReply_${sectionCommentId}_${Date.now()}`;
              const cancelFunctionName = `cancelReply_${sectionCommentId}_${Date.now()}`;

              // Create reply form
              const replyForm = `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
                  <textarea id="reply-input-${sectionCommentId}" placeholder="Add a reply..." style="width: 100%; min-height: 60px; background: white !important; color: #000 !important; border: 1px solid #ccc; border-radius: 4px; padding: 8px; font-family: inherit; resize: vertical;"></textarea>
                  <div style="margin-top: 8px;">
                    <button onclick="${replyFunctionName}()" style="background: #1976d2; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 13px; cursor: pointer; margin-right: 8px;">Add Reply</button>
                    <button onclick="${cancelFunctionName}()" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 13px; cursor: pointer;">Cancel</button>
                  </div>
                </div>
              `;

              // Clear existing content and inject our formatted content with reply form
              popup.innerHTML =
                formattedContent +
                replyForm +
                '<div class="r6o-footer"><button class="r6o-btn">Close</button></div>';

              // Add unique global functions for reply handling with current token
              (window as any)[replyFunctionName] = async () => {
                const textarea = document.getElementById(
                  `reply-input-${sectionCommentId}`
                ) as HTMLTextAreaElement;
                if (textarea && textarea.value.trim()) {
                  try {
                    console.log('Sending reply with token:', token ? 'present' : 'missing');
                    const response = await axios.post(
                      `/api/approval-requests/${id}/section-comments/${sectionCommentId}/replies`,
                      {
                        replyText: textarea.value.trim(),
                      },
                      {
                        headers: {
                          'x-auth-token': token,
                        },
                      }
                    );

                    console.log('Reply saved to database:', response.data);
                    showSuccess('Reply added successfully');

                    // Refresh the request data to show the new reply
                    fetchRequestDetails();

                    // Close the popup
                    try {
                      if (r.cancelSelected) {
                        r.cancelSelected();
                      } else if (r.clearSelection) {
                        r.clearSelection();
                      } else {
                        // Fallback: manually close the popup by removing it from DOM
                        const popup = document.querySelector('.r6o-editor');
                        if (popup) {
                          popup.remove();
                        }
                      }
                    } catch (error) {
                      console.log('Could not close popup automatically:', error);
                    }
                  } catch (error) {
                    console.error('Error saving reply:', error);
                    showError('Failed to save reply');
                  }
                }
              };

              (window as any)[cancelFunctionName] = () => {
                const textarea = document.getElementById(
                  `reply-input-${sectionCommentId}`
                ) as HTMLTextAreaElement;
                if (textarea) {
                  textarea.value = '';
                }

                // Close the popup with fallbacks
                try {
                  if (r.cancelSelected) {
                    r.cancelSelected();
                  } else if (r.clearSelection) {
                    r.clearSelection();
                  } else {
                    // Fallback: manually close the popup by removing it from DOM
                    const popup = document.querySelector('.r6o-editor');
                    if (popup) {
                      popup.remove();
                    }
                  }
                } catch (error) {
                  console.log('Could not close popup automatically:', error);
                  // Manual fallback
                  const popup = document.querySelector('.r6o-editor');
                  if (popup) {
                    popup.remove();
                  }
                }
              };
            } else {
              console.log('Popup element not found');
            }
          }, 100);
        });

        r.on('createAnnotation', async (annotation: any) => {
          console.log('Annotation created:', annotation);
          console.log('Annotation body:', annotation.body);
          console.log('Annotation bodies:', annotation.bodies);
          console.log('Annotation quote:', annotation.quote);
          console.log('Annotation start/end:', annotation.start, annotation.end);

          // Save new annotation to database
          try {
            // Try multiple ways to get the comment text based on the structure we see
            let commentText = '';
            let selectedText = '';
            let startOffset = 0;
            let endOffset = 0;

            // Check underlying first (new annotations)
            const annotationData = annotation.underlying || annotation;

            if (
              annotationData.body &&
              Array.isArray(annotationData.body) &&
              annotationData.body.length > 0
            ) {
              commentText = annotationData.body[0].value;
            } else if (annotationData.body && annotationData.body.value) {
              commentText = annotationData.body.value;
            } else if (annotationData.bodies && annotationData.bodies.length > 0) {
              commentText = annotationData.bodies[0].value;
            }

            // Extract target information
            if (annotationData.target && annotationData.target.selector) {
              const selectors = annotationData.target.selector;
              const textQuoteSelector = selectors.find((s: any) => s.type === 'TextQuoteSelector');
              const textPositionSelector = selectors.find(
                (s: any) => s.type === 'TextPositionSelector'
              );

              if (textQuoteSelector) {
                selectedText = textQuoteSelector.exact || '';
              }

              if (textPositionSelector) {
                startOffset = textPositionSelector.start || 0;
                endOffset = textPositionSelector.end || 0;
              }
            }

            console.log('Extracted comment text:', commentText);
            console.log('Selected text:', selectedText);
            console.log('Position:', startOffset, 'to', endOffset);

            if (commentText && commentText.trim()) {
              console.log('Attempting to save new comment to database...');
              const response = await axios.post(
                `/api/approval-requests/${id}/section-comments`,
                {
                  commentText: commentText.trim(), // API expects 'commentText' not 'comment'
                  selectedText: selectedText,
                  startOffset: startOffset,
                  endOffset: endOffset,
                },
                {
                  headers: {
                    'x-auth-token': token,
                  },
                }
              );

              console.log('New comment saved to database:', response.data);
              showSuccess('Comment added successfully');

              // Refresh the request data to show the new comment
              fetchRequestDetails();
            } else {
              console.log('No comment text found, not saving to database');
            }
          } catch (error) {
            console.error('Error saving comment:', error);
            showError('Failed to save comment');
          }
        });

        // Log successful initialization
        console.log('Recogito instance created successfully');
      }
    };

    initRecogitoForStaff();

    return () => {
      isMounted = false;
      if (recogitoInstance.current) {
        console.log('Cleaning up Recogito instance');
        recogitoInstance.current.destroy();
        recogitoInstance.current = null;
      }
    };
  }, [
    sanitizedHtmlContent,
    recogitoAnnotations,
    formatter,
    id,
    token,
    fetchRequestDetails,
    showSuccess,
    showError,
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
                                sx={{ mb: 1 }}
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
