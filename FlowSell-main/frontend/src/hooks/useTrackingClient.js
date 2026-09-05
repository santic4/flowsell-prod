import { useState, useCallback } from 'react';
import { apiRequest } from '../api/api.js';


export function useBuyers() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);

  const fetchBuyers = useCallback(async (itemIds, startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {

      const body = {
        itemIds,
        startDate,
        endDate
      };

      const data = await apiRequest('/api/client-tracking', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setJobId(data.jobId);
      setBuyers([]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { buyers, jobId, loading, error, refetch: fetchBuyers, setBuyers };
}
