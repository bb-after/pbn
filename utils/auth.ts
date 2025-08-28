import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface StaffUser {
  email: string;
  name: string;
  picture: string;
  domain: string;
  role: string;
  googleId: string;
}

export interface ClientContact {
  contact_id: number;
  name: string;
  email: string;
  client_id: number;
  client_name: string;
}

export interface AuthResult {
  type: 'staff' | 'client' | null;
  user: StaffUser | ClientContact | null;
  error?: string;
}

/**
 * Verifies staff authentication from request cookies
 */
export const verifyStaffAuth = (
  req: NextApiRequest
): { isValid: boolean; user: StaffUser | null; error?: string } => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.staff_auth_token;

    if (!token) {
      return { isValid: false, user: null, error: 'No staff token provided' };
    }

    const decodedToken = jwt.verify(token, JWT_SECRET) as any;

    if (!decodedToken || !decodedToken.email || decodedToken.role !== 'staff') {
      return { isValid: false, user: null, error: 'Invalid staff token' };
    }

    return {
      isValid: true,
      user: {
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        domain: decodedToken.domain,
        role: decodedToken.role,
        googleId: decodedToken.googleId,
      },
    };
  } catch (error) {
    return { isValid: false, user: null, error: 'Token verification failed' };
  }
};

/**
 * Verifies client authentication from request cookies
 */
export const verifyClientAuth = (
  req: NextApiRequest
): { isValid: boolean; user: ClientContact | null; error?: string } => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.client_auth_token;

    if (!token) {
      return { isValid: false, user: null, error: 'No client token provided' };
    }

    const decodedToken = jwt.verify(token, JWT_SECRET) as any;

    if (!decodedToken || !decodedToken.contact_id) {
      return { isValid: false, user: null, error: 'Invalid client token' };
    }

    return {
      isValid: true,
      user: {
        contact_id: decodedToken.contact_id,
        name: decodedToken.name,
        email: decodedToken.email,
        client_id: decodedToken.client_id,
        client_name: decodedToken.client_name,
      },
    };
  } catch (error) {
    return { isValid: false, user: null, error: 'Token verification failed' };
  }
};

/**
 * Attempts to authenticate using both staff and client methods
 * Returns the first valid authentication found
 */
export const verifyAuth = (req: NextApiRequest): AuthResult => {
  // Try staff authentication first
  const staffAuth = verifyStaffAuth(req);
  if (staffAuth.isValid && staffAuth.user) {
    return {
      type: 'staff',
      user: staffAuth.user,
    };
  }

  // Try client authentication
  const clientAuth = verifyClientAuth(req);
  if (clientAuth.isValid && clientAuth.user) {
    return {
      type: 'client',
      user: clientAuth.user,
    };
  }

  return {
    type: null,
    user: null,
    error: 'No valid authentication found',
  };
};

/**
 * Middleware function to protect API routes
 */
export const requireAuth = (
  handler: (req: NextApiRequest, res: any, auth: AuthResult) => Promise<void>
) => {
  return async (req: NextApiRequest, res: any) => {
    const auth = verifyAuth(req);

    if (!auth.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    return handler(req, res, auth);
  };
};

/**
 * Middleware function to protect API routes for staff only
 */
export const requireStaffAuth = (
  handler: (req: NextApiRequest, res: any, user: StaffUser) => Promise<void>
) => {
  return async (req: NextApiRequest, res: any) => {
    const staffAuth = verifyStaffAuth(req);

    if (!staffAuth.isValid || !staffAuth.user) {
      return res.status(401).json({ error: 'Staff authentication required' });
    }

    return handler(req, res, staffAuth.user);
  };
};

/**
 * Middleware function to protect API routes for clients only
 */
export const requireClientAuth = (
  handler: (req: NextApiRequest, res: any, user: ClientContact) => Promise<void>
) => {
  return async (req: NextApiRequest, res: any) => {
    const clientAuth = verifyClientAuth(req);

    if (!clientAuth.isValid || !clientAuth.user) {
      return res.status(401).json({ error: 'Client authentication required' });
    }

    return handler(req, res, clientAuth.user);
  };
};
