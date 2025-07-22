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
  Modal,
  FormGroup,
  FormControlLabel,
  ListItemButton,
  Checkbox,
  Snackbar,
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
  Edit as EditIcon,
} from '@mui/icons-material';
import LayoutContainer from '../../../components/LayoutContainer';
import StyledHeader from '../../../components/StyledHeader';
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
import dynamic from 'next/dynamic';
import ReactionPicker from 'components/ReactionPicker';
import { createRoot } from 'react-dom/client';
import ViewLogModal from 'components/ViewLogModal';
import AddReviewersModal from 'components/AddReviewersModal';

// Add Recogito types declaration reference (assuming it exists)
/// <reference path="../../../client-portal/recogito.d.ts" />
declare module '@recogito/recogito-js';

/// <reference path="./recogito.d.ts" />

declare global {
  interface Window {
    // Remove Recogito references
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
  contacts: ContactWithViews[]; // Use the updated ContactWithViews interface
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
    commenter_name?: string;
  }> | null;
  section_comments?: SectionComment[];
  project_slack_channel?: string | null; // Added for the new notifications card
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

// Function to process Google Doc URLs for embedding
// This function handles Google Doc embedding with appropriate permissions:
// - For staff view (isStaffView=true): Full editing capabilities for content creators
// - For client view (isStaffView=false): Comment-only mode, restricting clients
//   to making suggestions rather than direct edits
const getEmbeddableGoogleDocUrl = (
  url: string,
  status: string,
  useMinimalMode: boolean = true
): string => {
  try {
    if (!url.includes('docs.google.com')) return url;
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const docId = docIdMatch ? docIdMatch[1] : '';
    let finalUrl = url;
    if (docId) {
      if (status !== 'pending') {
        finalUrl = `https://docs.google.com/document/d/${docId}/view?embedded=true${useMinimalMode ? '&rm=minimal' : ''}&usp=sharing`;
      } else {
        finalUrl = `https://docs.google.com/document/d/${docId}/edit?embedded=true${useMinimalMode ? '&rm=minimal' : ''}&usp=sharing`;
      }
      console.log('[GoogleDocEmbed] status:', status, 'docId:', docId, 'finalUrl:', finalUrl);
      return finalUrl;
    }
    // Fallback for non-standard URLs
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace(/\/edit$/, status !== 'pending' ? '/view' : '/edit');
    urlObj.searchParams.set('embedded', 'true');
    if (useMinimalMode) urlObj.searchParams.set('rm', 'minimal');
    finalUrl = urlObj.toString();
    console.log('[GoogleDocEmbed] status:', status, 'fallback finalUrl:', finalUrl);
    return finalUrl;
  } catch (err) {
    console.error('[GoogleDocEmbed] Error:', err, 'url:', url, 'status:', status);
    return url;
  }
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

  // Add isMinimalMode state
  const [isMinimalMode, setIsMinimalMode] = useState(true);

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

  // State for toast notifications
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>(
    'success'
  );

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
    content_type?: string;
    google_doc_id?: string | null;
    comments: string | null;
    created_by_id: string | null;
    created_at: string;
  } | null>(null);
  // --- End State for Version Content Modal ---

  // --- Add State for New Version Dialog ---
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false);
  const [newVersionGoogleDocUrl, setNewVersionGoogleDocUrl] = useState('');
  const [newVersionComment, setNewVersionComment] = useState('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
  // --- End State for New Version Dialog ---

  // --- Add State for Add Reviewers Modal ---
  const [isAddReviewersModalOpen, setIsAddReviewersModalOpen] = useState(false);

  // Add Recogito Refs & State
  const contentRef = useRef<HTMLDivElement>(null);

  // Add state for approval dialog
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [notifyClientsOnApproval, setNotifyClientsOnApproval] = useState(true);
  const [clientsToNotify, setClientsToNotify] = useState<number[]>([]);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Add state for editing the slack channel
  const [slackChannel, setSlackChannel] = useState('');
  const [isEditingSlack, setIsEditingSlack] = useState(false);

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

      // Debug logging
      console.log('API Response for Request:', response.data);
      if (response.data.content_type === 'google_doc') {
        console.log('Google Doc Details:');
        console.log('content_type:', response.data.content_type);
        console.log('inline_content:', response.data.inline_content);
        console.log('google_doc_id:', response.data.google_doc_id);
      }

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
      setPublishedUrl(request.published_url);
    } else {
      setPublishedUrl('');
    }
  }, [request?.published_url]);

  useEffect(() => {
    if (request) {
      setSlackChannel(request.project_slack_channel || '');
    }
  }, [request]);

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
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      await axios.put(
        `/api/approval-requests/${id}`,
        {
          publishedUrl: publishedUrl.trim(),
        },
        { headers }
      );

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
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      await axios.put(`/api/approval-requests/${id}`, { isArchived: true }, { headers });

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

      // Find the contact name for the success message
      const contact = request?.contacts.find(c => c.contact_id === contactId);
      const contactName = contact?.name || `Contact ${contactId}`;

      showToast(`Notification sent successfully to ${contactName}`, 'success');
    } catch (err: any) {
      console.error('Error resending notification:', err);
      const errorMessage = err.response?.data?.error || 'Failed to send notification';
      setError(errorMessage);
      showToast(errorMessage, 'error');
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
    content_type?: string;
    google_doc_id?: string | null;
    comments: string | null;
    created_by_id: string | null;
    created_at: string;
  }) => {
    setSelectedVersion(version);
    setVersionContentModalOpen(true);
  };

  const handleCloseVersionContent = () => {
    setVersionContentModalOpen(false);
    setSelectedVersion(null);
  };
  // --- End Version Modal Handlers ---

  // --- Add New Version Dialog Handlers ---
  const handleOpenNewVersionDialog = () => {
    setNewVersionGoogleDocUrl('');
    setNewVersionComment('');
    setNewVersionDialogOpen(true);
  };

  const handleCloseNewVersionDialog = () => {
    setNewVersionDialogOpen(false);
  };

  const handleNewVersionGoogleDocUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewVersionGoogleDocUrl(e.target.value);
  };

  const handleSubmitNewVersion = async () => {
    if (!newVersionGoogleDocUrl.trim()) {
      setError('Google Doc URL is required');
      return;
    }

    // Validate if it's a valid Google Doc URL
    if (!newVersionGoogleDocUrl.includes('docs.google.com')) {
      setError('Please enter a valid Google Doc URL');
      return;
    }

    setIsSubmittingVersion(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      // Extract Google Doc ID from URL
      const docIdMatch = newVersionGoogleDocUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const googleDocId = docIdMatch ? docIdMatch[1] : null;

      if (!googleDocId) {
        setError('Could not extract Google Doc ID from URL');
        setIsSubmittingVersion(false);
        return;
      }

      // Send the new version with the Google Doc URL and ID
      const response = await axios.post(
        `/api/approval-requests/${id}/versions`,
        {
          googleDocId: googleDocId,
          inlineContent: newVersionGoogleDocUrl,
          contentType: 'google_doc',
          comments: newVersionComment.trim() || null,
        },
        { headers }
      );

      setNewVersionDialogOpen(false);
      setNewVersionGoogleDocUrl('');
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

  // Add this near the other handler functions
  const handleOpenApprovalDialog = () => {
    // Pre-select all clients for notification
    if (request) {
      setClientsToNotify(request.contacts.map(contact => contact.contact_id));
    }
    setApprovalDialogOpen(true);
  };

  const handleCloseApprovalDialog = () => {
    setApprovalDialogOpen(false);
  };

  const handleToggleClientNotification = (contactId: number) => {
    setClientsToNotify(prev => {
      const newSelection = prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId];

      // If no clients are selected, automatically uncheck the notification checkbox
      if (newSelection.length === 0) {
        setNotifyClientsOnApproval(false);
      }

      return newSelection;
    });
  };

  const handleNotifyClientsCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setNotifyClientsOnApproval(checked);

    // If turning on notifications but no clients selected, select all clients
    if (checked && clientsToNotify.length === 0 && request?.contacts) {
      setClientsToNotify(request.contacts.map(contact => contact.contact_id));
    }
  };

  const handleManualApproval = async () => {
    if (!request) return;

    setIsSubmittingApproval(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-auth-token'] = token;
      }

      // First, update the request status to approved
      await axios.put(`/api/approval-requests/${id}`, { status: 'approved' }, { headers });

      // Then, if notifications are enabled, notify selected clients
      if (notifyClientsOnApproval && clientsToNotify.length > 0) {
        await axios.post(
          `/api/approval-requests/${id}/notify-approval`,
          { contactIds: clientsToNotify },
          { headers }
        );
      }

      // Close dialog and refresh data
      handleCloseApprovalDialog();
      fetchRequestDetails();
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleSlackChannelUpdate = async () => {
    if (!request) return;

    try {
      const token = localStorage.getItem('usertoken');
      await axios.patch(
        `/api/approval-requests/${request.request_id}`,
        { project_slack_channel: slackChannel },
        { headers: { 'x-auth-token': token } }
      );
      // Optimistically update the local state
      setRequest(prev => (prev ? { ...prev, project_slack_channel: slackChannel } : null));
      setIsEditingSlack(false);
      showToast('Slack channel updated successfully!');
    } catch (error) {
      console.error('Error updating Slack channel:', error);
      showToast('Failed to update Slack channel.');
    }
  };

  const handleAddReviewers = () => {
    setIsAddReviewersModalOpen(true);
  };

  // Helper function to show toast messages
  const showToast = (
    message: string,
    severity: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // Handle closing the toast
  const handleCloseToast = () => {
    setToastOpen(false);
  };

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

  function ClientApprovalRequestContent() {
    const router = useRouter();
    const { isValidUser, isLoading } = useValidateUserToken();
    const { showError, showSuccess } = useToast();

    // State for request data
    const [request, setRequest] = useState<ApprovalRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    // Add isMinimalMode state
    const [isMinimalMode, setIsMinimalMode] = useState(true);

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
    const [contactToRemove, setContactToRemove] = useState<{ id: number; name: string } | null>(
      null
    );

    // State for toast notifications
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>(
      'success'
    );

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
      content_type?: string;
      google_doc_id?: string | null;
      comments: string | null;
      created_by_id: string | null;
      created_at: string;
    } | null>(null);
    // --- End State for Version Content Modal ---

    // --- Add State for New Version Dialog ---
    const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false);
    const [newVersionGoogleDocUrl, setNewVersionGoogleDocUrl] = useState('');
    const [newVersionComment, setNewVersionComment] = useState('');
    const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
    // --- End State for New Version Dialog ---

    // --- Add State for Add Reviewers Modal ---
    const [isAddReviewersModalOpen, setIsAddReviewersModalOpen] = useState(false);

    // Add Recogito Refs & State
    const contentRef = useRef<HTMLDivElement>(null);

    // Add state for approval dialog
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [notifyClientsOnApproval, setNotifyClientsOnApproval] = useState(true);
    const [clientsToNotify, setClientsToNotify] = useState<number[]>([]);
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

    // Add state for editing the slack channel
    const [slackChannel, setSlackChannel] = useState('');
    const [isEditingSlack, setIsEditingSlack] = useState(false);

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

        // Debug logging
        console.log('API Response for Request:', response.data);
        if (response.data.content_type === 'google_doc') {
          console.log('Google Doc Details:');
          console.log('content_type:', response.data.content_type);
          console.log('inline_content:', response.data.inline_content);
          console.log('google_doc_id:', response.data.google_doc_id);
        }

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
        setPublishedUrl(request.published_url);
      } else {
        setPublishedUrl('');
      }
    }, [request?.published_url]);

    useEffect(() => {
      if (request) {
        setSlackChannel(request.project_slack_channel || '');
      }
    }, [request]);

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
        const headers: Record<string, string> = {};
        if (token) {
          headers['x-auth-token'] = token;
        }

        await axios.put(
          `/api/approval-requests/${id}`,
          {
            publishedUrl: publishedUrl.trim(),
          },
          { headers }
        );

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
        const headers: Record<string, string> = {};
        if (token) {
          headers['x-auth-token'] = token;
        }

        await axios.put(`/api/approval-requests/${id}`, { isArchived: true }, { headers });

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

        // Find the contact name for the success message
        const contact = request?.contacts.find(c => c.contact_id === contactId);
        const contactName = contact?.name || `Contact ${contactId}`;

        showSuccess(`Notification sent successfully to ${contactName}`);
      } catch (err: any) {
        console.error('Error resending notification:', err);
        const errorMessage = err.response?.data?.error || 'Failed to send notification';
        setError(errorMessage);
        showError(errorMessage);
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
      content_type?: string;
      google_doc_id?: string | null;
      comments: string | null;
      created_by_id: string | null;
      created_at: string;
    }) => {
      setSelectedVersion(version);
      setVersionContentModalOpen(true);
    };

    const handleCloseVersionContent = () => {
      setVersionContentModalOpen(false);
      setSelectedVersion(null);
    };
    // --- End Version Modal Handlers ---

    // --- Add New Version Dialog Handlers ---
    const handleOpenNewVersionDialog = () => {
      setNewVersionGoogleDocUrl('');
      setNewVersionComment('');
      setNewVersionDialogOpen(true);
    };

    const handleCloseNewVersionDialog = () => {
      setNewVersionDialogOpen(false);
    };

    const handleNewVersionGoogleDocUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewVersionGoogleDocUrl(e.target.value);
    };

    const handleSubmitNewVersion = async () => {
      if (!newVersionGoogleDocUrl.trim()) {
        setError('Google Doc URL is required');
        return;
      }

      // Validate if it's a valid Google Doc URL
      if (!newVersionGoogleDocUrl.includes('docs.google.com')) {
        setError('Please enter a valid Google Doc URL');
        return;
      }

      setIsSubmittingVersion(true);
      setError(null);

      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['x-auth-token'] = token;
        }

        // Extract Google Doc ID from URL
        const docIdMatch = newVersionGoogleDocUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const googleDocId = docIdMatch ? docIdMatch[1] : null;

        if (!googleDocId) {
          setError('Could not extract Google Doc ID from URL');
          setIsSubmittingVersion(false);
          return;
        }

        // Send the new version with the Google Doc URL and ID
        const response = await axios.post(
          `/api/approval-requests/${id}/versions`,
          {
            googleDocId: googleDocId,
            inlineContent: newVersionGoogleDocUrl,
            contentType: 'google_doc',
            comments: newVersionComment.trim() || null,
          },
          { headers }
        );

        setNewVersionDialogOpen(false);
        setNewVersionGoogleDocUrl('');
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

    // Add this near the other handler functions
    const handleOpenApprovalDialog = () => {
      // Pre-select all clients for notification
      if (request) {
        setClientsToNotify(request.contacts.map(contact => contact.contact_id));
      }
      setApprovalDialogOpen(true);
    };

    const handleCloseApprovalDialog = () => {
      setApprovalDialogOpen(false);
    };

    const handleToggleClientNotification = (contactId: number) => {
      setClientsToNotify(prev => {
        const newSelection = prev.includes(contactId)
          ? prev.filter(id => id !== contactId)
          : [...prev, contactId];

        // If no clients are selected, automatically uncheck the notification checkbox
        if (newSelection.length === 0) {
          setNotifyClientsOnApproval(false);
        }

        return newSelection;
      });
    };

    const handleNotifyClientsCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setNotifyClientsOnApproval(checked);

      // If turning on notifications but no clients selected, select all clients
      if (checked && clientsToNotify.length === 0 && request?.contacts) {
        setClientsToNotify(request.contacts.map(contact => contact.contact_id));
      }
    };

    const handleManualApproval = async () => {
      if (!request) return;

      setIsSubmittingApproval(true);
      setError(null);

      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['x-auth-token'] = token;
        }

        // First, update the request status to approved
        await axios.put(`/api/approval-requests/${id}`, { status: 'approved' }, { headers });

        // Then, if notifications are enabled, notify selected clients
        if (notifyClientsOnApproval && clientsToNotify.length > 0) {
          await axios.post(
            `/api/approval-requests/${id}/notify-approval`,
            { contactIds: clientsToNotify },
            { headers }
          );
        }

        // Close dialog and refresh data
        handleCloseApprovalDialog();
        fetchRequestDetails();
      } catch (err: any) {
        console.error('Error approving request:', err);
        setError(err.response?.data?.error || 'Failed to approve request');
      } finally {
        setIsSubmittingApproval(false);
      }
    };

    const handleSlackChannelUpdate = async () => {
      if (!request) return;

      try {
        const token = localStorage.getItem('usertoken');
        await axios.patch(
          `/api/approval-requests/${request.request_id}`,
          { project_slack_channel: slackChannel },
          { headers: { 'x-auth-token': token } }
        );
        // Optimistically update the local state
        setRequest(prev => (prev ? { ...prev, project_slack_channel: slackChannel } : null));
        setIsEditingSlack(false);
        showSuccess('Slack channel updated successfully!');
      } catch (error) {
        console.error('Error updating Slack channel:', error);
        showError('Failed to update Slack channel.');
      }
    };

    const handleAddReviewers = () => {
      setIsAddReviewersModalOpen(true);
    };

    // Helper function to show toast messages
    const showToast = (
      message: string,
      severity: 'success' | 'error' | 'warning' | 'info' = 'success'
    ) => {
      setToastMessage(message);
      setToastSeverity(severity);
      setToastOpen(true);
    };

    // Handle closing the toast
    const handleCloseToast = () => {
      setToastOpen(false);
    };

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
        <IntercomLayout
          title={request?.title || 'Request Details'}
          breadcrumbs={[
            { label: 'Client Approval', href: '/client-approval' },
            { label: 'Request Details' },
          ]}
        >
          <Box>
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
                            label={
                              request.status?.charAt(0).toUpperCase() + request.status?.slice(1)
                            }
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
                            <Typography variant="body1" fontWeight="medium">
                              Manually approved by {request.approved_by_name}
                              {request.staff_approved_at && (
                                <>
                                  {' '}
                                  on {new Date(
                                    request.staff_approved_at
                                  ).toLocaleDateString()} at{' '}
                                  {new Date(request.staff_approved_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </>
                              )}
                            </Typography>
                          </Paper>
                        </Box>
                      )}

                      {request.description && (
                        <Typography variant="body1" sx={{ mt: 2 }}>
                          {request.description}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <IntercomCard>
                        <Box sx={{ p: 2 }}>
                          {/* <Typography variant="subtitle2" gutterBottom>
                            Request Info
                          </Typography> */}
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">
                              Created:
                            </Typography>
                            <Typography variant="body2">
                              {new Date(request.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          {/* <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">
                              Latest Version:
                            </Typography>
                            <Typography variant="body2">
                              {request.versions && request.versions.length > 0
                                ? request.versions[0].version_number
                                : 1}
                            </Typography>
                          </Box> */}
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="textSecondary">
                              Approvals:
                            </Typography>
                            <Typography variant="body2">
                              {request.contacts.filter(c => c.has_approved).length} /{' '}
                              {request.contacts.length}
                            </Typography>
                          </Box>
                        </Box>
                      </IntercomCard>

                      <IntercomCard title="Notifications" sx={{ mt: 2 }}>
                        <Box p={2}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Project Slack Channel
                          </Typography>
                          {isEditingSlack ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <TextField
                                value={slackChannel}
                                onChange={e => {
                                  let value = e.target.value.trim();
                                  if (value && !value.startsWith('#')) {
                                    value = '#' + value;
                                  }
                                  setSlackChannel(value);
                                }}
                                placeholder="#channel-name"
                                size="small"
                                fullWidth
                              />
                              <IconButton onClick={handleSlackChannelUpdate} color="primary">
                                <CheckIcon />
                              </IconButton>
                              <IconButton onClick={() => setIsEditingSlack(false)}>
                                <CloseIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body1">
                                {request?.project_slack_channel || 'Using default channel'}
                              </Typography>
                              <IconButton onClick={() => setIsEditingSlack(true)} size="small">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
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
                    {/* <Tab label="Version History" /> */}
                    {/* <Tab label="Contacts" /> */}
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
                              <Typography variant="h6">
                                Contact Status &nbsp;
                                <IntercomButton
                                  variant="secondary"
                                  onClick={() => setIsAddReviewersModalOpen(true)}
                                >
                                  Manage
                                </IntercomButton>
                              </Typography>
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
                                  onClick={() => handleOpenViewLog(contact)}
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
                              <IntercomButton
                                variant="danger"
                                onClick={handleArchiveRequest}
                                startIcon={<DeleteIcon />}
                              >
                                Archive Request
                              </IntercomButton>
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

                            {(() => {
                              if (request.inline_content) {
                                // Check if this is a Google Doc URL
                                if (
                                  request.content_type === 'google_doc' ||
                                  (request.inline_content.includes('docs.google.com') &&
                                    !request.inline_content.startsWith('<'))
                                ) {
                                  // Google Doc detected in staff view

                                  // Get the direct document URL - for staff view we pass true
                                  const docUrl = request.google_doc_id
                                    ? getEmbeddableGoogleDocUrl(
                                        `https://docs.google.com/document/d/${request.google_doc_id}`,
                                        request.status,
                                        isMinimalMode
                                      )
                                    : getEmbeddableGoogleDocUrl(
                                        request.inline_content,
                                        request.status,
                                        isMinimalMode
                                      );

                                  return (
                                    <Box mt={2}>
                                      <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        mb={2}
                                      >
                                        <Typography
                                          variant="h4"
                                          sx={{
                                            maxWidth: '75%',
                                            overflow: 'hidden',
                                            // textOverflow: 'ellipsis',
                                            // whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {request.title}
                                        </Typography>

                                        <IntercomButton
                                          variant="secondary"
                                          onClick={() => setIsMinimalMode(!isMinimalMode)}
                                          startIcon={
                                            isMinimalMode ? <ArticleIcon /> : <CloseIcon />
                                          }
                                        >
                                          {isMinimalMode
                                            ? 'Use Standard Editor'
                                            : 'Use Minimal Editor'}
                                        </IntercomButton>
                                      </Box>

                                      {/* Single iframe that follows the same format as client view */}
                                      <Box
                                        sx={{
                                          height: '700px', // Taller for better usability
                                          border: '1px solid',
                                          borderColor: 'rgba(0, 0, 0, 0.23)',
                                          borderRadius: 1,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <iframe
                                          src={docUrl}
                                          width="100%"
                                          height="100%"
                                          frameBorder="0"
                                          style={{ border: 'none' }}
                                          allow="autoplay; encrypted-media"
                                        ></iframe>
                                      </Box>
                                    </Box>
                                  );
                                }

                                // Regular HTML content
                                // Prepend the title as H1 to the inline content
                                const contentWithTitle = `<h1 style="font-size: 1.5rem; margin-bottom: 1.5rem; font-weight: bold;">${request.title}</h1>${request.inline_content}`;

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
                                    <div dangerouslySetInnerHTML={{ __html: contentWithTitle }} />
                                  </Box>
                                );
                              } else if (request.file_url) {
                                return (
                                  <Alert severity="info" sx={{ mt: 2 }}>
                                    This request contains a file attachment instead of inline
                                    content.
                                    <IntercomButton
                                      variant="secondary"
                                      onClick={() => window.open(request.file_url!, '_blank')}
                                      startIcon={<DownloadIcon />}
                                      sx={{ ml: 2 }}
                                    >
                                      Download File
                                    </IntercomButton>
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
                                  <IntercomInput
                                    fullWidth
                                    label="Published URL"
                                    placeholder="https://example.com/published-content"
                                    value={publishedUrl}
                                    onChange={e => setPublishedUrl(e.target.value)}
                                    leftIcon={<LinkIcon />}
                                  />
                                </Grid>
                                {request.published_url && (
                                  <Grid item xs={3}>
                                    <IntercomButton
                                      fullWidth
                                      onClick={() => window.open(request.published_url!, '_blank')}
                                    >
                                      Visit
                                    </IntercomButton>
                                  </Grid>
                                )}
                              </Grid>
                              <Box display="flex" justifyContent="flex-end" mt={2}>
                                <IntercomButton
                                  variant="primary"
                                  onClick={handleUpdatePublishedUrl}
                                  disabled={updatingUrl}
                                >
                                  {updatingUrl ? <CircularProgress size={24} /> : 'Update URL'}
                                </IntercomButton>
                              </Box>
                            </Box>
                          </Paper>

                          <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Comments
                            </Typography>

                            <Box mt={2} mb={3}>
                              <IntercomInput
                                fullWidth
                                multiline
                                rows={3}
                                label="Add a comment"
                                placeholder="Enter your comment here..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                              />
                              <Box display="flex" justifyContent="flex-end" mt={2}>
                                <IntercomButton
                                  variant="primary"
                                  onClick={handleSubmitComment}
                                  disabled={submittingComment || !newComment.trim()}
                                >
                                  {submittingComment ? (
                                    <CircularProgress size={24} />
                                  ) : (
                                    'Post Comment'
                                  )}
                                </IntercomButton>
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
                                              {comment.comment.startsWith('[STAFF APPROVAL]') ? (
                                                <Box
                                                  sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    mb: 1,
                                                  }}
                                                >
                                                  <Chip
                                                    label={`Manually Approved by ${comment.commenter_name}`}
                                                    color="success"
                                                    size="small"
                                                    icon={<CheckIcon />}
                                                    sx={{ alignSelf: 'flex-start', mb: 1 }}
                                                  />
                                                  <Box
                                                    sx={{
                                                      backgroundColor: 'success.light',
                                                      color: 'success.contrastText',
                                                      padding: 1,
                                                      borderRadius: 1,
                                                    }}
                                                  >
                                                    Content manually approved by staff
                                                  </Box>
                                                </Box>
                                              ) : (
                                                comment.comment
                                              )}
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
                      </Grid>
                    </>
                  )}

                  {tabValue === 1 && (
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Version History</Typography>
                        <IntercomButton
                          variant="primary"
                          startIcon={<AddIcon />}
                          onClick={handleOpenNewVersionDialog}
                        >
                          Create New Version
                        </IntercomButton>
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
                                        <IntercomButton
                                          variant="secondary"
                                          startIcon={<DownloadIcon />}
                                          onClick={() => window.open(version.file_url!, '_blank')}
                                          sx={{ mt: 2, mr: 2 }}
                                        >
                                          View / Download
                                        </IntercomButton>
                                      )}

                                      {/* Add View Content button */}
                                      <IntercomButton
                                        variant="secondary"
                                        startIcon={<ArticleIcon />}
                                        onClick={() => handleOpenVersionContent(version)}
                                        sx={{ mt: 2 }}
                                      >
                                        View Content
                                      </IntercomButton>
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
        </IntercomLayout>

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
            <IntercomButton onClick={handleCloseRemoveDialog} variant="ghost">
              Cancel
            </IntercomButton>
            <IntercomButton onClick={handleConfirmRemoveContact} variant="danger">
              Remove
            </IntercomButton>
          </DialogActions>
        </Dialog>

        {/* --- View Log Modal --- */}
        <ViewLogModal
          open={viewLogModalOpen}
          onClose={handleCloseViewLog}
          contactViews={selectedContactViews}
          resendingContactId={resendingContactId}
          onResendNotification={handleResendNotification}
        />
        {/* --- End View Log Modal --- */}

        {/* --- Approval Confirmation Dialog --- */}
        <Dialog
          open={approvalDialogOpen}
          onClose={handleCloseApprovalDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Approve Content</DialogTitle>
          <DialogContent dividers>
            <DialogContentText paragraph>
              You are about to manually approve this content. This will mark the request as approved
              regardless of client responses.
            </DialogContentText>

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notifyClientsOnApproval && clientsToNotify.length > 0}
                    onChange={handleNotifyClientsCheckboxChange}
                  />
                }
                label="Notify clients about approval"
              />
            </FormGroup>

            {notifyClientsOnApproval &&
              request &&
              request.contacts &&
              request.contacts.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select clients to notify:
                  </Typography>
                  <List dense>
                    {request.contacts.map(contact => (
                      <ListItem key={contact.contact_id} disablePadding>
                        <ListItemButton
                          dense
                          onClick={() => handleToggleClientNotification(contact.contact_id)}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={clientsToNotify.includes(contact.contact_id)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText primary={contact.name} secondary={contact.email} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
          </DialogContent>
          <DialogActions>
            <IntercomButton onClick={handleCloseApprovalDialog} variant="ghost">
              Cancel
            </IntercomButton>
            <IntercomButton
              onClick={handleManualApproval}
              variant="primary"
              disabled={isSubmittingApproval}
              startIcon={isSubmittingApproval ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              Approve
            </IntercomButton>
          </DialogActions>
        </Dialog>
        {/* --- End Approval Confirmation Dialog --- */}

        {/* Toast Notification */}
        <Snackbar
          open={toastOpen}
          autoHideDuration={6000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseToast} severity={toastSeverity} sx={{ width: '100%' }}>
            {toastMessage}
          </Alert>
        </Snackbar>

        {/* --- Add Reviewers Modal --- */}
        {request && (
          <AddReviewersModal
            open={isAddReviewersModalOpen}
            onClose={() => setIsAddReviewersModalOpen(false)}
            requestId={request.request_id}
            clientId={request.client_id}
            currentReviewerIds={request.contacts.map(c => c.contact_id)}
            onReviewersAdded={() => {
              fetchRequestDetails();
              showSuccess('Reviewers updated successfully.');
            }}
          />
        )}
        {/* --- End Add Reviewers Modal --- */}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Request Details - {request?.title || id}</title>
      </Head>
      <ToastProvider>
        <ClientApprovalRequestContent />
      </ToastProvider>
    </>
  );
}
