import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

const useGetTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, error, loading, reloadTemplates: fetchTemplates };
};

export default useGetTemplates;
