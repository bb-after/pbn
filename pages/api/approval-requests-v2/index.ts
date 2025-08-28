import { NextApiRequest, NextApiResponse } from 'next';
import { approvalRequestService } from '../../../utils/approvalRequestService';
import { validateUserToken } from '../validate-user-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate user token
    const userValidation = await validateUserToken(req);
    if (!userValidation.isValid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (req.method === 'POST') {
      return handleCreate(req, res, userValidation);
    } else if (req.method === 'GET') {
      return handleList(req, res, userValidation);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Approval requests API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const handleCreate = async (req: NextApiRequest, res: NextApiResponse, user: any) => {
  const { clientId, contactEmail, title, content, approvalDeadline } = req.body;

  if (!clientId || !contactEmail || !title || !content) {
    return res.status(400).json({
      error: 'Missing required fields: clientId, contactEmail, title, content',
    });
  }

  try {
    const result = await approvalRequestService.createApprovalRequest({
      clientId: parseInt(clientId),
      contactEmail,
      title,
      content,
      approvalDeadline: approvalDeadline ? new Date(approvalDeadline) : undefined,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // TODO: Send notifications, post to Slack, etc.

    return res.status(201).json({
      message: 'Approval request created successfully',
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Error creating approval request:', error);
    return res.status(500).json({ error: 'Failed to create approval request' });
  }
};

const handleList = async (req: NextApiRequest, res: NextApiResponse, user: any) => {
  const { clientId, status, limit = 50, offset = 0 } = req.query;

  try {
    const result = await approvalRequestService.getApprovalRequests({
      clientId: clientId ? parseInt(clientId as string) : undefined,
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      requests: result.data || [],
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error listing approval requests:', error);
    return res.status(500).json({ error: 'Failed to list approval requests' });
  }
};
