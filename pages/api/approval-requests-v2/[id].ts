import { NextApiRequest, NextApiResponse } from 'next';
import { approvalRequestService } from '../../../utils/approvalRequestService';
import { validateUserToken } from '../validate-user-token';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid request ID' });
  }

  try {
    // Validate user token
    const userValidation = await validateUserToken(req);
    if (!userValidation.isValid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (req.method === 'GET') {
      return handleGet(req, res, parseInt(id), userValidation);
    } else if (req.method === 'POST') {
      return handleSync(req, res, parseInt(id), userValidation);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Approval request API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse, localId: number, user: any) => {
  try {
    const result = await approvalRequestService.getApprovalRequest(localId);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return res.status(404).json({ error: result.error });
      }
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    console.error('Error getting approval request:', error);
    return res.status(500).json({ error: 'Failed to get approval request' });
  }
};

const handleSync = async (
  req: NextApiRequest,
  res: NextApiResponse,
  localId: number,
  user: any
) => {
  try {
    const result = await approvalRequestService.syncRequestStatus(localId);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Request status synchronized successfully',
    });
  } catch (error) {
    console.error('Error syncing approval request:', error);
    return res.status(500).json({ error: 'Failed to sync approval request' });
  }
};
