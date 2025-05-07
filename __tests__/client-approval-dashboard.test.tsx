import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { useRouter } from 'next/router';
import ClientApprovalPage from '../pages/client-approval/index';
import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock staff auth hook
jest.mock('../hooks/useValidateUserToken', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isValidUser: true,
    isLoading: false,
    token: 'fake-token',
  })),
}));

describe('ClientApprovalPage - Archived Requests Tab', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockImplementation(() => ({
      query: {},
      push: mockPush,
      replace: mockReplace,
      pathname: '/client-approval',
    }));
  });

  test('fetches and displays archived requests when switching to Archived Requests tab', async () => {
    // Mock API responses
    const activeRequests = [
      {
        request_id: 1,
        client_id: 1,
        client_name: 'Client A',
        title: 'Active Request',
        description: 'Active description',
        file_url: '',
        file_type: null,
        status: 'pending',
        created_by_id: 'user1',
        published_url: null,
        is_archived: false,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        approvals_count: 0,
        total_contacts: 1,
        versions: [
          {
            version_id: 1,
            version_number: 1,
            file_url: '',
            comments: null,
            created_at: '2023-01-01',
          },
        ],
      },
    ];
    const archivedRequests = [
      {
        request_id: 2,
        client_id: 2,
        client_name: 'Client B',
        title: 'Archived Request',
        description: 'Archived description',
        file_url: '',
        file_type: null,
        status: 'approved',
        created_by_id: 'user2',
        published_url: null,
        is_archived: true,
        created_at: '2023-01-02',
        updated_at: '2023-01-02',
        approvals_count: 1,
        total_contacts: 1,
        versions: [
          {
            version_id: 2,
            version_number: 1,
            file_url: '',
            comments: null,
            created_at: '2023-01-02',
          },
        ],
      },
    ];
    // First call: active requests
    mockedAxios.get.mockImplementationOnce(() => Promise.resolve({ data: activeRequests }));
    // Second call: archived requests
    mockedAxios.get.mockImplementationOnce(() => Promise.resolve({ data: archivedRequests }));
    // Mock clients fetch
    mockedAxios.get.mockImplementationOnce(() => Promise.resolve({ data: [] }));

    render(<ClientApprovalPage />);

    // Wait for active requests to load
    await waitFor(() => {
      expect(screen.getByText('Active Request')).toBeInTheDocument();
    });
    expect(screen.queryByText('Archived Request')).not.toBeInTheDocument();

    // Click the Archived Requests tab
    const archivedTab = screen.getByRole('tab', { name: /Archived Requests/i });
    fireEvent.click(archivedTab);

    // Wait for archived requests to load
    await waitFor(() => {
      expect(screen.getByText('Archived Request')).toBeInTheDocument();
    });
    expect(screen.queryByText('Active Request')).not.toBeInTheDocument();
  });
});
