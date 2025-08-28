/**
 * Service for managing approval requests in the main app
 * Coordinates between local reference table and external client portal
 */

import { query } from 'lib/db';
import { clientPortalApi, CreateApprovalRequest } from './clientPortalApi';

interface ApprovalRequestRef {
  id: number;
  external_request_id: string;
  client_id: number;
  client_name: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreateApprovalRequestInput {
  clientId: number;
  contactEmail: string;
  title: string;
  content: string;
  approvalDeadline?: Date;
}

class ApprovalRequestService {
  /**
   * Create a new approval request
   * 1. Get client and contact info
   * 2. Send to client portal API
   * 3. Store reference in local DB
   */
  async createApprovalRequest(
    input: CreateApprovalRequestInput
  ): Promise<{ success: boolean; requestId?: number; error?: string }> {
    try {
      // Get client information
      const clientQuery = `
        SELECT c.client_id, c.client_name, cc.contact_id, cc.name as contact_name, cc.email
        FROM clients c
        JOIN client_contacts cc ON c.client_id = cc.client_id
        WHERE c.client_id = ? AND cc.email = ? AND c.is_active = 1 AND cc.is_active = 1
      `;

      const [clientResult] = await query(clientQuery, [input.clientId, input.contactEmail]);

      if (!Array.isArray(clientResult) || clientResult.length === 0) {
        return { success: false, error: 'Client or contact not found' };
      }

      const clientData = clientResult[0] as any;

      // Create request in client portal
      const portalRequest: CreateApprovalRequest = {
        clientId: clientData.client_id,
        clientName: clientData.client_name,
        contactEmail: clientData.email,
        contactName: clientData.contact_name,
        title: input.title,
        content: input.content,
        approvalDeadline: input.approvalDeadline?.toISOString().split('T')[0],
      };

      const portalResponse = await clientPortalApi.createApprovalRequest(portalRequest);

      if (!portalResponse.success || !portalResponse.data) {
        return {
          success: false,
          error: `Failed to create request in client portal: ${portalResponse.error}`,
        };
      }

      // Store reference in local DB
      const insertRefQuery = `
        INSERT INTO approval_request_refs 
        (external_request_id, client_id, client_name, title, status) 
        VALUES (?, ?, ?, ?, 'pending')
      `;

      const [insertResult] = await query(insertRefQuery, [
        portalResponse.data.externalRequestId,
        clientData.client_id,
        clientData.client_name,
        input.title,
      ]);

      return {
        success: true,
        requestId: (insertResult as any).insertId,
      };
    } catch (error) {
      console.error('Error creating approval request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get approval request with full data from client portal
   */
  async getApprovalRequest(
    localId: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get local reference
      const refQuery = `
        SELECT * FROM approval_request_refs WHERE id = ?
      `;

      const [refResult] = await query(refQuery, [localId]);

      if (!Array.isArray(refResult) || refResult.length === 0) {
        return { success: false, error: 'Request reference not found' };
      }

      const ref = refResult[0] as ApprovalRequestRef;

      // Get full data from client portal
      const portalResponse = await clientPortalApi.getApprovalRequest(ref.external_request_id);

      if (!portalResponse.success) {
        return {
          success: false,
          error: `Failed to fetch from client portal: ${portalResponse.error}`,
        };
      }

      // Update local status if different
      if (portalResponse.data && portalResponse.data.status !== ref.status) {
        await this.updateLocalStatus(localId, portalResponse.data.status);
      }

      return {
        success: true,
        data: {
          ...portalResponse.data,
          local_id: localId,
        },
      };
    } catch (error) {
      console.error('Error getting approval request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of approval requests for admin view
   */
  async getApprovalRequests(filters?: {
    clientId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data?: ApprovalRequestRef[]; error?: string }> {
    try {
      let whereClause = '1=1';
      const params: any[] = [];

      if (filters?.clientId) {
        whereClause += ' AND client_id = ?';
        params.push(filters.clientId);
      }

      if (filters?.status) {
        whereClause += ' AND status = ?';
        params.push(filters.status);
      }

      const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : '';
      const offsetClause = filters?.offset ? `OFFSET ${filters.offset}` : '';

      const requestsQuery = `
        SELECT * FROM approval_request_refs 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        ${limitClause} ${offsetClause}
      `;

      const [result] = await query(requestsQuery, params);

      return {
        success: true,
        data: result as ApprovalRequestRef[],
      };
    } catch (error) {
      console.error('Error getting approval requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update local status when client portal status changes
   */
  private async updateLocalStatus(localId: number, newStatus: string): Promise<void> {
    const updateQuery = `
      UPDATE approval_request_refs 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await query(updateQuery, [newStatus, localId]);
  }

  /**
   * Sync status from client portal for a specific request
   */
  async syncRequestStatus(localId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.getApprovalRequest(localId);
      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }
}

export const approvalRequestService = new ApprovalRequestService();
export type { ApprovalRequestRef, CreateApprovalRequestInput };
