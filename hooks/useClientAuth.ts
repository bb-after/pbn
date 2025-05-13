import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

interface ClientContact {
  contact_id: number;
  name: string;
  email: string;
  client_id: number;
  client_name: string;
}

export default function useClientAuth(redirectTo?: string) {
  const router = useRouter();
  const [isValidClient, setIsValidClient] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're already on the login or verify page to avoid redirect loops
  const isAuthPage = () => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      return pathname.includes('/login') || pathname.includes('/verify');
    }
    return false;
  };

  useEffect(() => {
    const validateClient = async () => {
      // Skip validation on auth pages to avoid errors
      if (isAuthPage()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get('/api/client-auth/me');
        setClientInfo(response.data);
        setIsValidClient(true);
      } catch (error: any) {
        console.error('Error validating client auth:', error);
        setIsValidClient(false);
        setClientInfo(null);

        if (redirectTo && !isAuthPage()) {
          // Add error information to the redirect
          let errorMessage = 'not_authenticated';
          let statusCode = 401;

          // Extract more specific error information if available
          if (error.response) {
            statusCode = error.response.status;
            if (error.response.data && error.response.data.error) {
              errorMessage = error.response.data.error.toLowerCase().replace(/\s+/g, '_');
            }
          }

          // Construct the redirect URL with error information
          const redirectUrl = new URL(redirectTo, window.location.origin);
          redirectUrl.searchParams.set('error', errorMessage);
          redirectUrl.searchParams.set('status', statusCode.toString());

          // Save the attempted URL for potential redirection after login
          if (typeof window !== 'undefined') {
            // Don't save login or verify pages
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/login') && !currentPath.includes('/verify')) {
              localStorage.setItem('redirectAfterLogin', currentPath);
            }
          }

          router.push(redirectUrl.pathname + redirectUrl.search);
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateClient();
  }, [redirectTo, router]);

  const logout = async () => {
    try {
      await axios.post('/api/client-auth/logout');
      setIsValidClient(false);
      setClientInfo(null);

      // Clear stored paths
      if (typeof window !== 'undefined') {
        localStorage.removeItem('redirectAfterLogin');
      }

      router.push('/client-portal/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out');
    }
  };

  return { isValidClient, clientInfo, isLoading, error, logout };
}
