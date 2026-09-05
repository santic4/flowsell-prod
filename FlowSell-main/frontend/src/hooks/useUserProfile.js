import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/api.js';

const useUserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async (signal) => {
    try {
      setError(null);
      setLoading(true);

      const data = await apiRequest('/api/users/me', { signal });

      setUser({
        meliId:   data.meliId,
        email:    data.email,
        nickname: data.nickname,
        picture:  data.picture,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;

      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchUser(controller.signal);

    return () => controller.abort();
  }, [fetchUser]);

  return { user, loading, error };
};

export default useUserProfile;
