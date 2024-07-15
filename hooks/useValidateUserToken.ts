import { useState, useEffect } from 'react';
import axios from 'axios';

const useValidateUserToken = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidUser, setIsValidUser] = useState(false);

  useEffect(() => {
    const validateUserToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      let userToken = urlToken || localStorage.getItem('usertoken');

      if (!userToken) {
        setIsLoading(false);
        return;
      }

      console.log("token?", userToken);
      try {
        const response = await axios.get(`/api/validate-user-token?token=${userToken}`);
        if (response.data.valid) {
          setIsValidUser(true);
          localStorage.setItem('usertoken', userToken);
        } else {
          setIsValidUser(false);
          if (!urlToken) {
            localStorage.removeItem('usertoken');
          }
        }
      } catch (error) {
        console.error("Error validating user token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    validateUserToken();
  }, []);

  return { isLoading, isValidUser };
};

export default useValidateUserToken;
