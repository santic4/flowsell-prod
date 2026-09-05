import { useCallback, useState } from 'react';
import { apiRequest } from '../api/api.js';

export function useSendMessagesMassive() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const sendMessagesMassive = useCallback(async ({ templateIds, itemIds, buyers, jobId }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/client-tracking/send', {
        method: 'POST',
        body: JSON.stringify({ templateIds, itemIds, buyers, jobId }),
      });
      setResponse(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessages: sendMessagesMassive, loading, error, response };
}
