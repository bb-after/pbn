import { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction, getPool } from 'lib/db';
import { validateUserToken } from '../validate-user-token';

// Use centralized connection pool
const pool = getPool();
// Basic function to check client portal access
async function checkContactAccess(requestId: number, contactId: number): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM approval_request_contacts
      WHERE request_id = ? AND contact_id = ?
    `;
    const [result] = await pool.query(query, [requestId, contactId]);
    return (result as any[])[0].count > 0;
  } catch (error) {
    console.error('Error checking contact access:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle GET request to retrieve reactions
  if (req.method === 'GET') {
    const { targetType, targetId } = req.query;

    // Validate parameters
    if (
      !targetType ||
      !targetId ||
      !['comment', 'section_comment', 'reply'].includes(String(targetType))
    ) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
      const query = `
        SELECT 
          cr.reaction_id, 
          cr.target_type,
          cr.target_id,
          cr.emoji,
          cr.user_id,
          cr.client_contact_id,
          u.name as user_name,
          cc.name as contact_name,
          cr.created_at
        FROM 
          comment_reactions cr
        LEFT JOIN
          users u ON cr.user_id = u.id
        LEFT JOIN
          client_contacts cc ON cr.client_contact_id = cc.contact_id
        WHERE 
          cr.target_type = ? AND cr.target_id = ?
        ORDER BY 
          cr.created_at ASC
      `;

      const [rows] = await pool.query(query, [targetType, targetId]);

      // Group reactions by emoji for easier display
      const groupedReactions = (rows as any[]).reduce((acc: any, reaction: any) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }

        acc[reaction.emoji].push({
          reaction_id: reaction.reaction_id,
          user_id: reaction.user_id,
          client_contact_id: reaction.client_contact_id,
          name: reaction.user_name || reaction.contact_name || 'Unknown',
          created_at: reaction.created_at,
        });

        return acc;
      }, {});

      return res.status(200).json(groupedReactions);
    } catch (error) {
      console.error('Error retrieving reactions:', error);
      return res.status(500).json({ error: 'Failed to retrieve reactions' });
    }
  }

  // Handle POST request to add a reaction
  else if (req.method === 'POST') {
    const { targetType, targetId, emoji, requestId } = req.body;

    console.log('Reaction POST request received:', {
      targetType,
      targetId,
      emoji,
      requestId,
      headers: {
        'x-auth-token': req.headers['x-auth-token'] ? '✓ Present' : '× Missing',
        'x-client-portal': req.headers['x-client-portal'],
        'x-client-contact-id': req.headers['x-client-contact-id'],
      },
    });

    // Validate required fields
    if (
      !targetType ||
      !targetId ||
      !emoji ||
      !['comment', 'section_comment', 'reply'].includes(targetType)
    ) {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    // Validate emoji format (basic check)
    if (typeof emoji !== 'string' || emoji.length > 10) {
      return res.status(400).json({ error: 'Invalid emoji format' });
    }

    // Determine if this is a client or staff reaction
    const isClientPortal = req.headers['x-client-portal'] === 'true';
    const contactIdHeader = req.headers['x-client-contact-id'];

    let contactId: number | null = null;
    let userId: string | null = null;

    // Check authentication based on source
    if (isClientPortal) {
      // Client portal authentication
      if (!contactIdHeader || isNaN(Number(contactIdHeader))) {
        console.log('Client auth failed: Missing or invalid contact ID');
        return res.status(401).json({ error: 'Unauthorized - Missing or invalid contact ID' });
      }

      contactId = Number(contactIdHeader);

      // Verify requestId is provided for client access check
      if (!requestId) {
        console.log('Client auth failed: Missing request ID');
        return res
          .status(400)
          .json({ error: 'Request ID is required for client portal reactions' });
      }

      // Verify the client has access to this request
      const hasAccess = await checkContactAccess(Number(requestId), contactId);
      if (!hasAccess) {
        console.log('Client auth failed: No access to request');
        return res.status(403).json({ error: 'Forbidden - No access to this request' });
      }
    } else {
      // Staff authentication
      console.log('Attempting staff auth validation...');
      const userInfo = await validateUserToken(req);
      console.log('Staff auth validation result:', {
        isValid: userInfo.isValid,
        userId: userInfo.user_id ? '✓ Present' : '× Missing',
        username: userInfo.username ? '✓ Present' : '× Missing',
      });

      if (!userInfo.isValid) {
        console.log('Staff auth failed: Invalid token');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      userId = userInfo.user_id;
      console.log('Staff auth successful, using user_id:', userId);
    }

    try {
      // Insert the reaction
      const insertQuery = `
        INSERT INTO comment_reactions 
          (target_type, target_id, user_id, client_contact_id, emoji)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          created_at = CURRENT_TIMESTAMP
      `;

      console.log('Inserting reaction with:', {
        targetType,
        targetId,
        userId,
        contactId,
        emoji,
      });

      const [result] = await pool.query(insertQuery, [
        targetType,
        targetId,
        userId,
        contactId,
        emoji,
      ]);

      // Get the reaction ID
      const reactionId = (result as any).insertId || null;

      return res.status(201).json({
        message: 'Reaction added successfully',
        reaction_id: reactionId,
        target_type: targetType,
        target_id: targetId,
        emoji: emoji,
        user_id: userId,
        client_contact_id: contactId,
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      return res.status(500).json({ error: 'Failed to add reaction' });
    }
  }

  // Handle other HTTP methods
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
