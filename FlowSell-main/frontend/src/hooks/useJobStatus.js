import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/api.js';

export function useJobStatus(jobId) {
  const [job, setJob] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    setLoadingStatus(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/client-tracking/buyers/${jobId}`);
      setJob(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoadingStatus(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return undefined;
    let cancelled = false;
    let timer;

    const poll = async () => {
      const result = await fetchStatus();
      if (!cancelled && result && !['COMPLETED', 'FAILED'].includes(result.status)) {
        timer = window.setTimeout(poll, 3500);
      }
    };

    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fetchStatus, jobId]);

  return { job, loadingStatus, error, fetchStatus };
}
