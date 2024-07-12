import { useState, useEffect } from 'react';
import axios from 'axios';

const useValidateUserToken = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isValidUser, setIsValidUser] = useState(false);

  useEffect(() => {
    const validateUserToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userToken = urlParams.get("token");

      if (!userToken) {
        setIsLoading(false);
        return;
      }

      console.log("token?", userToken);
      try {
        const response = await axios.get(
          `/api/validate-user-token?token=${userToken}`
        );
        if (response.data.valid) {
          setIsValidUser(true);
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
