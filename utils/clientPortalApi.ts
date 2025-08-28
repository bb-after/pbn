/**
 * API client for communicating with the external client portal
 * Used by the main app (statuscrawl.io) to interact with statusapprovals.com
 */

const CLIENT_PORTAL_API_URL = process.env.CLIENT_PORTAL_API_URL || 'http://localhost:3001';
const CLIENT_PORTAL_API_KEY = process.env.CLIENT_PORTAL_API_KEY;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CreateApprovalRequest {
  clientId: number;
  clientName: string;
  contactEmail: string;
  contactName: string;
  title: string;
  content: string;
  approvalDeadline?: string;
}

interface ApprovalRequestData {
  request_id: number;
  external_request_id: string;
  contact_id: number;
  external_client_id: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  approval_deadline?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
}

class ClientPortalApi {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = CLIENT_PORTAL_API_URL;
    this.apiKey = CLIENT_PORTAL_API_KEY || '';

    if (!this.apiKey) {
      console.warn('CLIENT_PORTAL_API_KEY not set - API requests may fail');
    }
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/api${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Client Portal API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
      };
    }
  }

  /**
   * Create a new approval request in the client portal
   */
  async createApprovalRequest(
    request: CreateApprovalRequest
  ): Promise<ApiResponse<{ requestId: number; externalRequestId: string }>> {
    return this.makeRequest('/approval-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get an approval request by external ID
   */
  async getApprovalRequest(externalRequestId: string): Promise<ApiResponse<ApprovalRequestData>> {
    return this.makeRequest(`/approval-requests/${externalRequestId}`);
  }

  /**
   * Update approval request status
   */
  async updateApprovalRequestStatus(
    externalRequestId: string,
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  ): Promise<ApiResponse<ApprovalRequestData>> {
    return this.makeRequest(`/approval-requests/${externalRequestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Get approval requests for a client
   */
  async getClientApprovalRequests(clientId: number): Promise<ApiResponse<ApprovalRequestData[]>> {
    return this.makeRequest(`/approval-requests?clientId=${clientId}`);
  }

  /**
   * Add a comment to an approval request
   */
  async addComment(
    externalRequestId: string,
    comment: string,
    isInternal: boolean = false
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/approval-requests/${externalRequestId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, isInternal }),
    });
  }

  /**
   * Ensure a client contact exists in the client portal
   */
  async ensureClientContact(contact: {
    email: string;
    name: string;
    externalClientId: number;
    clientName: string;
  }): Promise<ApiResponse<{ contactId: number }>> {
    return this.makeRequest('/client-contacts/ensure', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  /**
   * Health check for the client portal API
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest('/health');
  }
}

export const clientPortalApi = new ClientPortalApi();
export type { CreateApprovalRequest, ApprovalRequestData };
