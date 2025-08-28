import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

interface StaffUser {
  email: string;
  name: string;
  picture: string;
  domain: string;
  role: string;
  googleId: string;
}

export default function useStaffAuth(redirectTo?: string) {
  const router = useRouter();
  const [isValidStaff, setIsValidStaff] = useState(false);
  const [staffInfo, setStaffInfo] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're already on the staff login page to avoid redirect loops
  const isStaffAuthPage = () => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      return pathname.includes('/staff/login');
    }
    return false;
  };

  useEffect(() => {
    const validateStaff = async () => {
      // Skip validation on auth pages to avoid errors
      if (isStaffAuthPage()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get('/api/staff-auth/me');
        setStaffInfo(response.data);
        setIsValidStaff(true);
      } catch (error: any) {
        console.error('Error validating staff auth:', error);
        setIsValidStaff(false);
        setStaffInfo(null);

        if (redirectTo && !isStaffAuthPage()) {
          // Add error information to the redirect
          let errorMessage = 'not_authenticated';
          let statusCode = 401;

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
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/staff/login')) {
              localStorage.setItem('redirectAfterStaffLogin', currentPath);
            }
          }

          router.push(redirectUrl.pathname + redirectUrl.search);
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateStaff();
  }, [redirectTo, router]);

  const logout = async () => {
    try {
      await axios.post('/api/staff-auth/logout');
      setIsValidStaff(false);
      setStaffInfo(null);

      // Clear stored paths
      if (typeof window !== 'undefined') {
        localStorage.removeItem('redirectAfterStaffLogin');
      }

      router.push('/staff/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out');
    }
  };

  return { isValidStaff, staffInfo, isLoading, error, logout };
}
