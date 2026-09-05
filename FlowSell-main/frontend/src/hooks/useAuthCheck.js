import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuthentication = useCallback(async () => {
    setIsChecking(true);
    try {
      const data = await apiRequest('/api/auth/check');
      setIsAuthenticated(Boolean(data?.isAuthenticated));
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  return {
    isAuthenticated,
    isChecking,
    setIsAuthenticated,
    refreshAuthentication: checkAuthentication,
  };
};

export default useAuthCheck;
