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

  useEffect(() => {
    const validateClient = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get('/api/client-auth/me');
        setClientInfo(response.data);
        setIsValidClient(true);
      } catch (error) {
        console.error('Error validating client auth:', error);
        setIsValidClient(false);
        setClientInfo(null);

        if (redirectTo) {
          router.push(redirectTo);
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

      router.push('/client-portal/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out');
    }
  };

  return { isValidClient, clientInfo, isLoading, error, logout };
}
