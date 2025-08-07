import axios from 'axios';
import { initVersionRecogito } from './recogito';

export interface RecogitoAnnotation {
  section_comment_id: number;
  request_id: number;
  user_id?: string | null;
  client_contact_id?: string | number | null;
  contact_id?: number | null; // Alias for client_contact_id
  user_name?: string | null;
  contact_name?: string | null;
  start_offset: number;
  end_offset: number;
  selected_text: string | null;
  comment_text: string;
  created_at: string;
  created_at_iso?: string;
  version_id?: number | null; // Version ID this comment belongs to
  replies?: Array<{
    reply_id: number;
    reply_text: string;
    user_id?: string | null;
    user_name?: string | null;
    client_contact_id?: number | null;
    contact_name?: string | null;
    author_name?: string | null;
    client_name?: string | null; // Add missing client_name property
    created_at: string;
    created_at_iso?: string;
  }>;
}

export interface RecogitoManagerOptions {
  contentElementId: string;
  annotations: RecogitoAnnotation[];
  isReadOnly: boolean;
  requestId: string | string[];
  // Authentication options
  auth: {
    type: 'staff' | 'client';
    token?: string; // For staff
    clientContactId?: number; // For client
  };
  // Callbacks
  onReplySuccess: () => void;
  onError?: (message: string) => void;
}

// Shared formatter function
export const createAnnotationFormatter = () => {
  return (annotation: any) => {
    console.log('Formatting annotation:', annotation);

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
            <div style="font-weight: 500; font-size: 0.9em; color: #1976d2;">${reply.author_name || reply.user_name || reply.contact_name || 'Unknown'}</div>
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
  };
};

// Convert database comment to Recogito annotation format
export const convertDbCommentToAnnotation = (dbComment: RecogitoAnnotation) => {
  const annotation = {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    id: `#section-comment-${dbComment.section_comment_id}`,
    body: {
      type: 'TextualBody',
      value: dbComment.comment_text,
      purpose: 'commenting',
      creator: {
        id: dbComment.user_id
          ? `staff:${dbComment.user_id}`
          : `contact:${dbComment.client_contact_id}`,
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
    replies: dbComment.replies || [],
    metadata: {
      comment_text: dbComment.comment_text,
      author_name: dbComment.user_name || dbComment.contact_name || 'Unknown',
      created_at: dbComment.created_at_iso || dbComment.created_at,
      replies: dbComment.replies || [],
    },
  };

  console.log(
    'Created annotation for text:',
    `"${dbComment.selected_text}" at positions ${dbComment.start_offset}-${dbComment.end_offset}`,
    'Replies:',
    dbComment.replies?.length || 0
  );
  return annotation;
};

// Main Recogito manager class
export class RecogitoManager {
  private instance: any = null;
  private formatter: any;
  private options: RecogitoManagerOptions;

  constructor(options: RecogitoManagerOptions) {
    this.options = options;
    this.formatter = createAnnotationFormatter();
    console.log('🏗️ RecogitoManager constructor called with auth options:', this.options.auth);
    console.trace('🔍 Stack trace for RecogitoManager constructor call:');
  }

  async initialize(): Promise<boolean> {
    try {
      // Wait for DOM element to be available with retry mechanism
      const element = await this.waitForElement(this.options.contentElementId);
      if (!element) {
        console.error(
          `RecogitoManager: Element #${this.options.contentElementId} not found after retries`
        );
        return false;
      }

      // Convert annotations to Recogito format
      const recogitoAnnotations = this.options.annotations.map(convertDbCommentToAnnotation);

      console.log('RecogitoManager: Initializing with', recogitoAnnotations.length, 'annotations');

      // Initialize Recogito
      const r = await initVersionRecogito({
        contentElementId: this.options.contentElementId,
        annotations: recogitoAnnotations,
        readOnly: this.options.isReadOnly,
        formatter: this.formatter,
        currentInstance: null,
      });

      if (!r) {
        console.error('RecogitoManager: Failed to initialize Recogito');
        return false;
      }

      this.instance = r;
      this.setupEventHandlers();
      console.log('RecogitoManager: Successfully initialized');
      return true;
    } catch (error) {
      console.error('RecogitoManager: Error during initialization:', error);
      return false;
    }
  }

  private async waitForElement(
    elementId: string,
    maxAttempts = 10,
    delay = 200
  ): Promise<Element | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const element = document.getElementById(elementId);
      if (element) {
        console.log(`RecogitoManager: Found element #${elementId} on attempt ${i + 1}`);
        return element;
      }
      console.log(
        `RecogitoManager: Waiting for element #${elementId}, attempt ${i + 1}/${maxAttempts}`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
  }

  private setupEventHandlers() {
    if (!this.instance) return;

    // Handle creating new annotations (when user highlights text and creates a comment)
    this.instance.on('createAnnotation', async (annotation: any) => {
      console.log('RecogitoManager: New annotation created:', annotation);

      if (this.options.isReadOnly) {
        console.log('RecogitoManager: Skipping save in read-only mode');
        return;
      }

      try {
        // Extract annotation details
        const body = annotation.body?.[0];
        const textQuote = annotation.target.selector?.find(
          (s: any) => s.type === 'TextQuoteSelector'
        );
        const textPosition = annotation.target.selector?.find(
          (s: any) => s.type === 'TextPositionSelector'
        );

        if (!body || !textPosition) {
          console.error('RecogitoManager: Missing required annotation data');
          return;
        }

        // Build request based on auth type
        const payload: any = {
          startOffset: textPosition.start,
          endOffset: textPosition.end,
          selectedText: textQuote?.exact || '',
          commentText: body.value || '',
          versionId: null, // Will be set by the API based on latest version
        };
        const headers: any = {};

        if (this.options.auth.type === 'staff' && this.options.auth.token) {
          headers['x-auth-token'] = this.options.auth.token;
          // For staff, we can pass user_id if available
        } else if (this.options.auth.type === 'client' && this.options.auth.clientContactId) {
          headers['x-client-portal'] = 'true';
          headers['x-client-contact-id'] = this.options.auth.clientContactId.toString();
          payload.contactId = this.options.auth.clientContactId;
        }

        console.log(
          'RecogitoManager: Saving new annotation with payload:',
          payload,
          'headers:',
          headers
        );
        console.log('RecogitoManager: Full axios request:', {
          url: `/api/approval-requests/${this.options.requestId}/section-comments`,
          payload,
          headers,
        });

        // Add detailed logging before the request
        console.log('RecogitoManager: About to send axios request with:');
        console.log(
          'RecogitoManager: - URL:',
          `/api/approval-requests/${this.options.requestId}/section-comments`
        );
        console.log('RecogitoManager: - Payload:', JSON.stringify(payload, null, 2));
        console.log('RecogitoManager: - Headers:', JSON.stringify(headers, null, 2));

        const response = await axios.post(
          `/api/approval-requests/${this.options.requestId}/section-comments`,
          payload,
          { headers }
        );

        console.log('RecogitoManager: New annotation saved successfully:', response.data);

        // Call success callback to refresh data
        setTimeout(() => {
          this.options.onReplySuccess(); // Reuse the success callback
        }, 500);
      } catch (error) {
        console.error('RecogitoManager: Error saving new annotation:', error);
        if (this.options.onError) {
          this.options.onError('Failed to save comment. Please try again.');
        }
      }
    });

    // Setup selectAnnotation event handler with custom popup injection
    this.instance.on('selectAnnotation', (annotation: any) => {
      console.log('RecogitoManager: Annotation selected:', annotation);

      setTimeout(() => {
        const popup = document.querySelector('.r6o-editor-inner');
        if (popup) {
          console.log('RecogitoManager: Found popup element, injecting custom content');
          const formattedContent = this.formatter(annotation);

          // Get section comment ID
          const sectionCommentId =
            annotation.id?.replace('#section-comment-', '') ||
            annotation.underlying?.id?.replace('#section-comment-', '');

          // Create unique function names
          const replyFunctionName = `addReply_${sectionCommentId}_${Date.now()}`;
          const cancelFunctionName = `cancelReply_${sectionCommentId}_${Date.now()}`;

          // Create reply form
          const replyForm = `
            <div style="margin-top: 12px; padding: 8px; border-top: 1px solid #eee;">
              <textarea id="reply-input-${sectionCommentId}" placeholder="Add a reply..." style="width: 100%; min-height: 60px; background: white !important; color: #000 !important; border: 1px solid #ccc; border-radius: 4px; padding: 8px; font-family: inherit; resize: vertical;"></textarea>
              <div style="margin-top: 8px;">
                <button onclick="${replyFunctionName}()" style="background: #1976d2; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 13px; cursor: pointer; margin-right: 8px;">Add Reply</button>
                <button onclick="${cancelFunctionName}()" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 13px; cursor: pointer;">Cancel</button>
              </div>
            </div>
          `;

          // Inject custom content
          popup.innerHTML =
            formattedContent +
            replyForm +
            '<div class="r6o-footer"><button class="r6o-btn">Close</button></div>';

          // Setup reply functionality
          this.setupReplyHandlers(replyFunctionName, cancelFunctionName, sectionCommentId);
        }
      }, 100);
    });
  }

  private setupReplyHandlers(
    replyFunctionName: string,
    cancelFunctionName: string,
    sectionCommentId: string
  ) {
    // Add reply handler
    (window as any)[replyFunctionName] = async () => {
      const textarea = document.getElementById(
        `reply-input-${sectionCommentId}`
      ) as HTMLTextAreaElement;
      if (textarea && textarea.value.trim()) {
        try {
          console.log('RecogitoManager: Sending reply');

          // Build request based on auth type
          const payload: any = { replyText: textarea.value.trim() };
          const headers: any = {};

          console.log('RecogitoManager: Auth config:', this.options.auth);

          if (this.options.auth.type === 'staff' && this.options.auth.token) {
            headers['x-auth-token'] = this.options.auth.token;
          } else if (this.options.auth.type === 'client' && this.options.auth.clientContactId) {
            headers['x-client-portal'] = 'true';
            headers['x-client-contact-id'] = this.options.auth.clientContactId.toString();
            payload.contactId = this.options.auth.clientContactId;
          }

          const response = await axios.post(
            `/api/approval-requests/${this.options.requestId}/section-comments/${sectionCommentId}/replies`,
            payload,
            { headers }
          );

          console.log('RecogitoManager: Reply saved successfully:', response.data);

          // Call success callback
          setTimeout(() => {
            this.options.onReplySuccess();
          }, 500);

          // Close popup
          this.closePopup();
        } catch (error) {
          console.error('RecogitoManager: Error saving reply:', error);
          if (this.options.onError) {
            this.options.onError('Failed to save reply');
          }
        }
      }
    };

    // Add cancel handler
    (window as any)[cancelFunctionName] = () => {
      const textarea = document.getElementById(
        `reply-input-${sectionCommentId}`
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = '';
      }
      this.closePopup();
    };
  }

  private closePopup() {
    try {
      if (this.instance.cancelSelected) {
        this.instance.cancelSelected();
      } else if (this.instance.clearSelection) {
        this.instance.clearSelection();
      } else {
        // Fallback: manually remove popup
        const popup = document.querySelector('.r6o-editor');
        if (popup) {
          popup.remove();
        }
      }
    } catch (error) {
      console.log('RecogitoManager: Could not close popup automatically, using fallback');
      const popup = document.querySelector('.r6o-editor');
      if (popup) {
        popup.remove();
      }
    }
  }

  destroy() {
    if (this.instance) {
      console.log('RecogitoManager: Destroying instance');
      this.instance.destroy();
      this.instance = null;
    }
  }

  getInstance() {
    return this.instance;
  }
}
