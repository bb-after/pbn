import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

interface User {
  id: number;
  username?: string;
  name?: string;
  email: string;
  role: string;
  picture?: string;
  domain?: string;
}

const useAuth = (redirectTo?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidUser, setIsValidUser] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error: any) {
      // Only log non-401 errors since logout might fail if already logged out
      if (error.response?.status !== 401) {
        console.error('Error during logout:', error);
      }
    } finally {
      // Always clear local state and redirect, regardless of API success/failure
      setIsValidUser(false);
      setUser(null);
      router.push('/login');
    }
  };

  useEffect(() => {
    const validateUser = async () => {
      try {
        // Check if we're already being redirected or on login page
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          setIsLoading(false);
          return;
        }
        
        const response = await axios.get('/api/auth/me');
        if (response.data.user) {
          setIsValidUser(true);
          // Map the response to match the User interface
          const userData: User = {
            id: response.data.user.id,
            name: response.data.user.name,
            username: response.data.user.name, // Keep backward compatibility
            email: response.data.user.email,
            role: response.data.user.role,
            picture: response.data.user.picture,
            domain: response.data.user.domain,
          };
          setUser(userData);
        } else {
          setIsValidUser(false);
          setUser(null);
          
          if (redirectTo) {
            localStorage.setItem('redirectAfterLogin', router.asPath);
            router.push(redirectTo);
          }
        }
      } catch (error: any) {
        // Only log non-401 errors since 401 is expected when not authenticated
        if (error.response?.status !== 401) {
          console.error('Error validating user:', error);
        }
        
        setIsValidUser(false);
        setUser(null);
        
        if (redirectTo) {
          localStorage.setItem('redirectAfterLogin', router.asPath);
          router.push(redirectTo);
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateUser();
  }, [router, redirectTo]);

  // Keep backward compatibility with useValidateUserToken interface
  return { 
    isLoading, 
    isValidUser, 
    user, 
    logout,
    // Legacy compatibility
    token: user ? 'jwt_token' : null, // Provide a placeholder since we use cookies now
  };
};

export default useAuth;