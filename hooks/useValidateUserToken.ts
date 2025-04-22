import { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

const useValidateUserToken = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidUser, setIsValidUser] = useState(false);
  const [token, setToken] = useState<string | null>(null); // Allow both string and null
  const [user, setUser] = useState<User | null>(null); // Add user state

  useEffect(() => {
    const validateUserToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      let userToken = urlToken || localStorage.getItem('usertoken');

      if (!userToken) {
        setIsLoading(false);
        return;
      }

      console.log('token?', userToken);
      try {
        const response = await axios.get(`/api/validate-user-token?token=${userToken}`);
        if (response.data.valid) {
          setIsValidUser(true);
          setToken(userToken); // Store the token in state

          // Store user data if available
          if (response.data.user) {
            setUser(response.data.user);
          }

          localStorage.setItem('usertoken', userToken);
        } else {
          setIsValidUser(false);
          setToken(null); // Reset token if invalid
          setUser(null); // Reset user if invalid
          if (!urlToken) {
            localStorage.removeItem('usertoken');
          }
        }
      } catch (error) {
        console.error('Error validating user token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    validateUserToken();
  }, []);

  return { isLoading, isValidUser, token, user };
};

export default useValidateUserToken;
