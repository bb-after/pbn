import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { sign } from 'jsonwebtoken';
import * as cookie from 'cookie';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET and POST for debugging
  const token = req.method === 'GET' ? req.query.token : req.body.token;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log('Verifying token in debug endpoint:', token);

    // 1. Check if token exists and is valid
    const tokenQuery = `
      SELECT 
        cat.token_id,
        cat.contact_id,
        cat.expires_at,
        cat.is_used,
        cc.name,
        cc.email,
        c.client_id,
        c.client_name
      FROM 
        client_auth_tokens cat
      JOIN
        client_contacts cc ON cat.contact_id = cc.contact_id
      JOIN
        clients c ON cc.client_id = c.client_id
      WHERE 
        cat.token = ?
    `;

    const [tokenResult] = await pool.query(tokenQuery, [token]);
    console.log('Token query result:', tokenResult);

    if ((tokenResult as any[]).length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid token', message: 'No token found with this ID' });
    }

    const tokenData = (tokenResult as any[])[0];

    // 2. Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token has expired', message: 'Token expired' });
    }

    // 3. Check if token is already used
    if (tokenData.is_used) {
      return res.status(400).json({ error: 'Token has already been used', message: 'Token used' });
    }

    // 4. Mark token as used
    const updateTokenQuery = `
      UPDATE client_auth_tokens
      SET is_used = 1
      WHERE token_id = ?
    `;

    await pool.query(updateTokenQuery, [tokenData.token_id]);

    // 5. Generate JWT for client session
    const clientData = {
      contact_id: tokenData.contact_id,
      name: tokenData.name,
      email: tokenData.email,
      client_id: tokenData.client_id,
      client_name: tokenData.client_name,
    };

    const clientJWT = sign(
      clientData,
      process.env.JWT_SECRET || 'default-secret-change-in-production',
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // 6. Set JWT as HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('client_auth_token', clientJWT, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from strict to lax for better compatibility
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
    );

    // For debugging, also include the JWT in the response
    return res.status(200).json({
      message: 'Authentication successful',
      client: {
        contact_id: tokenData.contact_id,
        name: tokenData.name,
        client_id: tokenData.client_id,
        client_name: tokenData.client_name,
      },
      jwt: clientJWT, // Only include this in debug mode
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return res
      .status(500)
      .json({ error: 'Failed to verify token', details: (error as Error).message });
  }
}
