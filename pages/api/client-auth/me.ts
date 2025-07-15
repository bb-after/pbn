import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import * as cookie from 'cookie';
import { query } from 'lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get the client_auth_token cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.client_auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // 2. Verify the JWT token
    const decodedToken = verify(
      token,
      process.env.JWT_SECRET || 'default-secret-change-in-production'
    ) as any;

    if (!decodedToken || !decodedToken.contact_id) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // 3. Get the latest contact information from the database
    const contactQuery = `
      SELECT 
        cc.contact_id, 
        cc.name, 
        cc.email, 
        c.client_id, 
        c.client_name
      FROM 
        client_contacts cc
      JOIN 
        clients c ON cc.client_id = c.client_id
      WHERE 
        cc.contact_id = ? AND cc.is_active = true AND c.is_active = 1
    `;

    const [contactRows] = await query(contactQuery, [decodedToken.contact_id]);

    if ((contactRows as any[]).length === 0) {
      return res.status(401).json({ error: 'Unauthorized - Contact not found or inactive' });
    }

    const contactData = (contactRows as any[])[0];

    // 4. Return the contact data
    return res.status(200).json({
      contact_id: contactData.contact_id,
      name: contactData.name,
      email: contactData.email,
      client_id: contactData.client_id,
      client_name: contactData.client_name,
    });
  } catch (error) {
    console.error('Error getting current client contact:', error);

    // Check if it's a JWT verification error
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized - Token expired' });
    }

    return res.status(500).json({ error: 'Failed to get current client contact' });
  }
}
