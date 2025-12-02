import { NextApiRequest } from 'next';
import { verifyStaffAuth, verifyClientAuth, verifyAuth } from '../utils/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

// Mock environment variables
process.env.JWT_SECRET = JWT_SECRET;

describe('Authentication Utils', () => {
  const mockStaffToken = jwt.sign(
    {
      email: 'test@statuslabs.com',
      name: 'Test Staff',
      role: 'staff',
      domain: 'statuslabs.com',
      googleId: '123456',
      picture: 'https://example.com/avatar.jpg'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const mockClientToken = jwt.sign(
    {
      contact_id: 1,
      name: 'Test Client',
      email: 'client@example.com',
      client_id: 1,
      client_name: 'Test Company'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  describe('verifyStaffAuth', () => {
    it('should verify valid staff token', () => {
      const mockReq = {
        headers: {
          cookie: `staff_auth_token=${mockStaffToken}`
        }
      } as NextApiRequest;

      const result = verifyStaffAuth(mockReq);
      
      expect(result.isValid).toBe(true);
      expect(result.user?.email).toBe('test@statuslabs.com');
      expect(result.user?.role).toBe('staff');
    });

    it('should reject request without token', () => {
      const mockReq = {
        headers: {}
      } as NextApiRequest;

      const result = verifyStaffAuth(mockReq);
      
      expect(result.isValid).toBe(false);
      expect(result.user).toBe(null);
    });
  });

  describe('verifyClientAuth', () => {
    it('should verify valid client token', () => {
      const mockReq = {
        headers: {
          cookie: `client_auth_token=${mockClientToken}`
        }
      } as NextApiRequest;

      const result = verifyClientAuth(mockReq);
      
      expect(result.isValid).toBe(true);
      expect(result.user?.email).toBe('client@example.com');
      expect(result.user?.contact_id).toBe(1);
    });

    it('should reject request without token', () => {
      const mockReq = {
        headers: {}
      } as NextApiRequest;

      const result = verifyClientAuth(mockReq);
      
      expect(result.isValid).toBe(false);
      expect(result.user).toBe(null);
    });
  });

  describe('verifyAuth', () => {
    it('should prefer staff auth when both tokens present', () => {
      const mockReq = {
        headers: {
          cookie: `staff_auth_token=${mockStaffToken}; client_auth_token=${mockClientToken}`
        }
      } as NextApiRequest;

      const result = verifyAuth(mockReq);
      
      expect(result.type).toBe('staff');
      expect((result.user as any)?.email).toBe('test@statuslabs.com');
    });

    it('should fall back to client auth when only client token present', () => {
      const mockReq = {
        headers: {
          cookie: `client_auth_token=${mockClientToken}`
        }
      } as NextApiRequest;

      const result = verifyAuth(mockReq);
      
      expect(result.type).toBe('client');
      expect((result.user as any)?.email).toBe('client@example.com');
    });

    it('should return null when no valid tokens present', () => {
      const mockReq = {
        headers: {}
      } as NextApiRequest;

      const result = verifyAuth(mockReq);
      
      expect(result.type).toBe(null);
      expect(result.user).toBe(null);
    });
  });
});