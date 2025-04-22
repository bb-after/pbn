/**
 * Approval Requests API Access Control Tests
 *
 * These tests validate that users can only access resources they have permission to.
 */

import axios from 'axios';
import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/approval-requests/[id]';

// Mock the request/response objects
const createMockReq = (params: any = {}, headers: any = {}, method: string = 'GET') => {
  return {
    query: { id: params.id || '1' },
    headers,
    method,
    body: params.body || {},
  } as unknown as NextApiRequest;
};

const createMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as unknown as NextApiResponse;
};

// Mock the mysql pool
jest.mock('mysql2/promise', () => {
  const mockQuery = jest.fn();
  return {
    createPool: jest.fn().mockReturnValue({
      query: mockQuery,
      getConnection: jest.fn().mockReturnValue({
        query: mockQuery,
        release: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      }),
    }),
  };
});

describe('Approval Requests API - Access Control', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Reset the mock query function
    jest.clearAllMocks();
    const pool = mysql.createPool({
      host: process.env.DB_HOST_NAME,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 20,
    });
    mockQuery = pool.query as unknown as jest.Mock;
  });

  describe('GET /api/approval-requests/[id]', () => {
    test('returns 404 when request ID does not exist', async () => {
      // Setup mock to return empty result for request query
      mockQuery.mockResolvedValueOnce([[], []]);

      const req = createMockReq({ id: '999' });
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Approval request not found' });
    });

    test('returns 403 when client tries to access a request from another client', async () => {
      // Setup mock to return a request
      mockQuery.mockResolvedValueOnce([
        [
          {
            request_id: 123,
            client_id: 456,
            client_name: 'Test Client',
            title: 'Test Request',
            description: null,
            file_url: null,
            file_type: null,
            inline_content: 'Test content',
            status: 'pending',
            created_by_id: 'user1',
            published_url: null,
            is_archived: false,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
          },
        ],
        [],
      ]);

      // Mock the access check query to return 0 (no access)
      mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);

      const req = createMockReq(
        { id: '123' },
        { 'x-client-portal': 'true', 'x-client-contact-id': '789' }
      );
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You do not have permission to view this request',
      });
    });

    test('returns 200 when client accesses their own request', async () => {
      // Setup mock to return a request
      mockQuery.mockResolvedValueOnce([
        [
          {
            request_id: 123,
            client_id: 456,
            client_name: 'Test Client',
            title: 'Test Request',
            description: null,
            file_url: null,
            file_type: null,
            inline_content: 'Test content',
            status: 'pending',
            created_by_id: 'user1',
            published_url: null,
            is_archived: false,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
          },
        ],
        [],
      ]);

      // Mock the access check query to return 1 (has access)
      mockQuery.mockResolvedValueOnce([[{ count: 1 }], []]);

      // Mock other queries needed to build the response
      mockQuery.mockResolvedValueOnce([[{ contact_id: 789, name: 'Test Contact' }], []]);
      mockQuery.mockResolvedValueOnce([[], []]); // for versions
      mockQuery.mockResolvedValueOnce([[], []]); // for comments
      mockQuery.mockResolvedValueOnce([[], []]); // for section comments

      const req = createMockReq(
        { id: '123' },
        { 'x-client-portal': 'true', 'x-client-contact-id': '789' }
      );
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('staff can access any request', async () => {
      // Setup mock to return a request
      mockQuery.mockResolvedValueOnce([
        [
          {
            request_id: 123,
            client_id: 456,
            client_name: 'Test Client',
            title: 'Test Request',
            description: null,
            file_url: null,
            file_type: null,
            inline_content: 'Test content',
            status: 'pending',
            created_by_id: 'user1',
            published_url: null,
            is_archived: false,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
          },
        ],
        [],
      ]);

      // Mock other queries needed to build the response
      mockQuery.mockResolvedValueOnce([[{ contact_id: 789, name: 'Test Contact' }], []]);
      mockQuery.mockResolvedValueOnce([[], []]); // for versions
      mockQuery.mockResolvedValueOnce([[], []]); // for comments
      mockQuery.mockResolvedValueOnce([[], []]); // for section comments

      const req = createMockReq({ id: '123' }, {}); // No client portal headers = staff access
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
